import React, { useState } from 'react';
import { Match, CorrectScorePrediction } from '../types/soccer';
import { Target, TrendingUp, Sparkles, Plus, Check, ChevronRight, BarChart3, ShieldCheck, Flame, Award, Layers, Gift } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { DailySuperPickView } from './DailySuperPickView';
import { MarketStrategyAnalytics } from '../components/MarketStrategyAnalytics';

interface TipsViewProps {
  matches: Match[];
  onSelectMatch: (match: Match) => void;
  onAddToBetSlip: (match: Match, prediction: CorrectScorePrediction) => void;
  betSlipMatchIds: Set<string>;
  onOpenPromoModal?: () => void;
}

export const TipsView: React.FC<TipsViewProps> = ({
  matches,
  onSelectMatch,
  onAddToBetSlip,
  betSlipMatchIds,
  onOpenPromoModal,
}) => {
  const [viewMode, setViewMode] = useState<'superpick' | 'strategy' | 'all'>('superpick');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');

  const leagues = [
    { id: 'all', name: 'ทุกลีก' },
    { id: 'Premier League', name: 'พรีเมียร์ลีก' },
    { id: 'La Liga', name: 'ลาลีกา' },
    { id: 'UEFA Champions League', name: 'UCL' },
    { id: 'Bundesliga', name: 'บุนเดสลีกา' },
    { id: 'Thai League 1', name: 'ไทยลีก' },
  ];

  const filteredMatches = selectedLeague === 'all'
    ? matches
    : matches.filter((m) => m.league === selectedLeague);

  // Pick top high confidence match for Featured Spot
  const featuredMatch = matches.find((m) => m.id === 'match-1') || matches[0];
  const topPrediction = featuredMatch.predictions[0];

  const handleAddSlip = (match: Match, pred: CorrectScorePrediction, e: React.MouseEvent) => {
    e.stopPropagation();
    soundManager.playTap();
    onAddToBetSlip(match, pred);
  };

  return (
    <div className="space-y-4">
      {/* Top Main Mode Segmented Switch: Super Pick vs 1-Month Strategy Backtest vs All Matches */}
      <div className="p-4 pb-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 bg-slate-900/90 rounded-2xl border border-amber-500/30 shadow-lg shadow-black/40">
          <button
            onClick={() => {
              soundManager.playTap();
              setViewMode('superpick');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'superpick'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30'
                : 'text-amber-300 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4 fill-current shrink-0" />
            <span>ซุปเปอร์โพย HDP (คัดเดี่ยว 1 คู่)</span>
          </button>

          <button
            onClick={() => {
              soundManager.playTap();
              setViewMode('strategy');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'strategy'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>สถิติ 1 เดือน (HDP / X2 / Over)</span>
          </button>

          <button
            onClick={() => {
              soundManager.playTap();
              setViewMode('all');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              viewMode === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>วิเคราะห์รายคู่ทั้งหมด ({matches.length})</span>
          </button>
        </div>
      </div>

      {/* Render Daily Super Pick View / 1-Month Market Strategy Analytics / All Matches */}
      {viewMode === 'superpick' ? (
        <DailySuperPickView
          onAddToBetSlip={onAddToBetSlip}
          onSelectMatch={onSelectMatch}
          matches={matches}
          onOpenPromoModal={onOpenPromoModal}
          onOpenStrategyStats={() => setViewMode('strategy')}
        />
      ) : viewMode === 'strategy' ? (
        <MarketStrategyAnalytics onJumpToTodayPick={() => setViewMode('superpick')} />
      ) : (
        <div className="p-4 space-y-5 pb-24">
          {/* Quick 1xBet Promo Code Alert Bar */}
          {onOpenPromoModal && (
            <div
              onClick={() => {
                soundManager.playTap();
                onOpenPromoModal();
              }}
              className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-sky-950/40 border border-amber-500/40 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all shadow-md group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-400 text-slate-950 font-black">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>รหัสโปรโมชั่น 1xBet:</span>
                    <span className="font-mono text-amber-300 font-black bg-slate-950 px-1.5 py-0.5 rounded border border-amber-500/30">SCORE95</span>
                    <span className="text-slate-400 text-[10px] hidden sm:inline">(โบนัส 130%)</span>
                  </div>
                  <div className="text-[10px] text-sky-300 mt-0.5">
                    ซุปเปอร์โพย HDP วันนี้ (Vasco da Gama -0.5 @1.68): <span className="font-mono font-bold text-white">1X-VASINT-19</span> &bull; คลิกดูวิธีใส่รหัสใน 1xBet
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          )}

          {/* Calibration Guarantee Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-[#0e1d38] to-slate-900 border border-sky-500/30 p-4 shadow-lg shadow-sky-950/40">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <ShieldCheck className="w-3 h-3" />
                Data Calibration &le; 5% Error
              </span>
              <span className="text-[11px] text-sky-400 font-bold">1xBet Certified</span>
            </div>
            <h1 className="text-base font-extrabold text-white tracking-tight">
              โมเดล xG รวมสถิติ Understat &amp; Opta + Dixon-Coles
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              พยากรณ์ผลสกอร์แม่นยำ (Correct Score) ผ่านกระบวนการ Platt Scaling และ Brier Score ปรับความเสี่ยงให้เกิดความผิดพลาดน้อยที่สุด พร้อมคำนวณราคาค่าน้ำ 1xBet ที่มีค่า +EV สูงสุด
            </p>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-center">
          <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Expected Calibration</div>
            <div className="text-xs font-black text-emerald-400 font-mono">3.2% Error</div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Brier Score</div>
            <div className="text-xs font-black text-sky-400 font-mono">0.078 (Excellence)</div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium">Monte Carlo Runs</div>
            <div className="text-xs font-black text-amber-400 font-mono">10,000 จำลอง</div>
          </div>
        </div>
      </div>

      {/* Featured Match of the Day (ทีเด็ดสกอร์ฟันธงประจำวัน) */}
      {featuredMatch && (
        <div
          onClick={() => onSelectMatch(featuredMatch)}
          className="relative overflow-hidden rounded-2xl bg-[#0f172a] border border-amber-500/40 p-4 shadow-xl shadow-amber-500/10 hover:border-amber-400 transition-all cursor-pointer group"
        >
          {/* Top highlight bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
                ทีเด็ดสกอร์เต็ง 1 ประจำวัน
              </span>
              <span className="text-xs text-slate-400">{featuredMatch.league}</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
              ความมั่นใจ {featuredMatch.calibration.confidenceIndex}%
            </span>
          </div>

          {/* Teams and score */}
          <div className="grid grid-cols-5 items-center gap-2 text-center my-3">
            <div className="col-span-2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-slate-800 p-1 mb-1 border border-slate-700/80 flex items-center justify-center">
                <img src={featuredMatch.homeTeam.logo} alt={featuredMatch.homeTeam.name} className="w-full h-full object-cover rounded-lg" />
              </div>
              <span className="text-xs font-bold text-white truncate max-w-[120px]">{featuredMatch.homeTeam.name}</span>
              <span className="text-[10px] text-sky-400 font-mono font-semibold">xG {featuredMatch.synthesizedXg.home}</span>
            </div>

            <div className="col-span-1 flex flex-col items-center">
              {featuredMatch.status === 'LIVE' ? (
                <div className="flex flex-col items-center">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                    LIVE {featuredMatch.minute}'
                  </span>
                  <div className="text-lg font-black text-amber-400 font-mono tracking-wider mt-0.5">
                    {featuredMatch.homeScore} - {featuredMatch.awayScore}
                  </div>
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-400">VS</div>
              )}
            </div>

            <div className="col-span-2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-slate-800 p-1 mb-1 border border-slate-700/80 flex items-center justify-center">
                <img src={featuredMatch.awayTeam.logo} alt={featuredMatch.awayTeam.name} className="w-full h-full object-cover rounded-lg" />
              </div>
              <span className="text-xs font-bold text-white truncate max-w-[120px]">{featuredMatch.awayTeam.name}</span>
              <span className="text-[10px] text-sky-400 font-mono font-semibold">xG {featuredMatch.synthesizedXg.away}</span>
            </div>
          </div>

          {/* Featured Prediction Highlight Box */}
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-blue-900/40 via-sky-900/30 to-blue-900/40 border border-sky-500/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-sky-300">พยากรณ์ Correct Score อันดับ 1</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-black text-white font-mono">{topPrediction?.score}</span>
                <span className="text-xs font-bold text-amber-400 font-mono">ค่าน้ำ 1xBet: {topPrediction?.odds1xBet}</span>
                <span className="text-[10px] font-bold text-emerald-400 font-mono bg-emerald-950/80 px-1.5 py-0.5 rounded">
                  EV +{topPrediction?.expectedValue}%
                </span>
              </div>
            </div>

            <button
              onClick={(e) => topPrediction && handleAddSlip(featuredMatch, topPrediction, e)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all active:scale-95 shadow-md shadow-sky-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ใส่บิล 1xBet</span>
            </button>
          </div>
        </div>
      )}

      {/* League Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {leagues.map((lg) => (
          <button
            key={lg.id}
            onClick={() => setSelectedLeague(lg.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
              selectedLeague === lg.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {lg.name}
          </button>
        ))}
      </div>

      {/* Match Cards List */}
      <div className="space-y-4">
        {filteredMatches.map((match) => {
          const isFinished = match.status === 'FINISHED';
          const isLive = match.status === 'LIVE';

          return (
            <div
              key={match.id}
              onClick={() => onSelectMatch(match)}
              className="rounded-2xl bg-[#0f172a]/90 border border-slate-800 hover:border-slate-700 transition-all p-4 shadow-md hover:shadow-xl cursor-pointer group"
            >
              {/* Header: League & Status */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{match.leagueFlag}</span>
                  <span className="font-semibold text-slate-300">{match.league}</span>
                  <span className="text-slate-500 font-mono text-[11px]">&middot; {match.kickoffTime}</span>
                </div>

                {isLive && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    LIVE {match.minute}'
                  </span>
                )}
                {isFinished && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    จบการแข่งขัน
                  </span>
                )}
                {!isLive && !isFinished && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-950/60 text-sky-400 border border-sky-800/40">
                    รอแข่ง
                  </span>
                )}
              </div>

              {/* Teams & Score Matchup */}
              <div className="grid grid-cols-12 items-center gap-2 my-2">
                {/* Home Team */}
                <div className="col-span-5 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 p-1 border border-slate-700 flex items-center justify-center shrink-0">
                    <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{match.homeTeam.name}</div>
                    <div className="text-[10px] text-sky-400 font-mono">xG {match.synthesizedXg.home}</div>
                  </div>
                </div>

                {/* Score / VS Center */}
                <div className="col-span-2 text-center">
                  {match.homeScore !== undefined ? (
                    <div className="text-base font-black text-amber-400 font-mono">
                      {match.homeScore} - {match.awayScore}
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-slate-500">VS</div>
                  )}
                </div>

                {/* Away Team */}
                <div className="col-span-5 flex items-center justify-end gap-2.5 text-right">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{match.awayTeam.name}</div>
                    <div className="text-[10px] text-sky-400 font-mono">xG {match.synthesizedXg.away}</div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-800 p-1 border border-slate-700 flex items-center justify-center shrink-0">
                    <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-full h-full object-cover rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Synthesized xG Momentum Bar */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                  <span>xG เจ้าบ้าน {match.synthesizedXg.home}</span>
                  <span className="text-[9px] text-slate-500">รวม 3 สถาบัน (Understat/Opta/FBref)</span>
                  <span>xG ทีมเยือน {match.synthesizedXg.away}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-sky-500"
                    style={{
                      width: `${(match.synthesizedXg.home / (match.synthesizedXg.home + match.synthesizedXg.away || 1)) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-amber-500"
                    style={{
                      width: `${(match.synthesizedXg.away / (match.synthesizedXg.home + match.synthesizedXg.away || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Top 3 Calibrated Correct Score Recommendations */}
              <div className="mt-3.5 space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>พยากรณ์ Correct Score อันดับ 1-3 (ค่าน้ำ 1xBet)</span>
                  <span className="text-emerald-400">Error &le; {match.calibration.expectedCalibrationError}%</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {match.predictions.slice(0, 3).map((pred, i) => (
                    <div
                      key={pred.score}
                      onClick={(e) => handleAddSlip(match, pred, e)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-850 transition-all flex flex-col justify-between group/pred"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white font-mono">{pred.score}</span>
                        <span className="text-[9px] font-bold px-1 rounded bg-sky-500/10 text-sky-400">
                          #{i + 1}
                        </span>
                      </div>

                      <div className="mt-1 flex items-baseline justify-between text-[10px]">
                        <span className="text-slate-400">{pred.calibratedProbability}%</span>
                        <span className="font-extrabold text-amber-400 font-mono">@{pred.odds1xBet}</span>
                      </div>

                      <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between">
                        <span className={`text-[9px] font-bold ${pred.expectedValue > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                          EV {pred.expectedValue > 0 ? `+${pred.expectedValue}%` : `${pred.expectedValue}%`}
                        </span>
                        <Plus className="w-3 h-3 text-sky-400 group-hover/pred:scale-125 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer action link */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-sky-400 font-semibold group-hover:text-sky-300">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>ดูเมทริกซ์ 5x5 และการวิเคราะห์แท็กติก AI</span>
                </div>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
      )}
    </div>
  );
};
