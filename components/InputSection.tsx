import React, { useRef } from 'react';
import { BlogPostParams, Brand, ContentType, Platform } from '../types';
import { Edit3, Hash, Video, FileText, Sparkles, X, Zap, Target, BookOpen, Music, Link as LinkIcon, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { processVideoFile } from '../utils/videoUtils';
import { KeywordTrendAnalyzer } from './KeywordTrendAnalyzer';

const platformNames: Record<string, string> = {
  naver: '네이버 블로그',
  wordpress: '워드프레스',
  tistory: '티스토리',
  blogspot: '구글 블로거',
  instagram: '인스타그램',
  threads: '스레드',
  eoplanet: '이오플래닛',
  x: 'X (트위터)'
};

interface InputSectionProps {
  activePlatform: string;
  params: BlogPostParams;
  onChange: (field: keyof BlogPostParams, value: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isProcessingVideo?: boolean;
  onVideoProcessingStart?: () => void;
  onVideoProcessingEnd?: () => void;
}

export const InputSection: React.FC<InputSectionProps> = ({ 
  activePlatform,
  params,
  onChange,
  onSubmit,
  isLoading,
  isProcessingVideo,
  onVideoProcessingStart,
  onVideoProcessingEnd
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024 * 1024) {
      if(!confirm("영상 용량이 큽니다(500MB+). 브라우저 성능에 따라 처리가 느릴 수 있습니다. 계속하시겠습니까?")) {
        if(fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    if (onVideoProcessingStart) onVideoProcessingStart();

    try {
      const { gif, captures } = await processVideoFile(file);
      onChange('videoAssets', { gif, captures });
    } catch (error) {
      console.error("Video processing failed", error);
      alert("영상 처리 중 오류가 발생했습니다.");
    } finally {
      if (onVideoProcessingEnd) onVideoProcessingEnd();
    }
  };

  const clearVideo = () => {
    onChange('videoAssets', undefined);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-white/5 overflow-y-auto text-slate-300 shadow-2xl">
      <div className="shrink-0 p-6 border-b border-white/10 bg-slate-900/50 backdrop-blur-md relative overflow-hidden space-y-6">
        <div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2 relative z-10">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30"><Target className="w-4 h-4 text-indigo-400" /></div>
            글 작성 목적 설정
          </h2>
          <p className="text-sm text-slate-400 mt-1 relative z-10">
            생성할 원고의 브랜드, 성격, 그리고 발행 목적을 차례대로 선택해주세요.
          </p>
        </div>

        <div className="space-y-6 relative z-10">
          {/* Step 1: Brand */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              <span className="text-indigo-400 font-bold mr-1">Step 1.</span> 브랜드 / 제품 설정
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'hema', label: '헤마 스튜디오' },
                { id: 'samsong', label: '삼송 E&M' },
                { id: 'tmc', label: 'TMC-7 치약' },
                { id: 'makemysong', label: '메이크마이송' }
              ].map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => onChange('brand', brand.id as Brand)}
                  className={`py-2 px-3 text-sm font-medium rounded-xl border transition-all ${
                    params.brand === brand.id 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-inner' 
                      : 'bg-slate-900 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {brand.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Content Type */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              <span className="text-indigo-400 font-bold mr-1">Step 2.</span> 원고 포맷 설정
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'review', label: '✍️ 체험 / 후기형' },
                { id: 'information', label: '💡 전문 / 정보성' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => onChange('contentType', type.id as ContentType)}
                  className={`py-2 px-3 text-sm font-medium rounded-xl border transition-all ${
                    params.contentType === type.id 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-inner' 
                      : 'bg-slate-900 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Step 3: Purpose (Traffic vs SEO) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              <span className="text-indigo-400 font-bold mr-1">Step 3.</span> 발행 목적 및 최적화 타겟
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'traffic', label: '🚀 트래픽 / 바이럴 유입' },
                { id: 'seo', label: '🔍 검색엔진 상위노출 (SEO)' }
              ].map((purpose) => (
                <button
                  key={purpose.id}
                  onClick={() => onChange('purpose', purpose.id)}
                  className={`py-2 px-3 text-sm font-medium rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                    params.purpose === purpose.id 
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-inner' 
                      : 'bg-slate-900 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {purpose.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 p-6 border-b border-white/10 bg-slate-950/50 backdrop-blur-md relative overflow-hidden">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 relative z-10">
          <div className="p-1.5 bg-slate-800 rounded-lg border border-slate-700"><Edit3 className="w-4 h-4 text-slate-400" /></div>
          작성 설정
        </h2>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {/* Main Keyword & Trend Analyzer */}
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200 flex items-center gap-1">
              <Hash className="w-4 h-4 text-indigo-400" /> 메인 키워드 (필수)
            </label>
            <input
              type="text"
              value={params.mainKeyword}
              onChange={(e) => onChange('mainKeyword', e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all placeholder:text-slate-600 shadow-inner"
            />
          </div>

          <KeywordTrendAnalyzer
            mainKeyword={params.mainKeyword}
            activePlatform={activePlatform as Platform}
            contentType={params.contentType}
            onApplyTrend={(main, sub, trend) => {
              onChange('mainKeyword', main);
              onChange('subKeywords', sub);
              onChange('trendTopic', trend);
            }}
          />
        </div>

        {/* Sub Keywords */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200 flex items-center gap-1">
            <Hash className="w-4 h-4 text-slate-400" /> 서브 키워드
          </label>
          <input
            type="text"
            value={params.subKeywords}
            onChange={(e) => onChange('subKeywords', e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all placeholder:text-slate-600 shadow-inner"
          />
        </div>

        {/* Trend Topic Field (Visible for both review and information) */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200 flex items-center gap-1">
            <Target className="w-4 h-4 text-emerald-400" /> 트렌드 테마 (선택)
          </label>
          <input
            type="text"
            value={params.trendTopic || ''}
            onChange={(e) => onChange('trendTopic', e.target.value)}
            placeholder={params.contentType === 'review' ? "예: 봄 웨딩 시즌, 연말 기념일, 환승연애 BGM 등" : "예: 장마철 실내 데이트, 연말 모임 등"}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white outline-none transition-all placeholder:text-slate-600 shadow-inner"
          />
        </div>

        {/* Video Upload */}
        <div className="space-y-2">
           <label className="block text-sm font-semibold text-slate-200 flex items-center gap-1">
            <Video className="w-4 h-4 text-slate-400" /> 영상 첨부 (선택)
          </label>
          
          {!params.videoAssets && !isProcessingVideo && (
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                id="video-upload"
              />
              <label 
                htmlFor="video-upload"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-colors text-slate-400 text-sm"
              >
                <Video className="w-5 h-5" />
                <span>영상 업로드 (자동 GIF/캡처 생성)</span>
              </label>
              <p className="text-xs text-slate-400 mt-1 pl-1">* 대용량 영상도 업로드 없이 브라우저에서 바로 처리됩니다.</p>
            </div>
          )}

          {isProcessingVideo && (
             <div className="w-full px-4 py-4 bg-slate-900 border border-slate-700/50 rounded-xl flex items-center justify-center gap-3">
               <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
               <span className="text-sm text-slate-400 font-medium">영상 분석 및 GIF 생성 중...</span>
             </div>
          )}

          {params.videoAssets && (
            <div className="w-full p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1">
                  <Video className="w-3 h-3" /> 영상 처리 완료
                </span>
                <button onClick={clearVideo} className="text-slate-400 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1 aspect-square rounded overflow-hidden border border-slate-700 relative group">
                  <img src={params.videoAssets.gif} alt="GIF" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1">GIF</span>
                </div>
                {params.videoAssets.captures.map((cap, i) => (
                  <div key={i} className="col-span-1 aspect-square rounded overflow-hidden border border-slate-700">
                     <img src={cap} alt={`Capture ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Music Information (Hema Review Only) */}
        {params.brand === 'hema' && params.contentType === 'review' && (
          <div className="space-y-3 pt-2 pb-2 border-y border-white/5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-1">
                <Music className="w-4 h-4 text-slate-400" /> 사용된 음악 / 곡 제목
              </label>
              <input
                type="text"
                placeholder="예: 폴킴 - 모든 날, 모든 순간"
                value={params.musicTitle || ''}
                onChange={(e) => onChange('musicTitle', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all placeholder:text-slate-600 shadow-inner text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-1">
                <Music className="w-4 h-4 text-slate-400" /> 음악/곡에 대한 설명 또는 사연
              </label>
              <textarea
                placeholder="이 곡을 선택한 이유나 특별한 사연을 적어주세요."
                value={params.musicDescription || ''}
                onChange={(e) => onChange('musicDescription', e.target.value)}
                className="w-full h-20 px-4 py-2.5 bg-slate-900 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all placeholder:text-slate-600 shadow-inner resize-none text-sm"
              />
            </div>
          </div>
        )}

        {/* Reference Links */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200 flex items-start sm:items-center gap-1 leading-snug">
            <LinkIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5 sm:mt-0" /> <span className="break-keep">참고용 레퍼런스 링크 (최대 5개)</span>
          </label>
          <p className="text-xs text-slate-400 mt-1 mb-2">
            AI가 해당 링크들의 말투, 분량, 서식(H1, H2), 이모티콘 활용 빈도를 분석하여 유사하게 작성합니다.
          </p>
          <div className="space-y-2">
            {(params.referenceLinks || []).map((link, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="url"
                  value={link}
                  onChange={(e) => {
                    const newLinks = [...(params.referenceLinks || [])];
                    newLinks[index] = e.target.value;
                    onChange('referenceLinks', newLinks);
                  }}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all placeholder:text-slate-600 shadow-inner text-sm leading-relaxed"
                />
                <button
                  onClick={() => {
                    const newLinks = (params.referenceLinks || []).filter((_, i) => i !== index);
                    onChange('referenceLinks', newLinks);
                  }}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(params.referenceLinks || []).length < 5 && (
              <button
                onClick={() => {
                  const newLinks = [...(params.referenceLinks || []), ''];
                  onChange('referenceLinks', newLinks);
                }}
                className="flex items-center justify-center gap-1 w-full py-2 border border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-indigo-400 hover:border-indigo-500 hover:bg-indigo-500/5 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> 링크 추가하기
              </button>
            )}
          </div>
        </div>

        {/* Draft/Notes / Stories */}
        <div className="space-y-2">
          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-sm font-semibold text-slate-200 flex items-start sm:items-center gap-1 leading-snug">
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5 sm:mt-0" /> 
              <span className="break-keep">
                {params.contentType === 'review' ? '고객 사연 / 현장 에피소드 등 (우선순위 1~5)' : '강조할 핵심 정보 / 전문 지식 / 사례 (우선순위 1~5)'}
              </span>
            </label>
            <div className="self-start">
              <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-2 py-1 rounded inline-flex items-center gap-1 font-bold">
                <Sparkles className="w-3 h-3 shrink-0" /> 
                <span className="leading-tight break-all sm:break-normal">
                  {params.brand === 'hema' && 'hemastudio.com '}
                  {params.brand === 'samsong' && 'samsongenm.com '}
                  {params.brand === 'tmc' && 'TMC-7 치약 상세정보 '}
                  {params.brand === 'makemysong' && 'makemysong.com '} 
                  자동 연동됨
                </span>
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {params.stories.map((story, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex flex-col items-center justify-center shrink-0 w-10 mt-2.5">
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md">{story.priority}순위</span>
                </div>
                <textarea
                  value={story.content}
                  onChange={(e) => {
                    const newStories = [...params.stories];
                    newStories[index].content = e.target.value;
                    onChange('stories', newStories);
                  }}
                  placeholder={params.contentType === 'review' ? `${story.priority}순위로 강조하고 싶은 현장 이야기나 사연을 입력하세요.` : `${story.priority}순위로 강조하고 싶은 전문 지식이나 핵심 정보를 입력하세요.`}
                  className="w-full h-20 px-3 py-2 bg-slate-900 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all placeholder:text-slate-600 shadow-inner resize-none text-sm leading-relaxed"
                />
                {params.stories.length > 1 && (
                  <button
                    onClick={() => {
                      const newStories = params.stories.filter((_, i) => i !== index);
                      // update priorities
                      newStories.forEach((s, i) => s.priority = i + 1);
                      onChange('stories', newStories);
                    }}
                    className="p-1.5 mt-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {params.stories.length < 5 && (
              <button
                onClick={() => {
                  onChange('stories', [...params.stories, { priority: params.stories.length + 1, content: '' }]);
                }}
                className="w-full py-2 flex items-center justify-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg border border-dashed border-indigo-500/30 transition-colors"
              >
                + 사연/내용 추가 (최대 5개)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
