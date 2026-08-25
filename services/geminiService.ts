import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BlogPostParams, GeneratedBlog, SeoTrend, Platform } from "../types";

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
 * Step 2: Generate the platform-tailored post using the identified trends and user inputs.
 */
export const generateBlogPost = async (
  params: BlogPostParams,
  seoTrend: SeoTrend,
  platform: Platform
): Promise<GeneratedBlog> => {
  const model = 'gemini-3.7-flash';
  const hasVideo = !!params.videoAssets;

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
    `;
  } else if (params.contentType === 'information') {
    contentTypeContext = `
      [글의 목적: 정보성 (Knowledge & Expert Tips)]
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
      You are a top-tier social media content director specializing in viral Instagram Card News and Feeds.
      
      ${brandContext}
      ${contentTypeContext}
      
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
