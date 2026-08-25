import React from 'react';
import { SeoTrend } from '../types';
import { TrendingUp, ExternalLink, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

interface TrendWidgetProps {
  activePlatform: string;
  trend: SeoTrend | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const platformInfo: Record<string, { name: string; color: string; badgeBg: string; badgeText: string; iconColor: string }> = {
  naver: {
    name: '네이버 블로그',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
    badgeText: 'text-emerald-400',
    iconColor: 'text-emerald-400'
  },
  wordpress: {
    name: '워드프레스',
    color: 'sky',
    badgeBg: 'bg-sky-500/10 border-sky-500/30',
    badgeText: 'text-sky-400',
    iconColor: 'text-sky-400'
  },
  tistory: {
    name: '티스토리',
    color: 'orange',
    badgeBg: 'bg-orange-500/10 border-orange-500/30',
    badgeText: 'text-orange-400',
    iconColor: 'text-orange-400'
  },
  blogspot: {
    name: '구글 블로거',
    color: 'amber',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
    badgeText: 'text-amber-400',
    iconColor: 'text-amber-400'
  },
  instagram: {
    name: '인스타그램',
    color: 'pink',
    badgeBg: 'bg-pink-500/10 border-pink-500/30',
    badgeText: 'text-pink-400',
    iconColor: 'text-pink-400'
  },
  threads: {
    name: '스레드(Threads)',
    color: 'purple',
    badgeBg: 'bg-purple-500/10 border-purple-500/30',
    badgeText: 'text-purple-400',
    iconColor: 'text-purple-400'
  },
  eoplanet: {
    name: '이오플래닛(EO Planet)',
    color: 'blue',
    badgeBg: 'bg-blue-500/10 border-blue-500/30',
    badgeText: 'text-blue-400',
    iconColor: 'text-blue-400'
  },
  x: {
    name: 'X (트위터)',
    color: 'slate',
    badgeBg: 'bg-slate-500/10 border-slate-500/30',
    badgeText: 'text-slate-200',
    iconColor: 'text-slate-200'
  }
};

export const TrendWidget: React.FC<TrendWidgetProps> = ({ activePlatform, trend, isLoading, onRefresh }) => {
  const currentInfo = platformInfo[activePlatform] || platformInfo.naver;

  if (isLoading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 animate-pulse backdrop-blur-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-slate-800 rounded-xl"></div>
          <div className="space-y-1.5 flex-1">
            <div className="h-4 bg-slate-800 rounded w-1/4"></div>
            <div className="h-3 bg-slate-800/60 rounded w-1/6"></div>
          </div>
        </div>
        <div className="space-y-2 mt-4">
          <div className="h-3 bg-slate-800 rounded w-full"></div>
          <div className="h-3 bg-slate-800 rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  if (!trend) return null;

  const formatText = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300">
      {/* Top subtle glow */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${currentInfo.badgeBg} ${currentInfo.iconColor} shadow-inner`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base tracking-tight">
                {currentInfo.name} 최신 알고리즘 로직
              </h3>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${currentInfo.badgeBg} ${currentInfo.badgeText} flex items-center gap-1`}>
                <CheckCircle2 className="w-3 h-3" /> 실시간 동기화
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">업데이트 기준: {trend.timestamp}</p>
          </div>
        </div>

        <button 
          onClick={onRefresh}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium border border-slate-800"
          title="Google 검색 기반 실시간 알고리즘 즉시 갱신"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>로직 재분석</span>
        </button>
      </div>
      
      {trend.changes && (
        <div className="mb-3.5 bg-slate-950/60 border border-indigo-500/20 rounded-xl p-3.5 text-xs text-indigo-200/90 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-indigo-300 block mb-0.5">💡 주요 핵심 포인트 & 변경점:</span>
            <span>{formatText(trend.changes)}</span>
          </div>
        </div>
      )}

      <div className="text-xs md:text-sm text-slate-300 leading-relaxed p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80">
        {formatText(trend.summary)}
      </div>

      {trend.sources && trend.sources.length > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-[11px] font-medium text-slate-500">근거 소스:</span>
          {trend.sources.map((source, idx) => (
            <a 
              key={idx} 
              href={source.uri} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{source.title || '출처 문서'}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
