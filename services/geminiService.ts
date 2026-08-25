import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BlogPostParams, GeneratedBlog, SeoTrend, Platform } from "../types";

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey
  });
}

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
 * Step 2: Generate the platform-tailored post using the identified trends and user inputs.
 */
export const generateBlogPost = async (
  params: BlogPostParams,
  seoTrend: SeoTrend,
  platform: Platform
): Promise<GeneratedBlog> => {
  const model = 'gemini-3.7-flash';
  const hasVideo = !!params.videoAssets;

  // --- BRAND CONTEXT ---
  let brandContext = '';
  if (params.brand === 'hema') {
    brandContext = `
      [BRAND: 헤마 스튜디오 (Hema Studio)]
      - 업종: 일반인 대상 전문 녹음 및 영상 제작 스튜디오 (음원 녹음, 커버 영상, 셀프 축가, 프로포즈 영상 등)
      - 핵심 소구점: 전문 디렉터의 1:1 보컬 디렉팅 및 음정 보정, K-POP 뮤직비디오 스타일의 고퀄리티 영상 제작, 특별한 날을 위한 이색 체험
      - 📝 [헤마스튜디오 전용 글쓰기 가이드라인 (실제 공식 블로그 레퍼런스 완벽 반영)]
        * 시점 및 화자 (매우 중요): 고객이 본인 블로그에 쓴 글이 아닙니다. **'헤마스튜디오'의 공식 블로그 담당자 시점**에서 우리 스튜디오를 방문해준 고객의 사연이나 유용한 정보를 따뜻하고 친절하게 소개하는 톤입니다.
        * 제목 양식: "[키워드1] [키워드2] 감성을 자극하는 서술형 제목" (예: [셀프축가영상] [결혼식축가] 신랑신부가 함께 불러 더 설레이는 셀프축가)
        * 오프닝 (고정): "안녕하세요~\\n평생 기억하고 싶은 순간을 담아드리는\\n헤마스튜디오 입니다💍" 로 무조건 시작하세요.
          - 그 다음 줄은 글의 목적에 따라 다르게 이어가세요. 
            ▶ 후기성 글: "오늘은 [주제/키워드]를 진행하신 고객님의 후기를 소개해드릴게요~"
            ▶ 정보성 글: "오늘은 [주제/키워드]에 대해 많은 분들이 궁금해하시는 꿀팁을 전해드릴게요~"
        * 톤앤매너: 매우 친절하고 부드러운 존댓말. '~텐데요~', '~있습니다🎵', '~해주셨어요!', '~해드릴게요~', '~살아났답니다💖', '~어떠셨나요?🥰' 등 다정하고 전문가다운 말투. 문장 끝에 적절하고 귀여운 이모지(🥰, 🎤, 📸, 🎥, 💐 등)를 자주 사용.
        * 텍스트 포맷 (중앙 정렬 감성) 및 분량: 
          - 분량 (매우 중요): **내용을 절대 짧게 요약하지 마세요. (최소 1,500자 이상 충분히 길고 풍부하게 작성)** 스튜디오 방문부터 디렉팅, 녹음, 영상 촬영, 완성본 수령까지의 '전체 여정'을 아주 상세하게 스토리텔링해야 합니다.
          - 포맷: 내용은 풍부하게 쓰되, 한 문단은 무조건 1~2줄 단위로 짧게 치고 빠지며 문단(엔터) 사이에 여백을 충분히 두세요. (스크롤이 길게 이어지면서 읽기 편한 구조)
        * 본문 전개: 
          - 단락이 바뀔 때 [소제목 🎤] (양옆에 이모지 포함) 형식으로 구분.
          - 글 중간중간 [🎬 영상 GIF], [📸 고객 녹음 부스 사진], [📸 메이킹 촬영 사진] 등 사진 삽입 위치를 텍스트 흐름에 맞게 디테일하게 마커로 표시.
          - 후기성 글인 경우, 고객이 사용한 [음악/곡 제목]과 [음악 설명/사연]이 주어지면 이를 단순히 나열하지 말고 "고객님이 선택하신 이 곡은 ~한 의미가 있죠", "직접 부르신 [곡명]이 스튜디오에 울려 퍼질 때 너무 감동이었어요" 등 감성적인 스토리텔링의 핵심 요소로 자연스럽게 녹여내세요.
        * 하단 CTA (고정 템플릿 - 반드시 글 맨 끝에 아래 양식을 토씨 하나 틀리지 않고 똑같이 출력할 것):
          
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
  } else if (params.brand === 'samsong') {
    brandContext = `
      [BRAND: 삼송 E&M (Samsong E&M Holdings)]
      - 업종: B2B 영상 제작 및 기업 조직문화 솔루션 기획사
      - 핵심 소구점: 대기업/정부기관 등 2,000개 이상 프로젝트 수행력, 영상 및 사운드 멀티플렉스 스튜디오 자체 보유, '사내노래경연대회' 등 독보적 조직문화 프로그램 기획
      - 톤앤매너: B2B 대상의 전문적이고 신뢰감 넘치면서도 기획력이 돋보이는 트렌디한 어조
      - CTA(마무리): 공식 홈페이지(samsongenm.com) 포트폴리오 확인 및 프로젝트 문의 유도
    `;
  } else if (params.brand === 'tmc') {
    brandContext = `
      [BRAND: TMC-7 치약]
      - 업종: 프리미엄 구강 케어 제품 (치약)
      - 핵심 소구점: 잇몸 질환 원인균(진지발리스균) 99.9% 살균, 식약처 인증 의약외품, 유해성분 Zero (무불소, 무파라벤 등 안심 성분)
      - 톤앤매너: 건강과 위생을 강조하는 신뢰감 있고 깔끔한 어조 (과장 광고 지양)
      - CTA(마무리): 네이버 스마트스토어 제품 상세페이지 방문 및 구매 유도
    `;
  } else if (params.brand === 'makemysong') {
    brandContext = `
      [BRAND: 메이크마이송 (Make my song)]
      - 업종: 커스텀 음원 및 AI 음반 제작/발매 플랫폼
      - 🏆 독보적 강점 (필수 강조 포인트): 
        1. "단순 AI가 아닌 진짜 음악": AI 기술의 편리함과 '실제 전문 프로듀서/뮤지션'의 디테일한 터치가 결합되어 퀄리티가 압도적임.
        2. "세상에 하나뿐인 100% 맞춤 제작": 기념일(프로포즈, 결혼식, 부모님 선물)부터 비즈니스(기업 로고송, 캠페인 송)까지 고객의 특별한 '사연'을 완벽한 노래로 구현.
        3. "빠르고 합리적인 제작 시스템": 기존 음악 제작의 높은 비용과 긴 시간을 획기적으로 단축.
        4. "원스톱 앨범 발매": 음악 제작을 넘어 실제 음원 사이트 앨범 발매까지 A to Z 원스톱 지원.
      - 📝 글의 성격에 따른 적용 (시의적절한 배치):
        * 정보성 글: 비용/시간 단축, 저작권, 음반 발매 과정의 편리함 등 실용적이고 전문적인 장점 어필. 누구나 뮤지션이 될 수 있다는 점 강조.
        * 후기성 글: '나만의 사연'이 노래로 만들어졌을 때의 벅찬 감동, 선물 받았을 때의 반응(울음바다 등), 섬세한 프로듀서 피드백 등 감정적 공감대 위주로 서술.
      - 톤앤매너: 감동을 자아내는 따뜻한 감성과 트렌디함이 공존하며, 누구나 쉽게 다가갈 수 있는 친근하고 영감을 주는 어조
      - CTA(마무리): 공식 홈페이지(makemysong.com) 방문, 포트폴리오(샘플곡) 감상 및 나만의 특별한 노래 제작 문의 유도
    `;
  }

  // --- CONTENT TYPE CONTEXT ---
  let contentTypeContext = '';
  if (params.contentType === 'review') {
    contentTypeContext = `
      [글의 목적: 후기성 (Review / Case Study)]
      - 고객의 실제 체험담, 비포/애프터, 만족도, 감동 포인트를 중심으로 서술하세요.
      - 독자의 공감대를 형성하고 스토리텔링을 통해 자연스럽게 브랜드의 장점을 녹여내세요.
    `;
  } else if (params.contentType === 'information') {
    contentTypeContext = `
      [글의 목적: 정보성 (Information / Tip)]
      - 독자가 궁금해할 전문 지식, 산업 트렌드, 유용한 팁을 논리적이고 명확하게 전달하세요.
      - 브랜드의 전문성과 권위성(Expertise & Authority)을 강조하여 신뢰도를 높이는 데 집중하세요.
    `;
  }

  let systemInstruction = '';
  
  if (platform === 'naver') {
    systemInstruction = `
      You are an elite Content Director and SEO Specialist. 
      Your mission is to write a high-ranking Naver blog post for the specified Brand.
      
      ${brandContext}
      ${contentTypeContext}
      
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
      You are a top-tier social media marketer.
      
      ${brandContext}
      ${contentTypeContext}
      
      ### INSTAGRAM GUIDELINES
      1. **Structure (Card News Slides)**:
         - Format the body content clearly slide by slide: [Slide 1: Hook], [Slide 2: Body], ..., [Slide Final: Call to Action].
         - Slide copy must be punchy, impactful, and easy to read in 2 seconds.
      
      2. **Caption & Hashtags**:
         - Write an empathetic, engaging caption with appropriate emojis.
         - Integrate the brand's CTA into the caption naturally (e.g. "프로필 링크를 확인하세요!").
         - Provide 15-20 categorized hashtags.
      
      3. **Current Trend Context**:
         ${seoTrend.summary}
    `;
  } else if (platform === 'threads') {
    systemInstruction = `
      You are an expert Threads creator who knows how to spark viral engagement.
      
      ${brandContext}
      ${contentTypeContext}
      
      ### THREADS GUIDELINES
      1. **Format**:
         - Keep it short: 2 to 3 concise, punchy paragraphs.
         - Strong relatable hook in the very first sentence.
         - Authentic, conversational voice.
         - End with a compelling, open-ended question or the brand's CTA.
      
      2. **Current Trend Context**:
         ${seoTrend.summary}
    `;
  } else if (platform === 'eoplanet') {
    systemInstruction = `
      You are a top-tier tech/startup essayist and content marketer for EO Planet (이오플래닛).
      
      ${brandContext}
      ${contentTypeContext}
      
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
    ${params.brand === 'hema' && params.contentType === 'review' && params.musicTitle ? `- Used Music/Song: ${params.musicTitle}` : ''}
    ${params.brand === 'hema' && params.contentType === 'review' && params.musicDescription ? `- Music Description/Story: ${params.musicDescription}` : ''}
    - Customer Stories / Priority Notes:
    ${(params.stories || []).map(s => `      [${s.priority}순위 강조 내용]: ${s.content}`).join('\n')}
    * ⚠️ IMPORTANT: 반영 지침: 위 순위는 고객이 원하는 글의 비중과 순서입니다. 1순위 내용을 가장 중심적이고 비중 있게 다루고, 2순위~5순위 내용도 빠짐없이 글의 흐름에 맞게 순차적으로 골고루 반영해 주세요.
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
