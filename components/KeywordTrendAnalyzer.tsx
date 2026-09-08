import React, { useState } from 'react';
import { KeywordTrendAnalysis, Platform } from '../types';
import { analyzeKeywordTrends } from '../services/geminiService';
import { Search, TrendingUp, Hash, Tag, Plus, Loader2, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface KeywordTrendAnalyzerProps {
  mainKeyword: string;
  activePlatform: Platform;
  onApplyTrend: (mainKeyword: string, subKeywords: string, trendTopic: string) => void;
}

export const KeywordTrendAnalyzer: React.FC<KeywordTrendAnalyzerProps> = ({ mainKeyword, activePlatform, onApplyTrend }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<KeywordTrendAnalysis | null>(null);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!mainKeyword.trim()) {
      alert("메인 키워드를 먼저 입력해주세요.");
      return;
    }
    setIsAnalyzing(true);
    setAppliedIndex(null);
    try {
      const result = await analyzeKeywordTrends(mainKeyword, activePlatform);
      setAnalysis(result);
    } catch (e) {
      alert("트렌드 분석에 실패했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = (index: number, combo: KeywordTrendAnalysis['recommendedCombinations'][0]) => {
    onApplyTrend(combo.mainKeyword, combo.subKeywords, combo.trendTopic);
    setAppliedIndex(index);
  };

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-4">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2 text-indigo-400">
          <TrendingUp className="w-4 h-4 shrink-0" />
          <h3 className="text-sm font-bold">네이버 실시간 키워드 & 트렌드 분석</h3>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !mainKeyword.trim()}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 rounded-lg text-xs font-bold hover:bg-indigo-500/30 transition-colors disabled:opacity-50 shrink-0"
        >
          {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          {isAnalyzing ? '분석 중...' : '트렌드 분석'}
        </button>
      </div>

      {analysis && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 font-bold mb-1.5 flex items-center gap-1"><Search className="w-3 h-3 shrink-0"/> 자동완성 검색어</span>
              <div className="flex flex-wrap gap-1">
                {analysis.autocompleteKeywords.map((k, i) => (
                  <span key={i} className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] break-words">{k}</span>
                ))}
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 font-bold mb-1.5 flex items-center gap-1"><Hash className="w-3 h-3 shrink-0"/> 연관 검색어</span>
              <div className="flex flex-wrap gap-1">
                {analysis.relatedKeywords.map((k, i) => (
                  <span key={i} className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] break-words">{k}</span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
             <span className="text-slate-400 font-bold mb-2 flex items-center gap-1"><Tag className="w-3 h-3 shrink-0"/> 현재 시즌 트렌드</span>
             <div className="space-y-1.5">
               {analysis.seasonalTrends.map((t, i) => (
                 <div key={i} className="flex gap-2 items-start">
                   <span className="text-emerald-400 font-bold shrink-0">#{t.tag}</span>
                   <span className="text-slate-300 break-words">{t.context}</span>
                 </div>
               ))}
             </div>
          </div>

          <div>
             <span className="text-slate-300 font-bold text-xs mb-2 block">조회수 폭발 황금 결합 키워드 세트 추천</span>
             <div className="space-y-2">
               {analysis.recommendedCombinations.map((combo, i) => (
                 <div key={i} className="bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-lg text-xs space-y-2">
                   <div className="font-bold text-indigo-300 text-[13px] leading-snug">{combo.titleIdea}</div>
                   <div className="text-slate-400 leading-relaxed">{combo.reason}</div>
                   <div className="flex flex-col gap-1.5 text-[10px]">
                     <span className="text-slate-300 break-words"><span className="text-slate-500 shrink-0">메인:</span> {combo.mainKeyword}</span>
                     <span className="text-slate-300 break-words"><span className="text-slate-500 shrink-0">서브:</span> {combo.subKeywords}</span>
                     <span className="text-slate-300 break-words"><span className="text-slate-500 shrink-0">테마:</span> {combo.trendTopic}</span>
                   </div>
                   <button
                     onClick={() => handleApply(i, combo)}
                     className={`w-full mt-2 py-2 px-2 rounded font-bold transition-all flex items-center justify-center gap-1.5 ${
                       appliedIndex === i 
                         ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                         : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                     }`}
                   >
                     {appliedIndex === i ? (
                       <><Check className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">아래에 적용 완료!</span></>
                     ) : (
                       <><Plus className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">이 세트로 적용하기</span></>
                     )}
                   </button>
                 </div>
               ))}
             </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
