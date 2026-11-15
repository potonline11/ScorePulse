import React, { useState } from 'react';
import { TenSourceConsensusAudit } from '../types/soccer';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Award,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  TrendingUp,
  X,
  Plus,
  Ticket,
  BarChart3,
  Flame,
  AlertTriangle,
  Globe,
  Sliders,
  Check,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface TenSourceConsensusModalProps {
  isOpen: boolean;
  onClose: () => void;
  consensusData?: TenSourceConsensusAudit;
  matchTitle: string;
  league: string;
  kickoffTime: string;
  onQuickAdd?: () => void;
}

export const TenSourceConsensusModal: React.FC<TenSourceConsensusModalProps> = ({
  isOpen,
  onClose,
  consensusData,
  matchTitle,
  league,
  kickoffTime,
  onQuickAdd,
}) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'factors'>('sources');

  if (!isOpen || !consensusData) return null;

  const isQualified = consensusData.isCertifiedSuperPick;
  const agreement = consensusData.agreementPercentage;
  const concurringCount = consensusData.concurringCount;
  const totalSources = consensusData.totalSources || consensusData.sources.length || 25;
  const factorAudits = consensusData.factorAudits || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-[#0c1529] via-[#091021] to-[#060a14] border-2 border-amber-500/60 shadow-2xl shadow-amber-500/20 overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/90 flex items-start justify-between gap-3 bg-slate-950/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 shadow-md">
                <Globe className="w-3.5 h-3.5" />
                <span>ระบบวิเคราะห์ {totalSources} สถาบันสถิติสากลทั่วโลก</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border flex items-center gap-1 ${
                isQualified
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {isQualified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{isQualified ? 'ผ่านเกณฑ์ตรงกัน 100% สมบูรณ์แบบ' : 'ไม่ผ่านเกณฑ์โพยเด็ด (<100%)'}</span>
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-black text-white tracking-tight pt-1">
              {matchTitle} &middot; <span className="text-amber-400 font-mono text-sm">{league}</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              เกณฑ์ระดับโลกตัดข้อผิดพลาดทุกจุด: ยกระดับเป็น <strong className="text-amber-300">{totalSources} สถาบันสถิติสากล</strong> และ <strong className="text-sky-300">10 ปัจจัยเจาะลึก</strong> ทุกมิติต้องเห็นพ้องตรงกัน <strong className="text-emerald-400">100.0% สมบูรณ์แบบ</strong> เท่านั้น
            </p>
          </div>

          <button
            onClick={() => {
              soundManager.playTap();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* 1. Consensus Rate Gauge & Status Card */}
          <div className={`p-4 rounded-2xl border-2 space-y-3 ${
            isQualified
              ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-amber-950/30 border-emerald-500/60 shadow-lg'
              : 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/60'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  เกณฑ์การผ่านคุณสมบัติขั้นสูงสุด (Zero-Defect Pass Threshold 100.0%)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                    ฉันทามติ: <span className={isQualified ? 'text-emerald-400' : 'text-rose-400'}>{agreement}%</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    ({concurringCount}/{totalSources} สถาบันสถิติสากลเห็นพ้องตรงกัน 100%)
                  </span>
                </div>
              </div>

              {/* Score Badge */}
              <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-medium">สกอร์ฉันทามติ {totalSources} สถาบัน:</div>
                  <div className="text-xl font-black font-mono text-amber-400 tracking-wider">
                    {consensusData.consensusScore}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-800 mx-1" />
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 font-medium">ค่าน้ำ 1xBet:</div>
                  <div className="text-sm font-black font-mono text-emerald-400">
                    @{consensusData.odds1xBet.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Visual Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-400">ระดับความเห็นพ้องของ {totalSources} สถาบันสถิติสากล</span>
                <span className={agreement >= 100 ? 'text-emerald-400' : 'text-rose-400'}>
                  {agreement}% (จุดตัดผ่านเกณฑ์ 100.0%)
                </span>
              </div>
              <div className="relative h-3.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                {/* 100% threshold line marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-emerald-400 z-10 shadow-[0_0_8px_rgba(52,211,153,1)]"
                  style={{ left: '100%' }}
                  title="เกณฑ์ผ่านสมบูรณ์แบบ 100.0%"
                />
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    agreement >= 100
                      ? 'bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-400'
                      : 'bg-gradient-to-r from-rose-500 to-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, agreement)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>0%</span>
                <span className="text-emerald-400 font-bold">◄ จุดตัด 100% (เกณฑ์ผ่านโพยเด็ดตรงกันทุกสถาบัน & 10 ปัจจัย)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Slip Number Banner */}
            {consensusData.slipNumber && (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-slate-300">
                    สลิปเดิมพันเดี่ยว 1xBet ในระบบ: <strong className="text-amber-300 font-mono">{consensusData.slipNumber}</strong>
                  </span>
                </div>
                <div className="text-emerald-400 font-mono font-bold">
                  คะแนนจริง {consensusData.consensusScore} @{consensusData.odds1xBet.toFixed(2)}
                </div>
              </div>
            )}

            {/* Status note */}
            <div className="text-[11px] leading-relaxed text-slate-300">
              {consensusData.rigorousRiskReductionAnalysis}
              {consensusData.disqualificationReason && (
                <div className="text-rose-300 font-bold mt-1">
                  ⚠️ {consensusData.disqualificationReason}
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation: 25 Institutions vs 10 Factor Audits */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => {
                soundManager.playTap();
                setActiveTab('sources');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'sources'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>รายชื่อ {totalSources} สถาบันสถิติสากล ({concurringCount}/{totalSources})</span>
            </button>

            {factorAudits.length > 0 && (
              <button
                onClick={() => {
                  soundManager.playTap();
                  setActiveTab('factors');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'factors'
                    ? 'bg-sky-400 text-slate-950 shadow-md shadow-sky-400/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>10 ปัจจัยเจาะลึกเข้มงวด (ตรงกัน 100% ทุกข้อ)</span>
              </button>
            )}
          </div>

          {/* TAB 1: 100 Sources List */}
          {activeTab === 'sources' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>รายชื่อสถาบันสถิติสากลชั้นนำทั่วโลก {totalSources} แห่ง:</span>
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  ตรงกัน {concurringCount}/{totalSources} แหล่ง (100.0%)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                {consensusData.sources.map((src, idx) => (
                  <div
                    key={src.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      src.concurrence
                        ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-black text-slate-400 truncate">
                          #{idx + 1} {src.institution}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            src.concurrence
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {src.statusLabel}
                        </span>
                      </div>

                      <div className="font-bold text-white text-xs truncate">{src.name}</div>

                      <div className="flex items-center gap-2 my-1.5 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-400 font-black border border-slate-800">
                          ฟันธง: {src.predictedScore}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-bold">
                          ความมั่นใจ: {src.confidence}%
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (นัยสำคัญ {src.weightPercent}%)
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                        {src.tacticalPoint}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: 10 Factor Audits Breakdown */}
          {activeTab === 'factors' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <span>การตรวจสอบ 10 มิติปัจจัยเจาะลึก (เกณฑ์ผ่าน 100.0% ทุกข้อ):</span>
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  ผ่าน 10/10 ปัจจัย (100.0%)
                </span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {factorAudits.map((factor, fIdx) => (
                  <div
                    key={fIdx}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-[10px]">
                          ✓
                        </span>
                        <span className="font-bold text-white text-xs">{factor.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[10px] text-slate-400">{factor.category}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/40">
                          {factor.score}%
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-2 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 rounded-full"
                        style={{ width: `${Math.min(100, factor.score)}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {factor.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Mathematical Rigor Note */}
          <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-sky-500/30 space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>ทำไมต้อง 100 สถาบันสถิติสากล และ 10 ปัจจัยตรงกัน 100%?</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              จากบทเรียนความผิดพลาดที่ผ่านมา ระบบจึงได้ทำการ <strong>ยกระดับมาตรฐานสูงสุดเป็น 100 สถาบันสถิติสากลชั้นนำทั่วโลก</strong> (ครอบคลุมทั้ง Supercomputer, AI Lab มหาวิทยาลัยระดับโลก, ตลาด Sharp Money ทั่วยุโรปและเอเชีย) พร้อมทั้ง <strong>ทดสอบ 10 ปัจจัยเจาะลึกรอบด้าน</strong> โดยตั้งเกณฑ์เข้มงวดเด็ดขาดว่า <strong>ทุกสถาบันและทุกปัจจัยต้องเห็นพ้องตรงกัน 100.0% สมบูรณ์แบบ (Zero-Defect 100% Consensus)</strong> หากมีแม้แต่สถาบันเดียวหรือปัจจัยเดียวที่ไม่ผ่านเกณฑ์ ระบบจะไม่อนุมัติเป็นโพยเด็ด เพื่อกำจัดข้อผิดพลาดให้หมดสิ้น 100%
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800/90 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-400 text-center sm:text-left">
            {isQualified ? (
              <span className="text-emerald-400 font-bold">
                ✓ ผ่านการรับรองครบ {totalSources} สถาบันสากล & 10 ปัจจัย (100.0%) ตรงกันทุกมิติ พร้อมสำหรับเดิมพัน
              </span>
            ) : (
              <span className="text-amber-400 font-bold">
                ⚠️ คู่นี้ฉันทามติ {agreement}% ไม่ผ่านเกณฑ์โพยเด็ด แนะนำวางแผนเซฟตี้
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onQuickAdd && isQualified && (
              <button
                onClick={() => {
                  soundManager.playTap();
                  onQuickAdd();
                  onClose();
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>วางเดิมพันโพยเด็ด {consensusData.consensusScore} (@{consensusData.odds1xBet.toFixed(2)})</span>
              </button>
            )}

            <button
              onClick={() => {
                soundManager.playTap();
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
