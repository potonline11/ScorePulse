import React, { useState } from 'react';
import { Match, MatchEvent } from '../types/soccer';
import { Zap, Play, Volume2, ShieldCheck, ChevronDown, ChevronUp, BellRing } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface LiveScoresViewProps {
  matches: Match[];
  onSelectMatch: (match: Match) => void;
  onSimulateGoal: (matchId: string, scoringTeam: 'home' | 'away', player: string) => void;
  onWatchStream?: (matchId?: string) => void;
}

export const LiveScoresView: React.FC<LiveScoresViewProps> = ({
  matches,
  onSelectMatch,
  onSimulateGoal,
  onWatchStream,
}) => {
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(matches[0]?.id || null);

  const filteredMatches = matches.filter((m) => {
    if (filter === 'live') return m.status === 'LIVE';
    if (filter === 'upcoming') return m.status === 'UPCOMING';
    if (filter === 'finished') return m.status === 'FINISHED';
    return true;
  });

  const liveCount = matches.filter((m) => m.status === 'LIVE').length;

  const handleTestSimulateGoal = (match: Match) => {
    const isHome = Math.random() > 0.5;
    const scorer = isHome
      ? match.homeTeam.name === 'Arsenal' ? 'Gabriel Martinelli' : 'Vinicius Jr'
      : match.awayTeam.name === 'Chelsea' ? 'Nicolas Jackson' : 'Robert Lewandowski';

    onSimulateGoal(match.id, isHome ? 'home' : 'away', scorer);
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Top Live Center Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-extrabold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>ผลบอลสด &amp; สถิติ xG เรียลไทม์</span>
          </h1>
          <p className="text-xs text-slate-400">
            ระบบอัปเดตโมเมนตัม xG ทุกนาที พร้อมสัญญาณแจ้งเตือนการทำประตูทันที
          </p>
        </div>

        {/* Live counter badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{liveCount} คู่สด</span>
        </div>
      </div>

      {/* Simulator Quick Action Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">ทดสอบระบบแจ้งเตือนประตูสด</div>
              <div className="text-[11px] text-slate-300">
                คลิกจำลองจังหวะยิงประตูเพื่อทดสอบเสียงหวีดสนาม + แตรฉลอง
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              const liveMatch = matches.find((m) => m.status === 'LIVE') || matches[0];
              handleTestSimulateGoal(liveMatch);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition-all active:scale-95 shadow-lg shadow-amber-500/20 shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>จำลองทำประตู!</span>
          </button>
        </div>
      </div>

      {/* Filter Segmented Control */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-medium">
        <button
          onClick={() => setFilter('all')}
          className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
            filter === 'all' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          ทั้งหมด
        </button>
        <button
          onClick={() => setFilter('live')}
          className={`py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
            filter === 'live' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>สด</span>
          {liveCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
            filter === 'upcoming' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          รอแข่ง
        </button>
        <button
          onClick={() => setFilter('finished')}
          className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
            filter === 'finished' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          จบแล้ว
        </button>
      </div>

      {/* Match List */}
      <div className="space-y-3">
        {filteredMatches.map((match) => {
          const isExpanded = expandedMatchId === match.id;
          const isLive = match.status === 'LIVE';

          return (
            <div
              key={match.id}
              className="rounded-2xl bg-[#0f172a] border border-slate-800 overflow-hidden transition-all shadow-md"
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-850 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{match.leagueFlag}</span>
                  <span className="text-xs font-bold text-slate-300">{match.league}</span>
                  <span className="text-[11px] text-slate-500 font-mono">&middot; {match.venue}</span>
                </div>

                <div className="flex items-center gap-2">
                  {isLive ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      LIVE {match.minute}'
                    </span>
                  ) : match.status === 'FINISHED' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400">
                      จบการแข่งขัน
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-950/60 text-sky-400">
                      {match.kickoffTime}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Match Main Strip */}
              <div className="px-4 py-3 bg-slate-900/60 border-t border-slate-800/80">
                <div className="grid grid-cols-12 items-center gap-2">
                  {/* Home Team */}
                  <div className="col-span-5 flex items-center gap-2.5">
                    <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-8 h-8 object-cover rounded-lg bg-slate-800 p-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{match.homeTeam.name}</div>
                      <div className="text-[10px] text-sky-400 font-mono">xG {match.synthesizedXg.home}</div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-2 text-center">
                    {match.homeScore !== undefined ? (
                      <div className="text-xl font-black text-amber-400 font-mono tracking-wider">
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
                    <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-8 h-8 object-cover rounded-lg bg-slate-800 p-0.5 shrink-0" />
                  </div>
                </div>

                {/* Live goal simulation button for testing */}
                {isLive && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {onWatchStream && (
                        <button
                          onClick={() => {
                            soundManager.playTap();
                            onWatchStream(match.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[10px] font-black transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span>📺 ดูถ่ายทอดสดคู่นี้</span>
                        </button>
                      )}
                      <span className="text-[10px] text-slate-400 hidden xs:inline">ต้องการทดสอบเหตุการณ์ยิงประตู?</span>
                    </div>

                    <button
                      onClick={() => handleTestSimulateGoal(match)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <span>⚽ ยิงประตูคู่นี้ (+Goal)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded Detailed Match Stats & Timeline */}
              {isExpanded && (
                <div className="p-4 bg-[#0d1424] border-t border-slate-800/80 space-y-4">
                  {/* Match Stats Comparison */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      สถิติการแข่งขันสด (Live Stats)
                    </div>

                    {/* Possession */}
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                        <span>{match.stats.possession[0]}%</span>
                        <span className="text-slate-400">การครองบอล (Possession)</span>
                        <span>{match.stats.possession[1]}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full flex overflow-hidden">
                        <div className="bg-sky-500" style={{ width: `${match.stats.possession[0]}%` }} />
                        <div className="bg-amber-500" style={{ width: `${match.stats.possession[1]}%` }} />
                      </div>
                    </div>

                    {/* Shots & Dangerous Attacks */}
                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                      <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400">โอกาสยิงทั้งหมด</div>
                        <div className="text-xs font-mono font-bold text-white mt-0.5">
                          {match.stats.shots[0]} - {match.stats.shots[1]}
                        </div>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400">ยิงตรงกรอบ</div>
                        <div className="text-xs font-mono font-bold text-sky-400 mt-0.5">
                          {match.stats.shotsOnTarget[0]} - {match.stats.shotsOnTarget[1]}
                        </div>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400">บุกอันตราย</div>
                        <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                          {match.stats.dangerousAttacks[0]} - {match.stats.dangerousAttacks[1]}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Match Event Timeline */}
                  {match.events.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        ลำดับเหตุการณ์สำคัญ (Match Events)
                      </div>
                      <div className="space-y-1.5">
                        {match.events.map((ev) => (
                          <div
                            key={ev.id}
                            className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                              ev.type === 'GOAL'
                                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sky-400 text-[11px] min-w-[24px]">
                                {ev.minute}'
                              </span>
                              <span className="text-sm">
                                {ev.type === 'GOAL' ? '⚽' : ev.type === 'YELLOW' ? '🟨' : '🔄'}
                              </span>
                              <span className="font-semibold">{ev.player}</span>
                              {ev.detail && <span className="text-[10px] text-slate-400 hidden sm:inline">&middot; {ev.detail}</span>}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              {ev.team === 'home' ? match.homeTeam.shortName : match.awayTeam.shortName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deep AI analysis link */}
                  <button
                    onClick={() => onSelectMatch(match)}
                    className="w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-sky-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                  >
                    <span>วิเคราะห์ตารางพยากรณ์ Correct Score 5x5 เต็มรูปแบบ</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
