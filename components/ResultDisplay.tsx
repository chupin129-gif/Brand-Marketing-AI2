import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { GeneratedBlog, Platform, AppStatus, BlogPostParams } from '../types';
import { Copy, Check, Info, Image as ImageIcon, Quote, Smile, MapPin, Video, Film, RefreshCw, Sparkles, Cpu, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResultDisplayProps {
  data: Partial<Record<Platform, GeneratedBlog>>;
  activePlatform: Platform;
  setActivePlatform: (p: Platform) => void;
  onGeneratePlatform: (p: Platform) => void;
  onGenerateImages: (p: Platform) => void;
  status: AppStatus;
  isGeneratingImages?: boolean;
  params: BlogPostParams;
}

const platformConfig: Record<Platform, { label: string; icon: string; bgClass: string; textClass: string; copyLabel: string; titleLabel: string }> = {
  naver: { label: '네이버 블로그', icon: 'N', bgClass: 'bg-naver', textClass: 'text-white', copyLabel: '블로그 서식 그대로 복사', titleLabel: '추천 제목 3종 (Title Options)' },
  wordpress: { label: '워드프레스', icon: 'W', bgClass: 'bg-blue-600', textClass: 'text-white', copyLabel: '블로그 서식 그대로 복사', titleLabel: '추천 제목 3종 (Title Options)' },
  tistory: { label: '티스토리', icon: 'T', bgClass: 'bg-orange-500', textClass: 'text-white', copyLabel: '블로그 서식 그대로 복사', titleLabel: '추천 제목 3종 (Title Options)' },
  blogspot: { label: '블로그스팟', icon: 'B', bgClass: 'bg-orange-600', textClass: 'text-white', copyLabel: '블로그 서식 그대로 복사', titleLabel: '추천 제목 3종 (Title Options)' },
  instagram: { label: '인스타그램', icon: 'IG', bgClass: 'bg-pink-500', textClass: 'text-white', copyLabel: '인스타그램 본문 복사', titleLabel: '추천 카드뉴스 헤드라인 3종' },
  threads: { label: '스레드', icon: '@', bgClass: 'bg-black', textClass: 'text-white', copyLabel: '스레드 본문 복사', titleLabel: '추천 훅(첫 문장) 3종' },
  eoplanet: { label: '이오플래닛', icon: 'EO', bgClass: 'bg-blue-500', textClass: 'text-white', copyLabel: '아티클 서식 복사', titleLabel: '추천 아티클 제목 3종' },
  x: { label: 'X (트위터)', icon: '𝕏', bgClass: 'bg-zinc-950 border border-slate-700', textClass: 'text-white', copyLabel: 'X 포스트/타래 복사', titleLabel: '추천 메인 트윗 훅 3종' },
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  data, 
  activePlatform, 
  setActivePlatform,
  onGeneratePlatform,
  onGenerateImages,
  isGeneratingImages,
  status,
  params
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const currentData = data[activePlatform];

  const handleGenerateClick = () => {
    onGeneratePlatform(activePlatform);
  };

  

  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyHtml = async (field: string) => {
    const contentEl = document.getElementById('markdown-content');
    if (!contentEl) return;
    try {
      // Create a clone to manipulate styles without affecting the UI
      const clone = contentEl.cloneNode(true) as HTMLElement;
      
      // Remove all explicit light colors for pasting into white-background editors (like Naver Blog)
      const allEls = clone.querySelectorAll('*');
      allEls.forEach((el) => {
        if (el instanceof HTMLElement) {
          if (el.style.color) {
            el.style.color = '#222'; // Force dark text for readability in blog editors
          }
          if (el.style.borderColor) {
            el.style.borderColor = '#e2e8f0'; // Lighter borders for white background
          }
          if (el.style.backgroundColor && el.style.backgroundColor.includes('rgba')) {
            // Keep subtle backgrounds but make them lighter if needed, or leave them
          }
        }
      });
      
      const html = clone.innerHTML;
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([contentEl.innerText], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
      await navigator.clipboard.write(data);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      console.error(e);
      // Fallback
      handleCopyText(contentEl.innerText, field);
    }
  };

  // Helper to retrieve capture images cyclically if multiple markers exist
  const getCaptureImage = (index: number) => {
    if (!currentData?.attachedAssets?.captures || currentData?.attachedAssets.captures.length === 0) return null;
    return currentData?.attachedAssets.captures[index % currentData?.attachedAssets.captures.length];
  };

  // Internal counter for capture markers to assign different images
  let captureMarkerCount = 0;

  const getCharCount = (text: string) => {
    const withoutSpaces = text.replace(/\s/g, '').length;
    const withSpaces = text.length;
    return `공백포함 ${withSpaces}자 / 공백제외 ${withoutSpaces}자`;
  };

  
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      
      
      {/* Platform Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 border-b border-white/5 pb-4 relative z-10">
        {(Object.keys(platformConfig)).map(platform => {
          const config = platformConfig[platform];
          const isActive = activePlatform === platform;
          const hasData = !!data[platform];
          
          return (
            <button
              key={platform}
              onClick={() => setActivePlatform(platform)}
              className={`
                relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all overflow-hidden
                ${isActive ? 'text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative z-10 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shadow-inner ${hasData ? config.bgClass : 'bg-slate-800'} ${hasData ? config.textClass : 'text-slate-400'}`}>
                {config.icon}
              </span>
              <span className="relative z-10">{config.label}</span>
              {hasData && isActive && <Check className="w-3.5 h-3.5 text-green-400 ml-1 relative z-10" />}
            </button>
          );
        })}
        <div className="flex-1" />
        {currentData && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateClick}
            disabled={status === AppStatus.GENERATING_CONTENT}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-indigo-500/20 border border-slate-700/50 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 rounded-xl font-bold text-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status === AppStatus.GENERATING_CONTENT ? 'animate-spin' : ''}`} />
            다시 생성하기
          </motion.button>
        )}
      </div>
{/* Raw Data Review Accordion */}
      {(status === AppStatus.SUCCESS || Object.keys(data).length > 0) && (
        <div className="mb-2">
          <details className="group [&_summary::-webkit-details-marker]:hidden bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-500">
            <summary className="flex cursor-pointer items-center justify-between gap-1.5 px-4 py-3 text-sm font-bold text-slate-400 hover:text-slate-200 hover:bg-white/5">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span>AI 원고 생성 기준 (Raw Data)</span>
              </div>
              <svg className="w-4 h-4 text-slate-400 transition duration-300 group-open:-rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            
            <div className="px-4 pb-4 pt-2 text-sm text-slate-600 grid gap-3 border-t border-slate-700/50">
              <div>
                <strong className="text-slate-300 block mb-1.5 text-xs tracking-wider">📌 메인 키워드</strong>
                <div className="bg-[#0B0F19] px-4 py-3 border border-slate-700/50 text-slate-300 shadow-inner rounded-lg">{params.mainKeyword || '-'}</div>
              </div>
              <div>
                <strong className="text-slate-300 block mb-1.5 text-xs tracking-wider">🏷️ 서브 키워드</strong>
                <div className="bg-[#0B0F19] px-4 py-3 border border-slate-700/50 text-slate-300 shadow-inner rounded-lg">{params.subKeywords || '-'}</div>
              </div>
              <div>
                <strong className="text-slate-300 block mb-1.5 text-xs tracking-wider">✍️ 사연 / 초안 데이터</strong>
                <div className="bg-[#0B0F19] px-4 py-3 border border-slate-700/50 text-slate-300 shadow-inner rounded-lg whitespace-pre-wrap text-sm leading-relaxed max-h-40 overflow-y-auto">
                  {params.draft || '-'}
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      
      
      {status === AppStatus.GENERATING_CONTENT ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-indigo-500/20 shadow-2xl p-12 min-h-[500px] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
          
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 mb-8 relative"
          >
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-indigo-400 rounded-full border-t-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
          </motion.div>
          
          <h3 className="text-2xl font-extrabold text-white mb-3 tracking-tight">AI 엔진 가동 중...</h3>
          <p className="text-indigo-200/70 text-center max-w-sm mb-8 font-medium">
            최신 {platformConfig[activePlatform].label} 알고리즘과 트렌드를 실시간 분석하여 초안을 완벽한 글로 재구성하고 있습니다.
          </p>
          
          {/* Progress bar effect */}
          <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 15, ease: "circOut" }}
            />
          </div>
        </motion.div>
) : !currentData ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-full bg-slate-900/30 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-xl p-12 min-h-[500px] relative overflow-hidden"
        >
          <div className="w-24 h-24 mb-8 rounded-3xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-400 shadow-inner">
            <span className="font-black text-4xl">{platformConfig[activePlatform].icon}</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">{platformConfig[activePlatform].label}용 AI 원고가 없습니다</h3>
          <p className="text-slate-400 text-center max-w-md mb-10 leading-relaxed">
            좌측에 입력하신 데이터를 바탕으로 {platformConfig[activePlatform].label} 플랫폼에 완벽하게 최적화된 콘텐츠를 즉시 생성할 수 있습니다.
          </p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGenerateClick}
            className={`px-8 py-4 rounded-2xl font-bold text-white shadow-xl flex items-center gap-3 transition-colors ${platformConfig[activePlatform].bgClass}`}
          >
            <Cpu className="w-5 h-5" />
            {platformConfig[activePlatform].label} 전용 원고 생성
          </motion.button>
        </motion.div>
) : (
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }} 
          className="space-y-8 relative z-10"
        >
          {/* SEO Strategy Banner */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-indigo-500/10 rounded-3xl p-6 border border-indigo-500/20 flex items-start gap-4">
            <div className="bg-indigo-500/20 p-2.5 rounded-xl text-indigo-400 mt-0.5">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-indigo-300 mb-1.5 flex items-center gap-2">
                {platformConfig[activePlatform].label} 최적화 알고리즘 반영 완료
              </h4>
              <p className="text-sm text-indigo-200/80 leading-relaxed font-medium">
                {currentData.seoStrategy}
              </p>
            </div>
          </motion.div>

          {/* Reference Info Banner */}
          {currentData.referenceInfo && (
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm text-slate-400 flex items-center gap-3">
              <span className="font-bold text-slate-300 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-300" /> 공식 정보 기반 작성:</span>
              <span>{currentData.referenceInfo}</span>
            </motion.div>
          )}

          {/* Title Output */}
          {currentData.titles && typeof currentData.titles === 'object' && (
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
              <div className="bg-slate-800/40 px-6 py-4 border-b border-slate-700/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-300 text-sm">{platformConfig[activePlatform].titleLabel}</span>
                  <span className="text-[11px] bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full font-bold">
                    {activePlatform === 'threads' || activePlatform === 'x' ? '피드 주목도 높은 훅 추천' : activePlatform === 'instagram' ? '카드뉴스 표지 헤드라인' : '최대 25~30자 권장'}
                  </span>
                </div>
              </div>
              <div className="p-0 divide-y divide-slate-700/50">
                {[
                  { id: 'standard', label: (activePlatform === 'threads' || activePlatform === 'x') ? '핵심 요약형 훅' : '검색 노출 최적화 (Standard)', value: currentData.titles.standard || '제목 생성 오류' },
                  { id: 'emotional', label: (activePlatform === 'threads' || activePlatform === 'x') ? '공감/감성 유발형 훅' : '감성 자극형 (Emotional)', value: currentData.titles.emotional || '제목 생성 오류' },
                  { id: 'clickbait', label: (activePlatform === 'threads' || activePlatform === 'x') ? '도파민/호기심 훅' : '호기심 유발형 (Click-bait)', value: currentData.titles.clickbait || '제목 생성 오류' },
                ].map((item) => (
                  <div key={item.id} className="p-5 hover:bg-slate-800/50 transition-colors flex justify-between items-start group gap-4 relative overflow-hidden">
                    <div className="flex-1 relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${platformConfig[activePlatform].bgClass} bg-opacity-20 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider`}>{item.label}</span>
                        <span className="text-[11px] text-slate-500 font-bold">{item.value.length}자</span>
                      </div>
                      <h1 className="text-lg font-bold text-white leading-tight">
                        {item.value}
                      </h1>
                    </div>
                    <button 
                      onClick={() => handleCopyText(item.value, 'title-' + item.id)}
                      className="relative z-10 text-xs flex items-center gap-1.5 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 py-2.5 px-4 border border-slate-600 hover:border-indigo-500 rounded-xl bg-slate-800 hover:bg-indigo-500/20 shadow-sm"
                    >
                      {copiedField === 'title-' + item.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      {copiedField === 'title-' + item.id ? '복사 완료' : '복사'}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Body Content */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden relative">
            <div className="bg-slate-800/40 px-6 py-4 border-b border-slate-700/50 flex justify-between items-center sticky top-0 z-20 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-300 text-sm">본문 (Body)</span>
                <span className="text-[11px] bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full font-bold">{getCharCount(currentData.content)}</span>
              </div>
              <button 
                onClick={() => handleCopyHtml('content')}
                className={`text-sm font-bold flex items-center gap-2 px-5 py-2 rounded-xl text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${platformConfig[activePlatform].bgClass}`}
              >
                {copiedField === 'content' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedField === 'content' ? '복사 완료!' : platformConfig[activePlatform].copyLabel}
              </button>
            </div>
            
            {/* The Markdown Render Area */}
            <div className="p-8 prose prose-invert prose-indigo max-w-none relative z-10" id="markdown-content">
              <ReactMarkdown 
                components={{
                  blockquote: ({ children }) => (
                    <blockquote style={{ borderLeft: '4px solid #6366f1', paddingLeft: '16px', margin: '32px 0', color: '#94a3b8', fontSize: '1.05rem', wordBreak: 'keep-all', backgroundColor: 'rgba(99, 102, 241, 0.05)', padding: '16px 20px', borderRadius: '0 12px 12px 0' }}>
                      {children}
                    </blockquote>
                  ),
                  h2: ({ children }) => (
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', marginTop: '48px', marginBottom: '20px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#818cf8' }}>#</span> {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9', marginTop: '32px', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                      {children}
                    </h3>
                  ),
                  hr: () => (
                    <hr style={{ border: 'none', borderTop: '1px dashed #334155', margin: '40px 0' }} />
                  ),
                  strong: ({ children }) => (
                    <strong style={{ fontWeight: '800', color: '#f8fafc', borderBottom: '2px solid rgba(99, 102, 241, 0.3)' }}>
                      {children}
                    </strong>
                  ),
                  p: ({ children }) => {
                    const text = String(children);
                    if (text.includes('[🎬 영상 GIF]')) { 
                       return (
                         <div className="my-8">
                           {currentData.attachedAssets?.gif ? (
                             <div className="rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl relative group">
                               <img src={currentData.attachedAssets.gif} alt="Video GIF" className="w-full h-auto max-w-[320px] mx-auto group-hover:scale-105 transition-transform duration-500" />
                               <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 pointer-events-none">
                                 <span className="bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">AI 생동감 효과</span>
                               </div>
                             </div>
                           ) : null}
                         </div>
                       );
                    }
                    if (text.includes('[🎞️ 영상 캡처')) {
                      const currentImage = getCaptureImage(captureMarkerCount);
                      captureMarkerCount++;
                      return (
                        <div className="my-8 space-y-2">
                           {currentImage ? (
                             <div className="rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl relative group">
                               <img src={currentImage} alt="Video Capture" className="w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                             </div>
                           ) : null}
                        </div>
                      );
                    }
                    if (text.includes('[📸 사진 가이드:')) { 
                       const contentStr = text.replace('[📸 사진 가이드:', '').replace(']', '');
                       return (
                         <div className="my-8 bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group hover:border-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer relative overflow-hidden">
                           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                           <div className="p-4 bg-slate-800/80 rounded-full text-indigo-400 group-hover:text-indigo-300 group-hover:scale-110 shadow-lg mb-1 transition-all relative z-10">
                             <ImageIcon className="w-6 h-6" />
                           </div>
                           <span className="text-sm font-bold text-slate-300 group-hover:text-white relative z-10">고품질 사진 첨부 위치</span>
                           <span className="text-xs text-slate-500 text-center max-w-sm relative z-10">{contentStr}</span>
                         </div>
                       );
                    }
                    if (text.includes('[😊 스티커:')) {
                      const contentStr = text.replace('[😊 스티커:', '').replace(']', '');
                      return (
                        <div className="my-6 flex justify-center">
                          <div className="px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-2 text-amber-400 text-sm font-bold shadow-lg shadow-amber-500/5">
                            <Smile className="w-4 h-4" />
                            <span>감성 추천 스티커: {contentStr}</span>
                          </div>
                        </div>
                      );
                    }
                    if (text.includes('[📍 지도:')) {
                      const contentStr = text.replace('[📍 지도:', '').replace(']', '');
                      return (
                        <div className="my-6 mx-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl shadow-xl flex items-center gap-4">
                          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-500 font-bold mb-0.5">스마트블록 지도 첨부 권장</span>
                            <span className="text-sm font-extrabold text-white">{contentStr}</span>
                          </div>
                        </div>
                      );
                    }
                    return <p style={{ marginBottom: '28px', lineHeight: '1.85', color: '#cbd5e1', fontSize: '1.05rem', wordBreak: 'keep-all' }}>{children}</p>;
                  }
                }}
              >
                {currentData.content}
              </ReactMarkdown>
            </div>
          </motion.div>
          
          {/* Hashtags */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl p-7 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <span className="font-extrabold text-white text-sm mb-4 flex items-center gap-2 relative z-10">
              <Hash className="w-4 h-4 text-indigo-400" />
              스마트 노출 추천 해시태그
            </span>
            <div className="flex flex-wrap gap-2 relative z-10">
              {currentData.hashtags.map((tag, index) => (
                <span key={index} className="text-sm font-bold text-slate-300 bg-slate-800/80 border border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/20 transition-colors px-4 py-1.5 rounded-full cursor-pointer shadow-sm">
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </motion.div>
          {/* Image Generation Section */}
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl p-7 relative overflow-hidden mt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="font-extrabold text-white text-sm flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  AI 썸네일 & 인포그래픽 자동 생성
                </span>
                <p className="text-xs text-slate-400 max-w-lg">
                  생성된 원고의 제목과 본문 내용을 바탕으로 Gemini (Nano Banana) 이미지 엔진이 글에 완벽하게 어울리는 맞춤형 썸네일과 본문 첨부용 인포그래픽 이미지를 2장 생성합니다.
                </p>
              </div>
              <button
                onClick={() => onGenerateImages(activePlatform)}
                disabled={isGeneratingImages}
                className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
              >
                {isGeneratingImages ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {currentData.thumbnailUrl ? '이미지 다시 생성하기' : '이미지 생성하기'}
              </button>
            </div>

            {/* Display Generated Images */}
            {currentData.generatedImages && currentData.generatedImages.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 border-t border-slate-700/50 pt-8">
                {currentData.generatedImages.map((img, idx) => (
                  <div key={idx} className="bg-slate-800/80 rounded-xl overflow-hidden border border-slate-700/60 flex flex-col group hover:border-slate-500 transition-all shadow-lg">
                    <div className="relative aspect-square w-full bg-slate-900 overflow-hidden">
                      {img.roleTitle && (
                        <div className="absolute top-2 left-2 z-10 bg-emerald-600/90 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-md backdrop-blur-sm">
                          {img.roleTitle}
                        </div>
                      )}
                      <img 
                        src={img.url} 
                        alt={img.caption || "Generated Image"} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        {img.locationHint && (
                          <div className="inline-block px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded mb-1.5 border border-blue-500/20 font-medium max-w-full truncate">
                            📍 {img.locationHint}
                          </div>
                        )}
                        {img.caption && (
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {img.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (currentData.thumbnailUrl || currentData.infographicUrl) && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-700/50 pt-8">
                {currentData.thumbnailUrl && (
                  <div className="space-y-3">
                    <span className="text-sm font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-lg">대표 썸네일 (1:1)</span>
                    <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-xl">
                      <img src={currentData.thumbnailUrl} alt="Generated Thumbnail" className="w-full h-auto" />
                    </div>
                  </div>
                )}
                {currentData.infographicUrl && (
                  <div className="space-y-3">
                    <span className="text-sm font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-lg">본문 첨부용 인포그래픽 (3:4)</span>
                    <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-xl">
                      <img src={currentData.infographicUrl} alt="Generated Infographic" className="w-full h-auto" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
