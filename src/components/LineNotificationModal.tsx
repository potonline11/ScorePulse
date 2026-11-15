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
  MessageSquare,
  Info,
  Activity,
  Link2,
  Terminal,
  Zap,
  Users,
  Search,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

export const LINE_STORAGE_KEY = 'scorepulse_line_config_v1';
export const TELEGRAM_STORAGE_KEY = 'scorepulse_telegram_config_v1';

interface DetectedWebhookRecipient {
  id: string;
  type: 'user' | 'group' | 'room';
  label: string;
  detectedAtBkk: string;
}

interface LineConfig {
  enabled: boolean;
  channelAccessToken: string;
  targetUserId: string;
  notifyTime: string;
  lastSentOperationalDate?: string;
  lastSentDate?: string;
  lastSentAt?: string;
  lastDispatchStatus?: 'SUCCESS' | 'ERROR' | 'PENDING' | 'NO_TOKEN';
  lastDispatchMessage?: string;
  lastError?: string;
  verifiedBotName?: string;
  verifiedBotBasicId?: string;
  quotaType?: string;
  quotaLimit?: number;
  quotaUsed?: number;
  detectedRecipients?: DetectedWebhookRecipient[];
}

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
    lineDoneForDate?: string;
    lineDoneAt?: string;
    lineStatus?: string;
    telegramDoneForDate?: string;
    telegramDoneAt?: string;
    telegramStatus?: string;
    logs: PipelineLogEntry[];
  };
}

interface LineNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
  initialChannel?: 'line' | 'telegram';
}

const cleanTokenInput = (raw: string) =>
  raw
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/[\r\n\s]+/g, '')
    .trim();

const cleanTelegramTokenInput = (raw: string) =>
  raw.trim().replace(/[\r\n\s]+/g, '').trim();

const isTargetFormatValid = (target: string) => {
  const t = target.trim();
  if (!t || t.toLowerCase() === 'all') return true;
  return /^[UCR][0-9a-fA-F]{32}$/.test(t);
};

const saveBackupToBrowser = (cfg: LineConfig) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (!cfg.channelAccessToken) {
      window.localStorage.removeItem(LINE_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      LINE_STORAGE_KEY,
      JSON.stringify({
        enabled: cfg.enabled,
        channelAccessToken: cfg.channelAccessToken,
        targetUserId: cfg.targetUserId,
        notifyTime: cfg.notifyTime || '06:30',
      })
    );
  } catch {
    // ignore storage errors
  }
};

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

