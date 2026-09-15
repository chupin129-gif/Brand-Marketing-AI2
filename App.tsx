import React, { useState, useEffect, useCallback } from 'react';
import { InputSection } from './components/InputSection';
import { ResultDisplay } from './components/ResultDisplay';
import { TrendWidget } from './components/TrendWidget';
import { BlogPostParams, GeneratedBlog, AppStatus, SeoTrend, Platform } from './types';
import { fetchLatestSeoTrends, generateBlogPost } from './services/geminiService';
import { Menu, X, Sparkles, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const platformNames: Record<Platform, string> = {
  naver: '네이버 블로그',
  wordpress: '워드프레스',
  tistory: '티스토리',
  blogspot: '구글 블로거',
  instagram: '인스타그램',
  threads: '스레드',
  eoplanet: '이오플래닛',
  x: 'X (트위터)'
};

const platformSubtext: Record<Platform, string> = {
  naver: 'SmartBlock, C-Rank, D.I.A.+ 최신 알고리즘 업데이트 확인 중',
  tistory: '티스토리 Daum 검색 및 구글 SEO 최적화 알고리즘 분석 중',
  wordpress: '구글 Core Update, E-E-A-T 및 구조화 데이터 랭킹 요인 분석 중',
  blogspot: '구글 검색 봇 색인(Indexing) 및 검색 노출 가이드라인 분석 중',
  instagram: '인스타그램 탐색탭 도달 및 릴스/캐러셀 최적화 로직 분석 중',
  threads: '스레드 추천 피드 노출 및 바이럴 참여형 알고리즘 분석 중',
  eoplanet: '스타트업 IT 메이커 맞춤형 스토리텔링 및 공감대 노출 트렌드 분석 중',
  x: 'X 알고리즘 맞춤 북마크/리포스트(RT) 유도 훅 및 타래(Thread) 구조 분석 중'
};

const App: React.FC = () => {
  // State
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [params, setParams] = useState<BlogPostParams>(() => {
    // Load from cache on init
    const saved = localStorage.getItem('BLOG_PARAMS_CACHE');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.draft !== undefined && !parsed.stories) {
          parsed.stories = [{ priority: 1, content: parsed.draft }];
          delete parsed.draft;
        }
        if (!parsed.purpose) {
          parsed.purpose = 'traffic';
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse cached params');
      }
    }
    return {
      brand: 'hema',
      contentType: 'review',
      purpose: 'traffic',
      mainKeyword: '',
      subKeywords: '',
      stories: [{ priority: 1, content: '' }],
      referenceLinks: [],
    };
  });
  const [generatedData, setGeneratedData] = useState<Partial<Record<Platform, GeneratedBlog>>>({});
  const [seoTrends, setSeoTrends] = useState<Partial<Record<Platform, SeoTrend>>>({});
  const [activePlatform, setActivePlatform] = useState<Platform>('naver');
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const [validationFeedback, setValidationFeedback] = useState<ValidationFeedback | null>(null);

  // Auto-save params
  useEffect(() => {
    localStorage.setItem('BLOG_PARAMS_CACHE', JSON.stringify(params));
  }, [params]);
  
  // Mobile menu state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const CACHE_KEY = 'SEO_TREND_CACHE';
  const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Handlers
  const handleInputChange = (field: keyof BlogPostParams, value: any) => {
    setParams(prev => ({ ...prev, [field]: value }));
  };

  const getCachedTrend = (platform: Platform): SeoTrend | null => {
    const cached = localStorage.getItem(`${CACHE_KEY}_${platform}`);
    if (cached) {
      try {
        const { trend, savedAt } = JSON.parse(cached);
        if (Date.now() - savedAt < CACHE_EXPIRY_MS) {
          return trend;
        }
      } catch (e) {
        console.error("Cache parsing error", e);
      }
    }
    return null;
  };

  const fetchTrends = useCallback(async (platform: Platform, forceRefresh = false) => {
    setStatus(AppStatus.FETCHING_TRENDS);
    setErrorMessage('');
    try {
      const oldTrend = getCachedTrend(platform) || undefined;
      const trend = await fetchLatestSeoTrends(forceRefresh ? oldTrend : undefined, platform);
      
      localStorage.setItem(`${CACHE_KEY}_${platform}`, JSON.stringify({
        trend,
        savedAt: Date.now()
      }));
      
      setSeoTrends(prev => ({ ...prev, [platform]: trend }));
      setStatus(AppStatus.IDLE);
      return trend;
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || '트렌드 로직을 가져오는 도중 문제가 발생했습니다.');
      setStatus(AppStatus.ERROR);
      return null;
    }
  }, []);

  const handlePlatformChange = (platform: Platform) => {
    setActivePlatform(platform);
    if (!seoTrends[platform]) {
      const cached = getCachedTrend(platform);
      if (cached) {
        setSeoTrends(prev => ({ ...prev, [platform]: cached }));
      } else {
        fetchTrends(platform);
      }
    }
  };

  const handleSubmit = async (platform: Platform = activePlatform) => {
    if (!params.mainKeyword) return;
    
    try {
      setActivePlatform(platform);
      setIsSidebarOpen(false); // Close sidebar on mobile when submitting
      setErrorMessage('');
      setValidationFeedback(null);
      
      // Step 0: Validate Input
      setStatus(AppStatus.VALIDATING_INPUT);
      const { validateContentInput } = await import('./services/geminiService');
      const validation = await validateContentInput(params);
      
      if (!validation.isValid) {
        setValidationFeedback(validation);
        setStatus(AppStatus.VALIDATION_FAILED);
        return;
      }
      
      // Step 1: Check if we have trends in memory or cache
      let currentTrend = seoTrends[platform] || getCachedTrend(platform);
      
      if (!currentTrend) {
        // If completely empty, fetch new
        setStatus(AppStatus.FETCHING_TRENDS);
        currentTrend = await fetchTrends(platform) || undefined;
      } else if (!seoTrends[platform]) {
        // If we found it in cache but not in state, just set the state
        setSeoTrends(prev => ({ ...prev, [platform]: currentTrend }));
      }

      if (!currentTrend) throw new Error("No trend data available");

      // Step 2: Generate Content
      setStatus(AppStatus.GENERATING_CONTENT);
      const result = await generateBlogPost(params, currentTrend, platform);
      setGeneratedData(prev => ({ ...prev, [platform]: result }));
      setStatus(AppStatus.SUCCESS);

    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || '원고 생성 중 오류가 발생했습니다.');
      setStatus(AppStatus.ERROR);
    }
  };

  const handleGenerateForPlatform = async (platform: Platform) => {
    await handleSubmit(platform);
  };

  const handleGenerateImages = async (platform: Platform) => {
    const blogData = generatedData[platform];
    if (!blogData) return;
    
    try {
      setIsGeneratingImages(true);
      const { generateInfographics } = await import('./services/geminiService');
      const { thumbnailUrl, infographicUrl, generatedImages } = await generateInfographics(blogData.titles.standard, blogData.content, platform, blogParams.contentType, blogParams.brand);
      
      setGeneratedData(prev => ({
        ...prev,
        [platform]: {
          ...prev[platform]!,
          thumbnailUrl,
          infographicUrl,
          generatedImages
        }
      }));
    } catch (error: any) {
      console.error(error);
      alert('이미지 생성 중 오류가 발생했습니다: ' + (error?.message || '알 수 없는 오류'));
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // Initial load effect
  useEffect(() => {
    const cached = getCachedTrend('naver');
    if (cached) {
      setSeoTrends(prev => ({ ...prev, naver: cached }));
    } else {
      fetchTrends('naver');
    }
  }, [fetchTrends]);

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      
      {/* Header */}
      <header className="flex-shrink-0 h-16 bg-slate-950 border-b border-white/10 flex items-center justify-between px-6 z-20 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Brand Marketing AI
          </span>
        </div>
        
        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors relative z-10"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>

        <div className="hidden md:flex items-center gap-4 text-sm text-slate-400 relative z-10">
          <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" /> Google Gemini 3.7 Pro Powered</span>
          <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold rounded-full text-[10px] tracking-wider uppercase">SEO Live</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Sidebar (Input) */}
        <aside 
          className={`
            fixed md:relative z-10 w-full md:w-[400px] h-[calc(100vh-64px)] bg-white transition-transform duration-300 ease-in-out border-r border-slate-200
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <InputSection 
            activePlatform={activePlatform} 
            params={params}
            onChange={handleInputChange} 
            onSubmit={() => handleSubmit(activePlatform)}
            isLoading={status === AppStatus.FETCHING_TRENDS || status === AppStatus.GENERATING_CONTENT}
            isProcessingVideo={status === AppStatus.PROCESSING_VIDEO}
            onVideoProcessingStart={() => setStatus(AppStatus.PROCESSING_VIDEO)}
            onVideoProcessingEnd={() => setStatus(AppStatus.IDLE)}
          />
        </aside>

        {/* Backdrop for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-0 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Preview Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-[#0B0F19]">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="max-w-4xl mx-auto">
            
            {/* SEO Trend Widget */}
            <div className="mb-6">
              <TrendWidget 
                activePlatform={activePlatform}
                trend={seoTrends[activePlatform] || null} 
                isLoading={status === AppStatus.FETCHING_TRENDS} 
                onRefresh={() => fetchTrends(activePlatform, true)}
              />
            </div>

            {/* Status Messages */}
            {status === AppStatus.VALIDATING_INPUT && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
                <p className="text-lg font-bold text-white mb-2">
                  작성하신 기획안을 에디터가 검토하고 있습니다...
                </p>
                <p className="text-sm text-slate-400 max-w-md">
                  고품질의 글이 나올 수 있는 충분한 정보인지 분석 중입니다.
                </p>
              </div>
            )}

            {status === AppStatus.VALIDATION_FAILED && validationFeedback && (
              <div className="flex flex-col items-center justify-center py-12 px-6 bg-amber-950/30 border border-amber-900/50 rounded-2xl text-center">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-extrabold text-amber-200 mb-2">에디터 피드백: 원고 생성을 잠시 멈췄습니다.</h3>
                <p className="text-sm text-amber-100/80 mb-6 max-w-xl leading-relaxed">
                  {validationFeedback.reason}
                </p>
                
                <div className="w-full max-w-xl bg-slate-900/50 rounded-xl p-5 text-left border border-amber-900/30">
                  <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> 이렇게 내용을 보충해 주시면 훨씬 좋은 글이 됩니다!
                  </h4>
                  <ul className="space-y-3">
                    {validationFeedback.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span> 
                        <span className="leading-relaxed">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button
                  onClick={() => setStatus(AppStatus.IDLE)}
                  className="mt-8 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors text-sm"
                >
                  입력창으로 돌아가기
                </button>
              </div>
            )}

            {status === AppStatus.FETCHING_TRENDS && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p className="text-lg font-bold text-white mb-2">
                  최신 {platformNames[activePlatform]} 로직을 분석하고 있습니다...
                </p>
                <p className="text-sm text-slate-400 max-w-md">
                  {platformSubtext[activePlatform] || '실시간 알고리즘 업데이트 확인 중'}
                </p>
              </div>
            )}

            {status === AppStatus.PROCESSING_VIDEO && (
               <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
                <p className="text-lg font-bold text-white mb-2">영상을 분석하고 GIF를 생성 중입니다...</p>
                <p className="text-sm text-slate-400">수백 MB 대용량 영상도 브라우저에서 안전하게 처리됩니다.</p>
              </div>
            )}

            {status === AppStatus.GENERATING_CONTENT && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <p className="text-lg font-bold text-white mb-2">
                  {platformNames[activePlatform]} 맞춤 로직을 바탕으로 글을 작성하고 있습니다...
                </p>
                <p className="text-sm text-slate-400">레퍼런스 스타일, 키워드 배치 및 포맷 최적화 중</p>
              </div>
            )}

            {status === AppStatus.ERROR && (
              <div className="flex flex-col items-center justify-center py-12 px-6 bg-red-950/30 border border-red-900/50 rounded-2xl text-center">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-400 mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <p className="text-lg font-bold text-red-200 mb-1">작업 중 오류가 발생했습니다.</p>
                <p className="text-sm text-red-300/80 mb-5 max-w-md">
                  {errorMessage || 'API 키 또는 네트워크 연결 상태를 확인 후 다시 시도해주세요.'}
                </p>
                <button
                  onClick={() => handleSubmit(activePlatform)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors text-sm flex items-center gap-2 shadow-lg shadow-red-900/30"
                >
                  <RefreshCw className="w-4 h-4" /> 다시 시도하기
                </button>
              </div>
            )}

            {/* Result */}
            <AnimatePresence mode="wait">
              {(status === AppStatus.SUCCESS || status === AppStatus.IDLE) && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ResultDisplay 
                    data={generatedData} 
                    activePlatform={activePlatform}
                    setActivePlatform={handlePlatformChange}
                    onGeneratePlatform={handleGenerateForPlatform}
                    onGenerateImages={handleGenerateImages}
                    status={status} 
                    isGeneratingImages={isGeneratingImages}
                    params={params}
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
