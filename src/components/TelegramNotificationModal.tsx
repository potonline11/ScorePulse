import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Bell,
  HelpCircle,
  ShieldCheck,
  Info,
  Activity,
  Link2,
  Terminal,
  Zap,
  Users,
  Search,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export const TELEGRAM_STORAGE_KEY = 'scorepulse_telegram_config_v1';

interface TelegramChatInfo {
  chatId: string;
  title: string;
  type: 'group' | 'supergroup' | 'channel' | 'private';
  lastMessageAtBkk: string;
}

interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  notifyTime: string;
  lastSentOperationalDate?: string;
  lastSentDate?: string;
  lastSentAt?: string;
  lastDispatchStatus?: 'SUCCESS' | 'ERROR' | 'PENDING' | 'NO_TOKEN';
  lastDispatchMessage?: string;
  lastError?: string;
  verifiedBotName?: string;
  verifiedBotUsername?: string;
  detectedChats?: TelegramChatInfo[];
}

interface PipelineLogEntry {
  timeBkk: string;
  dateKey: string;
  step: string;
  status: 'OK' | 'SKIP' | 'WARN' | 'ERROR';
  message: string;
}

interface EngineStateSummary {
  isServerless?: boolean;
  bangkokNow: {
    formattedTime: string;
    formattedDate: string;
    operationalDateKey: string;
  };
  activePick: {
    matchTitle: string;
    league: string;
    kickoffTime: string;
    primaryScore: string;
    primaryOdds: number;
    slipNumber: string;
    dateText: string;
    poissonPeak: number;
  };
  pipeline: {
    settleDoneForDate?: string;
    settleDoneAt?: string;
    settleSummary?: string;
    issueDoneForDate?: string;
    issueDoneAt?: string;
    issueSummary?: string;
    telegramDoneForDate?: string;
    telegramDoneAt?: string;
    telegramStatus?: string;
    logs: PipelineLogEntry[];
  };
}

interface TelegramNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

const cleanTelegramTokenInput = (raw: string) =>
  raw.trim().replace(/[\r\n\s]+/g, '').trim();

const saveTelegramBackupToBrowser = (cfg: TelegramConfig) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (!cfg.botToken) {
      window.localStorage.removeItem(TELEGRAM_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      TELEGRAM_STORAGE_KEY,
      JSON.stringify({
        enabled: cfg.enabled,
        botToken: cfg.botToken,
        chatId: cfg.chatId,
        notifyTime: cfg.notifyTime || '06:30',
      })
    );
  } catch {
    // ignore storage errors
  }
};

const stripTelegramHtmlTags = (html: string) =>
  html
    .replace(/<\/?b>/g, '')
    .replace(/<\/?code>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      error: `เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ (HTTP ${res.status}): ${text.slice(0, 140)}`,
    };
  }
}

