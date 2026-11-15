import React, { useState } from 'react';
import { Match, CorrectScorePrediction } from '../types/soccer';
import { X, Sparkles, Plus, Check, ShieldCheck, TrendingUp, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface MatchDetailModalProps {
  match: Match | null;
  onClose: () => void;
  onAddToBetSlip: (match: Match, prediction: CorrectScorePrediction) => void;
  betSlipMatchIds: Set<string>;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  onClose,
  onAddToBetSlip,
  betSlipMatchIds,
}) => {
  const [selectedScore, setSelectedScore] = useState<string>('2-1');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState(match?.aiSummary);

  if (!match) return null;

  const handleScoreClick = (score: string) => {
    soundManager.playTap();
    setSelectedScore(score);
  };

  const handleAddSlip = (pred: CorrectScorePrediction) => {
    soundManager.playTap();
    onAddToBetSlip(match, pred);
  };

  const handleGenerateAiAnalysis = async () => {
    setIsGeneratingAi(true);
    soundManager.playTap();

    try {
      const res = await fetch('/api/ai/match-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          league: match.league,
          homeXg: match.synthesizedXg.home,
          awayXg: match.synthesizedXg.away,
          currentScore: match.homeScore !== undefined ? `${match.homeScore}-${match.awayScore}` : '0-0',
          odds1xBet: match.odds1xBet.correctScores,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
      }
    } catch (err) {
      console.error('Failed to generate AI analysis:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const currentPred = match.predictions.find((p) => p.score === selectedScore) || match.predictions[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0b0f19] border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0d1424] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{match.leagueFlag}</span>
            <div>
              <div className="text-xs font-bold text-white">{match.league}</div>
              <div className="text-[10px] text-slate-400 font-mono">{match.venue} &middot; {match.kickoffTime}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Match Scoreboard Strip */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-blue-950/40 border border-slate-800 p-4">
            <div className="grid grid-cols-5 items-center gap-2 text-center">
              {/* Home */}
              <div className="col-span-2 flex flex-col items-center">
                <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-12 h-12 object-cover rounded-xl bg-slate-800 p-1 mb-1 border border-slate-700" />
                <span className="text-xs font-bold text-white truncate max-w-[130px]">{match.homeTeam.name}</span>
                <span className="text-[10px] text-sky-400 font-mono font-semibold">xG {match.synthesizedXg.home}</span>
              </div>

              {/* Center */}
              <div className="col-span-1 flex flex-col items-center">
                {match.homeScore !== undefined ? (
                  <>
                    <span className="text-[10px] font-bold text-emerald-400">
                      {match.status === 'LIVE' ? `LIVE ${match.minute}'` : 'FT'}
                    </span>
                    <span className="text-2xl font-black text-amber-400 font-mono tracking-wider">
                      {match.homeScore} - {match.awayScore}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-slate-500">VS</span>
                )}
              </div>

              {/* Away */}
              <div className="col-span-2 flex flex-col items-center">
                <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-12 h-12 object-cover rounded-xl bg-slate-800 p-1 mb-1 border border-slate-700" />
                <span className="text-xs font-bold text-white truncate max-w-[130px]">{match.awayTeam.name}</span>
                <span className="text-[10px] text-sky-400 font-mono font-semibold">xG {match.synthesizedXg.away}</span>
              </div>
            </div>

            {/* Calibration Proof Indicator */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>การสอบเทียบข้อมูล (Calibration Error):</span>
              </span>
              <span className="font-mono font-bold text-emerald-400 text-xs">
                {match.calibration.expectedCalibrationError}% (&le; 5% Target PASS)
              </span>
            </div>
          </div>

          {/* 5x5 Heatmap Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                <span>ตารางความน่าจะเป็น Correct Score 5x5 (Dixon-Coles Matrix)</span>
              </div>
              <span className="text-[10px] text-slate-400">คลิกสกอร์เพื่อดูค่าน้ำ 1xBet</span>
            </div>

            <div className="overflow-x-auto pb-1">
              <div className="min-w-[340px]">
                {/* Column Headers */}
                <div className="grid grid-cols-6 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
                  <div className="text-[9px] text-slate-500 self-center">เหย้า\เยือน</div>
                  <div>เยือน 0</div>
                  <div>เยือน 1</div>
                  <div>เยือน 2</div>
                  <div>เยือน 3</div>
                  <div>เยือน 4</div>
                </div>

                {[0, 1, 2, 3, 4].map((h) => (
                  <div key={h} className="grid grid-cols-6 gap-1 text-center mb-1">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center bg-slate-900/80 rounded-lg">
                      เหย้า {h}
                    </div>

                    {[0, 1, 2, 3, 4].map((a) => {
                      const sc = `${h}-${a}`;
                      const pred = match.predictions.find((p) => p.score === sc);
                      const isSelected = selectedScore === sc;
                      const prob = pred ? pred.calibratedProbability : 0;
                      const isTop = pred?.rank === 1;

                      let cellStyle = 'bg-slate-900 border-slate-800 text-slate-300';
                      if (prob > 10.0) cellStyle = 'bg-sky-600/40 border-sky-400 text-sky-100 font-black';
                      else if (prob > 6.0) cellStyle = 'bg-blue-900/40 border-blue-500/50 text-blue-200 font-bold';

                      if (isSelected) {
                        cellStyle = 'ring-2 ring-amber-400 bg-amber-500/30 border-amber-400 text-white font-black';
                      }

                      return (
                        <button
                          key={sc}
                          onClick={() => handleScoreClick(sc)}
                          className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer relative ${cellStyle}`}
                        >
                          {isTop && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                          )}
                          <div className="text-xs font-mono">{sc}</div>
                          <div className="text-[9px] font-mono opacity-90">{prob}%</div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Selected score action card */}
            {currentPred && (
              <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-white font-mono">{currentPred.score}</span>
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      ค่าน้ำ 1xBet: @{currentPred.odds1xBet}
                    </span>
                    <span className="text-[10px] font-bold text-sky-400">อันดับ #{currentPred.rank}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                    <span>โอกาสเกิด: {currentPred.calibratedProbability}%</span>
                    <span>&middot;</span>
                    <span className={currentPred.expectedValue > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      EV {currentPred.expectedValue > 0 ? `+${currentPred.expectedValue}%` : `${currentPred.expectedValue}%`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleAddSlip(currentPred)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all active:scale-95 shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ใส่บิล 1xBet</span>
                </button>
              </div>
            )}
          </div>

          {/* Multi-source xG Breakdown comparison table */}
          <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 space-y-3">
            <div className="text-xs font-bold text-white">
              เปรียบเทียบสถิติ xG 3 สถาบัน (Multi-Source Comparison)
            </div>

            <div className="space-y-2 text-xs">
              {/* Understat */}
              <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl">
                <span className="text-slate-300 font-semibold">Understat xG (35% Weight)</span>
                <div className="flex items-center gap-3 font-mono font-bold">
                  <span className="text-sky-400">{match.understatXg.home}</span>
                  <span className="text-slate-500">vs</span>
                  <span className="text-amber-400">{match.understatXg.away}</span>
                </div>
              </div>

              {/* Opta */}
              <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl">
                <span className="text-slate-300 font-semibold">Opta / StatsBomb (35% Weight)</span>
                <div className="flex items-center gap-3 font-mono font-bold">
                  <span className="text-sky-400">{match.optaXg.home}</span>
                  <span className="text-slate-500">vs</span>
                  <span className="text-amber-400">{match.optaXg.away}</span>
                </div>
              </div>

              {/* FBref */}
              <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl">
                <span className="text-slate-300 font-semibold">FBref Historical (30% Weight)</span>
                <div className="flex items-center gap-3 font-mono font-bold">
                  <span className="text-sky-400">{match.fbrefXg.home}</span>
                  <span className="text-slate-500">vs</span>
                  <span className="text-amber-400">{match.fbrefXg.away}</span>
                </div>
              </div>

              {/* Synthesized Master */}
              <div className="flex items-center justify-between bg-blue-950/40 p-2.5 rounded-xl border border-sky-500/30">
                <span className="text-sky-300 font-bold">Synthesized Master xG (ผลรวมสอบเทียบ)</span>
                <div className="flex items-center gap-3 font-mono font-black text-sm">
                  <span className="text-sky-400">{match.synthesizedXg.home}</span>
                  <span className="text-slate-400">vs</span>
                  <span className="text-amber-400">{match.synthesizedXg.away}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Tactical & Correct Score Engine */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-950/30 via-slate-900 to-blue-950/30 border border-sky-500/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">วิเคราะห์เชิงลึก AI Tactical Engine</span>
              </div>

              <button
                onClick={handleGenerateAiAnalysis}
                disabled={isGeneratingAi}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-[11px] font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? 'กำลังวิเคราะห์...' : 'วิเคราะห์สดด้วย AI'}</span>
              </button>
            </div>

            {aiAnalysis ? (
              <div className="space-y-2.5 text-xs">
                <div className="font-bold text-amber-300">{aiAnalysis.headline}</div>
                <p className="text-slate-300 leading-relaxed">{aiAnalysis.tacticalReasoning}</p>

                {aiAnalysis.keyFactors && aiAnalysis.keyFactors.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">ปัจจัยสำคัญเชิงสถิติ:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                      {aiAnalysis.keyFactors.map((kf, i) => (
                        <li key={i}>{kf}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">ฟันธง Correct Score 1xBet:</span>
                  <span className="font-mono font-bold text-emerald-400">{aiAnalysis.topPick}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">คลิก "วิเคราะห์สดด้วย AI" เพื่อสร้างบทวิเคราะห์เชิงลึก</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
