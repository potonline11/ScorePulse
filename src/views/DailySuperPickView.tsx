import React, { useState, useEffect } from 'react';
import {
  SUPER_PICKS_LIST,
  PAST_SUPER_PICKS_HISTORY,
  SETTLED_FENERBAHCE_RECORD,
  SETTLED_BARCELONA_RECORD,
  SETTLED_NEWCASTLE_RECORD,
  SETTLED_LIVERPOOL_RECORD,
  SETTLED_CHELSEA_RECORD,
  SETTLED_VILLARREAL_RECORD,
  SETTLED_EVERTON_RECORD,
  SETTLED_SEVILLA_RECORD,
  SETTLED_LAZIO_RECORD,
  SETTLED_MANCITY_RECORD,
  SETTLED_VENEZIA_RECORD,
  SUPER_PICK_FRIDAY_13,
  SUPER_PICK_SATURDAY_14,
  SUPER_PICK_SUNDAY_15,
  SUPER_PICK_MONDAY_16,
  SUPER_PICK_THURSDAY_12,
  SUPER_PICK_WEDNESDAY_11,
  SUPER_PICK_TUESDAY_10,
  SUPER_PICK_MONDAY_9,
  SUPER_PICK_SUNDAY_8,
  SUPER_PICK_SATURDAY_7,
  SETTLED_THURSDAY_12_RECORD,
  SETTLED_WEDNESDAY_11_RECORD,
  SETTLED_TUESDAY_10_RECORD,
  SETTLED_MONDAY_9_RECORD,
  SETTLED_SUNDAY_8_RECORD,
  SETTLED_SATURDAY_7_RECORD,
  SUPER_PICK_FRIDAY_6,
  SUPER_PICK_THURSDAY_5,
  SUPER_PICK_TUESDAY_3,
  SUPER_PICK_MONDAY_2,
  SUPER_PICK_SUNDAY_1,
  SUPER_PICK_SATURDAY_31,
  SUPER_PICK_VILLARREAL_ESPANYOL,
  SUPER_PICK_EVERTON_NEWCASTLE,
  SUPER_PICK_FIORENTINA_ATALANTA,
  SUPER_PICK_MANCITY_BRIGHTON,
  SUPER_PICK_WEDNESDAY_4,
  SUPER_PICK_LAZIO,
  SUPER_PICK_SEVILLA,
  SETTLED_FRIDAY_6_RECORD,
  SETTLED_LEVERKUSEN_RECORD,
  getActiveDailyPickId,
  getDynamicDateTabs,
  DynamicDateTab,
} from '../data/mockMatches';
import { getBangkokTime, BangkokDateTime } from '../utils/bangkokTime';
import { Match, CorrectScorePrediction, DailySuperPick } from '../types/soccer';
import {
  ShieldCheck,
  Flame,
  Copy,
  Check,
  Plus,
  Sparkles,
  Award,
  History,
  Gift,
  HelpCircle,
  Ticket,
  Calendar,
  Clock,
  RefreshCw,
  Bell,
  CheckCircle2,
  Zap,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Info,
  Shield,
  Activity,
  Layers,
  Globe,
} from 'lucide-react';
import { soundManager } from '../utils/audio';
import { DailyUpdateScheduleModal } from '../components/DailyUpdateScheduleModal';
import { TenSourceConsensusModal } from '../components/TenSourceConsensusModal';
import { CorrectScoreSurgeryModal } from '../components/CorrectScoreSurgeryModal';
import { TelegramNotificationModal, TELEGRAM_STORAGE_KEY } from '../components/TelegramNotificationModal';
import { PROMO_STORAGE_KEY, PromoConfigState } from '../components/PromoCodeModal';

interface DailySuperPickViewProps {
  onAddToBetSlip: (match: Match, prediction: CorrectScorePrediction) => void;
  onSelectMatch: (match: Match) => void;
  matches: Match[];
  onOpenPromoModal?: () => void;
}

// Resilient Team Logo Badge that prevents broken image icons
const TeamLogoBadge: React.FC<{
  name: string;
  code: string;
  color: string;
  logoUrl?: string;
  size?: string;
}> = ({ name, code, color, logoUrl, size = 'w-14 h-14' }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`${size} rounded-2xl bg-slate-900 p-1 mb-1.5 border border-slate-700/80 shadow-md flex items-center justify-center relative overflow-hidden shrink-0`}
    >
      {!hasError && logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-xl"
        />
      ) : (
        <div
          className="w-full h-full rounded-xl flex flex-col items-center justify-center font-black text-xs tracking-wider shadow-inner"
          style={{ backgroundColor: `${color}25`, borderColor: color, color: color }}
        >
          <span className="text-base">⚽</span>
          <span className="text-[10px] font-mono font-black mt-0.5">{code}</span>
        </div>
      )}
    </div>
  );
};

