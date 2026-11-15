import React from 'react';
import { Target, Zap, Sliders, MessageSquare, ReceiptText, Radio } from 'lucide-react';
import { soundManager } from '../utils/audio';

export type TabType = 'tips' | 'live' | 'stream' | 'lab' | 'community' | 'betslip';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  betSlipCount: number;
  liveMatchCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  betSlipCount,
  liveMatchCount,
}) => {
  const tabs = [
    {
      id: 'tips' as TabType,
      label: 'สกอร์แม่นยำ',
      icon: Target,
      badge: null,
    },
    {
      id: 'live' as TabType,
      label: 'บอลสด',
      icon: Zap,
      badge: liveMatchCount > 0 ? `${liveMatchCount}` : null,
      badgeColor: 'bg-emerald-500 text-slate-950',
    },
    {
      id: 'stream' as TabType,
      label: 'ถ่ายทอดสด',
      icon: Radio,
      badge: 'LIVE',
      badgeColor: 'bg-rose-500 text-white animate-pulse',
    },
    {
      id: 'lab' as TabType,
      label: 'แล็บ xG',
      icon: Sliders,
      badge: 'Calib',
      badgeColor: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    },
    {
      id: 'community' as TabType,
      label: 'กระดานสด',
      icon: MessageSquare,
      badge: null,
    },
    {
      id: 'betslip' as TabType,
      label: 'บิล 1xBet',
      icon: ReceiptText,
      badge: betSlipCount > 0 ? `${betSlipCount}` : null,
      badgeColor: 'bg-amber-400 text-slate-950',
    },
  ];

  const handleSelect = (id: TabType) => {
    soundManager.playTap();
    onTabChange(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d1424]/95 backdrop-blur-lg border-t border-slate-800/90 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-lg mx-auto grid grid-cols-6 h-16 items-center px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              className="relative flex flex-col items-center justify-center h-full py-1 text-center transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <div className="relative">
                <div
                  className={`p-1 rounded-xl transition-all duration-200 ${
                    isActive
                      ? tab.id === 'stream'
                        ? 'bg-rose-600/25 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                        : 'bg-blue-600/25 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.3)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                </div>

                {tab.badge && (
                  <span
                    className={`absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] text-[8px] font-black rounded-full flex items-center justify-center leading-none ${
                      tab.badgeColor || 'bg-blue-500 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? tab.id === 'stream'
                      ? 'text-rose-400 font-bold'
                      : 'text-sky-300 font-bold'
                    : 'text-slate-400 font-medium'
                }`}
              >
                {tab.label}
              </span>

              {isActive && (
                <div
                  className={`absolute bottom-1 w-3 h-0.5 rounded-full ${
                    tab.id === 'stream'
                      ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                      : 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
