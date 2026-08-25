import React, { useRef } from 'react';
import { BlogPostParams, Brand, ContentType } from '../types';
import { Edit3, Hash, Video, FileText, Sparkles, X, Zap, Target, BookOpen, Music } from 'lucide-react';
import { motion } from 'motion/react';
import { processVideoFile } from '../utils/videoUtils';

const platformNames: Record<string, string> = {
  naver: '네이버 블로그',
  wordpress: '워드프레스',
  tistory: '티스토리',
  blogspot: '구글 블로거',
  instagram: '인스타그램',
  threads: '스레드'
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
            브랜드 및 목적 설정
          </h2>
          <p className="text-sm text-slate-400 mt-1 relative z-10">
            생성할 원고의 브랜드와 글의 성격을 선택해주세요.
          </p>
        </div>

        <div className="space-y-4 relative z-10">
          {/* Brand Selector */}
          <div className="space-y-2">
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

          {/* Content Type Selector */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'review', label: '고객 후기형 (사례/후기 소개)' },
                { id: 'information', label: '정보성 (지식/정보 팁)' }
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
        </div>
      </div>

      <div className="shrink-0 p-6 border-b border-white/10 bg-slate-950/50 backdrop-blur-md relative overflow-hidden">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 relative z-10">
          <div className="p-1.5 bg-slate-800 rounded-lg border border-slate-700"><Edit3 className="w-4 h-4 text-slate-400" /></div>
          작성 설정
        </h2>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {/* Main Keyword */}
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

        {/* Draft/Notes / Stories */}
        <div className="space-y-2">
          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-1">
              <FileText className="w-4 h-4 text-slate-400" /> 고객 사연 / 촬영 현장 내용 (우선순위 1~5)
            </label>
            <div className="self-start">
              <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded flex items-center font-bold">
                <Sparkles className="w-3 h-3 mr-1" /> 
                {params.brand === 'hema' && 'hemastudio.com'}
                {params.brand === 'samsong' && 'samsongenm.com'}
                {params.brand === 'tmc' && 'TMC-7 치약 상세정보'}
                {params.brand === 'makemysong' && 'makemysong.com'} 자동 연동됨
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {params.stories.map((story, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex flex-col items-center gap-1 mt-2">
                  <span className="text-xs font-bold text-slate-400">{story.priority}순위</span>
                </div>
                <textarea
                  value={story.content}
                  onChange={(e) => {
                    const newStories = [...params.stories];
                    newStories[index].content = e.target.value;
                    onChange('stories', newStories);
                  }}
                  placeholder={`${story.priority}순위로 강조하고 싶은 내용을 입력하세요.`}
                  className="w-full h-20 px-4 py-2 bg-slate-900 border border-slate-700/50 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all placeholder:text-slate-600 shadow-inner resize-none text-sm"
                />
                {params.stories.length > 1 && (
                  <button
                    onClick={() => {
                      const newStories = params.stories.filter((_, i) => i !== index);
                      // update priorities
                      newStories.forEach((s, i) => s.priority = i + 1);
                      onChange('stories', newStories);
                    }}
                    className="p-2 mt-1 text-slate-500 hover:text-red-400 transition-colors"
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
