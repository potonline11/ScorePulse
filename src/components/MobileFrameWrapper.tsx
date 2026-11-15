import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

interface MobileFrameWrapperProps {
  isMobileFrame: boolean;
  children: React.ReactNode;
}

export const MobileFrameWrapper: React.FC<MobileFrameWrapperProps> = ({
  isMobileFrame,
  children,
}) => {
  if (!isMobileFrame) {
    return <div className="min-h-screen bg-[#0b0f19] text-slate-100">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#06080e] py-4 md:py-8 px-2 flex flex-col items-center justify-center">
      {/* Top simulator notification */}
      <div className="text-center mb-3 hidden md:block">
        <span className="text-xs text-sky-400 font-semibold tracking-wide bg-sky-950/60 border border-sky-800/60 px-3 py-1 rounded-full shadow-inner">
          📱 โหมดจำลอง Flutter Cross-Platform (iOS / Android 1xBet Experience)
        </span>
      </div>

      {/* Realistic Smartphone Shell */}
      <div className="w-full max-w-[420px] h-[860px] max-h-[92vh] bg-[#0b0f19] rounded-[48px] border-[10px] border-[#1e293b] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(14,165,233,0.15)] flex flex-col overflow-hidden relative">
        {/* Dynamic Island / Speaker Notch */}
        <div className="h-7 w-full bg-[#0b0f19] flex items-center justify-between px-6 pt-1 select-none z-50 shrink-0">
          <span className="text-[11px] font-bold text-slate-300 font-mono">19:45</span>
          <div className="w-20 h-4 bg-slate-950 rounded-full flex items-center justify-center gap-1.5 border border-slate-800/80">
            <div className="w-2 h-2 rounded-full bg-slate-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500/80" />
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-3.5 h-3.5 text-slate-300" />
          </div>
        </div>

        {/* Scrollable Phone Screen Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {children}
        </div>

        {/* iOS / Android Home Swipe Bar Indicator */}
        <div className="h-5 w-full bg-[#0d1424] flex items-center justify-center shrink-0 z-50">
          <div className="w-32 h-1 bg-slate-600/60 rounded-full" />
        </div>
      </div>
    </div>
  );
};
