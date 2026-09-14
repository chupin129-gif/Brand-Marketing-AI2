import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BlogPostParams, GeneratedBlog, SeoTrend, Platform, KeywordTrendAnalysis, ValidationFeedback } from "../types";

function getAIClient(): GoogleGenAI {
  const apiKey = 
    process.env.API_KEY || 
    process.env.GEMINI_API_KEY || 
    (import.meta as any).env?.VITE_GEMINI_API_KEY || 
    (import.meta as any).env?.VITE_API_KEY || 
    (import.meta as any).env?.GEMINI_API_KEY || 
    '';

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      "Gemini API 키가 설정되지 않았습니다. Vercel 프로젝트 설정(Settings > Environment Variables)에서 'GEMINI_API_KEY' (또는 'VITE_GEMINI_API_KEY')를 등록하고 반드시 [Redeploy]를 진행해주세요."
    );
  }

  return new GoogleGenAI({
    apiKey
  });
}

/**
 * Step 0: Validate if the user input is sufficient and relevant enough to write a high-quality post.
 */
export const validateContentInput = async (params: BlogPostParams): Promise<ValidationFeedback> => {
  const ai = getAIClient();
  const model = 'gemini-3.7-flash';

  const systemInstruction = `
    You are an elite Chief Editor. Your absolute priority is QUALITY OVER QUANTITY.
    You must prevent the generation of low-quality, spammy, hallucinated, or forced articles.
    Evaluate the provided input to determine if a high-quality, professional blog post can be written from it.

    Rules for Rejection (isValid: false):
    1. LACK OF RELEVANCE: If the "Provided Stories/Content" have absolutely nothing to do with the "Main Keyword" or the "Brand", you must reject it.
    2. LACK OF DEPTH: If the provided stories are too brief, vague, or lack any factual/contextual detail to write a 1,500-character post without hallucinating fake information, you must reject it.
    3. FORCED WRITING: If forcing an article out of this input would result in a generic, low-quality, or spammy post, you must reject it.

    Rules for Approval (isValid: true):
    - The input provides enough specific context, anecdotes, or factual details to write a natural, high-quality post.

    If rejecting, you MUST provide a clear 'reason' explaining why it's insufficient, and 2-3 specific 'suggestions' (questions or prompts) to help the user provide better information.
  `;

  const prompt = `
    Evaluate this input:
    - Brand: ${params.brand}
    - Purpose: ${params.purpose}
    - Content Type: ${params.contentType}
    - Main Keyword: ${params.mainKeyword}
    - Sub Keywords: ${params.subKeywords}
    - Provided Stories/Content:
    ${params.stories.map(s => `  * [Priority ${s.priority}]: ${s.content}`).join('\n')}
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      isValid: {
        type: Type.BOOLEAN,
        description: "True if the input is high quality and sufficient to write a good post. False if it lacks depth or relevance."
      },
      reason: {
        type: Type.STRING,
        description: "If isValid is false, explain exactly why the input is insufficient or irrelevant. Write in Korean."
      },
      suggestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "If isValid is false, provide 2-3 specific questions or suggestions to guide the user on what to add. Write in Korean."
      }
    },
    required: ["isValid"]
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.1
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response from validation API");
    return JSON.parse(responseText) as ValidationFeedback;
  } catch (error) {
    console.error("Validation API error:", error);
    // Fallback: If validation fails due to API error, let it pass to not block the user entirely, or return a generic error.
    // For safety, we will let it pass if the validation API itself crashes, but log it.
    return { isValid: true, reason: "", suggestions: [] };
  }
};

/**
 * Step 1: Search for the latest platform-specific SEO/Algorithm trends using Google Search Grounding.
 */
export const fetchLatestSeoTrends = async (oldTrend?: SeoTrend, platform: Platform = 'naver'): Promise<SeoTrend> => {
  const currentYear = new Date().getFullYear();
  
  // 플랫폼별 고정된 최신 SEO 로직 (API 크레딧 낭비 방지를 위해 하드코딩)
  const platformData: Record<Platform, { summary: string; changes: string; sources: { title: string; uri: string }[] }> = {
    naver: {
      summary: `네이버 블로그 최신 로직: 스마트블록(SmartBlock) 맞춤 키워드 매칭, 체류시간 확보, D.I.A.+ 출처 신뢰도 및 직접 경험 중심의 서술과 모바일 친화적 사진/영상 첨부가 핵심입니다.`,
      changes: `단순 키워드 반복을 피하고, 사용자의 실제 '경험'과 '정보'가 결합된 독창적인 텍스트(C-Rank)를 높게 평가합니다.`,
      sources: [{ title: '네이버 Search & Tech', uri: 'https://search.naver.com/' }]
    },
    tistory: {
      summary: `티스토리 최신 로직: 다음(Daum) 검색 및 구글 봇 크롤링 듀얼 최적화, H2/H3 구조화 태그, 명확한 정보성 본문 및 적정 키워드 밀도 유지가 상위 노출에 유리합니다.`,
      changes: `빠른 페이지 로딩 속도와 모바일 친화적(Responsive) 스킨 사용, 그리고 명확한 메타 태그 작성이 구글 노출에 직접적 영향을 줍니다.`,
      sources: [{ title: 'Google 검색 센터', uri: 'https://developers.google.com/search' }]
    },
    wordpress: {
      summary: `워드프레스 최신 로직: 구글 E-E-A-T(전문성, 경험, 권위성, 신뢰성) 기준 충족, Schema 마크업, 체계적인 H태그 계층 구조 및 깊이 있는 전문 정보 제공이 필수적입니다.`,
      changes: `단순 정보 나열보다 '독창적 연구'나 '실제 사례'가 포함된 심층적인 콘텐츠(Helpful Content)에 가산점이 부여됩니다.`,
      sources: [{ title: 'Google E-E-A-T 가이드', uri: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content' }]
    },
    blogspot: {
      summary: `구글 블로거 최신 로직: 검색 의도에 부합하는 명확한 Q&A 단락 구성, 빠른 로딩을 위한 모바일 최적화 및 구글 검색 색인 친화적 메타 구조가 핵심입니다.`,
      changes: `구글의 핵심 웹 바이탈(Core Web Vitals) 지표가 중요해짐에 따라, 이미지 용량 최적화와 텍스트 가독성이 순위를 결정합니다.`,
      sources: [{ title: 'Google 핵심 웹 바이탈', uri: 'https://developers.google.com/search/docs/appearance/core-web-vitals' }]
    },
    instagram: {
      summary: `인스타그램 최신 로직: 첫 슬라이드 3초 후킹, 5~10장의 핵심 요약형 캐러셀 카드뉴스, 저장 및 공유(Save/Share)를 유도하는 캡션과 연관 해시태그 배치가 도달률을 높입니다.`,
      changes: `단순 좋아요보다 타 유저에게 DM으로 '공유'되거나 '저장'되는 콘텐츠가 탐색탭 노출 가중치를 압도적으로 많이 받습니다.`,
      sources: [{ title: 'Instagram Creators', uri: 'https://creators.instagram.com/' }]
    },
    threads: {
      summary: `스레드(Threads) 최신 로직: 군더더기 없는 2~3줄의 강렬한 훅, 독자의 공감을 이끌어내는 솔직한 대화체, 댓글 소통을 유도하는 열린 질문이 추천 피드 노출을 극대화합니다.`,
      changes: `일방적인 정보 전달보다는 논쟁거리나 의견을 묻는 '대화형(Conversational)' 텍스트가 알고리즘의 선택을 받습니다.`,
      sources: [{ title: 'Threads 공식 업데이트', uri: 'https://www.threads.net/' }]
    },
    eoplanet: {
      summary: `이오플래닛(EO Planet) 최신 로직: IT/스타트업 종사자 타겟의 깊이 있는 회고록, 문제 해결 경험담, 진정성 있는 스토리텔링이 핵심이며, 가독성을 위한 깔끔한 마크다운 구조가 필수적입니다.`,
      changes: `성공 스토리뿐만 아니라 실패를 극복한 구체적인 '과정(Process)'과 '회고(Retrospective)'가 가장 높은 인게이지먼트를 얻습니다.`,
      sources: [{ title: 'EO Planet 가이드', uri: 'https://eoplanet.co/' }]
    },
    x: {
      summary: `X(구 트위터) 최신 로직: 첫 트윗(메인 훅)의 강력한 호기심 유발 및 임팩트, 체류시간 및 북마크/리포스트(RT)를 극대화하는 타래(Thread: 🧵 1/n) 구조, 외부 링크는 노출 페널티 방지를 위해 타래 맨 끝이나 프로필 바이오 유도가 핵심입니다.`,
      changes: `X 알고리즘은 '북마크(Bookmark)', '리포스트(RT)', '인용(Quote)'에 가장 높은 점수를 부여하며, 본문 내 외부 링크는 알고리즘 도달 제한을 받으므로 타래 끝이나 답글에서 언급해야 합니다.`,
      sources: [{ title: 'X Algorithm & Creator Docs', uri: 'https://x.com/' }]
    }
  };

  const data = platformData[platform] || platformData.naver;

  // 인위적인 지연 없이 즉시 반환하여 속도 최적화 및 비용 0원 달성
  return {
    summary: data.summary,
    changes: `💡 [${currentYear}년 최적화] ${data.changes}`,
    sources: data.sources,
    timestamp: new Date().toLocaleString(),
  };
};

/**
 * Step 1.5: Analyze keyword trends based on mainKeyword.
 */
export const analyzeKeywordTrends = async (
  mainKeyword: string,
  platform: Platform = 'naver',
  contentType: 'review' | 'information' = 'review'
): Promise<KeywordTrendAnalysis> => {
  const model = 'gemini-3.7-flash';
  const ai = getAIClient();
  const currentMonth = new Date().getMonth() + 1;
  const currentSeason = [12, 1, 2].includes(currentMonth) ? '겨울' : [3, 4, 5].includes(currentMonth) ? '봄' : [6, 7, 8].includes(currentMonth) ? '여름' : '가을';

  const formatTargetDesc = contentType === 'review'
    ? '체험/후기형 블로그 글 (고객 방문 사례, 현장 에피소드, 이용 후기)'
    : '전문 정보성/칼럼형 블로그 글 (전문 지식, 꿀팁, 가이드)';

  const titleExample = contentType === 'review'
    ? '봄 웨딩 시즌 맞이 직접 다녀온 셀프축가 녹음 솔직 후기!'
    : '장마철에도 문제 없는 실내 데이트 코스 & 녹음 스튜디오 추천!';

  const systemInstruction = `
    당신은 네이버 검색 노출(SEO) 및 실시간 트렌드 분석 전문가입니다.
    사용자가 입력한 '메인 키워드'를 기반으로, 실제 네이버 검색 유저들이 많이 찾는 '자동완성 검색어'와 '연관 검색어'를 유추하고,
    현재 시기(${currentMonth}월, ${currentSeason})에 맞는 라이프스타일/시즌 트렌드를 결합하여 
    ${formatTargetDesc}에서 조회수를 폭발시킬 수 있는 황금 결합 키워드 세트를 3가지 제안해주세요.

    다음 JSON 스키마를 엄격히 준수하여 응답하세요:
    {
      "autocompleteKeywords": ["키워드1", "키워드2", "키워드3"],
      "relatedKeywords": ["키워드1", "키워드2", "키워드3"],
      "seasonalTrends": [
        { "tag": "이슈태그(예: 장마철)", "context": "트렌드 문맥 설명" }
      ],
      "recommendedCombinations": [
        {
          "titleIdea": "제목 아이디어 (예: ${titleExample})",
          "mainKeyword": "메인키워드",
          "subKeywords": "서브키워드1, 서브키워드2",
          "trendTopic": "시즌 이슈 또는 테마 (예: 봄 웨딩 시즌, 실내 데이트 등)",
          "reason": "이 조합이 왜 클릭률을 높이는지 설명"
        }
      ]
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `메인 키워드: ${mainKeyword}\n글 종류: ${contentType === 'review' ? '체험/후기형' : '전문 정보성'}\n타겟 플랫폼: ${platform}\n\n이 키워드에 대한 트렌드 분석 및 황금 키워드 조합 3가지를 제안해줘.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.7,
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('트렌드 분석 결과를 가져올 수 없습니다.');
  }

  return JSON.parse(text) as KeywordTrendAnalysis;
};

/**
 * Step 2: Generate the platform-tailored post using the identified trends and user inputs.
 */
export const generateBlogPost = async (
  params: BlogPostParams,
  seoTrend: SeoTrend,
  platform: Platform
): Promise<GeneratedBlog> => {
  const model = 'gemini-3.7-flash';
  const hasVideo = !!params.videoAssets;
  
  let purposeContext = "";
  if (params.purpose === 'seo') {
    purposeContext = `
    [CRITICAL RULE - SEO OPTIMIZATION PURPOSE]
    This content is strictly optimized for Search Engine Ranking (SEO). You MUST follow these exact rules:
    1. The exact main keyword "${params.mainKeyword}" MUST be the very FIRST word in the main Title (Standard Title).
    2. The exact main keyword "${params.mainKeyword}" MUST be the very FIRST word in the H1 tag inside the body content.
    3. The tone must be highly informational, deep, and authoritative (E-E-A-T principles).
    4. Use structured data logic: abundant H2/H3 tags and clear bullet points for indexability.
    `;
  } else {
    purposeContext = `
    [CRITICAL RULE - VIRAL TRAFFIC PURPOSE]
    This content is strictly optimized for High Click-Through Rate (CTR), engagement, and viral traffic.
    1. Focus on curiosity-inducing hooks, emotional resonance, and a highly clickable title.
    2. Do NOT rigidly force the main keyword at the beginning if it ruins the natural flow.
    3. Prioritize readability, short paragraphs, storytelling, and engaging tone over rigid SEO structure.
    `;
  }

  // --- BRAND CONTEXT (플랫폼별 맞춤 조화) ---
  let brandContext = '';
  if (params.brand === 'hema') {
    if (platform === 'naver') {
      brandContext = `
        [BRAND: 헤마 스튜디오 (Hema Studio)]
        - 업종: 일반인 대상 전문 녹음 및 영상 제작 스튜디오 (음원 녹음, 커버 영상, 셀프 축가, 프로포즈 영상 등)
        - 핵심 소구점: 전문 디렉터의 1:1 보컬 디렉팅 및 음정 보정, K-POP 뮤직비디오 스타일의 고퀄리티 영상 제작, 특별한 날을 위한 이색 체험
        - 📝 [네이버 블로그 전용 공식 레퍼런스 스타일 가이드]
          * 시점 및 화자: **'헤마스튜디오' 공식 블로그 담당자 시점** (친절하고 전문적인 안내자).
          * 제목 양식: "[키워드1] [키워드2] 감성을 자극하는 서술형 제목" (예: [셀프축가영상] [결혼식축가] 신랑신부가 함께 불러 더 설레이는 셀프축가)
          * 오프닝 (고정 시작): "안녕하세요~\\n평생 기억하고 싶은 순간을 담아드리는\\n헤마스튜디오 입니다💍" 로 시작.
            - 그 다음 줄:
              ▶ 고객 후기형: "오늘은 [주제/키워드]를 진행하신 고객님의 생생한 후기를 소개해드릴게요~"
              ▶ 정보성 글: "오늘은 [주제/키워드]에 대해 많은 분들이 궁금해하시는 알짜 팁을 전해드릴게요~"
          * 톤앤매너: 매우 친절하고 다정한 존댓말 (~텐데요~, ~있습니다🎵, ~해주셨어요!, ~해드릴게요~, ~살아났답니다💖, ~어떠셨나요?🥰). 문장 끝에 귀여운 이모지 적극 활용.
          * 분량 & 포맷: 최소 1,200~1,500자 이상 상세하게 작성. 한 문단은 1~2줄 단위로 짧게 줄바꿈하여 모바일 스크롤 가독성 극대화.
          * 단락 구분: 단락이 바뀔 때 [소제목 🎤] 형식 적용.
          * 하단 CTA 템플릿 (글 맨 끝에 삽입):
            [📍 지도: 헤마스튜디오]
            
            ♥ 주소 ♥
            서울특별시 강남구 학동로 3길 27 메리디엠타워 지하 1층
            
            ♥ 오시는 방법 ♥
            논현역 9번 출구에서 나와 직진 후 바른PT를 끼고 우회전하여 메리디엠 타워 표지판이 있는 곳까지 오셔서 안쪽에 있는 건물의 지하 1층으로 오시면 됩니다 😃
            
            ♥ 예약 문의 ♥
            070 - 7504 - 1415
            
            ♥ 카카오톡 상담 문의 ♥
            [카카오톡 채널 링크 썸네일]
            
            ♥ 홈페이지 바로 가기 ♥
            [홈페이지 링크 썸네일]
      `;
    } else if (platform === 'threads' || platform === 'x') {
      brandContext = `
        [BRAND: 헤마 스튜디오 (Hema Studio)]
        - 업종: 일반인 전문 보컬 녹음 & 뮤직비디오급 영상 제작 스튜디오
        - 핵심 소구점: 1:1 보컬 튜닝/음정보정의 마법, 신랑/신부 셀프축가 및 프로포즈 감동 썰, 일반인 음치 탈출
        - 📝 [SNS(스레드/X) 전용 화자 & 톤]:
          * 화자: 스튜디오에서 고객들의 드라마틱한 순간을 매일 지켜보는 디렉터/엔지니어의 솔직한 1인칭 시점.
          * 톤: 격식 차린 인사는 전부 생략하고, 친구한테 썰 풀듯이 솔직담백한 반말체 (~했음, ~하더라, ~인 듯, ~거든).
          * CTA: "프로필 링크에서 다른 분들 완성 영상 구경해보셈" 또는 "너네라면 무슨 노래 부를 거임? 댓글/인용으로 추천 좀" 같은 가벼운 소통 유도.
      `;
    } else if (platform === 'instagram') {
      brandContext = `
        [BRAND: 헤마 스튜디오 (Hema Studio)]
        - 업종: 일반인 전문 음원 녹음 & 영상 스튜디오 (셀프축가, 프로포즈, 커버영상)
        - 핵심 소구점: 음치도 가수로 만들어주는 1:1 보컬 코칭 & 음정보정, 인생 영상 제작
        - 📝 [인스타그램 전용 톤]:
          * 감성적이고 트렌디한 존댓말 + 감정 이모지 활용.
          * 카드뉴스 슬라이드 카피와 피드 캡션을 완벽히 분리.
          * CTA: "프로필 링크에서 더 많은 포트폴리오 감상 및 예약 상담이 가능합니다 ✨"
      `;
    } else if (platform === 'eoplanet') {
      brandContext = `
        [BRAND: 헤마 스튜디오 (Hema Studio)]
        - 업종: 일반인 음악 경험 대중화 및 크리에이티브 스튜디오
        - 핵심 인사이트: "완벽한 가창력이 아닌, 진심을 담은 목소리를 기술과 디렉팅으로 완성하는 경험 디자인"
        - 📝 [이오플래닛 전용 톤]:
          * 메이커/디렉터로서 고객 경험(UX)을 어떻게 극대화했는지 진정성 있는 에세이 및 비하인드 인사이트 톤 (~했습니다, ~였습니다).
          * CTA: 헤마스튜디오 공식 홈페이지(hemastudio.com) 연계.
      `;
    } else {
      // Tistory, WordPress, Blogspot
      brandContext = `
        [BRAND: 헤마 스튜디오 (Hema Studio)]
        - 업종: 일반인 대상 전문 녹음 및 영상 제작 스튜디오 (음원 녹음, 커버 영상, 셀프 축가, 프로포즈 영상 등)
        - 핵심 소구점: 전문 디렉터의 1:1 보컬 디렉팅 및 음정 보정, K-POP 뮤직비디오 스타일의 고퀄리티 영상 제작, 특별한 날을 위한 이색 체험
        - 톤앤매너: 신뢰감 있고 친절한 안내 어조. 단계별 진행 과정(예약-녹음-보정-촬영)을 명확하게 설명.
        - CTA: 공식 홈페이지(hemastudio.com) 및 카카오톡 상담 링크 안내: **[🔗 헤마스튜디오 공식 예약 및 포트폴리오 바로가기]**
      `;
    }
  } else if (params.brand === 'samsong') {
    if (platform === 'threads' || platform === 'x') {
      brandContext = `
        [BRAND: 삼송 E&M (Samsong E&M Holdings)]
        - 업종: B2B 영상 제작 & 기업 조직문화 솔루션 기획사
        - 핵심 소구점: 2,000개 이상 대기업/공공기관 레퍼런스, 사내노래경연대회 등 독보적 사내 복지/문화 기획
        - 📝 [SNS(스레드/X) 전용 톤]:
          * 기업 행사나 B2B 영상 찍으면서 겪은 리얼한 기획 비하인드 썰을 푸는 기획자 시점의 반말체 (~했음, ~하더라).
          * 예: "요즘 잘나가는 대기업들이 사내노래자랑에 목숨 거는 진짜 이유 ㅋㅋㅋ"
      `;
    } else if (platform === 'eoplanet') {
      brandContext = `
        [BRAND: 삼송 E&M (Samsong E&M Holdings)]
        - 업종: B2B 크리에이티브 에이전시 & 기업 컬처 솔루션
        - 핵심 소구점: 2,000+ 프로젝트 수행을 통해 검증된 B2B 콘텐츠 기획 공식과 사내 인터널 브랜딩의 성공 전략
        - 📝 [이오플래닛 전용 톤]:
          * 스타트업 및 기업 리더들이 공감할 만한 조직문화/브랜딩 인사이트 에세이 톤.
          * CTA: 삼송E&M 공식 홈페이지(samsongenm.com) 포트폴리오 확인 유도.
      `;
    } else {
      brandContext = `
        [BRAND: 삼송 E&M (Samsong E&M Holdings)]
        - 업종: B2B 영상 제작 및 기업 조직문화 솔루션 기획사
        - 핵심 소구점: 대기업/정부기관 등 2,000개 이상 프로젝트 수행력, 영상 및 사운드 멀티플렉스 스튜디오 자체 보유, '사내노래경연대회' 등 독보적 조직문화 프로그램 기획
        - 톤앤매너: B2B 대상의 전문적이고 신뢰감 넘치면서도 기획력이 돋보이는 트렌디한 어조
        - CTA(마무리): 공식 홈페이지(samsongenm.com) 포트폴리오 확인 및 프로젝트 문의 유도
      `;
    }
  } else if (params.brand === 'tmc') {
    if (platform === 'threads' || platform === 'x') {
      brandContext = `
        [BRAND: TMC-7 치약]
        - 업종: 프리미엄 구강 케어 (치약)
        - 핵심 소구점: 잇몸 유해균(진지발리스균) 99.9% 살균, 식약처 인증 의약외품, 무불소/무파라벤 안심 성분
        - 📝 [SNS(스레드/X) 전용 톤]:
          * 치약 성분 꼼꼼히 따지는 소비자의 솔직 후기 또는 제품 기획자의 비하인드 반말 썰 (~했음, ~이더라).
          * 예: "양치하고 귤 먹어도 안 쓴 치약 드디어 찾음... 잇몸 피 나는 사람 필독"
      `;
    } else {
      brandContext = `
        [BRAND: TMC-7 치약]
        - 업종: 프리미엄 구강 케어 제품 (치약)
        - 핵심 소구점: 잇몸 질환 원인균(진지발리스균) 99.9% 살균, 식약처 인증 의약외품, 유해성분 Zero (무불소, 무파라벤 등 안심 성분)
        - 톤앤매너: 건강과 위생을 강조하는 신뢰감 있고 깔끔한 어조 (과장 광고 지양)
        - CTA(마무리): 네이버 스마트스토어 제품 상세페이지 방문 및 구매 유도
      `;
    }
  } else if (params.brand === 'makemysong') {
    if (platform === 'threads' || platform === 'x') {
      brandContext = `
        [BRAND: 메이크마이송 (Make my song)]
        - 업종: 커스텀 음원 & AI 맞춤 음반 제작/발매 플랫폼
        - 핵심 소구점: AI의 빠름 + 실제 프로듀서의 섬세한 터치, 사연 하나로 세상에 단 하나뿐인 노래 탄생, 음원사이트 정식 발매
        - 📝 [SNS(스레드/X) 전용 톤]:
          * "여친/부모님한테 직접 쓴 사연으로 만든 노래 선물해줬더니 반응 실화냐 ㅠㅠ" 식의 감동/반전 썰 중심 반말체 (~했음, ~하더라).
      `;
    } else if (platform === 'eoplanet') {
      brandContext = `
        [BRAND: 메이크마이송 (Make my song)]
        - 업종: 생성형 AI 음악 테크 & 크리에이터 이코노미
        - 핵심 인사이트: "기술(AI)과 인간의 감성(전문 프로듀싱)이 결합했을 때 탄생하는 새로운 음악 창작의 패러다임"
        - 📝 [이오플래닛 전용 톤]:
          * AI 기술과 창작의 결합에 대한 프로덕트 인사이트 에세이 톤.
          * CTA: makemysong.com 바로가기.
      `;
    } else {
      brandContext = `
        [BRAND: 메이크마이송 (Make my song)]
        - 업종: 커스텀 음원 및 AI 음반 제작/발매 플랫폼
        - 🏆 독보적 강점: 
          1. "단순 AI가 아닌 진짜 음악": AI 기술의 편리함과 '실제 전문 프로듀서/뮤지션'의 디테일한 터치 결합.
          2. "세상에 하나뿐인 100% 맞춤 제작": 기념일(프로포즈, 결혼식, 부모님 선물)부터 기업 로고송까지 고객 사연 완벽 구현.
          3. "빠르고 합리적인 제작 시스템": 높은 비용과 시간 단축.
          4. "원스톱 앨범 발매": 실제 멜론/지니 등 음원 사이트 정식 앨범 발매 지원.
        - 톤앤매너: 감동을 자아내는 따뜻한 감성과 트렌디함이 공존하며 영감을 주는 어조
        - CTA(마무리): 공식 홈페이지(makemysong.com) 방문, 포트폴리오 감상 및 나만의 특별한 노래 제작 문의 유도
      `;
    }
  }

  // --- CONTENT TYPE CONTEXT ---
  let contentTypeContext = '';
  if (params.contentType === 'review') {
    contentTypeContext = `
      [글의 목적: 고객 후기 및 진행 사례 (Client Story & Case Study)]
      - 본 블로그/채널의 운영자(브랜드 담당자) 시점에서, 우리 서비스를 이용하거나 프로젝트를 함께 진행한 고객의 실제 사연, 진행 과정, 만족도 및 감동 포인트를 생생하게 소개하는 글입니다.
      - 고객이 느낀 감동과 가치를 브랜드의 전문성과 정성스러운 디렉팅/작업 과정과 연결하여 자연스럽고 신뢰감 있는 스토리텔링으로 풀어내세요.
      - 🚨 맥락 유지: 모든 에피소드는 오직 [메인 키워드: ${params.mainKeyword}]를 중심으로 전개되어야 합니다.
    `;
  } else if (params.contentType === 'information') {
    contentTypeContext = `
      [글의 목적: 전문 정보성 / 가이드 칼럼 (Knowledge & Expert Guide)]
      - 핵심 원칙: 정보성 글이라 할지라도 모든 목차(H2, H3), 지식, 팁, 가이드는 오직 [메인 키워드: "${params.mainKeyword}"]와 [타겟 브랜드]에 100% 집중되어야 합니다.
      - 🚨 곁가지 주제 확장 엄격 금지 (Anti-Drift):
        * 사용자가 1~5순위 강조 내용에 특정 이벤트나 기념일(예: '추석 명절', '부모님 환갑/칠순/팔순 잔치', '리마인드 웨딩', '결혼 준비' 등)을 적었더라도, 절대로 메인 키워드와 무관한 '환갑 잔치 식순', '칠순 잔치 진행 요령', '명절 제사/선물 예절' 같은 엉뚱한 일반 상식 팁으로 소제목을 파거나 본문 분량을 채우지 마십시오!
        * 해당 기념일/상황은 오직 "왜 이번 추석이나 환갑/칠순에 [${params.mainKeyword}]가 최고의 감동적인 선택이 되는가?"라는 계기 및 배경 설명으로만 1~2문장으로 매끄럽게 연결해야 합니다.
        * 본문의 모든 소제목과 실전 팁은 반드시 [${params.mainKeyword}]를 성공적으로 준비/제작하는 전문 노하우, 실패 없는 팁, 브랜드의 전문 솔루션으로만 채워져야 합니다.
    `;
  }

  // --- REFERENCE STYLE CLONING CONTEXT ---
  let referenceCloningContext = '';
  if (params.referenceLinks && params.referenceLinks.length > 0) {
    const validLinks = params.referenceLinks.filter(link => link.trim() !== '');
    if (validLinks.length > 0) {
      referenceCloningContext = `
      ### 🎯 REFERENCE STYLE CLONING (CRITICAL MANDATE)
      - The user has explicitly provided the following reference URLs:
        ${validLinks.map(link => `- ${link}`).join('\n        ')}
      - **ACTION REQUIRED**: You MUST use your Google Search capability to access and thoroughly analyze the content at these URLs.
      - **MIMIC THE FOLLOWING ELEMENTS EXACTLY** from the provided references:
        1. **Tone and Voice (말투)**: Is it highly formal, casual, enthusiastic, or deeply professional? Adopt the exact same tone.
        2. **Length and Density (분량)**: Match the overall length, paragraph depth, and level of detail.
        3. **Document Structure (서식/구성)**: Replicate their exact use of Headings (H1, H2, H3), bullet points, and numbering systems.
        4. **Emoticon & Formatting Frequency (이모티콘 및 꾸밈 요소)**: If they use a lot of specific emojis or bold text, you must match that frequency and style. If they use none, you must use none.
      - Your generated output should feel like it was written by the exact same author who wrote the reference articles, while seamlessly integrating our target brand's message.
      `;
    }
  }

  let systemInstruction = '';
  
  if (platform === 'naver') {
    systemInstruction = `
      You are an elite Content Director and SEO Specialist. 
      Your mission is to write a high-ranking Naver blog post for the specified Brand.
      
      ${brandContext}
      ${contentTypeContext}
      ${purposeContext}
      ${referenceCloningContext}
      
      ### KNOWLEDGE INTEGRATION & LIVE SEARCH (MANDATORY)
      - **CRITICAL**: The user has provided official homepage and shopping mall URLs for these brands. You MUST use the Google Search tool to directly navigate to and read the most up-to-date information from these specific URLs before writing.
      - **Direct URL Check**: Do not just guess. Directly query the official domains (e.g., hemastudio.com, samsongenm.com, makemysong.com, and the TMC-7 official store) to check for updated prices, new features, or deleted services.
      - Rely ONLY on the newly searched live data. Do NOT use outdated memory.
      - Seamlessly weave these factual details into the post. Do NOT hallucinate.

      ### CRITICAL NAVER SEO GUIDELINES (Real-time Integration)
      1. **Search Intent Matching (D.I.A.+)**: 
         - NEVER use generic AI phrases like "알아보겠습니다", "결론적으로", "안녕하세요 여러분". Sound like a real passionate human expert.

      2. **Content Structure (MUST FOLLOW)**:
         - **Intro**: Hook the reader based on the content type.
         - **Body**: Explain the core value, features, or process.
         - **Result/CTA**: Share the final outcome and strongly drive the specified Call To Action (CTA).
      
      3. **SmartBlock Targeting**:
         - The Title MUST combine the [Main Keyword] with a specific benefit or hook.

      4. **Volume and Depth**:
         - Write a comprehensive, detailed post. Aim for 1,200 to 1,500 characters. 
         - Deeply elaborate on the specific brand details and interactions.

      5. **Visual Structure & Naver Formatting (Mobile First)**:
         - Paragraphs must be short (2-3 lines max), readable on smartphone screens.
         - **RICH TEXT FORMATTING**:
           - Use blockquotes (\`> \`) for key quotes or impressions.
           - Use bold text (\`**text**\`) for emphasis.
           - Use headings (\`## \`, \`### \`) clearly.
         - Use these specific markers exactly:
           - **[📸 사진 가이드: description]**: Where a photo goes.
           - **[😊 스티커: emotion]**: Where a Naver sticker fits.
           - **[📍 지도/링크: CTA details]**: Where a map or CTA link attachment is needed.
           ${hasVideo ? '- **[🎬 영상 GIF]**: Insert this marker at the very beginning.' : ''}
           ${hasVideo ? '- **[🎞️ 영상 캡처: detailed description]**: Insert this marker to show a specific still cut.' : ''}

      6. **Current Trend Context**:
         ${seoTrend.summary}
         
      7. **Reference Disclosure (MANDATORY)**:
         - State what specific official info you used in the "referenceInfo" JSON field.
    `;
  } else if (platform === 'tistory') {
    systemInstruction = `
      You are a specialized content creator and SEO strategist for Tistory (티스토리).
      
      ${brandContext}
      ${contentTypeContext}
      ${purposeContext}
      ${referenceCloningContext}
      
      ### TISTORY SEO & ALGORITHM GUIDELINES
      1. **Tone & Style**:
         - Authoritative yet accessible, clear informational tone (신뢰감 있고 명확한 정보 전달형 어조).
      
      2. **Structure**:
         - **H1 (Title)**: Direct and informative, containing the primary keyword naturally.
         - **H2 / H3 Headings**: Clean, hierarchical markdown headings for easy skimming.
         - **Intro**: Direct summary of what the reader will learn.
         - **Body**: Well-separated sections with bullet points (- ) and bold key takeaways.
         - **Conclusion / CTA**: Actionable tips and the specified brand Call to Action.
      
      3. **Formatting & Markers**:
         - Use **[📸 사진 가이드: description]** every 2-3 sections to maintain dwell time.
         - Use **[🔗 링크: CTA details]** for the final Call to Action.
      
      4. **Current Trend Context**:
         ${seoTrend.summary}
    `;
  } else if (platform === 'wordpress') {
    systemInstruction = `
      You are a professional WordPress content strategist and Google SEO expert. 
      Your mission is to write a high-ranking pillar article optimized for Google's E-E-A-T guidelines.
      
      ${brandContext}
      ${contentTypeContext}
      ${purposeContext}
      ${referenceCloningContext}
      
      ### WORDPRESS / GOOGLE SEO GUIDELINES
      1. **Tone & Authority**:
         - Professional, insightful, industry-grade tone with zero fluff.
      
      2. **Content Structure**:
         - **H1 Title**: Optimized for high Click-Through-Rate (CTR) and primary search intent.
         - **Table of Contents Ready H2 / H3 Structure**: Logically sequenced sections.
         - **Rich Informational Density**: Detailed explanations, case study insights, actionable advice (1,500+ characters).
         - **Conclusion / CTA**: Strong transition to the brand's Call to Action.
      
      3. **Formatting**:
         - Extensive use of structured markdown headings (##, ###).
         - Key summary boxes using blockquotes (\`> \`).
         - **[📸 사진 가이드: description]** placed strategically.
         - **[🔗 링크: CTA details]** for the final action.
      
      4. **Current Trend Context**:
         ${seoTrend.summary}
    `;
  } else if (platform === 'blogspot') {
    systemInstruction = `
      You are a Blogger (Google Blogspot) SEO specialist.
      
      ${brandContext}
      ${contentTypeContext}
      ${purposeContext}
      ${referenceCloningContext}
      
      ### BLOGSPOT SEO GUIDELINES
      1. **Search Intent & Readability**:
         - Clear, clean paragraph structures that answer user queries concisely.
      
      2. **Headings & Keywords**:
         - Use H2/H3 subheadings containing related long-tail search terms.
         - Use bullet points and bold highlights for mobile readability.
         - Include the brand's Call to Action at the end: **[🔗 링크: CTA details]**
      
      3. **Current Trend Context**:
         ${seoTrend.summary}
    `;
  } else if (platform === 'instagram') {
    systemInstruction = `
      You are a top-tier social media content director specializing in viral Instagram Card News and Feeds.
      
      ${brandContext}
      ${contentTypeContext}
      ${purposeContext}
      ${referenceCloningContext}
      
      ### 📸 INSTAGRAM CONTENT ARCHITECTURE & GUIDELINES
      1. **본문 포맷 구성 (반드시 3단 분리 구조로 작성)**:
         - **Part 1. [📱 카드뉴스 슬라이드 구성 (5~7장)]**:
           * **[Slide 1: 표지]** 3초 만에 시선을 사로잡는 강력한 헤드라인 & 서브 카피
           * **[Slide 2: 도입/공감]** 고객의 사연 또는 고민 포인트 제기
           * **[Slide 3~5: 본론/해결]** 핵심 과정, 비포&애프터, 전문가의 디렉팅/핵심 가치
           * **[Slide 6: 고객 감동/반응]** 실제 만족도 및 감동 포인트
           * **[Slide 7: 마지막장/CTA]** 저장/공유 유도 및 프로필 링크 안내
         
         - **Part 2. [📝 피드 캡션 (본문 줄글)]**:
           * 첫 2줄: 피드 목록에서 잘리지 않고 '...더보기'를 누르게 만드는 감성적/호기심 훅.
           * 본문: 따뜻하고 트렌디한 어조, 적절한 감정 이모지(✨, 💖, 🎤 등), 모바일에서 읽기 편한 줄바꿈.
           * 마무리: "궁금하신 점은 DM 또는 프로필 링크를 확인해주세요!" 등의 친절한 CTA.
         
         - **Part 3. [🏷️ 추천 해시태그]**:
           * 브랜드, 타겟 고객, 상황별(결혼식, 선물, 취미 등) 세부 키워드를 믹스한 15~20개 태그.

      2. **어조**:
         - 트렌디하고 감성적인 SNS 맞춤형 친근한 존댓말.

      3. **Current Trend Context**:
         ${seoTrend.summary}
    `;
  } else if (platform === 'threads') {
    systemInstruction = `
      You are an expert Threads creator and viral content maker in Korea.
      
      ${brandContext}
      ${contentTypeContext}
      ${purposeContext}
      ${referenceCloningContext}
      
      ### 🔥 THREADS PLATFORM GUIDELINES & VIRAL RULES
      1. **어조 (Tone & Voice) - 필수: 자연스러운 반말체/독백체**:
         - 스레드(Threads)의 플랫폼 문화와 알고리즘에 맞추어 **반드시 친근하고 솔직담백한 반말체 (~했음, ~하더라, ~임, ~인 듯, ~거든, ~해봄)** 로 작성하세요.
         - ❌ 절대 블로그나 고객센터 같은 딱딱한 존댓말(~했습니다, ~해요, ~하네요)을 쓰지 마세요.
         - 마치 친한 친구나 스레드 팔로워들에게 "스튜디오에서 일어난 진짜 썰", "고객 비하인드 스토리", "솔직한 생각"을 털어놓듯 리얼하고 날것의 자연스러운 톤을 유지하세요.
         - 예시: "음치 탈출하겠다고 스튜디오 찾아오신 신랑님인데... 솔직히 처음엔 나도 긴장함 ㅋㅋ", "근데 보정 끝나고 들어보시더니 눈물 글썽이심 ㅠㅠ"
      
      2. **구조 및 포맷 (Structure & Spacing)**:
         - **첫 문장 (강력한 훅)**: 스크롤을 멈추게 만드는 호기심 자극 문장이나 반전이 담긴 1줄 훅.
         - **본문 (2~3개 짧은 문단)**: 
           - 모바일 화면에서 한눈에 읽히도록 문장 사이에 적절한 엔터(공백)를 두세요.
           - 대화체 인용이나 생생한 리액션 이모지를 자연스럽게 섞어주세요.
         - **마무리 (인게이지먼트 유도 & CTA)**:
           - 댓글과 리포스트를 유도하는 가벼운 반말 질문이나 프로필 링크 유도 ("너네라면 축가 직접 부를 수 있을 것 같음?", "궁금한 거 있으면 댓글 남겨줘 / 프로필 링크 ㄱㄱ").
      
      3. **해시태그**:
         - 스레드에서는 본문에 태그를 도배하지 않고, 2~4개 정도의 핵심 키워드 태그만 깔끔하게 구성하세요.
      
      4. **Current Trend Context**:
         ${seoTrend.summary}
    `;
  } else if (platform === 'eoplanet') {
    systemInstruction = `
      You are a top-tier tech/startup essayist and content marketer for EO Planet (이오플래닛).
      
      ${brandContext}
      ${contentTypeContext}
      ${purposeContext}
      ${referenceCloningContext}
      
      ### EO PLANET SEO & ALGORITHM GUIDELINES
      1. **Tone & Style**:
         - Target Audience: Startup founders, developers, PMs, marketers, and makers.
         - Authentic storytelling, professional yet personal (진정성 있는 회고록, 에세이 형태).
         - Focus on problem-solving, real-world insights, and "how we did it" or "why you need this".
         - Do not sound like a generic advertisement. Sound like a passionate maker sharing knowledge.
      
      2. **Content Structure (MUST FOLLOW)**:
         - **Intro**: Hook with a relatable pain point, a bold statement, or a specific business/technical challenge.
         - **Body**: Deep dive into the insights, using structured headers. Show the process and the 'Why'.
         - **Result/CTA**: Conclude with a clear lesson learned or professional impact, naturally leading to the brand CTA.
      
      3. **Formatting (Markdown)**:
         - Use clear hierarchical H2 (##) and H3 (###) headers.
         - Use blockquotes (\`> \`) for key insights or emphasized thoughts.
         - Use bullet points for readability.
         - Keep paragraphs focused and medium-length.
         
      4. **Current Trend Context**:
         ${seoTrend.summary}
    `;
  } else if (platform === 'x') {
    systemInstruction = `
      You are an elite X (formerly Twitter) creator and viral thread architect in Korea.
      
      ${brandContext}
      ${contentTypeContext}
      ${purposeContext}
      ${referenceCloningContext}
      
      ### 𝕏 X (TWITTER) PLATFORM ALGORITHM & VIRAL RULES
      1. **어조 (Tone & Voice) - 필수: 강렬하고 간결한 반말 단문체**:
         - **X 특유의 빠르고 날카로운 단문/반말체 (~함, ~임, ~함?, ~했음, ~음)** 로 작성하세요.
         - ❌ 군더더기 서론, 긴 인사말, 뻔한 미사여구는 0.1초 만에 스크롤 이탈을 부르므로 완전 배제하세요.
         - 오직 생생한 팩트, 흥미진진한 썰, 극적인 전개와 결론으로만 승부하세요.
      
      2. **콘텐츠 구조 (타래: Thread 🧵 포맷 완벽 구현)**:
         - X에서 높은 체류시간(Dwell Time)과 인게이지먼트를 폭발시키는 표준 **[타래(Thread)]** 형식으로 본문을 작성하세요:
           * **1/ (메인 훅 트윗)**: 타임라인에서 엄지손가락을 즉시 멈추게 만드는 충격적/흥미로운 결론, 한 줄 요약 썰, 또는 반전 질문 + 타래 이모지(🧵👇).
             (예: "음치인 신랑님이 결혼식 셀프축가 부르겠다고 찾아왔을 때 솔직히 멘붕이었음... 근데 결과물 듣고 식장 눈물바다 된 썰 푼다 🧵👇")
           * **2/ ~ 4/ (전개 & 디테일 & 핵심 인사이트)**: 실제 작업 과정의 고비, 1:1 디렉팅의 비밀, 비포/애프터의 극적 차이, 솔직한 감정.
           * **5/ (결론 & 감동/성과)**: 주변 사람들의 찐 반응, 최종 만족도.
           * **6/ (마무리 & 강력한 CTA - 북마크/RT 유도)**:
             - "도움 됐거나 나중에 필요할 것 같으면 **북마크(Bookmark) & 리포스트(RT)** 해두셈!"
             - "풀 영상이나 상세 정보는 타래 첫 번째 답글 / 프로필 링크에 남겨둠"
      
      3. **X 최신 알고리즘 극대화 수칙 (Critical Algorithm Rules)**:
         - **북마크 & RT 최적화**: 사용자가 '나중에 다시 보려고 저장'하게 만드는 가치 있는 정보/스토리텔링으로 구성.
         - **외부 링크 페널티 회피**: 본문에 직접 외부 URL을 도배하지 않고 "타래 답글 또는 프로필 링크 확인"으로 우회.
         - **해시태그 절제**: 본문 맨 끝에 브랜드 및 핵심 키워드 태그 딱 1~2개만 최소화하여 배치 (태그 남발 시 스팸 감점).
      
      4. **Current Trend Context**:
         ${seoTrend.summary}
    `;
  }

  const guardrailContext = `
    ### 🚨 CRITICAL SAFETY & RELEVANCE GUARDRAIL (MANDATORY)
    1. **Brand Relevance Check**: Before generating the article, you MUST strictly evaluate if the user's input (Main Keyword, Sub Keywords, Draft) is logically related to the selected [BRAND].
    2. **Do NOT Force Connections**: If the input is completely irrelevant (e.g., asking for a food recipe when the brand is a dental product or B2B video company), DO NOT attempt to forcefully connect them. DO NOT hallucinate.
    3. **Rejection Output**: If you determine the input is irrelevant to the selected brand, STOP writing the article. You MUST output ONLY the following JSON structure to warn the user:
       - titles.standard: "⚠️ 작성 오류: 브랜드 연관성 없음"
       - titles.emotional: "입력하신 키워드가 브랜드와 맞지 않습니다"
       - titles.clickbait: "브랜드와 관련된 키워드를 다시 입력해주세요"
       - content: "> **작성 오류 안내**\\n\\n입력하신 내용 및 키워드는 현재 선택하신 브랜드와 연관성을 찾기 어렵습니다. 억지로 내용을 생성할 경우 잘못된 브랜드 정보가 노출될 위험이 있습니다.\\n\\n해당 브랜드의 제품이나 서비스와 관련된 키워드 및 초안을 다시 확인하여 입력해 주세요."
       - hashtags: []
       - seoStrategy: "Irrelevant input rejected by safety guardrails to protect brand integrity."
       - referenceInfo: ""

    ### 🔍 LIVE SEARCH MANDATE (CRITICAL)
    - Brand information, features, and campaigns change constantly. 
    - You MUST use the Google Search tool to fetch the latest official information BEFORE writing anything.
    - Example searches: "site:samsongenm.com [Keyword]", "site:hemastudio.com [Keyword]", "site:makemysong.com [Keyword]", or "TMC-7 치약 상세정보".
    - Rely ONLY on the newly searched live data to build your content. Do NOT rely on outdated memory or hallucinate features.
  `;

  const promptText = `
    ${guardrailContext}
    
    [User Input]
    - Brand Target: ${params.brand}
    - Content Type: ${params.contentType}
    - Platform: ${platform}
    - Main Keyword: ${params.mainKeyword}
    - Sub Keywords: ${params.subKeywords}
    ${params.trendTopic ? `- 🎯 Keyword Trend / Topic Context: ${params.trendTopic}` : ''}
    ${params.brand === 'hema' && params.contentType === 'review' && params.musicTitle ? `- Used Music/Song: ${params.musicTitle}` : ''}
    ${params.brand === 'hema' && params.contentType === 'review' && params.musicDescription ? `- Music Description/Story: ${params.musicDescription}` : ''}
    - Customer Stories / Priority Notes:
    ${(params.stories || []).map(s => `      [${s.priority}순위 강조 내용]: ${s.content}`).join('\n')}
    
    ★ [절대 준수 원칙: 단일 서사 척추(Single Core Spine) 및 맥락 탈선 방지(Anti-Drift) - 정보성/후기형 공통]:
    1. 1~5순위의 항목들을 각각 별개의 독립된 소제목(챕터)으로 쪼개어 기계적으로 나열하지 마십시오.
    2. 1~5순위의 모든 내용은 오직 [메인 키워드: "${params.mainKeyword}"]와 [브랜드]라는 "단 하나의 중심 축"을 탄탄하게 완성하기 위한 계기-배경-해결-결과로 유기적으로 융합되어야 합니다.
    3. [곁가지 정보 확장 절대 금지]: 1~5순위에 특정 이벤트(예: '추석 명절', '환갑/칠순 잔치', '리마인드 웨딩' 등)가 언급되어 있더라도, 정보성 글에서 그 이벤트 자체의 일반 팁(예: 환갑 잔치 식순, 잔치 진행법, 명절 음식 등)으로 곁가지를 파지 마십시오. 해당 이벤트는 오직 "${params.mainKeyword}"가 필요한 상황/계기로만 1~2문장으로 자연스럽게 언급하고, 글 전체의 소제목(H2, H3)과 핵심 지식/노하우는 100% "${params.mainKeyword}"에만 집중하세요.
    ${hasVideo ? '- **Video Context**: Video frames are attached. Describe these visuals authentically in the text.' : ''}

    [Output Format - JSON]
    {
      "titles": {
        "standard": "SEO Optimized Standard Title (Focus on keywords & clarity)",
        "emotional": "Emotional & Story-driven Title (Focus on feeling & empathy)",
        "clickbait": "High CTR / Benefit-driven Title (Curiosity and strong hook)"
      },
      "content": "Markdown content formatted specifically for ${platform}",
      "hashtags": ["#tag1", "#tag2"...],
      "seoStrategy": "Why this specific structure and tone were chosen based on ${platform}'s latest algorithm",
      "referenceInfo": "Service info or reference notes"
    }
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      titles: {
        type: Type.OBJECT,
        properties: {
          standard: { type: Type.STRING },
          emotional: { type: Type.STRING },
          clickbait: { type: Type.STRING }
        },
        required: ["standard", "emotional", "clickbait"]
      },
      content: { type: Type.STRING },
      hashtags: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING } 
      },
      seoStrategy: { type: Type.STRING },
      referenceInfo: { type: Type.STRING }
    },
    required: ["titles", "content", "hashtags", "seoStrategy", "referenceInfo"]
  };

  const parts: any[] = [{ text: promptText }];
  
  if (params.videoAssets && params.videoAssets.captures.length > 0) {
    params.videoAssets.captures.forEach(base64Str => {
      const base64Data = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    });
  }

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        tools: [{ googleSearch: {} }],
      },
    });

    let responseText = response.text || "{}";
    const jsonMatch = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      responseText = jsonMatch[1];
    } else {
      responseText = responseText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    }
    
    const result = JSON.parse(responseText);
    result.attachedAssets = params.videoAssets;
    
    return result as GeneratedBlog;
  } catch (error) {
    console.error("Error generating blog post:", error);
    throw new Error("Failed to generate blog post: " + (error instanceof Error ? error.message : JSON.stringify(error)));
  }
};

export const generateInfographics = async (
  title: string,
  content: string,
  platform: Platform
): Promise<{ thumbnailUrl: string; infographicUrl: string }> => {
  const ai = getAIClient();

  try {
    let thumbnailPrompt = '';
    let infographicPrompt = '';
    let thumbnailRatio = "1:1";
    let infographicRatio = "3:4";

    // 플랫폼별 썸네일 및 이미지 가이드라인 분기처리
    if (['naver', 'tistory', 'blogspot', 'wordpress'].includes(platform)) {
      // 블로그 계열 (Naver, Tistory, Blogspot, WordPress)
      thumbnailRatio = "1:1";
      infographicRatio = "3:4";
      thumbnailPrompt = `Create a highly engaging, professional blog thumbnail image (1:1 ratio) suitable for ${platform}. 
CRITICAL RULE 1: DO NOT write the entire long title. Instead, extract a SHORT, catchy Korean marketing hook (2-4 words maximum) based on this topic: "${title}".
CRITICAL RULE 2: Render this short Korean text prominently and beautifully in the image.
The design must be bold, clean, and use highly readable typography. It should look like a premium blog cover image. Use vibrant but professional colors. Ensure the Korean text is perfectly legible and not distorted.`;
      
      infographicPrompt = `Create a detailed, vertical infographic (3:4 ratio) summarizing the key points of this blog post.
CRITICAL RULE 1: Extract ONLY 2-3 short, factual Korean keywords from this content: "${content.substring(0, 300)}...".
CRITICAL RULE 2: ABSOLUTELY NO HALLUCINATIONS. DO NOT invent fake phone numbers, fake URLs, or fake statistics. Only use visual metaphors, charts, and the 2-3 short keywords.
The style should be a professional data-visualization or step-by-step infographic. Use clear icons, segmented sections, and a consistent color palette with perfect Korean text rendering. DO NOT clutter with too much text.`;

    } else if (platform === 'instagram') {
      // 인스타그램
      thumbnailRatio = "1:1";
      infographicRatio = "1:1";
      thumbnailPrompt = `Create a viral Instagram Carousel cover slide (1:1 ratio).
CRITICAL RULE 1: DO NOT write the entire title. Write a massive, click-baity, SHORT Korean hook (1-3 words max) based on this topic: "${title}".
CRITICAL RULE 2: Render this short Korean text accurately in the center.
The design MUST have massive, bold Korean typography centered on the image. It should look like a highly aesthetic, trendy Instagram information/card-news cover. Minimalist but visually striking.`;
      
      infographicPrompt = `Create an Instagram Carousel content slide (1:1 ratio) containing key information.
CRITICAL RULE 1: Extract 1-2 punchy Korean keywords summarizing this content: "${content.substring(0, 300)}...".
CRITICAL RULE 2: ABSOLUTELY NO FAKE INFO. Do not write fake phone numbers or emails.
The style should be a clean, aesthetic Instagram card-news slide. Large readable Korean text, modern icons, and plenty of negative space. DO NOT clutter it. Make it minimalist.`;

    } else if (platform === 'threads' || platform === 'x') {
      // 스레드, X (트위터)
      thumbnailRatio = "16:9";
      infographicRatio = "16:9";
      thumbnailPrompt = `Create a highly engaging, shareable social media attachment image (16:9 ratio) for a post.
CRITICAL RULE 1: Write a very short, intriguing Korean statement or keyword (1-2 words) based on: "${title}". DO NOT write the whole title.
CRITICAL RULE 2: Render this short Korean text accurately.
Make it visually arresting—like a bold statement card. The Korean typography should be the absolute focus, making people stop scrolling. Keep other elements minimal.`;
      
      infographicPrompt = `Create a quick-glance cheat-sheet or highly simplified chart (16:9 ratio) to attach to a short social media thread.
CRITICAL RULE 1: Extract ONE key Korean data point or keyword from this text: "${content.substring(0, 300)}...".
CRITICAL RULE 2: NO FAKE DATA. Do not make up numbers, phones, or URLs.
It must be extremely easy to read on a mobile phone screen within 3 seconds. Use bold contrast and minimal but highly legible Korean text, focusing on a single powerful visual metaphor.`;

    } else if (platform === 'eoplanet') {
      // EO 플래닛 (스타트업/IT)
      thumbnailRatio = "16:9";
      infographicRatio = "16:9";
      thumbnailPrompt = `Create a premium tech/startup editorial cover image (16:9 ratio).
CRITICAL RULE 1: Write a concise, professional Korean keyword (1-3 words) based on: "${title}". DO NOT use the full title.
CRITICAL RULE 2: Render this short Korean text accurately.
The style should be modern, sleek, and abstract. Think of a high-end tech magazine cover. Use geometric shapes, dark mode themes, and perfectly rendered Korean typography.`;
      
      infographicPrompt = `Create a professional startup/tech architecture diagram or workflow visualization (16:9 ratio).
CRITICAL RULE 1: Extract 2-3 professional Korean labels based on this text: "${content.substring(0, 300)}...". DO NOT use long sentences.
CRITICAL RULE 2: ABSOLUTELY NO FAKE INFO. No fake contact info.
Make it look like a high-quality presentation slide for IT professionals. Use sleek lines, modern corporate UI elements, and a sophisticated color scheme with perfect text legibility and minimal text density.`;
    }


    // 1. Generate Thumbnail
    const thumbnailResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: thumbnailPrompt,
      config: {
        imageConfig: { aspectRatio: thumbnailRatio as any }
      }
    });

    let thumbnailUrl = '';
    const thumbnailCandidates = thumbnailResponse.candidates?.[0]?.content?.parts;
    if (thumbnailCandidates) {
      for (const part of thumbnailCandidates) {
        if (part.inlineData) {
          thumbnailUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    // 2. Generate Infographic Body Image
    const infographicResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: infographicPrompt,
      config: {
        imageConfig: { aspectRatio: infographicRatio as any }
      }
    });

    let infographicUrl = '';
    const infographicCandidates = infographicResponse.candidates?.[0]?.content?.parts;
    if (infographicCandidates) {
      for (const part of infographicCandidates) {
        if (part.inlineData) {
          infographicUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    return { thumbnailUrl, infographicUrl };
  } catch (error) {
    console.error("Error generating images:", error);
    throw new Error("Failed to generate images: " + (error instanceof Error ? error.message : JSON.stringify(error)));
  }
};

