import React from 'react';
import { X, Clock, RefreshCw, CheckCircle2, Zap, ShieldCheck, Database, Calendar, Bell } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface DailyUpdateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnableNotification?: () => void;
  notificationEnabled?: boolean;
}

export const DailyUpdateScheduleModal: React.FC<DailyUpdateScheduleModalProps> = ({
  isOpen,
  onClose,
  onEnableNotification,
  notificationEnabled = false,
}) => {
  if (!isOpen) return null;

  const scheduleRounds = [
    {
      time: '06:00 น. - 07:00 น.',
      title: 'รอบที่ 1: ตัดรอบผลบอล & ปล่อยโพยวันใหม่อัตโนมัติ',
      tag: 'Morning Release & Settlement',
      tagColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      icon: RefreshCw,
      details: [
        'ดึงผลสกอร์จริงและค่า Final xG หลังบอลยุโรปรอบดึกเตะจบ (04:45 น.)',
        'ระบบ Settle อัปเดตผลโพยเข้าตารางสถิติย้อนหลัง 7 วัน (Track Record) ทันที',
        'รันโมเดล Dixon-Coles + Monte Carlo 10,000 นัด คัดคู่ที่มี Consensus เกิน 95% ของวันใหม่',
        'ปล่อยโพยเต็ง 1 ตัวตรงพร้อมรหัสจองคูปอง 1xBet ประจำวันใหม่',
      ],
      isPrimary: true,
    },
    {
      time: '14:00 น. - 15:00 น.',
      title: 'รอบที่ 2: ปรับสมดุลค่าน้ำ (+EV Odds Calibration)',
      tag: 'Midday Recalibration',
      tagColor: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
      icon: Zap,
      details: [
        'ดึงค่าน้ำล่าสุดของ 1xBet (Asian Handicap & Correct Score Markets)',
        'คำนวณส่วนต่างกำไร (+Expected Value) ใหม่เพื่อตรวจสอบว่ายังคุ้มค่าน่าลงทุน',
        'ทำ Platt Calibration ซ้ำหากค่าน้ำมีการขยับ ควบคุม Error ไม่เกิน 5%',
      ],
      isPrimary: false,
    },
    {
      time: '20:00 น. - 21:00 น.',
      title: 'รอบที่ 3: ล็อกโพยสุดท้ายหลังยืนยัน 11 ตัวจริง (Final Lock)',
      tag: 'Lineups Confirmed & Final Lock',
      tagColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      icon: ShieldCheck,
      details: [
        'ตรวจสอบรายชื่อ 11 ตัวจริง (Official Starting XI) ของทั้งสองทีม',
        'ประเมินตัวเจ็บ/แบนกะทันหัน ปรับแก้ xG ตัวผู้เล่นรายบุคคล',
        'ล็อกรหัสจองคูปอง 1xBet (Booking Code) ให้สมาชิกกดแทงได้ทันทีโดยไม่ต้องรอ',
      ],
      isPrimary: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#131d33] via-[#0b1222] to-slate-950 border-2 border-sky-500/50 p-5 shadow-2xl shadow-sky-500/20 text-white max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playTap();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-1.5">
              <span>ตารางเวลาอัปเดตโพยประจำวัน</span>
            </h2>
            <p className="text-xs text-sky-400 font-medium">
              ระบบวิเคราะห์ AI + Data Calibration และการตัดรอบอัตโนมัติ
            </p>
          </div>
        </div>

        {/* Brief Summary Box */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed mb-4">
          <p>
            📌 <strong>คำตอบสั้นๆ:</strong> โพยคู่ใหม่ของแต่ละวันจะ <strong className="text-amber-300">อัปเดตอัตโนมัติทุกเช้าเวลา 06:00 น.</strong> ทันทีหลังจากบอลลีกยุโรปรอบดึกเตะจบและระบบ Settle สรุปผลเรียบร้อย และจะมีการรีเช็กค่าน้ำตอน 14:00 น. ก่อนจะล็อก 11 ตัวจริงตอน 20:00 น. ครับ
          </p>
        </div>

        {/* Timeline Rounds */}
        <div className="space-y-3.5">
          {scheduleRounds.map((round, idx) => {
            const Icon = round.icon;
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all ${
                  round.isPrimary
                    ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/30 border-emerald-500/50 shadow-md'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-sky-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-sm text-white font-mono">{round.time}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${round.tagColor}`}>
                    {round.tag}
                  </span>
                </div>

                <div className="text-xs font-bold text-amber-300 mb-2">
                  {round.title}
                </div>

                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  {round.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Multi-Source Pipeline Info */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-300 text-xs">
            <Database className="w-4 h-4 text-sky-400" />
            <span>กระบวนการอัตโนมัติ 4 สถาบัน (Multi-Source Pipeline)</span>
          </div>
          <p>
            Opta & FBref ส่งข้อมูลสถิติ &rarr; Dixon-Coles โมเดลกระจายความน่าจะเป็น Poisson 10,000 จำลอง &rarr; Platt Calibrator ลดค่าความผิดพลาดเหลือ &le; 1.9% &rarr; เปรียบเทียบค่าน้ำ 1xBet และสร้างรหัสจองคูปองทันที
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          {onEnableNotification && (
            <button
              onClick={() => {
                soundManager.playTap();
                onEnableNotification();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
                notificationEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/20'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>{notificationEnabled ? 'เปิดแจ้งเตือน 06:00 น. เรียบร้อยแล้ว ✓' : 'เปิดแจ้งเตือนโพยใหม่ทุก 06:00 น.'}</span>
            </button>
          )}

          <button
            onClick={() => {
              soundManager.playTap();
              onClose();
            }}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            เข้าใจแล้ว ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
