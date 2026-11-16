import React from 'react';
import { Target, Volume2, VolumeX, Smartphone, Monitor, Sparkles, ReceiptText, ShieldCheck, Gift } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  betSlipCount: number;
  onOpenBetSlip: () => void;
  onOpenAiChat: () => void;
  onSelectSuperPick?: () => void;
  onOpenPromoModal?: () => void;
  onOpenLiveStream?: () => void;
  onOpenTelegramModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  soundEnabled,
  onToggleSound,
  isMobileFrame,
  onToggleMobileFrame,
  betSlipCount,
  onOpenBetSlip,
  onOpenAiChat,
  onSelectSuperPick,
  onOpenPromoModal,
  onOpenLiveStream,
  onOpenTelegramModal,
}) => {
  const handleTestSound = () => {
    soundManager.playWhistle();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80 px-2.5 sm:px-4 py-2.5 sm:py-3 overflow-x-hidden">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-amber-400 p-[1.5px] shadow-lg shadow-sky-500/20 shrink-0">
            <div className="w-full h-full bg-[#0d1527] rounded-[10px] flex items-center justify-center text-sky-400">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">ScorePulse</span>
              <span className="hidden xs:inline-block px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30">
                xG AI
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                1xBet
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 truncate">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Calibrated (&le;5%)</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
          {/* Telegram 06:30 Notification Button */}
          {onOpenTelegramModal && (
            <button
              onClick={() => {
                soundManager.playTap();
                onOpenTelegramModal();
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#229ED9]/20 hover:bg-[#229ED9]/30 border border-[#229ED9]/40 text-sky-300 text-[11px] sm:text-xs font-black transition-all active:scale-95 cursor-pointer shadow-sm shadow-[#229ED9]/20 whitespace-nowrap"
              title="ตั้งค่าแจ้งเตือนโพยคู่เอกส่งเข้ากลุ่ม Telegram อัตโนมัติทุกเช้า 06:30 น."
            >
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-400 animate-ping" />
              <span className="sm:hidden">TG 06:30</span>
              <span className="hidden sm:inline">Telegram 06:30</span>
            </button>
          )}

          {/* Live Streaming Button */}
          {onOpenLiveStream && (
            <button
              onClick={() => {
                soundManager.playTap();
                onOpenLiveStream();
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[11px] sm:text-xs font-black transition-all active:scale-95 cursor-pointer shadow-sm shadow-rose-600/20 whitespace-nowrap"
              title="ดูถ่ายทอดสดฟุตบอลนัดสำคัญ (Live Streaming)"
            >
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500" />
              <span>ดูบอลสด</span>
            </button>
          )}

          {/* Quick Super Pick 100% Consensus Button */}
          {onSelectSuperPick && (
            <button
              onClick={onSelectSuperPick}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 text-[11px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm shadow-amber-500/10 whitespace-nowrap"
              title="โพยเต็ง 1 ชัวร์สุดวันละคู่ (รับรอง 100 สถาบันสถิติสากล & 10 ปัจจัยตรงกัน 100%)"
            >
              <span>👑</span>
              <span className="hidden sm:inline">โพยชัวร์</span>
              <span className="text-[10px] font-mono bg-emerald-400 text-slate-950 font-black px-1 rounded shadow-sm">
                100%
              </span>
            </button>
          )}

          {/* 1xBet Promo & Booking Code Button */}
          {onOpenPromoModal && (
            <button
              onClick={() => {
                soundManager.playTap();
                onOpenPromoModal();
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/15 to-emerald-500/15 hover:from-amber-500/25 hover:to-emerald-500/25 border border-amber-400/40 text-amber-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              title="ดูรหัสโปรโมชั่น 1xBet และ รหัสจองคูปองบอล"
            >
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span>รหัส 1xBet</span>
            </button>
          )}

          {/* Ask AI Guru */}
          <button
            onClick={onOpenAiChat}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/20 to-sky-600/20 hover:from-blue-600/30 hover:to-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium transition-all active:scale-95 cursor-pointer"
            title="ปรึกษากูรู AI xG"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>กูรู AI</span>
          </button>

          {/* Sound / Goal whistle toggle */}
          <button
            onClick={onToggleSound}
            className={`hidden sm:flex p-2 rounded-lg border text-xs font-medium transition-colors active:scale-95 cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800/80 border-slate-700 text-emerald-400 hover:bg-slate-800'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'เสียงแจ้งเตือนเปิดอยู่ (คลิกเพื่อปิด)' : 'เสียงแจ้งเตือนปิดอยู่ (คลิกเพื่อเปิด)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Flutter Mobile Frame vs Wide view toggle */}
          <button
            onClick={onToggleMobileFrame}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all active:scale-95 cursor-pointer ${
              isMobileFrame
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="สลับโหมดจำลองมือถือ Flutter / หน้าจอกว้าง"
          >
            {isMobileFrame ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>โหมด Flutter App</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-slate-400" />
                <span>หน้าจอกว้าง Pro</span>
              </>
            )}
          </button>

          {/* 1xBet Bet Slip Trigger Button */}
          <button
            onClick={onOpenBetSlip}
            className="hidden sm:flex relative items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <ReceiptText className="w-4 h-4" />
            <span>บิล 1xBet</span>
            {betSlipCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {betSlipCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
