import React, { useEffect } from 'react';
import { GoalAlert } from '../types/soccer';
import { soundManager } from '../utils/audio';
import { X, ArrowRight } from 'lucide-react';

interface GoalAlertToastProps {
  alert: GoalAlert | null;
  onDismiss: () => void;
  onViewMatch: (matchId: string) => void;
}

export const GoalAlertToast: React.FC<GoalAlertToastProps> = ({
  alert,
  onDismiss,
  onViewMatch,
}) => {
  useEffect(() => {
    if (alert) {
      // Play celebratory sound fanfare
      soundManager.playGoalAlert();

      // Auto dismiss after 7 seconds if not clicked
      const timer = setTimeout(() => {
        onDismiss();
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [alert, onDismiss]);

  if (!alert) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-bounce-short">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#101b33] to-slate-900 border-2 border-amber-400/80 shadow-[0_10px_35px_rgba(245,158,11,0.35)] p-3.5 backdrop-blur-xl">
        {/* Glow backdrop indicator */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3">
          {/* Goal Icon & Team Badge */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
              <span className="text-xl">⚽</span>
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-red-600 text-[9px] font-black text-white">
                {alert.minute}'
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-500/20 text-red-400 border border-red-500/30 tracking-wider">
                  GOAL!! มีการทำประตู
                </span>
                <span className="text-[11px] text-slate-400">{alert.league}</span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {alert.player} <span className="text-slate-400 font-normal">({alert.teamName})</span>
              </div>
              <div className="text-xs font-semibold text-amber-400">
                สกอร์เปลี่ยนเป็น {alert.homeTeam} <span className="text-white font-black text-sm">{alert.newScore}</span> {alert.awayTeam}
              </div>
            </div>
          </div>

          {/* Close & Action Buttons */}
          <div className="flex flex-col gap-1.5 items-end shrink-0">
            <button
              onClick={onDismiss}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onViewMatch(alert.matchId);
                onDismiss();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all active:scale-95 shadow-md shadow-sky-500/20"
            >
              <span>ดูสด</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
