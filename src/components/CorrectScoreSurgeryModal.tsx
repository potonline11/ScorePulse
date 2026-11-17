import React from 'react';
import {
  X,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Zap,
  Target,
  BarChart3,
  Flame,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface CorrectScoreSurgeryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecommendedMatch?: () => void;
}

export const CorrectScoreSurgeryModal: React.FC<CorrectScoreSurgeryModalProps> = ({
  isOpen,
  onClose,
  onSelectRecommendedMatch,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-b from-[#0f172a] via-[#111c38] to-[#0b1120] rounded-3xl border-2 border-amber-500/50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>ผ่าตัดระบบ Correct Score v2 (Anti-Blowout)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Surgical v2 Precision Fix
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                ถอดบทเรียนชุดผ่าตัดแรกที่หลุด 5 วันติด (12–16 พ.ย.) & อัปเกรดสู่ระบบ Anti-Blowout + Dual-Shield
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
          {/* Executive Direct Summary */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wide">
              <Target className="w-4 h-4 text-amber-400" />
              <span>ยอมรับความจริง 100%: ทำไม "ผ่าตัดรอบแรก" ถึงหลุดรัวๆ 12–16 พ.ย.?</span>
            </div>
            <p className="text-slate-200 text-xs">
              หลังผ่าตัดรอบแรก (12–16 พ.ย.) ระบบบังคับเลือกคู่ที่ทีมต่อเหนือกว่าขาดลอยและฝืนฟันธงสกอร์ <strong>2-0 เพียงอย่างเดียว</strong> พร้อมตัดแผนเซฟตี้ออก ผลลัพธ์คือทีมต่อหลายคู่ยิงไหลเกินเป้า (เนเธอร์แลนด์ 7-0, สวิตเซอร์แลนด์ 4-0) และบอลทีมชาติมีความผันผวนสูง (โปรตุเกสแพ้ 1-4, อังกฤษ 2-1, ฝรั่งเศส 2-1) จึงอัปเกรดเป็น
              <strong className="text-emerald-300"> โมเดล Surgical v2 (Anti-Blowout + Dual-Shield)</strong>
            </p>
          </div>

          {/* Part 1: Comparison between Early Golden Era vs Surgical v1 Slump */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>1. เปรียบเทียบ: ช่วงทำกำไร VS ช่วงผ่าตัดรอบแรกที่หลุด 5 วันติด</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Early Golden Era */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-black text-xs">
                  <span>🏆 คู่บอลที่เข้าเป้าสกอร์ตรงจริง</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 font-mono">
                    สมดุล xG พอดี
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                    <span>• Villarreal vs Espanyol</span>
                    <strong className="text-emerald-400 font-mono">ฟันธง 2-0 (จบ 2-0 🎯)</strong>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                    <span>• Sunderland vs Chelsea</span>
                    <strong className="text-emerald-400 font-mono">ฟันธง 1-2 (จบ 1-2 🎯)</strong>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                    <span>• Rayo vs Las Palmas</span>
                    <strong className="text-emerald-400 font-mono">ฟันธง 1-0 (จบ 1-0 🎯)</strong>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                    <span>• Wycombe vs Crawley</span>
                    <strong className="text-emerald-400 font-mono">ฟันธง 2-1 (จบ 2-1 🎯)</strong>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-300/90 bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30">
                  <strong>จุดร่วมของคู่ที่เข้า:</strong> ลีกสโมสรที่มีวินัยแท็กติก ส่วนต่าง xG พอเหมาะ (ไม่ไหล 4-0/7-0) และเลือกสกอร์ยืดหยุ่น (1-0, 2-0, 2-1)
                </div>
              </div>

              {/* Surgical v1 Slump */}
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-2">
                <div className="flex items-center justify-between text-rose-400 font-black text-xs">
                  <span>❌ ผ่าตัด v1 (12–16 พ.ย. หลุด 5 วันติด)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 font-mono">
                    ฝืน 2-0 / ยิงไหล
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                    <span>• Netherlands vs Greece</span>
                    <strong className="text-rose-400 font-mono">วาง 2-0 (จบ 7-0 ❌)</strong>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                    <span>• Portugal vs Denmark</span>
                    <strong className="text-rose-400 font-mono">วาง 2-0 (จบ 1-4 ❌)</strong>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                    <span>• France vs Türkiye</span>
                    <strong className="text-rose-400 font-mono">วาง 2-0 (จบ 2-1 ❌)</strong>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex justify-between">
                    <span>• Switzerland vs Scotland</span>
                    <strong className="text-rose-400 font-mono">วาง 2-0 (จบ 4-0 ❌)</strong>
                  </div>
                </div>
                <div className="text-[10px] text-rose-300/90 bg-rose-950/60 p-2 rounded-xl border border-rose-500/30">
                  <strong>สาเหตุที่พัง:</strong> บอลทีมชาติ xG ห่างเกิน 1.3 จนทีมต่อถล่มยิงเกิน 2-0 และตัดแผนคุ้มครองทุน (Win/1X) ออกหมด
                </div>
              </div>
            </div>
          </div>

          {/* Part 2: Three Core Structural Flaws Dissected */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>2. ผ่าตัด 3 สาเหตุรากเหง้า (Root Cause Breakdown)</span>
            </h3>

            <div className="space-y-2.5">
              {/* Flaw 1 */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 inline-flex items-center justify-center font-mono font-black text-[11px]">
                    1
                  </span>
                  <span>กับดัก "บิ๊กแมตช์" และ "ดาร์บี้แมตช์" (High Entropy Matches)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed pl-7">
                  บิ๊กแมตช์อย่าง เชลซี-แมนยู หรือ ลิเวอร์พูล-อาร์เซน่อล เป็นคู่ที่แฟนบอลอยากดูมากที่สุด แต่ในทางคณิตศาสตร์สถิติ เป็นคู่ที่
                  <strong className="text-amber-300"> "ทายสกอร์ตรงตัวได้ยากที่สุดในโลก"</strong> เพราะโค้ชทั้งสองฝั่งแก้เกมตลอดเวลา เกิดความระมัดระวังสูง (ทำให้สกอร์ออก 1-1, 0-0 หรือ 0-1) การเลือกบิ๊กแมตช์มาเป็นโพยเดี่ยวจึงทำให้โอกาสพลาดสูงมาก
                </p>
              </div>

              {/* Flaw 2 */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 inline-flex items-center justify-center font-mono font-black text-[11px]">
                    2
                  </span>
                  <span>กับดักสกอร์ "2-1 และ 1-2" (Symmetrical Variance Multiplier)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed pl-7">
                  สังเกตได้ว่านัดที่หลุดเกือบทั้งหมด ระบบฟันธง <strong>2-1 หรือ 1-2</strong> ซึ่งสกอร์นี้ต้องพึ่งพาเงื่อนไขที่พร้อมกัน 3 ข้อ:
                  ทีมต่อต้องยิง 2, ทีมรองต้องยิง 1, และห้ามยิงเพิ่ม หากทีมรองยิงไม่ได้ กลายเป็น 2-0 เราก็เสียบิล หรือถ้าทีมต่อเจาะไม่เข้าจบ 1-1 เราก็เสียบิล สกอร์ 2-1 มีความเปราะบางสูงมากในการเล่นบิลเดี่ยว
                </p>
              </div>

              {/* Flaw 3 */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 inline-flex items-center justify-center font-mono font-black text-[11px]">
                    3
                  </span>
                  <span>ขาดตัวกรองความหนาแน่นความน่าจะเป็น (Poisson Probability Peak Filter)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed pl-7">
                  คู่บอลบางคู่ ความน่าจะเป็นของสกอร์เต็ง 1 อยู่ที่แค่ 10-12% (กระจายแบนราบ) ซึ่งหมายความว่าโอกาสเสียบิลสูงถึง 88-90% แต่ระบบยังปล่อยออกมา การจะแทง Correct Score ให้เข้าเป้า สกอร์เต็ง 1 ต้องมี
                  <strong className="text-emerald-300"> จุดยอดความน่าจะเป็นเดี่ยว (Poisson Peak) เกิน 18-20% ขึ้นไปเท่านั้น</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Part 3: The 4 Surgical v2 Solutions */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>3. กฎเหล็กผ่าตัดรอบ 2 (Surgical v2 — Anti-Blowout &amp; Dual-Shield)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. Anti-Blowout Filter (คุมช่องว่าง xG &le; 1.15)</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  แบนคู่ที่ทีมต่อเหนือกว่ามากเกินไป (xG Diff &gt; 1.15) เพื่อป้องกันเกมถล่ม 4-0 หรือ 7-0 และคัดเฉพาะคู่ที่มีส่วนต่าง xG 0.60–1.15 เท่านั้น
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2. เลือกสกอร์ยืดหยุ่น (1-0 / 2-0 / 2-1)</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  เลิกฝืนล็อกสกอร์ <strong>2-0</strong> เพียงแบบเดียว ให้โมเดลเลือก <strong>1-0</strong> เมื่อคาดการณ์เกมรับแน่น และ <strong>2-0</strong> เมื่อสมดุล xG เหมาะสม
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3. เปิดแผนเซฟตี้ Dual-Shield กลับมาช่วยพอร์ต</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  ทุกโพยต้องแนบแผนประกันความเสี่ยง (เช่น <strong>1X, Under 2.5, หรือ Win เต็มเวลา</strong>) เพราะตลอด 4 วันที่ผ่านมา ทีมต่อชนะจริง 3 จาก 4 คู่
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>4. ล็อกโปรแกรมจริงรายวันไม่ซ้ำคู่เมื่อวาน</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  บังคับตรวจสอบตารางแข่งจริงรายวัน (ห้ามซ้ำคู่เมื่อวานเด็ดขาด) พร้อมระบบ Cron Timeout &lt; 5 วินาทีเพื่อให้ Telegram 06:30 น. ยิงตรงเวลาทุกวัน
                </p>
              </div>
            </div>
          </div>

          {/* Real Example Tonights Match */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 to-slate-900 border border-sky-500/40 space-y-2">
            <div className="flex items-center justify-between text-sky-400 font-black text-xs">
              <span className="flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                <span>ตัวอย่างโพยแรกของระบบ Surgical v2 (คืนอังคาร 17 พ.ย. 02:45 น.)</span>
              </span>
              <span className="font-mono text-amber-400 font-black">บอสเนีย vs โรมาเนีย</span>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed">
              คู่คืนนี้เข้าเกณฑ์ Anti-Blowout v2 สมบูรณ์: บอสเนีย (xG 1.48) พบ โรมาเนีย (xG 0.78) ส่วนต่าง 0.70 ไม่ไหลเป็นสกอร์ถล่ม
              Poisson Peak อยู่ที่ <strong>1-0 (18.8%) ค่าน้ำ @6.40</strong> สลิป № 89998111717 พร้อมแผนคุ้มครองทุน <strong>Under 2.5 (@1.62) / 1X</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>อัปเกรดอัลกอริทึมเป็น Surgical v2 (Anti-Blowout + Dual-Shield) แล้ว</span>
          </div>

          <button
            onClick={() => {
              soundManager.playTap();
              onClose();
              if (onSelectRecommendedMatch) {
                onSelectRecommendedMatch();
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <span>ดูโพยคืนนี้ (บอสเนีย vs โรมาเนีย 1-0 @6.40)</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
