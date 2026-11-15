import React, { useState } from 'react';
import { BetSlipItem } from '../types/soccer';
import { ReceiptText, Trash2, Copy, Check, ExternalLink, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface BetSlipViewProps {
  items: BetSlipItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onUpdateStake: (id: string, stake: number) => void;
}

export const BetSlipView: React.FC<BetSlipViewProps> = ({
  items,
  onRemoveItem,
  onClearAll,
  onUpdateStake,
}) => {
  const [betTypeMode, setBetTypeMode] = useState<'single' | 'accumulator'>('accumulator');
  const [globalStake, setGlobalStake] = useState<number>(500);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [bookingCode, setBookingCode] = useState<string>('1X-K872F');

  // Compute total odds for accumulator
  const totalAccumulatorOdds = items.reduce((acc, item) => acc * item.odds, 1);
  const totalSingleStake = items.reduce((acc, item) => acc + item.stake, 0);
  const totalSingleReturn = items.reduce((acc, item) => acc + item.potentialReturn, 0);

  const accumulatorPotentialReturn = Math.round(globalStake * totalAccumulatorOdds);

  const handleGenerateNewCode = () => {
    soundManager.playTap();
    const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '1X-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setBookingCode(code);
    setCopiedCode(false);
  };

  const handleCopyCode = () => {
    soundManager.playTap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(bookingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const quickStakes = [100, 300, 500, 1000, 2000];

  return (
    <div className="p-4 space-y-4 pb-28">
      {/* 1xBet Branding Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0c2340] via-[#0f3460] to-[#0c2340] border border-blue-500/40 p-4 shadow-xl shadow-blue-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-black text-sm tracking-tighter shadow-md">
              1xBet
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>จัดการบิลเดิมพันสถิติ (Bet Slip Simulator)</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-400 text-slate-950">
                  Odds Pro
                </span>
              </div>
              <div className="text-[11px] text-blue-200">
                รองรับรูปแบบราคา 1xBet ทั้งบอลเต็งเดี่ยว และ บอลสเต็ปมิกซ์พาเลย์
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างทั้งหมด</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-850 flex items-center justify-center text-slate-500 mx-auto border border-slate-750">
            <ReceiptText className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">ยังไม่มีรายการในบิล 1xBet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              เลือกสกอร์ที่ผ่านการ Calibrate ในหน้า "สกอร์แม่นยำ" หรือ "แล็บ xG" เพื่อเพิ่มลงบิล
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Slip Type Toggle (Single vs Accumulator) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setBetTypeMode('accumulator')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                betTypeMode === 'accumulator'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              บอลสเต็ป / มิกซ์พาเลย์ ({items.length} คู่)
            </button>
            <button
              onClick={() => setBetTypeMode('single')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                betTypeMode === 'single'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              บอลเดี่ยวแยกคู่
            </button>
          </div>

          {/* Selected Items List */}
          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[#0f172a] border border-slate-800 p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] text-slate-400">{item.league}</div>
                    <div className="text-xs font-bold text-white mt-0.5">{item.matchTitle}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-black text-amber-400 font-mono">
                        {item.selection}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-500/20 text-sky-400 font-mono">
                        @{item.odds}
                      </span>
                      {item.isValueBet && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          +EV Value
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      soundManager.playTap();
                      onRemoveItem(item.id);
                    }}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-850 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Single bet individual stake editor */}
                {betTypeMode === 'single' && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">เงินเดิมพัน (THB):</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="50"
                        step="50"
                        value={item.stake}
                        onChange={(e) => onUpdateStake(item.id, parseFloat(e.target.value) || 0)}
                        className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs font-mono text-white"
                      />
                      <span className="text-emerald-400 font-mono font-bold">
                        ได้ ~฿{item.potentialReturn.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Accumulator Summary Box */}
          {betTypeMode === 'accumulator' && (
            <div className="rounded-2xl bg-gradient-to-br from-[#101b33] via-slate-900 to-[#101b33] border border-sky-500/30 p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold">อัตราราคาค่าน้ำรวมสเต็ป 1xBet:</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  @{totalAccumulatorOdds.toFixed(2)} เท่า
                </span>
              </div>

              {/* Stake input */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>เงินเดิมพัน (บาท THB)</span>
                  <span className="font-mono font-bold text-white">฿{globalStake.toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={globalStake}
                  onChange={(e) => setGlobalStake(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none"
                />

                {/* Quick stake pills */}
                <div className="flex gap-1.5 pt-1 overflow-x-auto">
                  {quickStakes.map((stk) => (
                    <button
                      key={stk}
                      onClick={() => {
                        soundManager.playTap();
                        setGlobalStake(stk);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-[11px] font-mono text-slate-300 font-semibold cursor-pointer"
                    >
                      +{stk}
                    </button>
                  ))}
                </div>
              </div>

              {/* Potential return highlight */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">
                    ผลกำไรที่คาดว่าจะได้รับ (1xBet Payout)
                  </div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                    ฿{accumulatorPotentialReturn.toLocaleString()}
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-300">
                  +{((totalAccumulatorOdds - 1) * 100).toFixed(0)}% ROI
                </span>
              </div>
            </div>
          )}

          {/* 1xBet Coupon Code Generator */}
          <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>รหัสคูปอง 1xBet (Booking Code)</span>
                  <span className="text-[10px] text-sky-400 font-mono">พร้อมใช้งาน</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  นำรหัสนี้ไปวางในช่องโหลดคูปองบนหน้าเว็บหรือแอป 1xBet เพื่อดึงรายการทันที
                </div>
              </div>

              <button
                onClick={handleGenerateNewCode}
                className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                สุ่มรหัสใหม่
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 font-mono font-black text-amber-400 text-sm tracking-widest text-center select-all">
                {bookingCode}
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all active:scale-95 shadow-md shadow-sky-500/20 cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-950" />
                    <span>คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>คัดลอกรหัส</span>
                  </>
                )}
              </button>
            </div>

            {/* Crucial distinction tip */}
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
              💡 <strong>ข้อแตกต่างที่ต้องรู้:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                <li><strong className="text-sky-300">รหัสจองคูปอง ({bookingCode})</strong> &rarr; ใส่ในเมนู <strong>"ดาวน์โหลดคูปอง"</strong> ในหน้าบิลเดิมพันเพื่อโหลดคู่บอล</li>
                <li><strong className="text-amber-300">รหัสโปรโมชั่น (SCORE95)</strong> &rarr; ใส่ในหน้า <strong>"สมัครสมาชิก / ฝากเงิน"</strong> เพื่อรับโบนัส 130%</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