export const TelegramNotificationModal: React.FC<TelegramNotificationModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [tgConfig, setTgConfig] = useState<TelegramConfig>({
    enabled: true,
    botToken: '',
    chatId: '',
    notifyTime: '06:30',
    detectedChats: [],
  });

  const [engineState, setEngineState] = useState<EngineStateSummary | null>(null);
  const [liveTelegramPreviewHtml, setLiveTelegramPreviewHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isDetectingChats, setIsDetectingChats] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isRunningCron, setIsRunningCron] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCronUrl, setCopiedCronUrl] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'guide'>('config');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const sharedOrigin = origin.includes('ais-dev-') ? origin.replace('ais-dev-', 'ais-pre-') : origin;
  const cronTickUrl = sharedOrigin ? `${sharedOrigin}/api/cron/tick` : '/api/cron/tick';

  const loadModalData = async () => {
    try {
      setIsLoading(true);
      const [tgCfgRes, stateRes, tgPreviewRes] = await Promise.all([
        fetch('/api/telegram/config'),
        fetch('/api/daily-engine/state'),
        fetch('/api/telegram/preview-message'),
      ]);

      let loadedTgCfg: TelegramConfig | null = null;
      if (tgCfgRes.ok) {
        loadedTgCfg = await parseJsonSafe(tgCfgRes);
      }

      if (loadedTgCfg && !loadedTgCfg.botToken && typeof window !== 'undefined') {
        try {
          const tgRaw = window.localStorage.getItem(TELEGRAM_STORAGE_KEY);
          if (tgRaw) {
            const backup = JSON.parse(tgRaw);
            if (backup?.botToken) {
              const syncRes = await fetch('/api/telegram/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backup),
              });
              if (syncRes.ok) {
                const syncData = await parseJsonSafe(syncRes);
                if (syncData?.config) loadedTgCfg = syncData.config;
              }
            }
          }
        } catch {
          // ignore localStorage errors
        }
      }

      if (loadedTgCfg) {
        setTgConfig((prev) => ({
          ...prev,
          ...loadedTgCfg,
          notifyTime: loadedTgCfg?.notifyTime || '06:30',
        }));
      }

      if (stateRes.ok) {
        const stateData = await parseJsonSafe(stateRes);
        if (stateData?.bangkokNow) {
          setEngineState(stateData);
        }
      }
      if (tgPreviewRes.ok) {
        const tgPrevData = await parseJsonSafe(tgPreviewRes);
        if (tgPrevData.htmlMessage) setLiveTelegramPreviewHtml(tgPrevData.htmlMessage);
      }
    } catch (err) {
      console.warn('Could not load Telegram modal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setTestResult(null);
    loadModalData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyTelegramBot = async () => {
    soundManager.playTap();
    setIsVerifying(true);
    setTestResult(null);
    const cleanedToken = cleanTelegramTokenInput(tgConfig.botToken);
    try {
      const res = await fetch('/api/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: cleanedToken }),
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data.valid) {
        soundManager.playGoalAlert();
        const nextCfg: TelegramConfig = {
          ...tgConfig,
          botToken: cleanedToken,
          verifiedBotName: data.displayName,
          verifiedBotUsername: data.username,
          lastError: undefined,
        };
        setTgConfig(nextCfg);
        saveTelegramBackupToBrowser(nextCfg);
        setTestResult({
          success: true,
          message: `เชื่อมต่อบอท Telegram สำเร็จ! ชื่อบอท: "${data.displayName}" (${data.username || 'Verified'}) — ฟรีไม่จำกัดโควตา`,
        });
        onConfigUpdated?.();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Bot Token ไม่ถูกต้อง',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `ตรวจสอบ Bot Token ไม่สำเร็จ: ${err.message}`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDetectTelegramChats = async () => {
    soundManager.playTap();
    setIsDetectingChats(true);
    setTestResult(null);
    const cleanedToken = cleanTelegramTokenInput(tgConfig.botToken);
    try {
      const res = await fetch('/api/telegram/detect-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: cleanedToken }),
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data.ok) {
        const chats: TelegramChatInfo[] = data.chats || [];
        const selectedId = data.selectedChatId || tgConfig.chatId;
        const nextCfg: TelegramConfig = {
          ...tgConfig,
          botToken: cleanedToken,
          chatId: selectedId,
          detectedChats: chats,
        };
        setTgConfig(nextCfg);
        saveTelegramBackupToBrowser(nextCfg);
        if (chats.length > 0) {
          soundManager.playGoalAlert();
          setTestResult({
            success: true,
            message: `สแกนพบ ${chats.length} แชท/กลุ่มแล้ว! ${
              selectedId
                ? `เลือกรหัส "${selectedId}" ให้อัตโนมัติแล้ว (คลิกสลับกลุ่มได้ที่รายการด้านล่าง)`
                : 'กรุณาคลิกเลือกกลุ่มที่ต้องการ'
            }`,
          });
        } else {
          setTestResult({
            success: false,
            message:
              'ยังไม่พบข้อความในกลุ่มใดเลย — กรุณาเชิญบอทเข้ากลุ่ม Telegram ก่อน แล้วพิมพ์ข้อความใดก็ได้ (เช่น สวัสดี) ลงในกลุ่ม 1 ครั้ง จากนั้นกดปุ่มสแกนใหม่อีกครั้งครับ',
          });
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || 'สแกนหากลุ่มไม่สำเร็จ',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `สแกนหากลุ่มไม่สำเร็จ: ${err.message}`,
      });
    } finally {
      setIsDetectingChats(false);
    }
  };

  const handleTestTelegramSend = async (type: 'test' | 'daily' = 'test') => {
    soundManager.playTap();
    setIsTesting(true);
    setTestResult(null);
    const cleanedToken = cleanTelegramTokenInput(tgConfig.botToken);
    const cleanedChatId = tgConfig.chatId.trim();
    try {
      const endpoint = type === 'daily' ? '/api/telegram/send-daily' : '/api/telegram/test';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tgConfig,
          botToken: cleanedToken,
          chatId: cleanedChatId,
        }),
      });
      const data = await parseJsonSafe(res);
      if (res.ok && data.success) {
        soundManager.playGoalAlert();
        saveTelegramBackupToBrowser({
          ...tgConfig,
          botToken: cleanedToken,
          chatId: data.chatId || cleanedChatId,
        });
        setTestResult({
          success: true,
          message: data.message || 'ส่งข้อความเข้ากลุ่ม Telegram สำเร็จแล้ว!',
        });
        await loadModalData();
        onConfigUpdated?.();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'ส่งเข้ากลุ่ม Telegram ไม่สำเร็จ',
        });
        await loadModalData();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `เกิดข้อผิดพลาดในการส่งเข้า Telegram: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveTelegram = async () => {
    soundManager.playTap();
    setIsLoading(true);
    setTestResult(null);

    const cleanedToken = cleanTelegramTokenInput(tgConfig.botToken);
    const cleanedChatId = tgConfig.chatId.trim();
    const payload = {
      ...tgConfig,
      botToken: cleanedToken,
      chatId: cleanedChatId,
    };

    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setTestResult({
          success: false,
          message: data.error || 'บันทึกตั้งค่า Telegram ไม่สำเร็จ',
        });
        return;
      }

      if (data.config) {
        setTgConfig(data.config);
        saveTelegramBackupToBrowser(data.config);
      }
      if (data.engineState) {
        setEngineState(data.engineState);
      }

      if (!cleanedToken) {
        setTestResult({
          success: true,
          message: 'ล้าง Telegram Bot Token แล้ว',
        });
      } else if (!data.tokenValid) {
        setTestResult({
          success: false,
          message: `Bot Token ไม่ผ่านการตรวจสอบ: ${data.verificationError || 'Invalid Bot Token'}`,
        });
      } else if (!data.config?.chatId) {
        setTestResult({
          success: false,
          message: `บอท ${data.config?.verifiedBotUsername || ''} พร้อมแล้ว แต่ยังไม่พบ Chat ID กลุ่ม — กรุณาเชิญบอทเข้ากลุ่ม Telegram แล้วพิมพ์ 1 ข้อความ จากนั้นกด "สแกนหากลุ่มอัตโนมัติ"`,
        });
      } else {
        soundManager.playGoalAlert();
        const opKey = data.engineState?.bangkokNow?.operationalDateKey;
        const sentNow = opKey && data.config?.lastSentOperationalDate === opKey;
        const dispatchErr = data.config?.lastDispatchStatus === 'ERROR' ? data.config?.lastError : undefined;

        if (dispatchErr) {
          setTestResult({
            success: false,
            message: `เชื่อมต่อบอท ${data.config.verifiedBotUsername} สำเร็จ แต่ส่งเข้ากลุ่ม ${data.config.chatId} ไม่ผ่าน: ${dispatchErr}`,
          });
        } else if (sentNow) {
          setTestResult({
            success: true,
            message: `บันทึกสำเร็จ! ส่งโพยรอบวันนี้เข้ากลุ่ม Telegram (${data.config.chatId}) ทันทีเรียบร้อยแล้ว!`,
          });
        } else {
          setTestResult({
            success: true,
            message: `บันทึกสำเร็จ! บอท ${data.config.verifiedBotUsername} พร้อมส่งเข้ากลุ่ม ${data.config.chatId} ทุกเช้าเวลา ${data.config.notifyTime} น. แล้ว`,
          });
        }
      }

      await loadModalData();
      onConfigUpdated?.();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `บันทึก Telegram ไม่สำเร็จ: ${err?.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCronNow = async () => {
    soundManager.playTap();
    setIsRunningCron(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/cron/tick', { method: 'POST' });
      const data = await parseJsonSafe(res);
      if (res.ok && data.ok) {
        await loadModalData();
        onConfigUpdated?.();
        const tgOk = data.telegramDispatchStatus === 'SUCCESS';
        if (tgOk && !data.telegramError) soundManager.playGoalAlert();

        setTestResult({
          success: tgOk || !data.telegramError,
          message: `รัน Pipeline เวลา ${data.bangkokTime} น. — สถานะ Telegram: ${data.telegramDispatchStatus}${
            data.telegramError ? ` (${data.telegramError})` : data.telegramStatus ? ` (${data.telegramStatus})` : ''
          }`,
        });
      } else {
        setTestResult({ success: false, message: data.error || 'Cron Tick ล้มเหลว' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `รัน Cron ไม่สำเร็จ: ${err.message}` });
    } finally {
      setIsRunningCron(false);
    }
  };

  const handleCopyCronUrl = () => {
    soundManager.playTap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cronTickUrl);
      setCopiedCronUrl(true);
      setTimeout(() => setCopiedCronUrl(false), 2500);
    }
  };

  const opDateKey = engineState?.bangkokNow.operationalDateKey;
  const tgSentToday = Boolean(opDateKey && tgConfig.lastSentOperationalDate === opDateKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92vh] bg-gradient-to-b from-[#0b1624] via-[#0c1b2e] to-[#09101b] rounded-3xl border-2 border-[#229ED9]/60 shadow-2xl shadow-[#229ED9]/15 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#229ED9]/20 border border-[#229ED9]/40 text-[#38bdf8] flex items-center justify-center shrink-0 shadow-lg shadow-[#229ED9]/20">
              <Send className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white">
                  ส่งโพยเข้ากลุ่ม Telegram อัตโนมัติ 06:30 น.
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono bg-[#229ED9]/20 text-sky-300 border-[#229ED9]/40">
                  ฟรีไม่จำกัด + Vercel Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                ยิงโพยคู่เอกประจำวันตรงเข้ากลุ่ม Telegram อัตโนมัติ (ฟรี 100% ไม่มีโควตาจำกัด)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/60 p-1 text-xs">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'config'
                ? 'bg-[#229ED9] text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>ตั้งค่าบอท & กลุ่ม</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-[#229ED9] text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>ข้อความวันนี้ (สด)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-[#229ED9] text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>วิธีตั้งกลุ่ม & Vercel</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Live Pipeline Diagnostics Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>สถานะระบบอัตโนมัติ (รอบวันที่ {opDateKey || '...'})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCronNow}
                  disabled={isRunningCron}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3 h-3 ${isRunningCron ? 'animate-pulse' : ''}`} />
                  <span>{isRunningCron ? 'กำลังรัน...' : 'รันส่งเข้ากลุ่มตอนนี้'}</span>
                </button>
                <button
                  onClick={loadModalData}
                  className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>รีเฟรช</span>
                </button>
              </div>
            </div>

            {/* 3-Step Diagnostics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-bold text-amber-400 flex items-center justify-between">
                  <span>1. 05:00 น. สรุปผล</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-slate-300 mt-0.5 line-clamp-2">
                  {engineState?.pipeline.settleSummary || 'ตัดรอบผลบอลเมื่อคืนแล้ว'}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-bold text-sky-400 flex items-center justify-between">
                  <span>2. 06:00 น. ออกโพย</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-slate-300 mt-0.5 line-clamp-2">
                  {engineState?.activePick
                    ? `${engineState.activePick.matchTitle} (${engineState.activePick.primaryScore} @${engineState.activePick.primaryOdds.toFixed(2)})`
                    : 'กำลังโหลดโพยวันนี้...'}
                </div>
              </div>

              <div
                className={`p-2 rounded-xl border ${
                  tgSentToday
                    ? 'bg-emerald-950/50 border-emerald-500/50'
                    : tgConfig.lastDispatchStatus === 'ERROR'
                    ? 'bg-rose-950/50 border-rose-500/60'
                    : !tgConfig.botToken || !tgConfig.chatId
                    ? 'bg-sky-950/40 border-sky-500/50'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="font-bold text-sky-400 flex items-center justify-between">
                  <span>3. {tgConfig.notifyTime || '06:30'} น. Telegram</span>
                  {tgSentToday ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <AlertTriangle
                      className={`w-3 h-3 ${
                        tgConfig.lastDispatchStatus === 'ERROR' ? 'text-rose-400' : 'text-sky-400'
                      }`}
                    />
                  )}
                </div>
                <div className="text-slate-300 mt-0.5 line-clamp-2">
                  {tgSentToday
                    ? `ส่งเข้ากลุ่มแล้ว (${engineState?.pipeline.telegramDoneAt || ''})`
                    : !tgConfig.botToken
                    ? 'กรอก Bot Token จาก @BotFather ด้านล่าง'
                    : !tgConfig.chatId
                    ? 'กดสแกนหา Chat ID กลุ่ม'
                    : engineState?.pipeline.telegramStatus || 'พร้อมยิงเข้ากลุ่มรอบถัดไป'}
                </div>
              </div>
            </div>

            {!tgConfig.botToken ? (
              <div className="p-2.5 rounded-xl bg-sky-950/50 border border-[#229ED9]/40 text-sky-200 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block">Telegram Bot API ส่งเข้ากลุ่มฟรีไม่จำกัดข้อความ 100%:</strong>
                  <span>
                    วาง <strong>Bot Token</strong> จาก <strong>@BotFather</strong> ด้านล่าง &rarr; กด{' '}
                    <strong>🔍 สแกนหากลุ่มอัตโนมัติ</strong> &rarr; กดทดสอบและบันทึกได้เลยครับ
                  </span>
                </div>
              </div>
            ) : tgConfig.verifiedBotName ? (
              <div className="p-2 rounded-xl bg-sky-950/40 border border-[#229ED9]/50 text-sky-200 text-[11px] flex items-center justify-between flex-wrap gap-1.5">
                <span>
                  ✈️ บอท Telegram: <strong>{tgConfig.verifiedBotName}</strong> ({tgConfig.verifiedBotUsername || 'Bot'})
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                    โควตา: ไม่จำกัด (ฟรี)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#229ED9]/30 text-sky-200 text-[10px] font-bold">
                    Verified
                  </span>
                </div>
              </div>
            ) : null}

            {tgConfig.lastError && (
              <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-[11px] break-words">
                <strong className="block text-rose-300">สาเหตุล่าสุดที่ส่ง Telegram ไม่ผ่าน:</strong>
                <span>{tgConfig.lastError}</span>
              </div>
            )}
          </div>

          {/* TAB 1: CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              {/* Enable Toggle Switch */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block text-xs">
                    เปิดระบบส่งโพยคู่เอกเข้ากลุ่ม Telegram อัตโนมัติ
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ส่งเข้ากลุ่มทุกวันเวลา {tgConfig.notifyTime || '06:30'} น. (ฟรี 100% ไม่จำกัดข้อความต่อเดือน)
                  </span>
                </div>
                <button
                  onClick={() => {
                    soundManager.playTap();
                    setTgConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
                  }}
                  className={`w-12 h-6.5 rounded-full transition-all relative p-0.5 cursor-pointer shrink-0 ${
                    tgConfig.enabled ? 'bg-[#229ED9]' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transition-all ${
                      tgConfig.enabled ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Time Selector */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="font-bold text-white block text-xs">เวลาส่งเข้ากลุ่ม Telegram ประจำวัน:</span>
                    <span className="text-[11px] text-slate-400">เวลาประเทศไทย (Asia/Bangkok UTC+7)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={tgConfig.notifyTime}
                    onChange={(e) => setTgConfig((prev) => ({ ...prev, notifyTime: e.target.value }))}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-sky-300 font-mono font-black text-sm focus:border-sky-400 outline-none"
                  />
                  <span className="text-[11px] text-slate-400">น.</span>
                </div>
              </div>

              {/* Bot Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-bold text-white flex items-center gap-1 text-xs">
                    <span>Telegram Bot Token (จาก @BotFather):</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <button
                    onClick={handleVerifyTelegramBot}
                    disabled={isVerifying || !tgConfig.botToken}
                    className="px-2.5 py-1 rounded-lg bg-[#229ED9]/20 hover:bg-[#229ED9]/30 disabled:opacity-40 text-sky-300 border border-[#229ED9]/40 text-[10px] font-bold cursor-pointer"
                  >
                    {isVerifying ? 'กำลังตรวจ...' : 'ตรวจสอบบอท (getMe)'}
                  </button>
                </div>
                <input
                  type="text"
                  value={tgConfig.botToken}
                  onChange={(e) =>
                    setTgConfig((prev) => ({ ...prev, botToken: cleanTelegramTokenInput(e.target.value) }))
                  }
                  placeholder="เช่น 9074934698:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-xs font-mono text-sky-300 placeholder:text-slate-600 focus:border-[#229ED9] outline-none"
                />
              </div>

              {/* Group Chat ID + 1-Click Auto-Scanner */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="font-bold text-white text-xs">
                    Group Chat ID (รหัสกลุ่ม Telegram): <span className="text-rose-400">*</span>
                  </label>
                  <button
                    onClick={handleDetectTelegramChats}
                    disabled={isDetectingChats || !tgConfig.botToken}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Search className={`w-3 h-3 ${isDetectingChats ? 'animate-spin' : ''}`} />
                    <span>{isDetectingChats ? 'กำลังสแกน...' : '🔍 สแกนหากลุ่มอัตโนมัติ (getUpdates)'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={tgConfig.chatId}
                  onChange={(e) => setTgConfig((prev) => ({ ...prev, chatId: e.target.value.trim() }))}
                  placeholder="รหัสกลุ่มขึ้นต้นด้วย - หรือ -100... (หรือกดปุ่มสแกนด้านขวา)"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-600 focus:border-[#229ED9] outline-none"
                />

                {/* Auto-Detected Telegram Groups */}
                {tgConfig.detectedChats && tgConfig.detectedChats.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-bold text-sky-300 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>กลุ่ม/แชท Telegram ที่บอทตรวจพบ (คลิกเพื่อเลือกใช้):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tgConfig.detectedChats.map((c) => {
                        const isSelected = tgConfig.chatId === c.chatId;
                        const typeLabel =
                          c.type === 'supergroup'
                            ? 'Supergroup'
                            : c.type === 'group'
                            ? 'Group'
                            : c.type === 'channel'
                            ? 'Channel'
                            : 'Private';
                        return (
                          <button
                            key={c.chatId}
                            onClick={() => {
                              soundManager.playTap();
                              setTgConfig((prev) => ({ ...prev, chatId: c.chatId }));
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] border cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-[#229ED9] text-slate-950 border-[#229ED9] font-black'
                                : 'bg-slate-950 text-slate-200 border-slate-700 hover:border-sky-400'
                            }`}
                          >
                            <span className="font-bold">{c.title}</span>
                            <span
                              className={`px-1 rounded text-[9px] font-mono ${
                                isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-sky-500/20 text-sky-300'
                              }`}
                            >
                              {typeLabel}
                            </span>
                            <span className="font-mono opacity-80">{c.chatId}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                      : 'bg-rose-950/80 border-rose-500 text-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span className="break-words">{testResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleTestTelegramSend('test')}
                  disabled={isTesting || !tgConfig.botToken || !tgConfig.chatId}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce' : ''}`} />
                  <span>{isTesting ? 'กำลังส่ง...' : 'ทดสอบส่งเข้ากลุ่ม'}</span>
                </button>

                <button
                  onClick={() => handleTestTelegramSend('daily')}
                  disabled={isTesting || !tgConfig.botToken || !tgConfig.chatId}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#229ED9] to-sky-600 hover:from-sky-400 hover:to-sky-500 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#229ED9]/20 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ส่งโพยวันนี้ ({engineState?.activePick?.primaryScore || '2-0'}) เข้ากลุ่มทันที</span>
                </button>
              </div>

              <button
                onClick={handleSaveTelegram}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-400/20 active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isLoading ? 'กำลังบันทึก & สแกนกลุ่ม...' : 'บันทึก & ตรวจบอท Telegram อัตโนมัติ'}</span>
              </button>

              {engineState?.pipeline?.logs && engineState.pipeline.logs.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                    <Terminal className="w-3.5 h-3.5 text-sky-400" />
                    <span>บันทึกการทำงานล่าสุดของเซิร์ฟเวอร์ (Pipeline Logs):</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {engineState.pipeline.logs.slice(0, 6).map((log, i) => (
                      <div
                        key={i}
                        className="text-[10px] font-mono p-1.5 rounded-lg bg-slate-900/90 border border-slate-800/80 flex items-start gap-2"
                      >
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold shrink-0 ${
                            log.status === 'ERROR'
                              ? 'bg-rose-500/20 text-rose-300'
                              : log.status === 'WARN'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {log.step}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-400 mr-1.5">[{log.timeBkk}]</span>
                          <span className="text-slate-200 break-words">{log.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE DYNAMIC MESSAGE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>
                  ข้อความจริงที่จะถูกส่งเข้า <strong>กลุ่ม Telegram</strong> วันนี้:
                </span>
                <span className="font-mono text-sky-400 font-bold">
                  {engineState?.bangkokNow.operationalDateKey}
                </span>
              </div>

              <div className="p-4 rounded-3xl bg-[#0e1621] border border-[#229ED9]/40 space-y-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <div className="w-7 h-7 rounded-full bg-[#229ED9] flex items-center justify-center text-slate-950 font-black text-[10px]">
                    TG
                  </div>
                  <div>
                    <span className="font-bold text-sky-300 block">
                      {tgConfig.verifiedBotName || 'ScorePulse Bot'}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({tgConfig.verifiedBotUsername || '@bot'})
                      </span>
                    </span>
                    <span className="text-[9px] text-slate-400">
                      ส่งเข้ากลุ่ม {tgConfig.chatId || '(ยังไม่ได้เลือกกลุ่ม)'} • {tgConfig.notifyTime || '06:30'} น.
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl rounded-tl-sm bg-[#182533] text-slate-100 border border-slate-700/60 p-3.5 shadow-lg text-[11px] leading-relaxed font-sans whitespace-pre-wrap break-words">
                  {liveTelegramPreviewHtml
                    ? stripTelegramHtmlTags(liveTelegramPreviewHtml)
                    : 'กำลังโหลดตัวอย่างข้อความโพยวันนี้...'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GUIDE (Telegram + Vercel) */}
          {activeTab === 'guide' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-[#229ED9]/40 space-y-2">
                <span className="font-bold text-sky-300 text-xs block">
                  1. วิธีสร้างและดึงบอท Telegram เข้ากลุ่มแชท:
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                  <li>
                    เปิด Telegram ค้นหา <code className="bg-slate-950 px-1.5 py-0.5 rounded text-sky-300">@BotFather</code> &rarr; พิมพ์ <code className="bg-slate-950 px-1 rounded text-amber-300">/newbot</code> &rarr; คัดลอก <strong>Token</strong>
                  </li>
                  <li>
                    เชิญบอทเข้ากลุ่ม Telegram ของคุณ (ตั้งเป็น <strong>Admin</strong>) &rarr; พิมพ์ข้อความในกลุ่ม 1 ครั้ง
                  </li>
                  <li>
                    วาง Token ในช่องตั้งค่า แล้วกด <strong className="text-emerald-300">🔍 สแกนหากลุ่มอัตโนมัติ</strong> เพื่อเลือกกลุ่ม
                  </li>
                </ol>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-[11px] space-y-2">
                <div className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>2. การ Deploy บน Vercel + ตั้ง Environment Variables ถาวร:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  บน <strong>Vercel</strong> ไฟล์ที่เขียนลงดิสก์จะไม่ถาวร — ให้เพิ่มค่า 2 ตัวนี้ใน{' '}
                  <strong>Vercel Project &gt; Settings &gt; Environment Variables</strong> เพื่อให้ส่ง 06:30 น. ได้ทุกวัน:
                </p>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[10px] text-amber-300 space-y-1">
                  <div>TELEGRAM_BOT_TOKEN = (Bot Token จาก @BotFather)</div>
                  <div>TELEGRAM_CHAT_ID = (Chat ID กลุ่ม เช่น -100...)</div>
                  <div>GEMINI_API_KEY = (ตัวเสริม สำหรับดึงผลบอล/ออกโพยล่วงหน้า)</div>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  ระบบมี <code className="text-emerald-300">vercel.json</code> ตั้ง <strong>Vercel Cron</strong> ที่เวลา{' '}
                  <code>30 23 * * *</code> (06:30 น. เวลาไทย) ไว้แล้ว หรือนำไปวางใน{' '}
                  <strong>cron-job.org</strong> ยิงมาที่ลิงก์นี้ทุกวัน 06:30 น. ได้ตรงนาทีที่สุด:
                </p>
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <code className="text-[10px] font-mono text-emerald-300 truncate flex-1">{cronTickUrl}</code>
                  <button
                    onClick={handleCopyCronUrl}
                    className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedCronUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCronUrl ? 'คัดลอกแล้ว' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">Telegram Bot API (Free Unlimited) + Bangkok UTC+7</span>
          </div>

          <button
            onClick={() => {
              soundManager.playTap();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer text-xs shrink-0"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