export const LineNotificationModal: React.FC<LineNotificationModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
  initialChannel = 'line',
}) => {
  const [channel, setChannel] = useState<'line' | 'telegram'>(initialChannel);

  const [config, setConfig] = useState<LineConfig>({
    enabled: true,
    channelAccessToken: '',
    targetUserId: '',
    notifyTime: '06:30',
  });
  const [tgConfig, setTgConfig] = useState<TelegramConfig>({
    enabled: true,
    botToken: '',
    chatId: '',
    notifyTime: '06:30',
    detectedChats: [],
  });

  const [engineState, setEngineState] = useState<EngineStateSummary | null>(null);
  const [livePreviewText, setLivePreviewText] = useState<string>('');
  const [liveTelegramPreviewHtml, setLiveTelegramPreviewHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isDetectingChats, setIsDetectingChats] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isRunningCron, setIsRunningCron] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCronUrl, setCopiedCronUrl] = useState<boolean>(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState<boolean>(false);
  const [copiedAppsScript, setCopiedAppsScript] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'config' | 'preview' | 'guide'>('config');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const sharedOrigin = origin.includes('ais-dev-') ? origin.replace('ais-dev-', 'ais-pre-') : origin;
  const cronTickUrl = sharedOrigin ? `${sharedOrigin}/api/cron/tick` : '/api/cron/tick';
  const webhookUrl = origin ? `${origin}/api/line/webhook` : '/api/line/webhook';

  const appsScriptSnippet = `// วางใน script.google.com > ตั้ง Trigger แบบ Time-driven ทุกวันเวลา 06:00 - 07:00 น. (เวลาไทย)
// ปลุกครั้งเดียวส่งพร้อมกันทั้ง LINE OA และ กลุ่ม Telegram อัตโนมัติ!
function wakeScorePulseAt0630() {
  var url = "${cronTickUrl}";
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log("Status: " + res.getResponseCode() + " | " + res.getContentText());
}`;

  const handleCopyAppsScript = () => {
    soundManager.playTap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(appsScriptSnippet);
      setCopiedAppsScript(true);
      setTimeout(() => setCopiedAppsScript(false), 2500);
    }
  };

  const loadModalData = async () => {
    try {
      setIsLoading(true);
      const [cfgRes, tgCfgRes, stateRes, previewRes, tgPreviewRes] = await Promise.all([
        fetch('/api/line/config'),
        fetch('/api/telegram/config'),
        fetch('/api/daily-engine/state'),
        fetch('/api/line/preview-message'),
        fetch('/api/telegram/preview-message'),
      ]);

      let loadedCfg: LineConfig | null = null;
      if (cfgRes.ok) {
        loadedCfg = await cfgRes.json();
      }

      if (loadedCfg && !loadedCfg.channelAccessToken && typeof window !== 'undefined') {
        try {
          const backupRaw = window.localStorage.getItem(LINE_STORAGE_KEY);
          if (backupRaw) {
            const backup = JSON.parse(backupRaw);
            if (backup?.channelAccessToken) {
              const syncRes = await fetch('/api/line/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backup),
              });
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                if (syncData?.config) loadedCfg = syncData.config;
              }
            }
          }
        } catch {
          // ignore localStorage parse errors
        }
      }

      if (loadedCfg) {
        setConfig((prev) => ({
          ...prev,
          ...loadedCfg,
          notifyTime: loadedCfg?.notifyTime || '06:30',
        }));
      }

      let loadedTgCfg: TelegramConfig | null = null;
      if (tgCfgRes.ok) {
        loadedTgCfg = await tgCfgRes.json();
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
                const syncData = await syncRes.json();
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
        const stateData = await stateRes.json();
        setEngineState(stateData);
      }
      if (previewRes.ok) {
        const prevData = await previewRes.json();
        if (prevData.message) setLivePreviewText(prevData.message);
      }
      if (tgPreviewRes.ok) {
        const tgPrevData = await tgPreviewRes.json();
        if (tgPrevData.htmlMessage) setLiveTelegramPreviewHtml(tgPrevData.htmlMessage);
      }
    } catch (err) {
      console.warn('Could not load notification modal data:', err);
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

  const targetInvalid = !isTargetFormatValid(config.targetUserId);

  // --- LINE Handlers ---
  const handleSaveLine = async () => {
    soundManager.playTap();
    setIsLoading(true);
    setTestResult(null);

    const cleanedToken = cleanTokenInput(config.channelAccessToken);
    const cleanedTarget = config.targetUserId.trim();
    const payload = {
      ...config,
      channelAccessToken: cleanedToken,
      targetUserId: cleanedTarget,
    };

    try {
      const res = await fetch('/api/line/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setTestResult({
          success: false,
          message: data.error || 'บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่',
        });
        return;
      }

      if (data.config) {
        setConfig(data.config);
        saveBackupToBrowser(data.config);
      }
      if (data.engineState) {
        setEngineState(data.engineState);
      }

      if (!cleanedToken) {
        setTestResult({
          success: true,
          message: 'ล้าง Token แล้ว (กรุณาวาง Channel Access Token เพื่อเปิดใช้งานส่ง LINE)',
        });
      } else if (!data.tokenValid) {
        setTestResult({
          success: false,
          message: `Token ไม่ผ่านการตรวจสอบกับ LINE API: ${data.verificationError || 'Invalid Token'}`,
        });
      } else if (data.targetWarning) {
        setTestResult({
          success: false,
          message: data.targetWarning,
        });
      } else {
        soundManager.playGoalAlert();
        const opKey = data.engineState?.bangkokNow?.operationalDateKey;
        const sentNow = opKey && data.config?.lastSentOperationalDate === opKey;
        const dispatchErr = data.config?.lastDispatchStatus === 'ERROR' ? data.config?.lastError : undefined;

        if (dispatchErr) {
          setTestResult({
            success: false,
            message: `เชื่อมต่อบอท "${data.config.verifiedBotName}" สำเร็จ แต่ยิงข้อความไม่ผ่าน: ${dispatchErr}`,
          });
        } else if (sentNow) {
          setTestResult({
            success: true,
            message: `บันทึกสำเร็จ! ระบบตรวจสอบบอท "${data.config.verifiedBotName}" และส่งโพยรอบวันนี้เข้า LINE ให้ทันทีเรียบร้อยแล้ว!`,
          });
        } else {
          setTestResult({
            success: true,
            message: `บันทึกสำเร็จ! เชื่อมต่อบอท "${data.config.verifiedBotName}" พร้อมส่งอัตโนมัติเวลา ${data.config.notifyTime} น. แล้ว`,
          });
        }
      }

      await loadModalData();
      onConfigUpdated?.();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `เกิดข้อผิดพลาดในการบันทึก: ${err?.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLineToken = async () => {
    soundManager.playTap();
    setIsVerifying(true);
    setTestResult(null);
    const cleanedToken = cleanTokenInput(config.channelAccessToken);
    try {
      const res = await fetch('/api/line/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelAccessToken: cleanedToken }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        soundManager.playGoalAlert();
        const nextCfg: LineConfig = {
          ...config,
          channelAccessToken: cleanedToken,
          verifiedBotName: data.displayName,
          verifiedBotBasicId: data.basicId,
          quotaType: data.quotaType,
          quotaLimit: data.quotaLimit,
          quotaUsed: data.quotaUsed,
          lastError: undefined,
        };
        setConfig(nextCfg);
        saveBackupToBrowser(nextCfg);
        const quotaTxt =
          typeof data.quotaLimit === 'number'
            ? ` | โควตาเดือนนี้ใช้ไป ${data.quotaUsed ?? 0}/${data.quotaLimit} ข้อความ`
            : '';
        setTestResult({
          success: true,
          message: `เชื่อมต่อบอท LINE OA สำเร็จ! ชื่อบอท: "${data.displayName}" (${data.basicId || 'Verified'})${quotaTxt}`,
        });
        onConfigUpdated?.();
      } else {
        setTestResult({
          success: false,
          message: `Token ไม่ถูกต้องหรือหมดอายุ: ${data.error || 'Verify failed'}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `ตรวจสอบ Token ไม่สำเร็จ: ${err.message}`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTestLineSend = async (type: 'test' | 'daily' = 'test') => {
    soundManager.playTap();
    setIsTesting(true);
    setTestResult(null);
    const cleanedToken = cleanTokenInput(config.channelAccessToken);
    const cleanedTarget = config.targetUserId.trim();
    try {
      const endpoint = type === 'daily' ? '/api/line/send-daily' : '/api/line/test';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          channelAccessToken: cleanedToken,
          targetUserId: cleanedTarget,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        soundManager.playGoalAlert();
        saveBackupToBrowser({
          ...config,
          channelAccessToken: cleanedToken,
          targetUserId: cleanedTarget,
        });
        setTestResult({
          success: true,
          message: data.message || 'ส่งข้อความเข้า LINE สำเร็จเรียบร้อยแล้ว!',
        });
        await loadModalData();
        onConfigUpdated?.();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'ส่งไม่สำเร็จ: กรุณาตรวจสอบ Channel Access Token หรือ User ID',
        });
        await loadModalData();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // --- TELEGRAM Handlers ---
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
      const data = await res.json();
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
      const data = await res.json();
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
              selectedId ? `เลือกรหัส "${selectedId}" ให้อัตโนมัติแล้ว (คลิกสลับกลุ่มได้ที่รายการด้านล่าง)` : 'กรุณาคลิกเลือกกลุ่มที่ต้องการ'
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
      const data = await res.json();
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
      const data = await res.json();

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
      const data = await res.json();
      if (res.ok && data.ok) {
        await loadModalData();
        onConfigUpdated?.();
        const lineOk = data.lineDispatchStatus === 'SUCCESS';
        const tgOk = data.telegramDispatchStatus === 'SUCCESS';
        const activeErr = channel === 'telegram' ? data.telegramError : data.lineError;
        const activeStatusText = channel === 'telegram' ? data.telegramStatus : data.lineStatus;
        const anySuccess = lineOk || tgOk;
        if (anySuccess && !activeErr) soundManager.playGoalAlert();

        setTestResult({
          success: channel === 'telegram' ? tgOk || !activeErr : lineOk || !activeErr,
          message: `รัน Pipeline เวลา ${data.bangkokTime} น. — LINE: ${data.lineDispatchStatus} | Telegram: ${data.telegramDispatchStatus}${
            activeErr ? ` (${activeErr})` : activeStatusText ? ` (${activeStatusText})` : ''
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

  const handleCopyWebhookUrl = () => {
    soundManager.playTap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2500);
    }
  };

  const opDateKey = engineState?.bangkokNow.operationalDateKey;
  const lineSentToday = Boolean(opDateKey && config.lastSentOperationalDate === opDateKey);
  const tgSentToday = Boolean(opDateKey && tgConfig.lastSentOperationalDate === opDateKey);
  const isTg = channel === 'telegram';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div
        className={`relative w-full max-w-xl max-h-[92vh] bg-gradient-to-b from-[#0c1913] via-[#0c1b26] to-[#09101b] rounded-3xl border-2 shadow-2xl overflow-hidden flex flex-col ${
          isTg ? 'border-[#229ED9]/60 shadow-[#229ED9]/15' : 'border-[#06C755]/50 shadow-[#06C755]/10'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                isTg
                  ? 'bg-[#229ED9]/20 border border-[#229ED9]/40 text-[#38bdf8] shadow-[#229ED9]/20'
                  : 'bg-[#06C755]/20 border border-[#06C755]/40 text-[#06C755] shadow-[#06C755]/20'
              }`}
            >
              {isTg ? <Send className="w-5 h-5" /> : <MessageSquare className="w-5 h-5 fill-current" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white">
                  ระบบส่งโพยอัตโนมัติ 06:30 น.
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${
                    isTg
                      ? 'bg-[#229ED9]/20 text-sky-300 border-[#229ED9]/40'
                      : 'bg-[#06C755]/20 text-[#06C755] border-[#06C755]/40'
                  }`}
                >
                  LINE OA + Telegram Group
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                ส่งตรงพร้อมกันเข้า LINE และ กลุ่มแชท Telegram อัตโนมัติ (Self-Healing Sync)
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

        {/* Channel Switcher: LINE OA vs Telegram Group */}
        <div className="px-3 pt-2.5 pb-1.5 bg-slate-950/90 border-b border-slate-800 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              soundManager.playTap();
              setChannel('line');
              setTestResult(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              channel === 'line'
                ? 'bg-[#06C755]/20 border-[#06C755] text-[#06C755] shadow-md shadow-[#06C755]/10'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>💬 LINE OA</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                lineSentToday
                  ? 'bg-emerald-500 text-slate-950'
                  : config.channelAccessToken
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {lineSentToday ? '✓ ส่งแล้ว' : config.channelAccessToken ? 'พร้อม' : 'ยังไม่ตั้ง'}
            </span>
          </button>

          <button
            onClick={() => {
              soundManager.playTap();
              setChannel('telegram');
              setTestResult(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              channel === 'telegram'
                ? 'bg-[#229ED9]/20 border-[#229ED9] text-sky-300 shadow-md shadow-[#229ED9]/15'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>✈️ Telegram กลุ่ม</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                tgSentToday
                  ? 'bg-emerald-500 text-slate-950'
                  : tgConfig.botToken && tgConfig.chatId
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-sky-500/20 text-sky-300'
              }`}
            >
              {tgSentToday ? '✓ ส่งแล้ว' : tgConfig.botToken && tgConfig.chatId ? 'พร้อมส่งฟรี' : 'ฟรีไม่อั้น'}
            </span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/60 p-1 text-xs">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'config'
                ? isTg
                  ? 'bg-[#229ED9] text-slate-950 shadow-md font-black'
                  : 'bg-[#06C755] text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>ตั้งค่า & วินิจฉัย</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'preview'
                ? isTg
                  ? 'bg-[#229ED9] text-slate-950 shadow-md font-black'
                  : 'bg-[#06C755] text-slate-950 shadow-md font-black'
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
                ? isTg
                  ? 'bg-[#229ED9] text-slate-950 shadow-md font-black'
                  : 'bg-[#06C755] text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isTg ? 'วิธีตั้งกลุ่ม Telegram' : 'คู่มือ Webhook + Cron'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Live Pipeline Diagnostics Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <Activity className={`w-4 h-4 ${isTg ? 'text-sky-400' : 'text-[#06C755]'}`} />
                <span>สถานะระบบอัตโนมัติ (รอบวันที่ {opDateKey || '...'})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCronNow}
                  disabled={isRunningCron}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3 h-3 ${isRunningCron ? 'animate-pulse' : ''}`} />
                  <span>{isRunningCron ? 'กำลังรัน...' : 'รัน Catch-Up ตอนนี้'}</span>
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

              {isTg ? (
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
                    <span>3. {tgConfig.notifyTime || '06:30'} น. TG กลุ่ม</span>
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
                      ? 'กรอก Token จาก @BotFather ด้านล่าง'
                      : !tgConfig.chatId
                      ? 'กดสแกนหา Chat ID กลุ่ม'
                      : engineState?.pipeline.telegramStatus || 'พร้อมยิงเข้ากลุ่มรอบถัดไป'}
                  </div>
                </div>
              ) : (
                <div
                  className={`p-2 rounded-xl border ${
                    lineSentToday
                      ? 'bg-emerald-950/50 border-emerald-500/50'
                      : config.lastDispatchStatus === 'ERROR'
                      ? 'bg-rose-950/50 border-rose-500/60'
                      : !config.channelAccessToken
                      ? 'bg-amber-950/40 border-amber-500/50'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="font-bold text-[#06C755] flex items-center justify-between">
                    <span>3. {config.notifyTime || '06:30'} น. LINE</span>
                    {lineSentToday ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <AlertTriangle
                        className={`w-3 h-3 ${config.lastDispatchStatus === 'ERROR' ? 'text-rose-400' : 'text-amber-400'}`}
                      />
                    )}
                  </div>
                  <div className="text-slate-300 mt-0.5 line-clamp-2">
                    {lineSentToday
                      ? `ส่งรอบวันนี้แล้ว (${engineState?.pipeline.lineDoneAt || ''})`
                      : !config.channelAccessToken
                      ? 'ยังไม่ได้ใส่ Token ในเซิร์ฟเวอร์'
                      : engineState?.pipeline.lineStatus || 'พร้อมยิงรอบถัดไป'}
                  </div>
                </div>
              )}
            </div>

            {/* Channel-Specific Verified Info / Warning */}
            {!isTg ? (
              <>
                {!config.channelAccessToken ? (
                  <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">ยังไม่ได้ใส่ LINE Channel Access Token:</strong>
                      <span>
                        วาง Token ด้านล่างแล้วกด <strong>บันทึก & ตรวจสอบ Token</strong> ระบบจะสำรองไว้และส่งให้อัตโนมัติครับ
                      </span>
                    </div>
                  </div>
                ) : config.verifiedBotName ? (
                  <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center justify-between flex-wrap gap-1.5">
                    <span>
                      🤖 บอท LINE: <strong>{config.verifiedBotName}</strong> ({config.verifiedBotBasicId || 'LINE OA'})
                    </span>
                    <div className="flex items-center gap-1.5">
                      {typeof config.quotaLimit === 'number' && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-sky-300 border border-sky-500/30 text-[10px] font-mono">
                          โควตา: {config.quotaUsed ?? 0}/{config.quotaLimit}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] font-bold">Verified</span>
                    </div>
                  </div>
                ) : null}

                {config.lastError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-[11px] break-words">
                    <strong className="block text-rose-300">สาเหตุล่าสุดที่ส่ง LINE ไม่ผ่าน:</strong>
                    <span>{config.lastError}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {!tgConfig.botToken ? (
                  <div className="p-2.5 rounded-xl bg-sky-950/50 border border-[#229ED9]/40 text-sky-200 text-[11px] flex items-start gap-2">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Telegram Bot API ส่งเข้ากลุ่มฟรีไม่จำกัดข้อความ 100%:</strong>
                      <span>
                        สร้างบอทผ่าน <strong>@BotFather</strong> &rarr; วาง Token ด้านล่าง &rarr; เชิญบอทเข้ากลุ่ม &rarr; กด{' '}
                        <strong>สแกนหากลุ่มอัตโนมัติ</strong> ได้ทันทีครับ
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
              </>
            )}
          </div>

          {/* TAB 1: CONFIGURATION */}
          {activeTab === 'config' && !isTg && (
            <div className="space-y-4">
              {/* Enable Toggle Switch */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block text-xs">
                    เปิดระบบส่งโพยคู่เอกเข้า LINE อัตโนมัติ + Catch-Up
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ส่งทันทีเมื่อถึงเวลา {config.notifyTime || '06:30'} น. (หากเซิร์ฟเวอร์ตื่นหลัง 06:30 จะตามส่งให้อัตโนมัติ)
                  </span>
                </div>
                <button
                  onClick={() => {
                    soundManager.playTap();
                    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
                  }}
                  className={`w-12 h-6.5 rounded-full transition-all relative p-0.5 cursor-pointer shrink-0 ${
                    config.enabled ? 'bg-[#06C755]' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transition-all ${
                      config.enabled ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Time Selector */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-bold text-white block text-xs">เวลาส่งแจ้งเตือนประจำวัน (LINE):</span>
                    <span className="text-[11px] text-slate-400">เวลาประเทศไทย (Asia/Bangkok UTC+7)</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={config.notifyTime}
                    onChange={(e) => setConfig((prev) => ({ ...prev, notifyTime: e.target.value }))}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono font-black text-sm focus:border-amber-400 outline-none"
                  />
                  <span className="text-[11px] text-slate-400">น.</span>
                </div>
              </div>

              {/* Channel Access Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-bold text-white flex items-center gap-1 text-xs">
                    <span>LINE Channel Access Token (Long-lived):</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <button
                    onClick={handleVerifyLineToken}
                    disabled={isVerifying || !config.channelAccessToken}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-300 border border-sky-400/40 text-[10px] font-bold cursor-pointer"
                  >
                    {isVerifying ? 'กำลังตรวจ...' : 'ตรวจสอบ Token กับ LINE'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={config.channelAccessToken}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, channelAccessToken: cleanTokenInput(e.target.value) }))
                  }
                  placeholder="วาง Channel Access Token จาก LINE Developers (Messaging API > Channel access token long-lived)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-700 text-xs font-mono text-emerald-300 placeholder:text-slate-600 focus:border-[#06C755] outline-none"
                />
              </div>

              {/* Target User ID / Group ID */}
              <div className="space-y-1.5">
                <label className="font-bold text-white flex items-center justify-between gap-1 text-xs flex-wrap">
                  <span>LINE User ID / Group ID (เป้าหมาย):</span>
                  <span className="text-emerald-400 font-normal text-[10px]">
                    (แนะนำ: เว้นว่าง = Broadcast ทุกคนที่เป็นเพื่อน)
                  </span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={config.targetUserId}
                    onChange={(e) => setConfig((prev) => ({ ...prev, targetUserId: e.target.value.trim() }))}
                    placeholder="เว้นว่างเพื่อ Broadcast หรือใส่ U... / C... 33 ตัว"
                    className={`w-full px-3 py-2 rounded-xl bg-slate-950/90 border text-xs font-mono text-white placeholder:text-slate-600 outline-none ${
                      targetInvalid ? 'border-amber-500 text-amber-200' : 'border-slate-700 focus:border-[#06C755]'
                    }`}
                  />
                  {config.targetUserId && (
                    <button
                      onClick={() => setConfig((prev) => ({ ...prev, targetUserId: '' }))}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold shrink-0 cursor-pointer"
                    >
                      เว้นว่าง (Broadcast)
                    </button>
                  )}
                </div>

                {targetInvalid && (
                  <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-[10px] flex items-center justify-between gap-2">
                    <span>
                      ⚠️ รหัสไม่ถูกต้อง! LINE API ห้ามใส่ <strong>@LINE ID ที่ใช้แอดเพื่อน</strong> (ต้องขึ้นต้นด้วย{' '}
                      <code>U</code>, <code>C</code> หรือ <code>R</code> 33 ตัว หรือเว้นว่างไว้เลย)
                    </span>
                    <button
                      onClick={() => setConfig((prev) => ({ ...prev, targetUserId: '' }))}
                      className="px-2 py-1 rounded bg-amber-400 text-slate-950 font-black shrink-0 cursor-pointer"
                    >
                      ล้างเป็น Broadcast
                    </button>
                  </div>
                )}

                {config.detectedRecipients && config.detectedRecipients.length > 0 && (
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] font-bold text-sky-300 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>รหัสแชทที่ตรวจพบจาก Webhook (คลิกเพื่อเลือก):</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {config.detectedRecipients.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setConfig((prev) => ({ ...prev, targetUserId: r.id }))}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border cursor-pointer ${
                            config.targetUserId === r.id
                              ? 'bg-[#06C755] text-slate-950 border-[#06C755] font-black'
                              : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-sky-400'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
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
                  onClick={() => handleTestLineSend('test')}
                  disabled={isTesting || !config.channelAccessToken}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce' : ''}`} />
                  <span>{isTesting ? 'กำลังส่ง...' : 'ทดสอบส่งข้อความ'}</span>
                </button>

                <button
                  onClick={() => handleTestLineSend('daily')}
                  disabled={isTesting || !config.channelAccessToken}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#06C755] to-emerald-600 hover:from-[#05b34c] hover:to-emerald-500 disabled:opacity-40 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#06C755]/20 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ส่งโพยวันนี้ ({engineState?.activePick?.primaryScore || '2-0'}) เข้า LINE ทันที</span>
                </button>
              </div>

              <button
                onClick={handleSaveLine}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-400/20 active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isLoading ? 'กำลังบันทึก & ตรวจ Token...' : 'บันทึก & ตรวจสอบ Token + ยิง Catch-Up อัตโนมัติ'}</span>
              </button>
            </div>
          )}

          {/* TAB 1 (TELEGRAM): CONFIGURATION */}
          {activeTab === 'config' && isTg && (
            <div className="space-y-4">
              {/* Enable Toggle Switch */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block text-xs">
                    เปิดระบบส่งโพยคู่เอกเข้ากลุ่ม Telegram อัตโนมัติ + Catch-Up
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
                  placeholder="เช่น 7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
                <span>{isLoading ? 'กำลังบันทึก & สแกนกลุ่ม...' : 'บันทึก & ตรวจบอท Telegram + ยิง Catch-Up อัตโนมัติ'}</span>
              </button>
            </div>
          )}

          {/* Live Server Execution Logs (Shared across LINE & Telegram) */}
          {activeTab === 'config' && engineState?.pipeline?.logs && engineState.pipeline.logs.length > 0 && (
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

          {/* TAB 2: LIVE DYNAMIC MESSAGE PREVIEW */}
          {activeTab === 'preview' && !isTg && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>
                  ข้อความจริงที่จะถูกส่งเข้า LINE วันนี้ (ดึงสดจาก <strong>Server Daily Engine</strong>):
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {engineState?.bangkokNow.operationalDateKey}
                </span>
              </div>

              <div className="p-4 rounded-3xl bg-[#748899]/30 border border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <div className="w-7 h-7 rounded-full bg-[#06C755] flex items-center justify-center text-slate-950 font-black text-[10px]">
                    SP
                  </div>
                  <div>
                    <span className="font-bold text-white block">
                      {config.verifiedBotName || 'ScorePulse xG (Official)'}
                    </span>
                    <span className="text-[9px] text-slate-400">{config.notifyTime || '06:30'} น. (เวลาไทย)</span>
                  </div>
                </div>

                <div className="rounded-2xl rounded-tl-sm bg-white text-slate-950 p-3.5 shadow-lg text-[11px] leading-relaxed font-sans whitespace-pre-wrap break-words">
                  {livePreviewText || 'กำลังโหลดตัวอย่างข้อความโพยวันนี้...'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && isTg && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>
                  ข้อความจริงที่จะถูกส่งเข้า <strong>กลุ่ม Telegram</strong> วันนี้ (จัดรูปแบบ HTML สวยงาม):
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
                    : livePreviewText || 'กำลังโหลดตัวอย่างข้อความโพยวันนี้...'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GUIDE */}
          {activeTab === 'guide' && isTg && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-[#229ED9]/40 space-y-2">
                <span className="font-bold text-sky-300 text-xs block">
                  1. วิธีสร้างบอท Telegram ฟรีใน 1 นาที (ผ่าน @BotFather):
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                  <li>
                    เปิดแอป Telegram ค้นหา <code className="bg-slate-950 px-1.5 py-0.5 rounded text-sky-300">@BotFather</code> (มีติ๊กถูกสีฟ้า)
                  </li>
                  <li>
                    พิมพ์คำสั่ง <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">/newbot</code> &rarr; ตั้งชื่อบอท &rarr; ตั้ง Username ลงท้ายด้วย <code className="bg-slate-950 px-1 rounded">_bot</code>
                  </li>
                  <li>
                    คัดลอกรหัส <strong>HTTP API Token</strong> ยาวๆ (เช่น <code className="text-[10px] text-sky-300">7123456:AAH...</code>) มาวางในช่อง <strong>Telegram Bot Token</strong> ด้านบน
                  </li>
                </ol>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <span className="font-bold text-emerald-300 text-xs block">
                  2. วิธีดึงบอทเข้ากลุ่มแชท Telegram และสแกนรหัสกลุ่มอัตโนมัติ:
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                  <li>
                    เปิดกลุ่มแชท Telegram ของคุณ &rarr; กด <strong>Add Members</strong> &rarr; เชิญบอทที่คุณสร้างเข้ากลุ่ม (แนะนำให้ตั้งเป็น <strong>Admin</strong> เพื่อให้ส่งข้อความได้ตลอดแม้กลุ่มเปิดโหมดจำกัด)
                  </li>
                  <li>
                    พิมพ์ข้อความใดก็ได้ในกลุ่ม 1 ครั้ง (เช่น <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-300">เริ่มระบบ</code>) เพื่อให้ Telegram บันทึกห้องแชทเข้าคิว
                  </li>
                  <li>
                    กลับมาที่หน้าต่างนี้ กดปุ่ม <strong className="text-emerald-300">🔍 สแกนหากลุ่มอัตโนมัติ (getUpdates)</strong> &rarr; ระบบจะดึงชื่อกลุ่มและรหัส <code className="text-sky-300">-100...</code> มาให้คลิกเลือกทันที!
                  </li>
                </ol>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-[11px] space-y-2">
                <div className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>3. การให้บอทส่งตรงเวลา 06:30 น. ทุกวัน (แม้ปิดแอปตอนกลางคืน) + เก็บ Token ถาวร:</span>
                </div>
                <p className="text-slate-300">
                  • นำ <code className="text-amber-300">TELEGRAM_BOT_TOKEN</code> และ <code className="text-amber-300">TELEGRAM_CHAT_ID</code> ไปใส่ในเมนู <strong>Secrets</strong> ของโปรเจกต์ เพื่อไม่ให้หายเมื่อเปิดเครื่องใหม่<br />
                  • ตั้งเวลาปลุกลิงก์ Cron (<code className="text-emerald-300">ais-pre-.../api/cron/tick</code>) ตอนเช้า 06:30 น. ระบบจะส่งเข้า <strong>ทั้ง LINE OA และกลุ่ม Telegram พร้อมกันในการปลุกครั้งเดียว</strong> ครับ:
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
                <div className="pt-1 border-t border-sky-500/20 flex items-center justify-between gap-2">
                  <span className="text-slate-300 text-[10px]">
                    หรือตั้ง Trigger ฟรีผ่าน <strong>Google Apps Script</strong>:
                  </span>
                  <button
                    onClick={handleCopyAppsScript}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedAppsScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAppsScript ? 'คัดลอกโค้ดแล้ว' : 'Copy Apps Script'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && !isTg && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="font-bold text-white text-xs block">
                  1. วิธีนำ Channel Access Token จาก LINE Developers (Messaging API):
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                  <li>
                    เปิด <strong>LINE Developers Console</strong> (<code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400">developers.line.biz</code>) &rarr; โปรดอย่าใช้ LINE Notify (ปิดบริการแล้ว)
                  </li>
                  <li>เลือก Provider &rarr; เลือก Channel ประเภท <strong>Messaging API</strong></li>
                  <li>คลิกแท็บ <strong>Messaging API</strong> เลื่อนลงล่างสุดที่หัวข้อ <strong>Channel access token (long-lived)</strong></li>
                  <li>กดปุ่ม <strong>Issue</strong> แล้ว Copy มาวางในช่องตั้งค่าแล้วกดบันทึก (ระบบจะเช็กชื่อบอทและโควตาให้อัตโนมัติ)</li>
                </ol>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] space-y-2">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>2. Webhook ดึงรหัสกลุ่ม/แชทอัตโนมัติ (ถ้าอยากให้ส่งเฉพาะกลุ่มหรือแชทส่วนตัว):</span>
                </div>
                <p className="text-slate-300">
                  นำ URL Webhook นี้ไปวางใน LINE Developers &rarr; Messaging API &rarr; <strong>Webhook URL</strong> และเปิด <strong>Use webhook</strong> จากนั้นทักคำว่า <code className="bg-slate-950 px-1 rounded text-amber-300">ผูกแชท</code> เข้าไปในกลุ่มหรือบอทได้เลย:
                </p>
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <code className="text-[10px] font-mono text-emerald-300 truncate flex-1">{webhookUrl}</code>
                  <button
                    onClick={handleCopyWebhookUrl}
                    className="px-2.5 py-1 rounded-lg bg-[#06C755] hover:bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedWebhookUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedWebhookUrl ? 'คัดลอกแล้ว' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-[11px] space-y-2">
                <div className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>3. ลิงก์ปลุก Cron อัตโนมัติ 06:30 น. (สำคัญมากถ้าปิดแอปตอนกลางคืน):</span>
                </div>
                <p className="text-amber-200 bg-amber-950/50 border border-amber-500/40 p-2 rounded-xl leading-relaxed">
                  <strong>⚠️ ทำไม 06:30 น. จึงรอจนกว่าจะเปิดแอป:</strong> บนระบบ AI Studio / Cloud Run เมื่อปิดหน้าเว็บทุกเครื่องเซิร์ฟเวอร์จะ <strong>พักเครื่องอัตโนมัติ (Idle Sleep)</strong> และลิงก์ <code>ais-dev-...</code> จะติดหน้า Login Google ทำให้เว็บ Cron ภายนอกปลุกไม่ได้ ต้องกด <strong>Share / Publish (Anyone with link)</strong> แล้วใช้ลิงก์ <code>ais-pre-...</code> ด้านล่างแทนครับ:
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

                <div className="pt-1 border-t border-sky-500/20 flex items-center justify-between gap-2">
                  <span className="text-slate-300 text-[10px]">
                    หรือตั้งเวลาฟรีผ่าน <strong>Google Apps Script</strong> (<code>script.google.com</code>):
                  </span>
                  <button
                    onClick={handleCopyAppsScript}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedAppsScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAppsScript ? 'คัดลอกโค้ดแล้ว' : 'Copy Apps Script'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>หมายเหตุสำคัญ (Broadcast vs Push):</span>
                </div>
                <p className="text-slate-300">
                  ถ้าต้องการรับเองคนเดียวแบบไม่ต้องตั้ง Webhook: เพิ่มบอท OA เป็นเพื่อนแล้ว <strong>เว้นช่อง User ID ว่างไว้</strong> ระบบจะส่งแบบ Broadcast ให้เพื่อนทุกคนที่แอดบอทครับ
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate">
            <ShieldCheck className={`w-4 h-4 shrink-0 ${isTg ? 'text-sky-400' : 'text-[#06C755]'}`} />
            <span className="truncate">
              {isTg ? 'Telegram Bot API (Free Unlimited) + Bangkok UTC+7' : 'LINE Messaging API V2 + Bangkok UTC+7 Auto-Engine'}
            </span>
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
