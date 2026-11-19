import React, { useMemo, useState } from 'react';
import {
  computeStrategyBacktest,
  MarketStrategyId,
  StrategySummary,
  TimeframeWindow,
} from '../data/marketBacktest';
import { BarChart3, TrendingUp, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface MarketStrategyAnalyticsProps {
  onJumpToTodayPick?: () => void;
}

const TIMEFRAME_OPTIONS: { id: TimeframeWindow; label: string; sub: string }[] = [
  { id: '30d', label: '1 เดือนเต็ม (31 นัด)', sub: '19 ต.ค. – 18 พ.ย.' },
  { id: '14d', label: '14 วันล่าสุด', sub: '5 พ.ย. – 18 พ.ย.' },
  { id: '7d', label: '7 วันล่าสุด', sub: '12 พ.ย. – 18 พ.ย.' },
];

const STAKE_OPTIONS = [50, 100, 300, 500];

const CHART_COLORS: Record<MarketStrategyId, string> = {
  dc: '#10b981',     // emerald-500
  over15: '#22d3ee', // cyan-400
  over25: '#38bdf8', // sky-400
  hdp0: '#f59e0b',   // amber-500
  hdp05: '#a78bfa',  // violet-400
  cs: '#f43f5e',     // rose-500
};

export const MarketStrategyAnalytics: React.FC<MarketStrategyAnalyticsProps> = ({
  onJumpToTodayPick,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeWindow>('30d');
  const [stakePerBet, setStakePerBet] = useState<number>(100);
  const [excludeFixtureError, setExcludeFixtureError] = useState<boolean>(false);
  const [selectedChartIds, setSelectedChartIds] = useState<Set<MarketStrategyId>>(
    () => new Set<MarketStrategyId>(['dc', 'over25', 'hdp0', 'cs'])
  );

  const { rows, summaries } = useMemo(
    () => computeStrategyBacktest(timeframe, stakePerBet, excludeFixtureError),
    [timeframe, stakePerBet, excludeFixtureError]
  );

  const bestHitStrategy = useMemo(
    () => [...summaries].sort((a, b) => b.hitRate - a.hitRate)[0],
    [summaries]
  );

  const bestAlternativeRoi = useMemo(
    () =>
      [...summaries]
        .filter((s) => s.id !== 'cs')
        .sort((a, b) => b.netProfit - a.netProfit)[0],
    [summaries]
  );

  const csSummary = summaries.find((s) => s.id === 'cs')!;
  const dcSummary = summaries.find((s) => s.id === 'dc')!;
  const over25Summary = summaries.find((s) => s.id === 'over25')!;
  const over15Summary = summaries.find((s) => s.id === 'over15')!;
  const hdp0Summary = summaries.find((s) => s.id === 'hdp0')!;
  const hdp05Summary = summaries.find((s) => s.id === 'hdp05')!;

  const toggleChartSeries = (id: MarketStrategyId) => {
    soundManager.playTap();
    setSelectedChartIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Compute SVG chart bounds cleanly across visible series
  const chartBounds = useMemo(() => {
    const activeSeries = summaries.filter((s) => selectedChartIds.has(s.id));
    const allValues = activeSeries.flatMap((s) => s.equityCurve);
    const rawMin = Math.min(0, ...allValues);
    const rawMax = Math.max(0, ...allValues);
    const pad = Math.max(stakePerBet, Math.round((rawMax - rawMin) * 0.12));
    return {
      min: rawMin - pad,
      max: rawMax + pad,
      pointsCount: activeSeries[0]?.equityCurve.length || 2,
      activeSeries,
    };
  }, [summaries, selectedChartIds, stakePerBet]);

  const svgWidth = 640;
  const svgHeight = 200;
  const padX = 12;
  const padY = 14;
  const innerW = svgWidth - padX * 2;
  const innerH = svgHeight - padY * 2;

  const mapX = (idx: number, count: number) =>
    padX + (idx / Math.max(1, count - 1)) * innerW;

  const mapY = (val: number) => {
    const range = Math.max(1, chartBounds.max - chartBounds.min);
    return padY + innerH - ((val - chartBounds.min) / range) * innerH;
  };

  const zeroY = mapY(0);

  const formatBaht = (amount: number) => {
    const prefix = amount > 0 ? '+' : '';
    return `${prefix}${amount.toLocaleString()} ฿`;
  };

  return (
    <div className="p-4 space-y-5 pb-28">
      {/* Header Summary */}
      <section className="rounded-2xl bg-[#0d1424] border border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
              <BarChart3 className="w-4 h-4" />
              <span>BACKTEST &amp; PROBABILITY AUDIT &middot; ข้อมูลจริง 100%</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              เปรียบเทียบโอกาสชนะ: X2 / Handicap / Over Score vs สกอร์ตรงตัว
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              คำนวณจากผลการแข่งขันจริงทุกคู่ในระบบ ({rows.length} นัด) เพื่อหาคำตอบว่าทำไมสกอร์ตรงตัวถึงหลุดติดต่อกัน
              และแนวทางใดให้โอกาสชนะและกำไรสะสมดีที่สุดในรอบ 1 เดือนที่ผ่านมา
            </p>
          </div>

          {onJumpToTodayPick && (
            <button
              onClick={() => {
                soundManager.playTap();
                onJumpToTodayPick();
              }}
              className="self-start shrink-0 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>ดูโพยวันนี้ (ปรับแผนแล้ว)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Interactive Filter Toolbar */}
        <div className="pt-3 border-t border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Timeframe Selector */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {TIMEFRAME_OPTIONS.map((opt) => {
              const active = timeframe === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    soundManager.playTap();
                    setTimeframe(opt.id);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-sky-500 text-slate-950 font-black'
                      : 'text-slate-300 hover:bg-slate-900 font-semibold'
                  }`}
                >
                  <div className="text-[11px] leading-tight">{opt.label}</div>
                  <div className={`text-[10px] font-mono ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                    {opt.sub}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stake Size + Fixture Error Toggle */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">จำลองเงินทุน/คู่:</span>
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                {STAKE_OPTIONS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      soundManager.playTap();
                      setStakePerBet(amt);
                    }}
                    className={`px-2 py-1 rounded-md font-mono tabular-nums text-[11px] transition-colors cursor-pointer ${
                      stakePerBet === amt
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {amt}฿
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excludeFixtureError}
                onChange={(e) => {
                  soundManager.playTap();
                  setExcludeFixtureError(e.target.checked);
                }}
                className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
              />
              <span>ตัดนัด 6 พ.ย. (โปรแกรมคลาดเคลื่อน)</span>
            </label>
          </div>
        </div>

        {/* 3 Primary Insight Takeaways (No clutter pills, crisp tabular numbers) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-1">
            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>โอกาสชนะสูงสุด ({rows.length} นัด)</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-base font-black text-white">{bestHitStrategy.shortName}</span>
              <span className="text-xl font-black font-mono tabular-nums text-emerald-400">
                {bestHitStrategy.hitRate}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tabular-nums">
              ชนะ {bestHitStrategy.wins}/{bestHitStrategy.totalMatches} คู่ &middot; แพ้ติดกันสูงสุด {bestHitStrategy.maxLosingStreak} นัด
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-sky-500/30 space-y-1">
            <div className="text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>ตลาดทางเลือกทำกำไรสูงสุด ({rows.length} นัด)</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-base font-black text-white">{bestAlternativeRoi.shortName}</span>
              <span
                className={`text-xl font-black font-mono tabular-nums ${
                  bestAlternativeRoi.netProfit >= 0 ? 'text-sky-400' : 'text-rose-400'
                }`}
              >
                {formatBaht(bestAlternativeRoi.netProfit)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tabular-nums">
              ROI {bestAlternativeRoi.roiPct > 0 ? `+${bestAlternativeRoi.roiPct}%` : `${bestAlternativeRoi.roiPct}%`} &middot; เข้าเป้า {bestAlternativeRoi.wins}/{bestAlternativeRoi.totalMatches} ({bestAlternativeRoi.hitRate}%)
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-500/30 space-y-1">
            <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>เทียบแนวทางเดิม (Correct Score)</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-base font-black text-white">สกอร์ตรงตัว</span>
              <span
                className={`text-xl font-black font-mono tabular-nums ${
                  csSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatBaht(csSummary.netProfit)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tabular-nums">
              เข้า {csSummary.wins}/{csSummary.totalMatches} ({csSummary.hitRate}%) &middot; แตกติดกันสูงสุด {csSummary.maxLosingStreak} นัด
            </p>
          </div>
        </div>
      </section>

      {/* Main Comparison Matrix Table */}
      <section className="rounded-2xl bg-[#0d1424] border border-slate-800 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-extrabold text-white">
              ตารางเปรียบเทียบความน่าจะเป็นและผลตอบแทน (ทุกรูปแบบตลาด)
            </h2>
            <p className="text-[11px] text-slate-400">
              เดิมพันสม่ำเสมอคู่ละ {stakePerBet.toLocaleString()} บาท (Flat Stake) รวม {rows.length} นัด
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold">
                <th className="py-2.5 pr-3">แนวทาง / ตลาด</th>
                <th className="py-2.5 px-2 text-right">ความแม่นยำ</th>
                <th className="py-2.5 px-2 text-right">ชนะ-คืน-แพ้</th>
                <th className="py-2.5 px-2 text-right">ค่าน้ำเฉลี่ย</th>
                <th className="py-2.5 px-2 text-right">แพ้ติดสูงสุด</th>
                <th className="py-2.5 pl-2 text-right">กำไร / ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {summaries.map((s: StrategySummary) => {
                const isProfit = s.netProfit > 0;
                const isBest = s.id === bestAlternativeRoi.id || s.id === bestHitStrategy.id;
                return (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      s.id === 'cs' ? 'bg-rose-950/15' : isBest ? 'bg-emerald-950/15' : 'hover:bg-slate-900/50'
                    }`}
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: CHART_COLORS[s.id] }}
                        />
                        <div>
                          <div className="font-bold text-white">{s.shortName} &middot; {s.marketLabel}</div>
                          <div className="text-[10px] text-slate-400">{s.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums">
                      <span
                        className={`font-black ${
                          s.hitRate >= 75
                            ? 'text-emerald-400'
                            : s.hitRate >= 58
                            ? 'text-sky-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {s.hitRate}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-300">
                      {s.wins}-{s.pushes}-{s.losses}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums text-amber-400">
                      @{s.avgOdds.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums">
                      <span className={s.maxLosingStreak >= 6 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {s.maxLosingStreak} นัด
                      </span>
                    </td>
                    <td className="py-3 pl-2 text-right font-mono tabular-nums">
                      <div className={`font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatBaht(s.netProfit)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ROI {s.roiPct > 0 ? `+${s.roiPct}%` : `${s.roiPct}%`}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cumulative P&L Trajectory SVG Chart */}
      <section className="rounded-2xl bg-[#0d1424] border border-slate-800 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-white">
              กราฟเปรียบเทียบพอร์ตกำไรสะสม (Cumulative P&amp;L)
            </h2>
            <p className="text-[11px] text-slate-400">
              กดเลือก/ซ่อนเส้นตลาดด้านขวาเพื่อเปรียบเทียบความนิ่งของกราฟเงินทุน
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {summaries.map((s) => {
              const active = selectedChartIds.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleChartSeries(s.id)}
                  className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 border-slate-600 text-white'
                      : 'bg-slate-950 border-slate-800/80 text-slate-500'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: active ? CHART_COLORS[s.id] : '#475569' }}
                  />
                  <span>{s.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-xl bg-slate-950/90 border border-slate-800 p-2 sm:p-3">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-44 sm:h-52 overflow-visible"
            role="img"
            aria-label="กราฟเปรียบเทียบกำไรสะสมแต่ละแนวทาง"
          >
            {/* Zero break-even line */}
            <line
              x1={padX}
              y1={zeroY}
              x2={svgWidth - padX}
              y2={zeroY}
              stroke="#475569"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text
              x={padX + 2}
              y={zeroY - 5}
              fill="#94a3b8"
              fontSize="10"
              fontFamily="monospace"
            >
              ทุนเดิม 0 ฿
            </text>

            {/* Series paths */}
            {chartBounds.activeSeries.map((s) => {
              const pts = s.equityCurve
                .map((val, i) => `${mapX(i, s.equityCurve.length).toFixed(1)},${mapY(val).toFixed(1)}`)
                .join(' ');
              const lastVal = s.equityCurve[s.equityCurve.length - 1] || 0;
              const lastX = mapX(s.equityCurve.length - 1, s.equityCurve.length);
              const lastY = mapY(lastVal);

              return (
                <g key={s.id}>
                  <polyline
                    fill="none"
                    stroke={CHART_COLORS[s.id]}
                    strokeWidth={s.id === 'dc' || s.id === 'over25' || s.id === 'cs' ? 2.4 : 1.7}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={pts}
                  />
                  <circle
                    cx={lastX}
                    cy={lastY}
                    r={3.5}
                    fill={CHART_COLORS[s.id]}
                  />
                </g>
              );
            })}
          </svg>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 px-1">
            <span>เริ่มต้น ({rows[rows.length - 1]?.dateLabel || '-'})</span>
            <span>ล่าสุด ({rows[0]?.dateLabel || '-'})</span>
          </div>
        </div>
      </section>

      {/* Strategic Guidance Card (Direct Answer for User!) */}
      <section className="rounded-2xl bg-[#0d1424] border border-amber-500/30 p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-extrabold text-amber-300">
          สรุปคำแนะนำ: ถ้าจะเปลี่ยนแนวทางเล่น ควรเลือกแบบไหนดีที่สุด?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="font-bold text-amber-400">1. สายกำไรสม่ำเสมอ 1 เดือน: HDP -0.5 / HDP 0</div>
            <p className="text-slate-300 leading-relaxed">
              ตลอด {rows.length} นัด <strong className="text-white">HDP -0.5 (ชนะเต็ม)</strong> ทำกำไรดีสุด{' '}
              <strong className="text-emerald-400 font-mono">{formatBaht(hdp05Summary.netProfit)}</strong>{' '}
              (ROI {hdp05Summary.roiPct > 0 ? `+${hdp05Summary.roiPct}%` : `${hdp05Summary.roiPct}%`} &middot; เข้า {hdp05Summary.hitRate}%)
              ส่วน <strong className="text-white">HDP 0 (เสมอคืนทุน)</strong> ได้{' '}
              <strong className="text-white font-mono">{formatBaht(hdp0Summary.netProfit)}</strong> (แพ้ติดสุดแค่ {hdp0Summary.maxLosingStreak} นัด)
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="font-bold text-sky-400">2. สายยิงมันส์แก้ทางสกอร์พัง: Over 1.5 / Over 2.5</div>
            <p className="text-slate-300 leading-relaxed">
              <strong className="text-white">Over 1.5</strong> เข้า <strong className="text-emerald-400 font-mono">{over15Summary.hitRate}%</strong> ({formatBaht(over15Summary.netProfit)})
              ส่วน <strong className="text-white">Over 2.5</strong> เข้า <strong className="text-white font-mono">{over25Summary.hitRate}%</strong> ({formatBaht(over25Summary.netProfit)})
              — ช่วง 7 วันหลังสุดที่สกอร์ตรงตายเรียบ <strong className="text-sky-300">Over 2.5 เข้า 7/7 (100%)</strong>
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="font-bold text-emerald-400">3. Double Chance (1X / X2): แม่นแต่ค่าน้ำต่ำ</div>
            <p className="text-slate-300 leading-relaxed">
              <strong className="text-white">1X / X2</strong> เข้าเป้าสูงถึง <strong className="text-white font-mono">{dcSummary.hitRate}%</strong> ({dcSummary.wins}/{dcSummary.totalMatches})
              แพ้ติดสุดแค่ {dcSummary.maxLosingStreak} นัด แต่ค่าน้ำเฉลี่ย @{dcSummary.avgOdds.toFixed(2)} (ต้องแม่น ≥82% ถึงคุ้ม)
              เหมาะนำไปจับ <strong className="text-emerald-300">สเต็ป 2 คู่ร่วมกับ Over 1.5</strong> หรือเลือกเฉพาะคู่ค่าน้ำ ≥@1.25
            </p>
          </div>
        </div>
      </section>

      {/* Match-by-Match Audit Log */}
      <section className="rounded-2xl bg-[#0d1424] border border-slate-800 p-4 sm:p-5 space-y-3">
        <div>
          <h2 className="text-sm font-extrabold text-white">
            ตารางตรวจผลรายคู่ย้อนหลัง ({rows.length} นัด)
          </h2>
          <p className="text-[11px] text-slate-400">
            ตรวจสอบได้ทีละนัดว่าผลสกอร์จริงชนะหรือแพ้ในแต่ละตลาด (✅ = ชนะ, ➖ = เสมอคืนทุน, ❌ = เสีย)
          </p>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-left border-collapse min-w-[660px] text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold">
                <th className="py-2 pr-2">วันที่</th>
                <th className="py-2 px-2">คู่แข่งขัน</th>
                <th className="py-2 px-2 text-center">ทาย / จริง</th>
                <th className="py-2 px-2 text-center">1X / X2</th>
                <th className="py-2 px-2 text-center">HDP 0</th>
                <th className="py-2 px-2 text-center">HDP -0.5</th>
                <th className="py-2 px-2 text-center">O 1.5</th>
                <th className="py-2 px-2 text-center">O 2.5</th>
                <th className="py-2 pl-2 text-center">สกอร์ตรง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((r) => {
                const renderCell = (val: 'WIN' | 'LOSS' | 'PUSH') => {
                  if (val === 'WIN') return <span className="text-emerald-400 font-bold">✅</span>;
                  if (val === 'PUSH') return <span className="text-amber-400 font-bold">➖</span>;
                  return <span className="text-rose-400/80">❌</span>;
                };

                return (
                  <tr
                    key={r.id}
                    className={r.fixtureError ? 'bg-amber-950/15' : 'hover:bg-slate-900/40'}
                  >
                    <td className="py-2 pr-2 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {r.dateLabel}
                    </td>
                    <td className="py-2 px-2">
                      <div className="font-semibold text-white truncate max-w-[190px]">
                        {r.matchTitle}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[190px]">
                        {r.league}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center font-mono tabular-nums whitespace-nowrap">
                      <span className="text-slate-400">{r.predictedScore}</span>
                      <span className="text-slate-600 mx-1">&rarr;</span>
                      <span className="font-bold text-white">{r.actualScore}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[10px] font-mono text-slate-500">{r.recommendedDcLabel}</span>
                        {renderCell(r.outcomes.dc)}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">{renderCell(r.outcomes.hdp0)}</td>
                    <td className="py-2 px-2 text-center">{renderCell(r.outcomes.hdp05)}</td>
                    <td className="py-2 px-2 text-center">{renderCell(r.outcomes.over15)}</td>
                    <td className="py-2 px-2 text-center">{renderCell(r.outcomes.over25)}</td>
                    <td className="py-2 pl-2 text-center">{renderCell(r.outcomes.cs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