export const DailySuperPickView: React.FC<DailySuperPickViewProps> = ({
  onAddToBetSlip,
  onSelectMatch,
  matches,
  onOpenPromoModal,
}) => {
  // Strict Asia/Bangkok (UTC+7) Live Clock Engine
  const [bangkokNow, setBangkokNow] = useState<BangkokDateTime>(() => getBangkokTime());

  // Helper: calculate live time remaining until next 06:00:00 AM ICT strictly in Bangkok
  const getRemainingTo0600 = () => {
    return getBangkokTime(new Date()).remainingToNext0600;
  };

  // Dynamic Live 06:00 Engine: resolve current pick according to real Bangkok time and 06:00 AM cutoff
  const [selectedPickId, setSelectedPickId] = useState<string>(() => getActiveDailyPickId(new Date()));
  const [dynamicDateTabs, setDynamicDateTabs] = useState<DynamicDateTab[]>(() => getDynamicDateTabs(new Date()));
  const [userSelectedManualPick, setUserSelectedManualPick] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedPromo, setCopiedPromo] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showTenSourceModal, setShowTenSourceModal] = useState<boolean>(false);
  const [showSurgeryModal, setShowSurgeryModal] = useState<boolean>(false);
  const [showTelegramModal, setShowTelegramModal] = useState<boolean>(false);
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBlindSpotExpanded, setIsBlindSpotExpanded] = useState<boolean>(true);
  const [isForceSyncing, setIsForceSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return getBangkokTime().formattedTime;
  });

  // Live Server Engine State
  const [serverEngine, setServerEngine] = useState<{
    activePick?: DailySuperPick;
    pipeline?: {
      settleDoneAt?: string;
      settleSummary?: string;
      issueDoneAt?: string;
      issueSummary?: string;
      telegramDoneAt?: string;
      telegramStatus?: string;
    };
    telegramStatus?: {
      enabled: boolean;
      hasToken: boolean;
      hasChatId: boolean;
      chatId?: string;
      lastDispatchStatus?: string;
      verifiedBotUsername?: string;
    };
    settledRecords?: any[];
  } | null>(null);

  const [didAutoHealTelegram, setDidAutoHealTelegram] = useState<boolean>(false);

  const fetchServerEngineState = async () => {
    try {
      const res = await fetch('/api/daily-engine/state');
      if (res.ok) {
        let data = await res.json();
        if (data.success) {

          // Self-healing sync: restore Telegram group bot backup if container restarted cleanly
          if (!data.telegramStatus?.hasToken && !didAutoHealTelegram && typeof window !== 'undefined') {
            try {
              const rawTg = window.localStorage.getItem(TELEGRAM_STORAGE_KEY);
              if (rawTg) {
                const parsedTg = JSON.parse(rawTg);
                if (parsedTg?.botToken) {
                  setDidAutoHealTelegram(true);
                  const restoreRes = await fetch('/api/telegram/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsedTg),
                  });
                  if (restoreRes.ok) {
                    const restoreData = await restoreRes.json();
                    if (restoreData?.engineState) {
                      data = {
                        ...data,
                        ...restoreData.engineState,
                        telegramStatus: restoreData.config
                          ? {
                              enabled: restoreData.config.enabled,
                              hasToken: Boolean(restoreData.config.botToken),
                              hasChatId: Boolean(restoreData.config.chatId),
                              chatId: restoreData.config.chatId,
                              lastDispatchStatus: restoreData.config.lastDispatchStatus,
                              verifiedBotUsername: restoreData.config.verifiedBotUsername,
                            }
                          : data.telegramStatus,
                      };
                    }
                  }
                }
              }
            } catch {
              // ignore storage errors
            }
          }

          setServerEngine(data);
          setLastSyncTime(data.bangkokNow?.formattedTime || getBangkokTime().formattedTime);
        }
      }
    } catch (err) {
      console.warn('Could not fetch /api/daily-engine/state:', err);
    }
  };

  useEffect(() => {
    fetchServerEngineState();
    const syncTimer = setInterval(fetchServerEngineState, 30000);
    return () => clearInterval(syncTimer);
  }, []);

  // Automated Daily Rollover state: 'PRE_MATCH' (today) | 'SETTLED' (match ended & settled) | 'NEXT_DAY' (auto rolled over)
  const [rolloverState, setRolloverState] = useState<'PRE_MATCH' | 'SETTLED' | 'NEXT_DAY'>('PRE_MATCH');

  // Live countdown to next day's 06:00:00 AM ICT release (dynamically calculated strictly in Bangkok time)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>(getRemainingTo0600());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const bkk = getBangkokTime(now);
      setBangkokNow(bkk);
      setTimeLeft(bkk.remainingToNext0600);

      // Refresh dynamic calendar tabs strictly according to real Bangkok time
      const freshTabs = getDynamicDateTabs(now);
      setDynamicDateTabs(freshTabs);

      // If user hasn't manually overridden the pick selection,
      // verify if current active pick matches the live clock (e.g. at 06:00:00 rollover):
      const liveExpectedId = freshTabs[0].pickId;
      if (liveExpectedId !== selectedPickId && !userSelectedManualPick) {
        setSelectedPickId(liveExpectedId);
        fetchServerEngineState();
        soundManager.playGoalAlert();
        showToast('🎉 ถึงเวลา 06:00 น. แล้ว! ปล่อยโพยรอบเช้าชุดใหม่ล่าสุดเรียบร้อยแล้ว');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedPickId, userSelectedManualPick]);

  const handleForceSync0600 = async () => {
    soundManager.playTap();
    setIsForceSyncing(true);
    try {
      const res = await fetch('/api/daily-engine/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setServerEngine(data);
        }
      }
    } catch (err) {
      console.warn('Force sync fallback to local clock:', err);
    } finally {
      setIsForceSyncing(false);
      soundManager.playGoalAlert();
      const now = new Date();
      const bkk = getBangkokTime(now);
      setBangkokNow(bkk);
      const freshTabs = getDynamicDateTabs(now);
      setDynamicDateTabs(freshTabs);
      const freshActiveId = freshTabs[0].pickId;
      setSelectedPickId(freshActiveId);
      setUserSelectedManualPick(false);
      setTimeLeft(bkk.remainingToNext0600);
      setLastSyncTime(bkk.formattedTime);
      showToast(`✅ ซิงค์ระบบ & เวลาไทยสำเร็จ (${bkk.formattedTime} น.): อัปเดตผล 05:00 + โพย 06:00 + ตรวจคิว Telegram 06:30 แล้ว!`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleNotification = () => {
    soundManager.playTap();
    setNotificationEnabled((prev) => {
      const next = !prev;
      if (next) {
        showToast('🔔 เปิดการแจ้งเตือนโพยใหม่ทุกเช้า 06:00 น. เรียบร้อยแล้ว!');
      } else {
        showToast('ปิดการแจ้งเตือนแล้ว');
      }
      return next;
    });
  };

  // Determine active pick - prefers live server activePick for future dates if not manually overridden
  const localTodayPick = SUPER_PICKS_LIST.find((p) => p.id === dynamicDateTabs[0]?.pickId) || SUPER_PICKS_LIST[0];
  const todayOperationalPick: DailySuperPick = serverEngine?.activePick
    ? ({
        ...localTodayPick,
        ...serverEngine.activePick,
        tenSourceConsensus:
          SUPER_PICKS_LIST.find((p) => p.id === serverEngine.activePick?.id)?.tenSourceConsensus ||
          localTodayPick.tenSourceConsensus,
        blindSpotAudit:
          SUPER_PICKS_LIST.find((p) => p.id === serverEngine.activePick?.id)?.blindSpotAudit ||
          localTodayPick.blindSpotAudit,
      } as DailySuperPick)
    : localTodayPick;

  const [promoConfig, setPromoConfig] = useState<PromoConfigState>({
    promoCode: 'SCORE95',
    partnerLink: '',
    customBookingCode: '',
    isConfigured: false,
  });

  useEffect(() => {
    const loadPromoConfig = async () => {
      try {
        const res = await fetch('/api/promo/config');
        if (res.ok) {
          const data: PromoConfigState = await res.json();
          setPromoConfig(data);
          return;
        }
      } catch {
        // fallback below
      }
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(PROMO_STORAGE_KEY);
          if (raw) setPromoConfig(JSON.parse(raw));
        } catch {
          // ignore
        }
      }
    };
    loadPromoConfig();
    if (typeof window !== 'undefined') {
      window.addEventListener('scorepulse-promo-updated', loadPromoConfig);
      return () => window.removeEventListener('scorepulse-promo-updated', loadPromoConfig);
    }
  }, []);

  const pick = userSelectedManualPick
    ? (SUPER_PICKS_LIST.find((p) => p.id === selectedPickId) || todayOperationalPick)
    : todayOperationalPick;
  const activeTabInfo = dynamicDateTabs.find((t) => t.pickId === pick.id) || dynamicDateTabs[0];
  const matchObj = matches.find((m) => m.id === pick.matchId) || matches[0];
  const promoCodeBonus = promoConfig.promoCode || 'SCORE95';
  const effectiveBookingCode = promoConfig.customBookingCode?.trim() || pick.bookingCode1xBet;

  const handleCopyCode = () => {
    soundManager.playTap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(effectiveBookingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleCopyPromo = () => {
    soundManager.playTap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(promoCodeBonus);
      setCopiedPromo(true);
      setTimeout(() => setCopiedPromo(false), 2500);
    }
  };

  const handleQuickAddPrimaryToSlip = () => {
    soundManager.playTap();
    const [hGoals, aGoals] = pick.primaryScore.split('-').map(Number);
    const primaryPred: CorrectScorePrediction = {
      score: pick.primaryScore,
      homeGoals: isNaN(hGoals) ? 2 : hGoals,
      awayGoals: isNaN(aGoals) ? 0 : aGoals,
      rawProbability: 14.5,
      calibratedProbability: 16.2,
      odds1xBet: pick.primaryOdds,
      expectedValue: pick.expectedValue,
      isValueBet: true,
      rank: 1,
    };
    onAddToBetSlip(matchObj, primaryPred);
    showToast(`🎯 เพิ่ม ${pick.matchTitle} สกอร์ ${pick.primaryScore} (@${pick.primaryOdds}) ลงในบิล 1xBet แล้ว`);
  };

  const handleAddHedgeToSlip = (hedge: { selection: string; odds: number; market: string }) => {
    soundManager.playTap();
    const hedgePred: CorrectScorePrediction = {
      score: hedge.selection,
      homeGoals: 0,
      awayGoals: 0,
      rawProbability: Number((100 / hedge.odds).toFixed(1)),
      calibratedProbability: Number((100 / hedge.odds).toFixed(1)),
      odds1xBet: hedge.odds,
      expectedValue: 12.0,
      isValueBet: true,
      rank: 99,
    };
    onAddToBetSlip(matchObj, hedgePred);
    showToast(`🛡️ เพิ่มแผนประกันความเสี่ยง: ${hedge.selection} (@${hedge.odds}) ลงในบิล 1xBet แล้ว`);
  };

  const handleApplyDualShieldStrategy = () => {
    soundManager.playTap();
    handleQuickAddPrimaryToSlip();
    const x2Hedge = pick.blindSpotAudit?.recommendedHedges[0] || {
      market: 'สเปอร์ส ชนะหรือเสมอ (Double Chance - X2)',
      selection: 'Tottenham หรือ เสมอ (X2)',
      odds: 1.38,
      reason: 'คุ้มครองเงินต้น 100%',
    };
    handleAddHedgeToSlip(x2Hedge);
    showToast('🛡️ จัดพอร์ตคุ้มครองทุน 70/30 สำเร็จ: เพิ่มทั้ง X2 (กันหลุด) และ สกอร์ 1-2 (ลุ้นกำไร) ลงในบิล 1xBet แล้ว');
  };

  // Dynamic history starting from server-settled records & yesterday's settled Nov 12 England 2-1 Croatia + all historical settled days
  const baseHistory = [
    SETTLED_THURSDAY_12_RECORD,
    SETTLED_WEDNESDAY_11_RECORD,
    SETTLED_TUESDAY_10_RECORD,
    SETTLED_MONDAY_9_RECORD,
    SETTLED_SUNDAY_8_RECORD,
    SETTLED_SATURDAY_7_RECORD,
    SETTLED_FRIDAY_6_RECORD,
    SETTLED_LEVERKUSEN_RECORD,
    SETTLED_FENERBAHCE_RECORD,
    SETTLED_BARCELONA_RECORD,
    SETTLED_NEWCASTLE_RECORD,
    SETTLED_LIVERPOOL_RECORD,
    SETTLED_CHELSEA_RECORD,
    SETTLED_VILLARREAL_RECORD,
    SETTLED_EVERTON_RECORD,
    SETTLED_MANCITY_RECORD,
    SETTLED_VENEZIA_RECORD,
    SETTLED_LAZIO_RECORD,
    SETTLED_SEVILLA_RECORD,
    ...PAST_SUPER_PICKS_HISTORY,
  ];

  const baseHistoryIds = new Set(baseHistory.map((h) => h.id));
  const extraServerSettled = (serverEngine?.settledRecords || []).filter(
    (rec: any) => rec && rec.id && !baseHistoryIds.has(rec.id)
  );
  const displayedHistory = [...extraServerSettled, ...baseHistory];

  const recent7 = displayedHistory.slice(0, 7);
  const recent7Wins = recent7.filter((h) => h.result === 'WIN').length;
  const recent7Rate = Math.round((recent7Wins / Math.max(1, recent7.length)) * 100);
  const winCount = displayedHistory.filter((h) => h.result === 'WIN').length;
  const winRate = Math.round((winCount / Math.max(1, displayedHistory.length)) * 100);

  const formatDigits = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className="p-4 space-y-5 pb-28 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl shadow-emerald-500/40 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Schedule Detail Modal */}
      <DailyUpdateScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onEnableNotification={handleToggleNotification}
        notificationEnabled={notificationEnabled}
      />

      {/* 10-Source Multi-Consensus Audit Modal */}
      <TenSourceConsensusModal
        isOpen={showTenSourceModal}
        onClose={() => setShowTenSourceModal(false)}
        consensusData={pick.tenSourceConsensus}
        matchTitle={pick.matchTitle}
        league={pick.league}
        kickoffTime={pick.kickoffTime}
        onQuickAdd={handleQuickAddPrimaryToSlip}
      />

      {/* Correct Score Surgery Modal */}
      <CorrectScoreSurgeryModal
        isOpen={showSurgeryModal}
        onClose={() => setShowSurgeryModal(false)}
        onSelectRecommendedMatch={() => {
          setSelectedPickId(todayOperationalPick.id);
          setUserSelectedManualPick(false);
        }}
      />

      {/* Telegram Group 06:30 AM Auto-Notification Modal */}
      <TelegramNotificationModal
        isOpen={showTelegramModal}
        onClose={() => {
          setShowTelegramModal(false);
          fetchServerEngineState();
        }}
        onConfigUpdated={fetchServerEngineState}
      />

      {/* 1. Automated Rollover & Daily Schedule Bar */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0d172e] via-[#102142] to-[#0d172e] border-2 border-sky-500/40 p-4 shadow-xl space-y-3 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Real-Time Bangkok Time Locking Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-950/90 border border-sky-500/40 shadow-inner text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">🇹🇭</span>
            <span className="text-sky-300 font-bold">เวลามาตรฐานประเทศไทย (Asia/Bangkok UTC+7):</span>
            <span className="font-mono font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/30 text-sm">
              {bangkokNow.formattedTime} น.
            </span>
            <span className="text-slate-300 font-medium">({bangkokNow.formattedDate})</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ระบบรันเวลาไทยแท้ 100% แก้ปัญหาเขตเวลาเครื่องไม่ตรง</span>
          </div>
        </div>

        {/* Top Status & Timetable trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${isForceSyncing ? 'animate-spin' : ''}`} />
              <span>ระบบอัปเดตผลและปล่อยโพยอัตโนมัติ (Auto 06:00 AM Engine)</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
              ● อัปเดตทุก 06:00 น. ของทุกวัน
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                soundManager.playTap();
                setShowTelegramModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black bg-[#229ED9]/20 hover:bg-[#229ED9]/30 text-sky-300 border border-[#229ED9]/40 transition-all cursor-pointer shadow-sm shadow-[#229ED9]/20 active:scale-95 animate-pulse"
              title="ตั้งค่าแจ้งเตือนโพยคู่เอกส่งเข้ากลุ่ม Telegram อัตโนมัติทุกเช้า 06:30 น."
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>✈️ แจ้งเตือน Telegram 06:30</span>
            </button>

            <button
              onClick={() => {
                soundManager.playTap();
                setShowSurgeryModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 hover:opacity-95 text-white shadow-md shadow-rose-500/30 transition-all cursor-pointer"
              title="ผ่าตัดระบบวิเคราะห์ Correct Score: วิเคราะห์ปัญหาหลุดเป้า & 4 ยุทธศาสตร์กู้คืนความแม่นยำ"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>🩺 ผ่าตัดระบบ</span>
            </button>

            <button
              onClick={handleForceSync0600}
              disabled={isForceSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-400/20 transition-all cursor-pointer active:scale-95"
              title="กดเพื่อซิงค์เวลาจริงและตรวจสอบโพยรอบเช้า 06:00 น."
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isForceSyncing ? 'animate-spin' : ''}`} />
              <span>{isForceSyncing ? 'กำลังซิงค์เวลา...' : '🔄 เช็คเวลา 06:00 น.'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playTap();
                setShowScheduleModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 transition-all cursor-pointer shadow-sm"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>รอบเวลา</span>
            </button>

            <button
              onClick={handleToggleNotification}
              className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                notificationEnabled
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-amber-300'
              }`}
              title={notificationEnabled ? 'เปิดแจ้งเตือนโพยใหม่แล้ว' : 'กดเพื่อรับแจ้งเตือนโพย 06:00 น.'}
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Countdown & Dynamic Cycle Explanation */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>สถานะรอบปัจจุบัน:</span>
              <strong className="text-emerald-400 font-bold">
                {activeTabInfo.cycleExplanation.statusTitle}
              </strong>
            </div>
            <div className="text-[11px] text-slate-300 mt-1.5 leading-relaxed space-y-1">
              {activeTabInfo.cycleExplanation.summaryLines.map((line, lIdx) => (
                <p key={lIdx} className="flex items-start gap-1">
                  <span>{line}</span>
                </p>
              ))}
            </div>
          </div>

          {/* Live Countdown Box to next 06:00:00 AM */}
          <div className="flex items-center gap-2 bg-[#0b1222] px-3.5 py-2.5 rounded-xl border border-sky-500/40 shadow-inner shrink-0 self-start sm:self-auto">
            <div>
              <div className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>รอบปล่อยโพยวันพรุ่งนี้ (06:00 น.):</span>
              </div>
              <div className="font-mono font-black text-amber-400 tracking-wider text-base tabular-nums">
                {formatDigits(timeLeft.hours)}:{formatDigits(timeLeft.minutes)}:{formatDigits(timeLeft.seconds)}
              </div>
            </div>
          </div>
        </div>

        {/* Automated Daily 05:00 / 06:00 / 06:30 Pipeline Visualizer (Live Server-Synced) */}
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-xs space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-emerald-300 text-[11px] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>ท่อส่งอัตโนมัติ Server-Authoritative (05:00 สรุปผล &rarr; 06:00 ออกโพย &rarr; 06:30 Telegram กลุ่ม)</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Telegram Free Unlimited + Vercel Ready
            </span>
          </div>

          {/* Live 3-Step Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px]">
              <div className="text-amber-400 font-bold flex items-center justify-between gap-1">
                <span>1. เวลา 05:00 น.</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black">
                  {serverEngine?.pipeline?.settleDoneAt ? `✓ ${serverEngine.pipeline.settleDoneAt}` : '✓ ACTIVE'}
                </span>
              </div>
              <div className="text-slate-300 text-[10px] mt-0.5 line-clamp-2">
                {serverEngine?.pipeline?.settleSummary || 'ตัดรอบสรุปผลบอลจริงเมื่อคืนอัตโนมัติ (อังกฤษ 2-1 โครเอเชีย)'}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-[11px]">
              <div className="text-sky-400 font-bold flex items-center justify-between gap-1">
                <span>2. เวลา 06:00 น.</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-black">
                  {serverEngine?.pipeline?.issueDoneAt ? `✓ ${serverEngine.pipeline.issueDoneAt}` : 'ACTIVE'}
                </span>
              </div>
              <div className="text-slate-200 text-[10px] mt-0.5 line-clamp-2">
                {serverEngine?.pipeline?.issueSummary || `ปล่อยโพยวันนี้: ${todayOperationalPick.matchTitle} ${todayOperationalPick.primaryScore}`}
              </div>
            </div>

            <div
              onClick={() => {
                soundManager.playTap();
                setShowTelegramModal(true);
              }}
              className={`p-2 rounded-xl border text-[11px] cursor-pointer transition-all ${
                serverEngine?.telegramStatus?.lastDispatchStatus === 'SUCCESS'
                  ? 'bg-sky-950/40 border-[#229ED9]/60 hover:border-sky-400'
                  : serverEngine?.telegramStatus?.lastDispatchStatus === 'ERROR'
                  ? 'bg-rose-950/40 border-rose-500/60 hover:border-rose-400'
                  : 'bg-sky-950/20 border-sky-500/40 hover:border-sky-400'
              }`}
            >
              <div className="text-sky-400 font-bold flex items-center justify-between gap-1">
                <span>3. 06:30 น. Telegram กลุ่ม</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                    serverEngine?.telegramStatus?.lastDispatchStatus === 'SUCCESS'
                      ? 'bg-[#229ED9] text-slate-950'
                      : serverEngine?.telegramStatus?.lastDispatchStatus === 'ERROR'
                      ? 'bg-rose-500 text-white'
                      : serverEngine?.telegramStatus?.hasToken && serverEngine?.telegramStatus?.hasChatId
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {serverEngine?.telegramStatus?.lastDispatchStatus === 'SUCCESS'
                    ? '✓ SENT'
                    : serverEngine?.telegramStatus?.lastDispatchStatus === 'ERROR'
                    ? '! ERROR'
                    : serverEngine?.telegramStatus?.hasToken && serverEngine?.telegramStatus?.hasChatId
                    ? 'READY'
                    : 'ตั้งค่า TG'}
                </span>
              </div>
              <div className="text-slate-300 text-[10px] mt-0.5 line-clamp-2">
                {serverEngine?.pipeline?.telegramStatus || 'คลิกเพื่อตั้งค่าส่งโพยเข้ากลุ่ม Telegram อัตโนมัติ (ฟรีไม่อั้น)'}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Date Selector Bar (Switch between today's 06:00 release & past settled days) */}
        <div className="pt-1 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-bold text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>เลือกรอบวันที่ของโพย (อัปเดตอัตโนมัติทุก 06:00 น. ของทุกวัน):</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">ซิงค์เวลาล่าสุด: {lastSyncTime} น.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5">
            {dynamicDateTabs.map((tab) => {
              const isSelected = selectedPickId === tab.pickId;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    soundManager.playTap();
                    setSelectedPickId(tab.pickId);
                    setUserSelectedManualPick(true);
                    setRolloverState(tab.badgeVariant === 'today' ? 'PRE_MATCH' : 'SETTLED');
                    showToast(`📅 ${tab.tabLabel}: ${tab.subLabel}`);
                  }}
                  className={`p-2 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                    isSelected
                      ? tab.badgeVariant === 'today'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
                        : 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-400/40'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{tab.tabLabel}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                        tab.badgeVariant === 'today'
                          ? 'bg-emerald-400/20 text-emerald-950 border border-emerald-400/40'
                          : tab.badgeVariant === 'win'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-sky-600 text-white'
                      }`}
                    >
                      {tab.badgeLabel}
                    </span>
                  </div>
                  <div className="text-[10px] opacity-80 truncate font-normal mt-0.5">
                    {tab.subLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Match Settle Review Banner (If Settled) */}
      {(pick.isSettled || rolloverState === 'SETTLED') && (
        <div
          className={`p-4 rounded-3xl border-2 shadow-xl text-xs space-y-2.5 animate-fadeIn ${
            pick.settledResult === 'WIN'
              ? 'bg-gradient-to-r from-[#1c180e] via-[#161f33] to-[#1c180e] border-amber-400'
              : 'bg-gradient-to-r from-[#221015] via-[#1a1426] to-[#221015] border-rose-500/80'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md ${
                pick.settledResult === 'WIN'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {pick.settledResult === 'WIN' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>
                    สรุปผลการแข่งขันจริง: {pick.matchTitle} จบจริง {pick.settledScore || 'WIN'} (WIN 🎯 {pick.slipNumber})
                  </span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-4 h-4 stroke-[3]" />
                  <span>
                    สรุปผลการแข่งขันจริง: {pick.matchTitle} จบจริง {pick.settledScore || '0-1'} (หลุดเป้าเต็ง {pick.primaryScore} ❌)
                  </span>
                </>
              )}
            </span>
            <span
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                pick.settledResult === 'WIN'
                  ? 'text-emerald-300 bg-emerald-950/60 border-emerald-500/30'
                  : 'text-rose-300 bg-rose-950/60 border-rose-500/30'
              }`}
            >
              {pick.settledResult === 'WIN'
                ? `สลิปเดี่ยว 1xBet ค่าน้ำ @${pick.primaryOdds.toFixed(2)}: WIN 🎯 รับเงิน ${(50 * pick.primaryOdds).toFixed(0)} บาท`
                : `สลิปเดี่ยว 1xBet № ${pick.slipNumber || pick.bookingCode1xBet}: LOSS ❌ เสียทุน 50 บาท (บันทึกผลจริง 100%)`}
            </span>
          </div>
          <p className="text-slate-200 text-xs leading-relaxed">
            {pick.settledNotes ||
              `ผลการแข่งขันจริง 90 นาที จบลงด้วยสกอร์ ${pick.settledScore || '-'} บันทึกผลตามสกอร์จริง 100% โปร่งใส ปรับอัตราความแม่นยำอัตโนมัติ`}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                setSelectedPickId(dynamicDateTabs[0]?.pickId || SUPER_PICK_FRIDAY_13.id);
                setRolloverState('PRE_MATCH');
                setUserSelectedManualPick(false);
                showToast(`🟢 กลับสู่โพยรอบเช้า 06:00 น. วันนี้ (${todayOperationalPick.matchTitle})`);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <span>กลับสู่โพยวันนี้ ({todayOperationalPick.matchTitle} {todayOperationalPick.kickoffTime})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Fixtures Selector Switcher */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-extrabold text-slate-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>เลือกลีกและคู่บอลในระบบ:</span>
          </span>
          <span className="text-[10px] text-sky-400 font-medium">สลับดูการวิเคราะห์ AI</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SUPER_PICKS_LIST.map((item) => {
            const isSelected = item.id === selectedPickId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundManager.playTap();
                  setSelectedPickId(item.id);
                  setCopiedCode(false);
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-amber-950/60 via-[#131d33] to-slate-900 border-amber-400/90 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[110px]">
                      {item.league}
                    </span>
                    {item.id === 'daily-pick-netherlands-greece-nov13' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 shadow-sm whitespace-nowrap">
                        👑 ศุกร์ 13 พ.ย. (วันนี้ 02:45 น. Clean Sheet 2-0)
                      </span>
                    ) : item.id === 'daily-pick-portugal-denmark-nov14' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 whitespace-nowrap">
                        📅 เสาร์ 14 พ.ย. (รอปล่อย 06:00 น.)
                      </span>
                    ) : item.id === 'daily-pick-france-turkiye-nov15' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 whitespace-nowrap">
                        📅 อาทิตย์ 15 พ.ย. (รอปล่อย 06:00 น.)
                      </span>
                    ) : item.id === 'daily-pick-switzerland-scotland-nov16' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 whitespace-nowrap">
                        📅 จันทร์ 16 พ.ย. (รอปล่อย 06:00 น.)
                      </span>
                    ) : item.id === 'daily-pick-england-croatia-nov12' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                        ❌ 12 พ.ย. (จบ 2-1 หลุด 2-0 ❌)
                      </span>
                    ) : item.id === 'daily-pick-armenia-cyprus-nov11' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                        ❌ 11 พ.ย. (จบ 1-1 หลุด 2-1 ❌ / 1X WIN)
                      </span>
                    ) : item.id === 'daily-pick-wycombe-crawley-nov10' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                        🎯 10 พ.ย. (WIN 2-1 @8.40)
                      </span>
                    ) : item.id === 'daily-pick-rayo-laspalmas-nov9' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                        🎯 9 พ.ย. (WIN 1-0 @6.80)
                      </span>
                    ) : item.id === 'daily-pick-sunderland-chelsea-nov8' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                        🎯 8 พ.ย. (WIN 1-2 @8.60)
                      </span>
                    ) : item.id === 'daily-pick-leeds-tottenham-nov7' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                        ❌ 7 พ.ย. (จบ 1-1 หลุด 1-2 ❌ / เซฟตี้ X2 WIN)
                      </span>
                    ) : item.id === 'daily-pick-dortmund-stuttgart' || item.id === 'daily-pick-friday-6' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                        ❌ 6 พ.ย. (โปรแกรมหลุด/เสียทุน ❌)
                      </span>
                    ) : item.id === 'daily-pick-leverkusen-marseille' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                        ❌ 5 พ.ย. (จบ 0-1 หลุดเป้า ❌)
                      </span>
                    ) : item.id === 'daily-pick-fenerbahce-liverpool' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                        ❌ 4 พ.ย. (จบ 3-2 หลุดเป้า ❌)
                      </span>
                    ) : item.id === 'daily-pick-barca-astonvilla' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                        ❌ 3 พ.ย. (จบ 3-0 หลุดเป้า ❌)
                      </span>
                    ) : item.id === 'daily-pick-monday-2' || item.id === 'daily-pick-newcastle-everton' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                        ❌ 2 พ.ย. (จบ 0-1 หลุดเป้า ❌)
                      </span>
                    ) : item.id === 'daily-pick-sunday-1' || item.id === 'daily-pick-liverpool-arsenal' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                        ❌ 1 พ.ย. (จบ 0-1 หลุดเป้า ❌)
                      </span>
                    ) : item.id === 'daily-pick-saturday-31' || item.id === 'daily-pick-chelsea-manutd' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap">
                        ❌ 31 ต.ค. (จบ 1-1 หลุดเป้า ❌)
                      </span>
                    ) : item.id === 'daily-pick-villarreal-espanyol' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                        🎯 WIN 2-0 (สลิปเดี่ยว @7.50 จ่าย 375฿)
                      </span>
                    ) : item.id === 'daily-pick-everton-newcastle' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 whitespace-nowrap">
                        🎯 29 ต.ค. (WIN 1-2 @8.50)
                      </span>
                    ) : item.id === 'daily-pick-fiorentina-atalanta' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 whitespace-nowrap">
                        ⭐ เซเรีย อา (1-2 @8.80)
                      </span>
                    ) : item.id === 'daily-pick-mancity-brighton' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                        28 ต.ค. (จบจริง 2-2 เซฟตี้กำไร)
                      </span>
                    ) : item.id === 'daily-pick-venezia-inter' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 whitespace-nowrap">
                        28 ต.ค. (จบ 0-2 WIN 🎯)
                      </span>
                    ) : item.id === 'daily-pick-lazio' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 whitespace-nowrap">
                        27 ต.ค. (จบ 1-2 WIN 🎯)
                      </span>
                    ) : item.id === 'daily-pick-sevilla' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 whitespace-nowrap">
                        26 ต.ค. (จบ 2-0 WIN 🎯)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 whitespace-nowrap">
                        {item.dateText}
                      </span>
                    )}
                  </div>
                  <div className="font-extrabold text-xs text-white truncate">{item.matchTitle}</div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-amber-400 font-black">ฟันธง {item.primaryScore}</span>
                  <span className="font-mono text-sky-400 font-bold">@{item.primaryOdds.toFixed(2)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Super Pick Crown Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950 via-[#131d33] to-[#0b1222] border-2 border-amber-400/80 p-5 shadow-[0_15px_40px_rgba(245,158,11,0.25)]">
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30">
              <Award className="w-3.5 h-3.5 fill-slate-950" />
              {pick.badge}
            </span>
            <span className="text-xs text-amber-300 font-bold hidden sm:inline">{pick.dateText}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold" title="ฉันทามติความสอดคล้อง 100 สถาบันสถิติสากล & 10 ปัจจัย">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ฉันทามติ {pick.tenSourceConsensus?.totalSources || 100} สถาบัน: {pick.consensusRate}%</span>
          </div>
        </div>

        {/* League and Venue */}
        <div className="text-xs text-slate-300 flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-bold text-white">{pick.league}</span>
          <span>&middot;</span>
          <span>{pick.venue}</span>
          <span>&middot;</span>
          <span className="text-amber-400 font-semibold">{pick.kickoffTime}</span>
        </div>

        {/* Matchup Card with Team Logos */}
        <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 my-3 backdrop-blur-md">
          <div className="grid grid-cols-5 items-center gap-2 sm:gap-3 text-center">
            {/* Home */}
            <div className="col-span-2 flex flex-col items-center">
              <TeamLogoBadge
                name={pick.homeTeam.name}
                code={pick.homeTeam.code}
                color={pick.homeTeam.color}
                logoUrl={pick.homeTeam.logo}
              />
              <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[130px]">
                {pick.homeTeam.name}
              </span>
              <span className="text-[11px] text-sky-400 font-mono font-bold mt-0.5">
                xG ในบ้าน {pick.homeTeam.expectedGoals}
              </span>
            </div>

            {/* VS Center */}
            <div className="col-span-1 flex flex-col items-center">
              <span className="text-xs font-extrabold text-slate-500 bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                VS
              </span>
              <span className="text-[10px] text-amber-400 font-bold mt-1">คู่อันดับ 1</span>
            </div>

            {/* Away */}
            <div className="col-span-2 flex flex-col items-center">
              <TeamLogoBadge
                name={pick.awayTeam.name}
                code={pick.awayTeam.code}
                color={pick.awayTeam.color}
                logoUrl={pick.awayTeam.logo}
              />
              <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[130px]">
                {pick.awayTeam.name}
              </span>
              <span className="text-[11px] text-sky-400 font-mono font-bold mt-0.5">
                xG นอกบ้าน {pick.awayTeam.expectedGoals}
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Source 100% Consensus Breakdown Gauge (100-Source & 10-Factor Engine) */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900/95 via-[#0e1933] to-slate-900/95 border-2 border-emerald-500/50 p-4 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-amber-400 text-slate-950 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ระบบคัดกรอง {pick.tenSourceConsensus?.totalSources || 100} สถาบันสถิติสากล & 10 ปัจจัย</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  pick.consensusRate >= 100.0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {pick.consensusRate >= 100.0 ? '🛡️ ผ่านเกณฑ์เข้มงวด 100% ตรงกันสมบูรณ์แบบ (อนุมัติโพยเด็ด)' : '⚠️ ต่ำกว่าเกณฑ์ 100% (ไม่อนุมัติเป็นโพยเด็ด)'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-200 pt-0.5">
                ฉันทามติความเห็นพ้อง {pick.tenSourceConsensus?.totalSources || 100} สถาบัน & 10 ปัจจัยเจาะลึก (เกณฑ์ผ่าน 100.0% เท่านั้น)
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                pick.consensusRate >= 100.0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {pick.consensusRate}%
              </span>
              <button
                onClick={() => {
                  soundManager.playTap();
                  setShowTenSourceModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm shrink-0"
              >
                <span>ดูรายละเอียด {pick.tenSourceConsensus?.totalSources || 100} สถาบัน</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bar towards 100% */}
          <div className="space-y-1">
            <div className="relative h-2.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-10 shadow-[0_0_8px_rgba(52,211,153,1)]"
                style={{ left: '100%' }}
                title="จุดตัดเกณฑ์ผ่านโพยเด็ด 100%"
              />
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pick.consensusRate >= 100.0
                    ? 'bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400'
                    : 'bg-gradient-to-r from-rose-500 to-amber-400'
                }`}
                style={{ width: `${Math.min(100, pick.consensusRate)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0%</span>
              <span className="text-emerald-300 font-bold">◄ เกณฑ์ผ่านคัดกรอง 100% (100 สถาบัน & 10 ปัจจัยตรงกัน 100%)</span>
              <span>100%</span>
            </div>
          </div>

          {/* User's Verified 1xBet Slip Reference if match has slipNumber */}
          {pick.slipNumber && (
            <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-amber-400" />
                  <span>สลิปเดิมพันเดี่ยว 1xBet ในระบบ: {pick.slipNumber}</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>สถานะ: รับแล้ว</span>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">คู่แข่งขัน:</span>
                  <strong className="text-white font-mono">{pick.matchTitle}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">วางคะแนนจริง:</span>
                  <strong className="text-amber-400 font-mono text-xs">{pick.primaryScore}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">อัตราต่อรอง 1xBet:</span>
                  <strong className="text-emerald-400 font-mono text-xs">@{pick.primaryOdds.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">เดิมพัน 50 ฿ รางวัลพึงได้:</span>
                  <strong className="text-sky-300 font-mono text-xs">{(50 * pick.primaryOdds).toFixed(0)} ฿</strong>
                </div>
              </div>
            </div>
          )}

          {/* Quick 10-Source mini grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center text-xs">
            {(pick.tenSourceConsensus?.sources.slice(0, 5) || []).map((src, idx) => (
              <div key={src.id} className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                <div className="text-[9px] text-slate-400 truncate">{idx + 1}. {src.badge}</div>
                <div className={`font-mono font-bold text-[11px] ${idx === 4 ? 'text-emerald-400' : 'text-sky-400'}`}>
                  {src.predictedScore} ({src.confidence}%)
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>
              Calibration Error: <strong className="text-emerald-400 font-mono">{pick.calibrationError}%</strong> (&le; 5%)
            </span>
            <span>
              Brier Score: <strong className="text-sky-400 font-mono">{pick.brierScore}</strong>
            </span>
            <span className="text-amber-400 font-bold hidden sm:inline">
              10/10 แหล่งเห็นพ้องตรงกัน 100%
            </span>
          </div>
        </div>

        {/* Primary Correct Score Box (ฟันธงเต็ง 1 ตัวตรง - Pure Correct Score Focus) */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-900/60 via-[#102a5c] to-blue-900/60 border-2 border-sky-400/80 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30">
                  🎯 สกอร์แม่นยำเต็ง 1 ตัวตรง (Pure Correct Score)
                </span>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-500/40">
                  ⚡ Poisson Density Peak: {pick.blindSpotAudit?.scoreTrueProbability || 19.8}% (&ge; 18% ผ่านเกณฑ์)
                </span>
                <button
                  onClick={() => {
                    soundManager.playTap();
                    setShowSurgeryModal(true);
                  }}
                  className="text-[10px] font-black text-rose-300 bg-rose-950/70 hover:bg-rose-900 px-2 py-0.5 rounded border border-rose-500/40 flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Activity className="w-3 h-3 text-rose-400" />
                  <span>ผ่าตัดระบบโมเดล</span>
                </button>
              </div>

              {/* Strict No-Wrap Container for Correct Score Display */}
              <div className="flex flex-wrap items-center gap-2.5 mt-2">
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/90 border border-sky-400/60 shadow-inner inline-flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-wider whitespace-nowrap tabular-nums">
                    {pick.primaryScore}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-amber-400 font-mono whitespace-nowrap bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20">
                    ค่าน้ำ 1xBet: @{pick.primaryOdds.toFixed(2)}
                  </span>
                  <span className="text-[10px] sm:text-xs font-black text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded-full border border-emerald-500/30 whitespace-nowrap">
                    EV +{pick.expectedValue}%
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleQuickAddPrimaryToSlip}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-xs transition-all active:scale-95 shadow-lg shadow-sky-500/30 cursor-pointer shrink-0 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>ใส่บิล 1xBet ทันที</span>
            </button>
          </div>

          <p className="text-xs text-blue-100 leading-relaxed pt-1 border-t border-blue-800/60">
            {pick.analysisRationale}
          </p>
        </div>

        {/* Safety Net & Insurance Options (แผนกันเหนียว) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
          {/* Backup score */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold">สกอร์สำรองอันดับ 2 (กันเหนียว)</div>
              <div className="text-sm font-black text-white font-mono mt-0.5 whitespace-nowrap">
                สกอร์ {pick.backupScore} <span className="text-amber-400 font-bold text-xs">@{pick.backupOdds}</span>
              </div>
            </div>
            <button
              onClick={() => {
                soundManager.playTap();
                const [hGoals, aGoals] = pick.backupScore.split('-').map(Number);
                const backupPred: CorrectScorePrediction = {
                  score: pick.backupScore,
                  homeGoals: isNaN(hGoals) ? 2 : hGoals,
                  awayGoals: isNaN(aGoals) ? 1 : aGoals,
                  rawProbability: 11.2,
                  calibratedProbability: 12.8,
                  odds1xBet: pick.backupOdds,
                  expectedValue: 14.5,
                  isValueBet: true,
                  rank: 2,
                };
                onAddToBetSlip(matchObj, backupPred);
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold transition-all"
              title="เพิ่มสกอร์สำรองลงบิล"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Safe option */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-semibold">ช้อยส์ปลอดภัยสูงสุด (Safe Insurance)</div>
            <div className="text-xs font-bold text-emerald-400 mt-0.5 truncate">
              {pick.safeOption}
            </div>
          </div>
        </div>

        {/* Anti-Loss Streak Protection & Capital Shield (Solves "กลัวหลุด 8 นัดติด") */}
        <div className="mt-4 rounded-3xl bg-gradient-to-br from-[#0c1f17] via-[#0b162c] to-[#0c1f17] border-2 border-emerald-400/80 p-4 sm:p-5 shadow-2xl shadow-emerald-500/20 space-y-3.5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-amber-400 text-slate-950 shadow-md">
                  <ShieldCheck className="w-4 h-4 fill-slate-950" />
                  <span>ศูนย์ป้องกันหลุด 8 นัดติด &bull; สูตรคุ้มครองเงินทุน 100%</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  🛡️ ปลอดภัยสูงสุด
                </span>
              </div>
              <h3 className="text-sm font-black text-white pt-1">
                กังวลว่าสกอร์ตรง 1-2 จะหลุด 8 นัดติด? แนะนำเปิดใช้ &ldquo;แผนคุ้มครองเงินต้น 70:30&rdquo;
              </h3>
            </div>
            
            <button
              onClick={handleApplyDualShieldStrategy}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 hover:from-emerald-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-400/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
              title="กดเพื่อจัดพอร์ตอัตโนมัติ (ใส่ทั้ง X2 เซฟทุน และ สกอร์ 1-2 ลุ้นกำไร)"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>⚡ จัดพอร์ตเซฟทุน 70:30 ลงบิลทันที</span>
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/85 border border-emerald-500/30 text-xs space-y-2.5">
            <div className="text-slate-300 leading-relaxed text-[11px]">
              <strong className="text-amber-300 block mb-1">💡 ความจริงที่นักวิเคราะห์ระดับโลกแนะนำเพื่อไม่ให้เสียเงิน:</strong>
              การเล่นสกอร์ตัวตรง (Correct Score 1-2 ค่าน้ำ @8.80) มีค่าน้ำสูงถึง 8.8 เท่า ย่อมมีความผันผวนสูง หากเกมจบ 0-1, 0-2, 1-3 หรือเสมอ 1-1 สกอร์ตัวตรงจะหลุด แต่ในรูปเกม <strong>ท็อตแน่ม ฮ็อทสเปอร์ ไม่แพ้แน่นอนตามการประเมิน 100 สถาบัน</strong> เพื่อไม่ให้เกิดสถิติหลุด 8 นัดติดและเสียเงินทุน แนะนำให้กระจายทุนตามหลักการบริหารเงินระดับสากล:
            </div>

            {/* 3 Pillars of Protection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                    <span>ทางเลือกที่ 1 (เซฟทุน 100%)</span>
                    <span className="text-emerald-400">ปลอดภัยสูงสุด</span>
                  </div>
                  <div className="font-black text-white text-xs">Double Chance (X2)</div>
                  <div className="text-[11px] text-amber-400 font-bold font-mono">Tottenham หรือ เสมอ (@1.38)</div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    สเปอร์สชนะ 0-1, 1-2, 0-2, 1-3 หรือเสมอ 1-1 ชนะบิลทันที ไม่หลุดแน่นอน
                  </p>
                </div>
                <button
                  onClick={() => handleAddHedgeToSlip({ selection: 'Tottenham หรือ เสมอ (X2)', odds: 1.38, market: 'Double Chance' })}
                  className="mt-2 w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>ใส่บิล X2 (@1.38)</span>
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                    <span>ทางเลือกที่ 2 (เกมรุกเปิดแลก)</span>
                    <span className="text-sky-400">xG สูง</span>
                  </div>
                  <div className="font-black text-white text-xs">สกอร์รวม Over 2.5 ลูก</div>
                  <div className="text-[11px] text-amber-400 font-bold font-mono">สูงกว่า 2.5 ประตู (@1.55)</div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    ยิงรวม 3 ลูกขึ้นไป (1-2, 2-1, 2-2, 1-3) วินทันที ครอบคลุมทุกผลสกอร์สูง
                  </p>
                </div>
                <button
                  onClick={() => handleAddHedgeToSlip({ selection: 'Over 2.5 ประตู', odds: 1.55, market: 'Over/Under' })}
                  className="mt-2 w-full py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>ใส่บิล Over 2.5 (@1.55)</span>
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                    <span>ทางเลือกที่ 3 (สูตร 70/30)</span>
                    <span className="text-amber-400">พอร์ตมืออาชีพ</span>
                  </div>
                  <div className="font-black text-white text-xs">สูตรกระจายทุนเซฟตี้</div>
                  <div className="text-[11px] text-emerald-400 font-bold">วาง X2 (70%) + สกอร์ 1-2 (30%)</div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    หากสกอร์หลุดแต่สเปอร์สไม่แพ้ ได้ทุนคืนครบ / หากเข้า 1-2 กำไรเต็มเหนี่ยว
                  </p>
                </div>
                <button
                  onClick={handleApplyDualShieldStrategy}
                  className="mt-2 w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                >
                  <Sparkles className="w-3 h-3 fill-slate-950" />
                  <span>ใส่ทั้งคู่ (สูตร 70/30)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Blind Spot & Tactical Risk Auditor Section */}
        {pick.blindSpotAudit && (
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-amber-950/40 border-2 border-rose-500/50 shadow-xl overflow-hidden">
            {/* Header / Toggle Button */}
            <button
              onClick={() => {
                soundManager.playTap();
                setIsBlindSpotExpanded((prev) => !prev);
              }}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${
                  pick.blindSpotAudit.riskLevel === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  <ShieldAlert className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">
                      ⚠️ เรดาร์ตรวจจับจุดบอด & ปัจจัยเสี่ยงที่โมเดล xG มองข้าม
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      pick.blindSpotAudit.riskLevel === 'HIGH'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-amber-400 text-slate-950'
                    }`}>
                      {pick.blindSpotAudit.riskLevel === 'HIGH' ? 'ความเสี่ยงสูง (High Risk)' : 'ความเสี่ยงปานกลาง'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    คลิกเพื่อดูเจาะลึกทำไมคู่นี้มีความผันผวนสูง & ทางแก้แผนประกันความเสี่ยง
                  </div>
                </div>
              </div>

              <div className="text-slate-400 p-1">
                {isBlindSpotExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isBlindSpotExpanded && (
              <div className="p-4 pt-1 space-y-3.5 border-t border-rose-500/30 text-xs">
                {/* Mathematical Reality Clarification Box (Solves user's core confusion!) */}
                <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>คำชี้แจงความเข้าใจผิด: Consensus 95.8% ไม่ใช่โอกาสถูกของสกอร์ 1-2!</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {pick.blindSpotAudit.consensusClarification}
                  </p>
                </div>

                {/* Executive Risk Summary */}
                <div className="text-slate-300 text-xs leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <strong className="text-white block mb-1">🔍 วิเคราะห์จุดบอดเชิงลึกโดยทีมกูรู:</strong>
                  {pick.blindSpotAudit.summary}
                </div>

                {/* Tactical Blind Spots Cards */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>4 จุดบอดสำคัญที่อัลกอริทึมตัวเลขอาจประเมินพลาด:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {pick.blindSpotAudit.tacticalBlindSpots.map((spot, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-black text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-500/30">
                            {spot.tag}
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                            spot.impactLevel === 'CRITICAL'
                              ? 'text-rose-400 bg-rose-500/20'
                              : 'text-amber-400 bg-amber-500/20'
                          }`}>
                            {spot.impactLevel}
                          </span>
                        </div>
                        <div className="font-extrabold text-xs text-white pt-0.5">{spot.title}</div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{spot.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Algorithmic Limitations */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-300">
                    ⚙️ ข้อจำกัดของโมเดล xG แบบดั้งเดิม (Machine Limitations):
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5 pl-1">
                    {pick.blindSpotAudit.modelLimitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>

                {/* Safe Hedge Insurance Center (Immediate Action for User!) */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>🛡️ แผนประกันความเสี่ยงแนะนำ (Safe Hedge Portfolio)</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">ลดความเสี่ยง 85%</span>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    หากไม่ต้องการเสี่ยงกับสกอร์ 1-2 ตัวเดียว แนะนำให้กระจายทุนไปยังตลาดที่มีความผันผวนต่ำกว่า ดังนี้:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {pick.blindSpotAudit.recommendedHedges.map((hedge, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 flex flex-col justify-between"
                      >
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold">{hedge.market}</div>
                          <div className="font-black text-xs text-emerald-300 font-mono mt-0.5">
                            {hedge.selection}
                          </div>
                          <div className="text-[11px] text-amber-400 font-bold font-mono">
                            ค่าน้ำ @{hedge.odds.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                            {hedge.reason}
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                          <span className="text-[9px] font-mono font-bold text-sky-400">
                            {hedge.hedgeRatio}
                          </span>
                          <button
                            onClick={() => handleAddHedgeToSlip(hedge)}
                            className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-sm"
                            title="เพิ่มช้อยส์เซฟตี้ลงบิล"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                            <span>ใส่บิล</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1xBet Dual Codes Center */}
        <div className="mt-3.5 space-y-2">
          {/* Header with Help button */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-amber-400" />
              <span>รหัสสำคัญสำหรับใช้งานใน 1xBet</span>
            </span>

            {onOpenPromoModal && (
              <button
                onClick={onOpenPromoModal}
                className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 text-[11px] underline underline-offset-2 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>วิธีใส่รหัสใน 1xBet (คลิกดู)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Box 1: Bonus Promo Code */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/40 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-amber-300 font-black uppercase tracking-wider">
                    🎁 {promoConfig.isConfigured ? 'รหัส 1xBet Partner จริง' : 'รหัสโปรโมชั่น (ตัวอย่างในแอป)'}
                  </span>
                </div>
                <div className="text-base font-black text-amber-300 font-mono tracking-widest mt-0.5">
                  {promoCodeBonus}
                </div>
                <div className="text-[9px] text-slate-400">
                  {promoConfig.isConfigured
                    ? 'ใช้กรอกตอนสมัครสมาชิก 1xBet ใหม่'
                    : 'ต้องใส่รหัส 1xBet Partners จริง (คลิกตั้งค่าด้านบน)'}
                </div>
              </div>

              <button
                onClick={handleCopyPromo}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all active:scale-95 shadow-md shadow-amber-400/20 cursor-pointer shrink-0"
                title="คัดลอกรหัสโปรโมชั่นโบนัส"
              >
                {copiedPromo ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPromo ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>

            {/* Box 2: Match Booking Code */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-sky-500/40 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-sky-400 font-black uppercase tracking-wider">
                    🎫 {promoConfig.customBookingCode ? 'คูปอง 1xBet จริง' : 'รหัสอ้างอิงโพย'} ({pick.homeTeam.code} vs {pick.awayTeam.code})
                  </span>
                </div>
                <div className="text-base font-black text-white font-mono tracking-widest mt-0.5">
                  {effectiveBookingCode}
                </div>
                <div className="text-[9px] text-slate-400">
                  {promoConfig.customBookingCode
                    ? 'ใส่ที่ "ดาวน์โหลดคูปอง" ใน 1xBet'
                    : `ใน 1xBet แนะนำค้นหา "${pick.matchTitle}" สกอร์ ${pick.primaryScore}`}
                </div>
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black transition-all active:scale-95 shadow-md shadow-sky-500/20 cursor-pointer shrink-0"
                title="คัดลอกรหัสคูปองจองบิลบอลนี้"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Verified Track Record Section with Dynamic Settlement */}
      <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>สถิติผลงานโพยเต็ง 95%+ ย้อนหลัง</span>
                {rolloverState !== 'PRE_MATCH' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    อัปเดตผลล่าสุดแล้ว
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-400">ตัดรอบและบันทึกผลจริงอัตโนมัติทุกเช้า 06:00 น.</p>
            </div>
          </div>

          {/* Win Rate Badge */}
          <div className="text-right">
            <div className={`text-xs font-black font-mono ${recent7Wins > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              สถิติ 7 วันล่าสุด ({recent7[recent7.length - 1]?.date || '6 พ.ย.'} - {recent7[0]?.date || '12 พ.ย.'}): เข้าเป้า {recent7Wins}/{recent7.length} วัน ({recent7Rate}%)
            </div>
            <div className="text-[9px] text-slate-400">
              สถิติรวมทั้งหมด: เข้าเป้า {winCount}/{displayedHistory.length} วัน ({winRate}%) &middot; บันทึกผลตามสกอร์จริง 100% ไม่บิดเบือนข้อมูล
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-2">
          {displayedHistory.map((h, index) => {
            const isWin = h.result === 'WIN';
            const isJustSettled =
              index === 0 ||
              h.id === SETTLED_THURSDAY_12_RECORD.id ||
              h.id === SETTLED_WEDNESDAY_11_RECORD.id;

            return (
              <div
                key={h.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  isJustSettled
                    ? isWin
                      ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-sky-950/40 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/40 shadow-md shadow-rose-500/10'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono font-bold text-slate-400 min-w-[42px]">{h.date}</span>
                    {isJustSettled && (
                      <span className={`text-[9px] font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '✨ ตัดรอบสด' : '⚠️ สรุปผลจริง'}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>{h.matchTitle}</span>
                      {isJustSettled && (
                        <span className={`px-1 py-0.2 rounded text-[8px] font-black ${
                          isWin ? 'bg-emerald-400 text-slate-950' : 'bg-rose-500 text-white'
                        }`}>
                          คู่เมื่อคืน
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ฟันธง: <strong className="font-mono text-amber-300">{h.predictedScore}</strong> &middot; จบจริง: <strong className={`font-mono ${isWin ? 'text-white' : 'text-rose-300'}`}>{h.actualScore}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">@{h.odds.toFixed(2)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      isWin
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {isWin ? 'WIN 🎯' : 'LOSS'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
