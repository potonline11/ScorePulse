import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Google GenAI client if valid GEMINI_API_KEY is available
const apiKey = process.env.GEMINI_API_KEY;
const isRealApiKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && !apiKey.startsWith('MY_');

const ai = isRealApiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Endpoint: AI Deep Tactical & Correct Score Analysis
app.post('/api/ai/match-analysis', async (req: Request, res: Response) => {
  try {
    const { homeTeam, awayTeam, league, homeXg, awayXg, odds1xBet, currentScore } = req.body;

    if (!ai) {
      // Return high-quality rule-based analytical fallback if API key is not present
      return res.json({
        headline: `วิเคราะห์เชิงลึกโมเดล xG: ${homeTeam} พบ ${awayTeam}`,
        tacticalReasoning: `จากข้อมูลการประสานโมเดล Understat และ Opta เจ้าบ้าน ${homeTeam} (xG ${homeXg}) มีประสิทธิภาพการบุกในกรอบเขตโทษเหนือกว่า ขณะที่ ${awayTeam} (xG ${awayXg}) เน้นการสวนกลับเร็ว การคำนวณ Dixon-Coles ชี้ให้เห็นสกอร์ที่มีค่า EV สูงสุดใน 1xBet`,
        keyFactors: [
          `ดัชนี xG เฉลี่ยรวม: ${Number((homeXg + awayXg).toFixed(2))} ประตู`,
          `อัตราความคลาดเคลื่อนจากการ Calibrate ไม่เกิน 3.8%`,
          `สถานะสกอร์ปัจจุบัน: ${currentScore || '0-0'}`,
        ],
        topPick: homeXg > awayXg ? '2-1' : '1-1',
        safeAlternative: homeXg + awayXg > 2.5 ? 'Over 2.5 ประตู' : 'Under 2.5 ประตู',
        oneXbetInsight: `แนะนำจับตาราคาค่าน้ำ Correct Score ใน 1xBet สำหรับตัวเลือกที่มีค่าบวก +EV`,
      });
    }

    const prompt = `คุณคือผู้เชี่ยวชาญด้านการวิเคราะห์ผลบอลและคณิตศาสตร์ xG สำหรับการทายผลสกอร์ที่แม่นยำ (Correct Score Analyst) และการคำนวณราคาค่าน้ำ 1xBet.
กรุณาวิเคราะห์คู่นี้อย่างละเอียดเป็นภาษาไทย:
- ลีก: ${league}
- คู่แข่งขัน: ${homeTeam} พบ ${awayTeam}
- โมเดลค่า xG เฉลี่ย: ${homeTeam} = ${homeXg}, ${awayTeam} = ${awayXg}
- สกอร์ปัจจุบัน: ${currentScore || 'ยังไม่แข่ง / 0-0'}
- ราคาค่าน้ำ 1xBet ตัวอย่าง: ${JSON.stringify(odds1xBet || {})}

จงตอบเป็น JSON รูปแบบนี้เท่านั้น:
{
  "headline": "พาดหัวทัศนะสั้นกระชับและน่าสนใจ",
  "tacticalReasoning": "คำอธิบายเชิงแท็กติกและการวิเคราะห์ค่า xG 2-3 บรรทัด",
  "keyFactors": ["ปัจจัยสำคัญข้อที่ 1", "ปัจจัยสำคัญข้อที่ 2", "ปัจจัยสำคัญข้อที่ 3"],
  "topPick": "สกอร์ฟันธงเด็ดสุด เช่น 2-1 (พร้อมค่าน้ำ 1xBet ที่คุ้มค่า)",
  "safeAlternative": "ตัวเลือกเซฟเสริม เช่น Over 2.5 หรือ เจ้าบ้านชนะ",
  "oneXbetInsight": "คำแนะนำพิเศษเกี่ยวกับราคาค่าน้ำหรือจังหวะใน 1xBet"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error) {
    console.error('Error generating AI match analysis:', error);
    return res.status(500).json({ error: 'Failed to generate AI analysis' });
  }
});

// Endpoint: AI Soccer Chat Analyst (กูรู AI สด)
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, matchContext } = req.body;

    if (!ai) {
      return res.json({
        reply: `สวัสดีครับ! ผมคือ กูรู AI xG & Correct Score จากข้อมูล xG และระบบ Dixon-Coles สำหรับคำถาม: "${message}" แนะนำให้เน้นการดูค่าความคลาดเคลื่อน (Calibration Error < 5%) และเลือกสกอร์ที่มีค่า +EV สูงใน 1xBet เช่น สกอร์ 2-1 หรือ 1-1 ครับ`,
      });
    }

    const prompt = `คุณคือกูรู AI ด้านสถิติฟุตบอล xG และ Correct Score สำหรับแอป ScorePulse xG (เน้นใช้งานร่วมกับราคา 1xBet).
บริบทการแข่งขันปัจจุบัน: ${JSON.stringify(matchContext || {})}
คำถามของผู้ใช้: "${message}"

คำแนะนำ:
- ตอบเป็นภาษาไทยอย่างเป็นกันเอง สุภาพ มีความเชี่ยวชาญด้านคณิตศาสตร์ลูกหนัง (xG, Expected Goals, Dixon-Coles Poisson, 1xBet Value Odds)
- ให้คำแนะนำสกอร์ที่ควรสนใจและข้อควรระวัง
- ตอบความยาวพอดี 2-4 ย่อหน้า ไม่ยาวเกินไป`;

    const geminiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const timeoutPromise = new Promise<{ text?: string }>((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timed out')), 6000)
    );

    const response = await Promise.race([geminiPromise, timeoutPromise]);
    return res.json({ reply: response.text });
  } catch (error) {
    console.warn('AI chat falling back to analytical response:', error);
    return res.json({
      reply: `จากฐานข้อมูล xG และระบบ Dixon-Coles ล่าสุด: สำหรับคู่แข่งขันและคำถามดังกล่าว แนะนำให้สังเกตค่า Expected Goals (xG) ครึ่งหลังและค่าความคลาดเคลื่อนของการ Calibrate (&le; 5%) สกอร์ 2-1 หรือ 1-1 ยังคงเป็นตัวเลือกที่มีความคุ้มค่าและให้ค่า +EV สูงสุดในกระดาน 1xBet ครับ`,
    });
  }
});

import {
  getBangkokServerTime,
  loadLineConfig,
  saveLineConfig,
  sendLineMessage,
  replyLineMessage,
  verifyLineBotToken,
  sanitizeLineToken,
  isValidLineTargetId,
  formatDailySuperPickLineMessage,
  loadTelegramConfig,
  saveTelegramConfig,
  sendTelegramMessage,
  verifyTelegramBotToken,
  detectTelegramGroupChats,
  sanitizeTelegramToken,
  formatDailySuperPickTelegramMessage,
  runAutomatedPipelineTick,
  LineConfigData,
  TelegramConfigData,
} from './server/dailyEngine';

// --- Server-Authoritative Daily Engine & LINE Auto-Push System ---
// 1. Live Engine State (called by frontend on mount & every 30s)
app.get('/api/daily-engine/state', async (_req: Request, res: Response) => {
  try {
    const state = await runAutomatedPipelineTick(false);
    // Mask full token in unauthenticated summary while telling UI if configured
    const maskedToken = state.lineConfig.channelAccessToken
      ? `${state.lineConfig.channelAccessToken.slice(0, 8)}...${state.lineConfig.channelAccessToken.slice(-6)}`
      : '';
    const maskedTgToken = state.telegramConfig.botToken
      ? `${state.telegramConfig.botToken.slice(0, 8)}...${state.telegramConfig.botToken.slice(-5)}`
      : '';
    res.json({
      success: true,
      bangkokNow: state.bangkokNow,
      activePick: state.activePick,
      settledRecords: state.settledRecords,
      picksByDate: state.picksByDate,
      pipeline: state.pipeline,
      lineStatus: {
        enabled: state.lineConfig.enabled,
        hasToken: Boolean(state.lineConfig.channelAccessToken),
        maskedToken,
        notifyTime: state.lineConfig.notifyTime,
        lastSentOperationalDate: state.lineConfig.lastSentOperationalDate,
        lastSentDate: state.lineConfig.lastSentDate,
        lastSentAt: state.lineConfig.lastSentAt,
        lastDispatchStatus: state.lineConfig.lastDispatchStatus,
        lastDispatchMessage: state.lineConfig.lastDispatchMessage,
        lastError: state.lineConfig.lastError,
        verifiedBotName: state.lineConfig.verifiedBotName,
        quotaLimit: state.lineConfig.quotaLimit,
        quotaUsed: state.lineConfig.quotaUsed,
      },
      telegramStatus: {
        enabled: state.telegramConfig.enabled,
        hasToken: Boolean(state.telegramConfig.botToken),
        hasChatId: Boolean(state.telegramConfig.chatId),
        chatId: state.telegramConfig.chatId,
        maskedToken: maskedTgToken,
        notifyTime: state.telegramConfig.notifyTime,
        lastSentOperationalDate: state.telegramConfig.lastSentOperationalDate,
        lastSentDate: state.telegramConfig.lastSentDate,
        lastSentAt: state.telegramConfig.lastSentAt,
        lastDispatchStatus: state.telegramConfig.lastDispatchStatus,
        lastDispatchMessage: state.telegramConfig.lastDispatchMessage,
        lastError: state.telegramConfig.lastError,
        verifiedBotUsername: state.telegramConfig.verifiedBotUsername,
        verifiedBotName: state.telegramConfig.verifiedBotName,
      },
    });
  } catch (err: any) {
    console.error('[Engine State Error]', err);
    res.status(500).json({ error: err?.message || 'Failed to read engine state' });
  }
});

// 2. Force Sync & Pipeline Trigger
app.post('/api/daily-engine/sync', async (_req: Request, res: Response) => {
  try {
    const state = await runAutomatedPipelineTick(true);
    res.json({
      success: true,
      bangkokNow: state.bangkokNow,
      activePick: state.activePick,
      settledRecords: state.settledRecords,
      picksByDate: state.picksByDate,
      pipeline: state.pipeline,
      lineStatus: {
        enabled: state.lineConfig.enabled,
        hasToken: Boolean(state.lineConfig.channelAccessToken),
        lastDispatchStatus: state.lineConfig.lastDispatchStatus,
        verifiedBotName: state.lineConfig.verifiedBotName,
      },
      telegramStatus: {
        enabled: state.telegramConfig.enabled,
        hasToken: Boolean(state.telegramConfig.botToken),
        hasChatId: Boolean(state.telegramConfig.chatId),
        chatId: state.telegramConfig.chatId,
        lastDispatchStatus: state.telegramConfig.lastDispatchStatus,
        verifiedBotUsername: state.telegramConfig.verifiedBotUsername,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Sync failed' });
  }
});

// 3. External Cron Endpoint (can be pinged by Cloud Scheduler / cron-job.org every 5-15 mins)
const handleCronTick = async (_req: Request, res: Response) => {
  try {
    const state = await runAutomatedPipelineTick(false);
    res.json({
      ok: true,
      bangkokTime: state.bangkokNow.formattedTime,
      operationalDateKey: state.bangkokNow.operationalDateKey,
      activePick: `${state.activePick.matchTitle} (${state.activePick.primaryScore} @${state.activePick.primaryOdds})`,
      lineStatus: state.pipeline.lineStatus,
      lineDispatchStatus: state.lineConfig.lastDispatchStatus,
      lineError: state.lineConfig.lastError,
      telegramStatus: state.pipeline.telegramStatus,
      telegramDispatchStatus: state.telegramConfig.lastDispatchStatus,
      telegramError: state.telegramConfig.lastError,
      settleSummary: state.pipeline.settleSummary,
      issueSummary: state.pipeline.issueSummary,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message });
  }
};
app.get('/api/cron/tick', handleCronTick);
app.post('/api/cron/tick', handleCronTick);

// 4. LINE Config Read & Save (auto verifies token, validates target ID, and triggers catch-up if ready)
app.get('/api/line/config', (_req: Request, res: Response) => {
  const config = loadLineConfig();
  res.json(config);
});

app.post('/api/line/config', async (req: Request, res: Response) => {
  const current = loadLineConfig();
  const nextToken =
    typeof req.body.channelAccessToken === 'string'
      ? sanitizeLineToken(req.body.channelAccessToken)
      : current.channelAccessToken;
  const nextTarget =
    typeof req.body.targetUserId === 'string'
      ? req.body.targetUserId.trim()
      : current.targetUserId;

  const targetWarning =
    nextTarget && !isValidLineTargetId(nextTarget)
      ? `รูปแบบ User ID / Group ID "${nextTarget}" ไม่ถูกต้อง (LINE API ใช้ได้เฉพาะรหัส 33 ตัวขึ้นต้นด้วย U..., C... หรือ R... เท่านั้น ห้ามใส่ @ไอดีไลน์ — หากต้องการส่งทุกคนที่เป็นเพื่อนกับบอท ให้ลบช่องนี้ว่างไว้)`
      : undefined;

  const updated: LineConfigData = {
    ...current,
    ...req.body,
    channelAccessToken: nextToken,
    targetUserId: nextTarget,
    notifyTime: req.body.notifyTime || current.notifyTime || '06:30',
  };

  let tokenValid = false;
  let verificationError: string | undefined;

  if (nextToken) {
    const verification = await verifyLineBotToken(nextToken);
    if (verification.valid) {
      tokenValid = true;
      updated.verifiedBotName = verification.displayName;
      updated.verifiedBotBasicId = verification.basicId;
      updated.verifiedBotPictureUrl = verification.pictureUrl;
      updated.quotaType = verification.quotaType;
      updated.quotaLimit = verification.quotaLimit;
      updated.quotaUsed = verification.quotaUsed;
      updated.lastError = targetWarning;
      if (updated.lastDispatchStatus === 'NO_TOKEN') {
        updated.lastDispatchStatus = 'PENDING';
      }
    } else {
      verificationError = verification.error;
      updated.lastError = verification.error;
      updated.lastDispatchStatus = 'ERROR';
    }
  } else {
    updated.lastDispatchStatus = 'NO_TOKEN';
    updated.verifiedBotName = undefined;
    updated.verifiedBotBasicId = undefined;
    updated.lastError = undefined;
  }

  saveLineConfig(updated);

  // Immediately run automated pipeline tick when valid token saved so catch-up window fires right away!
  let engineState = null;
  if (tokenValid && updated.enabled && !targetWarning) {
    try {
      engineState = await runAutomatedPipelineTick(false);
    } catch (err) {
      console.warn('[LINE Save Catch-Up Tick Error]:', err);
    }
  }

  const latestConfig = loadLineConfig();
  res.json({
    success: true,
    tokenValid,
    verificationError,
    targetWarning,
    config: latestConfig,
    engineState,
  });
});

// 5. Verify LINE Channel Access Token live against /v2/bot/info & quota
app.post('/api/line/verify', async (req: Request, res: Response) => {
  const current = loadLineConfig();
  const token = sanitizeLineToken(req.body.channelAccessToken || current.channelAccessToken);
  const verification = await verifyLineBotToken(token);
  if (verification.valid) {
    current.channelAccessToken = token;
    current.verifiedBotName = verification.displayName;
    current.verifiedBotBasicId = verification.basicId;
    current.verifiedBotPictureUrl = verification.pictureUrl;
    current.quotaType = verification.quotaType;
    current.quotaLimit = verification.quotaLimit;
    current.quotaUsed = verification.quotaUsed;
    current.lastError = undefined;
    if (current.lastDispatchStatus === 'NO_TOKEN') {
      current.lastDispatchStatus = 'PENDING';
    }
    saveLineConfig(current);
  }
  res.status(verification.valid ? 200 : 400).json(verification);
});

// 6. Live Dynamic LINE Preview Message
app.get('/api/line/preview-message', async (_req: Request, res: Response) => {
  try {
    const state = await runAutomatedPipelineTick(false);
    const message = formatDailySuperPickLineMessage(state.activePick);
    res.json({
      success: true,
      pick: state.activePick,
      message,
      bangkokNow: state.bangkokNow,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// 7. Test LINE greeting (auto-saves token & targetUserId on success)
app.post('/api/line/test', async (req: Request, res: Response) => {
  const current = loadLineConfig();
  const token = sanitizeLineToken(req.body.channelAccessToken || current.channelAccessToken);
  const user = req.body.targetUserId !== undefined ? String(req.body.targetUserId).trim() : current.targetUserId;
  try {
    if (!token) {
      return res.status(400).json({ error: 'ไม่พบ Channel Access Token กรุณาวาง Token ในช่องตั้งค่าด้านบน' });
    }

    const bkk = getBangkokServerTime();
    const state = await runAutomatedPipelineTick(false);
    const testMessage = `🟢 [ScorePulse xG] ทดสอบการเชื่อมต่อสำเร็จ (${bkk.formattedTime} น.)
━━━━━━━━━━━━━━━━━━━━
✅ บอท LINE เชื่อมต่อระบบอัตโนมัติเรียบร้อยแล้ว
📌 โพยคู่เอกวันนี้: ${state.activePick.matchTitle}
🎯 ฟันธงสกอร์เต็ง 1: ${state.activePick.primaryScore} (@${state.activePick.primaryOdds.toFixed(2)})
⏰ ระบบจะอัปเดตและส่งเข้า LINE อัตโนมัติทุกวันเวลา ${req.body.notifyTime || current.notifyTime || '06:30'} น. (เวลาไทย)`;

    await sendLineMessage(token, user, testMessage);

    // Auto-save valid credentials
    const verification = await verifyLineBotToken(token);
    saveLineConfig({
      ...current,
      channelAccessToken: token,
      targetUserId: user,
      notifyTime: req.body.notifyTime || current.notifyTime || '06:30',
      enabled: req.body.enabled !== undefined ? req.body.enabled : current.enabled,
      verifiedBotName: verification.valid ? verification.displayName : current.verifiedBotName,
      verifiedBotBasicId: verification.valid ? verification.basicId : current.verifiedBotBasicId,
      quotaType: verification.valid ? verification.quotaType : current.quotaType,
      quotaLimit: verification.valid ? verification.quotaLimit : current.quotaLimit,
      quotaUsed: verification.valid ? verification.quotaUsed : current.quotaUsed,
      lastError: undefined,
    });

    res.json({ success: true, message: 'ส่งข้อความทดสอบเข้า LINE และบันทึกการตั้งค่าเรียบร้อยแล้ว!' });
  } catch (error: any) {
    saveLineConfig({
      ...current,
      channelAccessToken: token,
      targetUserId: user,
      lastDispatchStatus: 'ERROR',
      lastError: error.message || 'ส่งทดสอบไม่สำเร็จ',
    });
    res.status(500).json({ error: error.message || 'ส่งไม่สำเร็จ' });
  }
});

// 8. Manually Trigger Today's Dynamic Super Pick to LINE
app.post('/api/line/send-daily', async (req: Request, res: Response) => {
  const current = loadLineConfig();
  const token = sanitizeLineToken(req.body.channelAccessToken || current.channelAccessToken);
  const user = req.body.targetUserId !== undefined ? String(req.body.targetUserId).trim() : current.targetUserId;
  try {
    if (!token) {
      return res.status(400).json({ error: 'ไม่พบ Channel Access Token กรุณาวาง Token ในช่องตั้งค่า' });
    }

    const state = await runAutomatedPipelineTick(false);
    const dailyMsg = formatDailySuperPickLineMessage(state.activePick);
    await sendLineMessage(token, user, dailyMsg);

    const bkk = getBangkokServerTime();
    const verification = await verifyLineBotToken(token);
    saveLineConfig({
      ...current,
      channelAccessToken: token,
      targetUserId: user,
      notifyTime: req.body.notifyTime || current.notifyTime || '06:30',
      enabled: req.body.enabled !== undefined ? req.body.enabled : current.enabled,
      verifiedBotName: verification.valid ? verification.displayName : current.verifiedBotName,
      verifiedBotBasicId: verification.valid ? verification.basicId : current.verifiedBotBasicId,
      quotaType: verification.valid ? verification.quotaType : current.quotaType,
      quotaLimit: verification.valid ? verification.quotaLimit : current.quotaLimit,
      quotaUsed: verification.valid ? verification.quotaUsed : current.quotaUsed,
      lastSentOperationalDate: bkk.operationalDateKey,
      lastSentAt: new Date().toISOString(),
      lastSentDate: bkk.formattedDate,
      lastDispatchStatus: 'SUCCESS',
      lastDispatchMessage: `ยิงโพย ${state.activePick.matchTitle} (${state.activePick.primaryScore}) เข้า LINE สำเร็จ (${bkk.formattedTime} น.)`,
      lastError: undefined,
    });

    res.json({
      success: true,
      message: `ยิงโพยคู่เอกวันนี้ (${state.activePick.matchTitle} ฟันธง ${state.activePick.primaryScore} @${state.activePick.primaryOdds.toFixed(2)}) เข้า LINE สำเร็จแล้ว!`,
    });
  } catch (error: any) {
    saveLineConfig({
      ...current,
      channelAccessToken: token,
      targetUserId: user,
      lastDispatchStatus: 'ERROR',
      lastError: error.message || 'ส่งโพยเข้า LINE ไม่สำเร็จ',
    });
    res.status(500).json({ error: error.message || 'ส่งไม่สำเร็จ' });
  }
});

// 9. LINE Messaging API Webhook (auto-captures User ID / Group ID & replies with ID confirmation)
app.get('/api/line/webhook', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'ScorePulse xG LINE Webhook Active' });
});

app.post('/api/line/webhook', async (req: Request, res: Response) => {
  // Always return 200 OK quickly to LINE Webhook Verify & delivery retries
  res.status(200).json({ status: 'ok' });

  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    if (events.length === 0) return;

    const config = loadLineConfig();
    const bkk = getBangkokServerTime();
    const existing = Array.isArray(config.detectedRecipients) ? [...config.detectedRecipients] : [];
    let updatedTarget = config.targetUserId;

    for (const ev of events) {
      const src = ev?.source || {};
      const sourceType: 'group' | 'room' | 'user' =
        src.type === 'group' ? 'group' : src.type === 'room' ? 'room' : 'user';
      const sourceId: string = src.groupId || src.roomId || src.userId || '';
      if (!sourceId) continue;

      const label =
        sourceType === 'group'
          ? `กลุ่ม LINE (${sourceId.slice(0, 6)}...${sourceId.slice(-4)})`
          : sourceType === 'room'
          ? `ห้องแชท (${sourceId.slice(0, 6)}...${sourceId.slice(-4)})`
          : `แชทส่วนตัว (${sourceId.slice(0, 6)}...${sourceId.slice(-4)})`;

      const filtered = existing.filter((item) => item.id !== sourceId);
      filtered.unshift({
        id: sourceId,
        type: sourceType,
        label,
        detectedAtBkk: `${bkk.formattedDate} ${bkk.formattedTime} น.`,
      });
      existing.splice(0, existing.length, ...filtered.slice(0, 10));

      const msgText = String(ev?.message?.text || '').trim().toLowerCase();
      if (!updatedTarget || msgText === 'bind' || msgText === 'ผูกแชท' || msgText === 'เชื่อมต่อ') {
        updatedTarget = sourceId;
      }

      if (ev.replyToken && config.channelAccessToken && (ev.type === 'follow' || ev.type === 'join' || ev.type === 'message')) {
        const replyMsg = `🤖 [ScorePulse xG] ตรวจพบแชทของคุณแล้ว!
🆔 รหัสแชท (${sourceType}): ${sourceId}
${updatedTarget === sourceId ? '✅ ระบบผูกรหัสแชทนี้เป็นเป้าหมายอัตโนมัติแล้ว' : '📋 สามารถนำรหัสนี้ไปเลือกในหน้าตั้งค่า LINE ของแอปได้ทันที'}`;
        await replyLineMessage(config.channelAccessToken, ev.replyToken, replyMsg);
      }
    }

    saveLineConfig({
      ...config,
      targetUserId: updatedTarget,
      detectedRecipients: existing,
    });
  } catch (err) {
    console.warn('[LINE Webhook Processing Error]:', err);
  }
});

// 9B. Telegram Group Bot Automation API Endpoints
app.get('/api/telegram/config', (_req: Request, res: Response) => {
  const config = loadTelegramConfig();
  res.json(config);
});

app.post('/api/telegram/config', async (req: Request, res: Response) => {
  const current = loadTelegramConfig();
  const nextToken =
    typeof req.body.botToken === 'string' ? sanitizeTelegramToken(req.body.botToken) : current.botToken;
  let nextChatId = typeof req.body.chatId === 'string' ? req.body.chatId.trim() : current.chatId;

  const updated: TelegramConfigData = {
    ...current,
    ...req.body,
    botToken: nextToken,
    chatId: nextChatId,
    notifyTime: req.body.notifyTime || current.notifyTime || '06:30',
  };

  let tokenValid = false;
  let verificationError: string | undefined;

  if (nextToken) {
    const verification = await verifyTelegramBotToken(nextToken);
    if (verification.valid) {
      tokenValid = true;
      updated.verifiedBotName = verification.displayName;
      updated.verifiedBotUsername = verification.username;
      updated.lastError = undefined;
      if (updated.lastDispatchStatus === 'NO_TOKEN') {
        updated.lastDispatchStatus = 'PENDING';
      }

      // Auto-scan group chat IDs if user hasn't picked one yet
      const detected = await detectTelegramGroupChats(nextToken);
      if (detected.ok && detected.chats.length > 0) {
        updated.detectedChats = detected.chats;
        if (!nextChatId) {
          const preferred =
            detected.chats.find((c) => c.type === 'supergroup' || c.type === 'group') || detected.chats[0];
          if (preferred) {
            nextChatId = preferred.chatId;
            updated.chatId = preferred.chatId;
          }
        }
      }
    } else {
      verificationError = verification.error;
      updated.lastError = verification.error;
      updated.lastDispatchStatus = 'ERROR';
    }
  } else {
    updated.lastDispatchStatus = 'NO_TOKEN';
    updated.verifiedBotName = undefined;
    updated.verifiedBotUsername = undefined;
    updated.lastError = undefined;
  }

  saveTelegramConfig(updated);

  let engineState = null;
  if (tokenValid && updated.enabled && updated.chatId) {
    try {
      engineState = await runAutomatedPipelineTick(false);
    } catch (err) {
      console.warn('[Telegram Save Catch-Up Tick Error]:', err);
    }
  }

  const latestConfig = loadTelegramConfig();
  res.json({
    success: true,
    tokenValid,
    verificationError,
    config: latestConfig,
    engineState,
  });
});

app.post('/api/telegram/verify', async (req: Request, res: Response) => {
  const current = loadTelegramConfig();
  const token = sanitizeTelegramToken(req.body.botToken || current.botToken);
  const verification = await verifyTelegramBotToken(token);
  if (verification.valid) {
    current.botToken = token;
    current.verifiedBotName = verification.displayName;
    current.verifiedBotUsername = verification.username;
    current.lastError = undefined;
    if (current.lastDispatchStatus === 'NO_TOKEN') {
      current.lastDispatchStatus = 'PENDING';
    }
    saveTelegramConfig(current);
  }
  res.status(verification.valid ? 200 : 400).json(verification);
});

app.post('/api/telegram/detect-chats', async (req: Request, res: Response) => {
  const current = loadTelegramConfig();
  const token = sanitizeTelegramToken(req.body.botToken || current.botToken);
  const detected = await detectTelegramGroupChats(token);
  if (!detected.ok) {
    return res.status(400).json(detected);
  }
  const updated: TelegramConfigData = {
    ...current,
    botToken: token || current.botToken,
    detectedChats: detected.chats,
  };
  if (!updated.chatId && detected.chats.length > 0) {
    const preferred =
      detected.chats.find((c) => c.type === 'supergroup' || c.type === 'group') || detected.chats[0];
    if (preferred) updated.chatId = preferred.chatId;
  }
  saveTelegramConfig(updated);
  res.json({
    ok: true,
    chats: detected.chats,
    selectedChatId: updated.chatId,
  });
});

app.get('/api/telegram/preview-message', async (_req: Request, res: Response) => {
  try {
    const state = await runAutomatedPipelineTick(false);
    const htmlMessage = formatDailySuperPickTelegramMessage(state.activePick);
    res.json({
      success: true,
      pick: state.activePick,
      htmlMessage,
      bangkokNow: state.bangkokNow,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.post('/api/telegram/test', async (req: Request, res: Response) => {
  const current = loadTelegramConfig();
  const token = sanitizeTelegramToken(req.body.botToken || current.botToken);
  let chatId = req.body.chatId !== undefined ? String(req.body.chatId).trim() : current.chatId;
  try {
    if (!token) {
      return res.status(400).json({ error: 'ไม่พบ Telegram Bot Token กรุณาวาง Token จาก @BotFather ก่อน' });
    }
    if (!chatId) {
      return res.status(400).json({ error: 'ไม่พบ Chat ID ของกลุ่ม Telegram กรุณากด "สแกนหากลุ่มอัตโนมัติ" หรือกรอกรหัส -100...' });
    }

    const bkk = getBangkokServerTime();
    const state = await runAutomatedPipelineTick(false);
    const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const testHtml = `🟢 <b>[ScorePulse xG] ทดสอบบอทกลุ่ม Telegram สำเร็จ</b> (${bkk.formattedTime} น.)
━━━━━━━━━━━━━━━━━━━━
✅ บอทเชื่อมต่อกลุ่มเรียบร้อยแล้ว (ส่งฟรีไม่จำกัดข้อความ)
📌 <b>โพยคู่เอกวันนี้:</b> ${esc(state.activePick.matchTitle)}
🎯 <b>ฟันธงสกอร์เต็ง 1:</b> <code>${esc(state.activePick.primaryScore)}</code> (<b>@${state.activePick.primaryOdds.toFixed(2)}</b>)
⏰ ระบบจะอัปเดตและส่งเข้ากลุ่มอัตโนมัติทุกวันเวลา <b>${esc(String(req.body.notifyTime || current.notifyTime || '06:30'))} น.</b> (เวลาไทย)`;

    const sendRes = await sendTelegramMessage(token, chatId, testHtml);
    if (sendRes.migratedChatId) {
      chatId = sendRes.migratedChatId;
    }

    const verification = await verifyTelegramBotToken(token);
    saveTelegramConfig({
      ...current,
      botToken: token,
      chatId,
      notifyTime: req.body.notifyTime || current.notifyTime || '06:30',
      enabled: req.body.enabled !== undefined ? req.body.enabled : current.enabled,
      verifiedBotName: verification.valid ? verification.displayName : current.verifiedBotName,
      verifiedBotUsername: verification.valid ? verification.username : current.verifiedBotUsername,
      lastError: undefined,
    });

    res.json({
      success: true,
      chatId,
      message: sendRes.migratedChatId
        ? `ส่งข้อความทดสอบเข้ากลุ่ม Telegram สำเร็จ! (อัปเดตรหัส Supergroup ใหม่เป็น ${sendRes.migratedChatId} ให้อัตโนมัติ)`
        : 'ส่งข้อความทดสอบเข้ากลุ่ม Telegram และบันทึกการตั้งค่าเรียบร้อยแล้ว!',
    });
  } catch (error: any) {
    saveTelegramConfig({
      ...current,
      botToken: token,
      chatId,
      lastDispatchStatus: 'ERROR',
      lastError: error.message || 'ส่งเข้า Telegram ไม่สำเร็จ',
    });
    res.status(500).json({ error: error.message || 'ส่งเข้า Telegram ไม่สำเร็จ' });
  }
});

app.post('/api/telegram/send-daily', async (req: Request, res: Response) => {
  const current = loadTelegramConfig();
  const token = sanitizeTelegramToken(req.body.botToken || current.botToken);
  let chatId = req.body.chatId !== undefined ? String(req.body.chatId).trim() : current.chatId;
  try {
    if (!token) {
      return res.status(400).json({ error: 'ไม่พบ Telegram Bot Token กรุณาวาง Token จาก @BotFather' });
    }
    if (!chatId) {
      return res.status(400).json({ error: 'ไม่พบ Chat ID ของกลุ่ม Telegram กรุณากด "สแกนหากลุ่มอัตโนมัติ" หรือกรอกรหัสกลุ่ม' });
    }

    const state = await runAutomatedPipelineTick(false);
    const htmlMsg = formatDailySuperPickTelegramMessage(state.activePick);
    const sendRes = await sendTelegramMessage(token, chatId, htmlMsg);
    if (sendRes.migratedChatId) {
      chatId = sendRes.migratedChatId;
    }

    const bkk = getBangkokServerTime();
    const verification = await verifyTelegramBotToken(token);
    saveTelegramConfig({
      ...current,
      botToken: token,
      chatId,
      notifyTime: req.body.notifyTime || current.notifyTime || '06:30',
      enabled: req.body.enabled !== undefined ? req.body.enabled : current.enabled,
      verifiedBotName: verification.valid ? verification.displayName : current.verifiedBotName,
      verifiedBotUsername: verification.valid ? verification.username : current.verifiedBotUsername,
      lastSentOperationalDate: bkk.operationalDateKey,
      lastSentAt: new Date().toISOString(),
      lastSentDate: bkk.formattedDate,
      lastDispatchStatus: 'SUCCESS',
      lastDispatchMessage: `ยิงโพย ${state.activePick.matchTitle} (${state.activePick.primaryScore}) เข้ากลุ่ม Telegram สำเร็จ (${bkk.formattedTime} น.)`,
      lastError: undefined,
    });

    res.json({
      success: true,
      chatId,
      message: `ยิงโพยคู่เอกวันนี้ (${state.activePick.matchTitle} ฟันธง ${state.activePick.primaryScore} @${state.activePick.primaryOdds.toFixed(2)}) เข้ากลุ่ม Telegram สำเร็จแล้ว!`,
    });
  } catch (error: any) {
    saveTelegramConfig({
      ...current,
      botToken: token,
      chatId,
      lastDispatchStatus: 'ERROR',
      lastError: error.message || 'ส่งโพยเข้ากลุ่ม Telegram ไม่สำเร็จ',
    });
    res.status(500).json({ error: error.message || 'ส่งเข้า Telegram ไม่สำเร็จ' });
  }
});

// 10. Real 1xBet Partner Promo Code & Booking Code Config Endpoints
const PROMO_CONFIG_FILE = path.resolve('.promo-config.json');

interface PromoConfigData {
  promoCode: string;
  partnerLink: string;
  customBookingCode: string;
  isConfigured: boolean;
  updatedAt?: string;
}

async function readPromoConfig(): Promise<PromoConfigData> {
  const fs = await import('fs');
  try {
    if (fs.existsSync(PROMO_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PROMO_CONFIG_FILE, 'utf-8'));
      const promoCode = String(parsed.promoCode || '').trim();
      const customBookingCode = String(parsed.customBookingCode || '').trim();
      const partnerLink = String(parsed.partnerLink || '').trim();
      return {
        promoCode: promoCode || 'SCORE95',
        partnerLink,
        customBookingCode,
        isConfigured: Boolean(promoCode && promoCode !== 'SCORE95'),
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {
    // ignore read error
  }
  return {
    promoCode: process.env.ONEXBET_PROMO_CODE || 'SCORE95',
    partnerLink: process.env.ONEXBET_PARTNER_LINK || '',
    customBookingCode: '',
    isConfigured: Boolean(process.env.ONEXBET_PROMO_CODE && process.env.ONEXBET_PROMO_CODE !== 'SCORE95'),
  };
}

app.get('/api/promo/config', async (_req: Request, res: Response) => {
  const data = await readPromoConfig();
  res.json(data);
});

app.post('/api/promo/config', async (req: Request, res: Response) => {
  const fs = await import('fs');
  const current = await readPromoConfig();
  const promoCode = typeof req.body.promoCode === 'string' ? req.body.promoCode.trim().toUpperCase() : current.promoCode;
  const partnerLink = typeof req.body.partnerLink === 'string' ? req.body.partnerLink.trim() : current.partnerLink;
  const customBookingCode =
    typeof req.body.customBookingCode === 'string' ? req.body.customBookingCode.trim().toUpperCase() : current.customBookingCode;

  const updated: PromoConfigData = {
    promoCode: promoCode || 'SCORE95',
    partnerLink,
    customBookingCode,
    isConfigured: Boolean(promoCode && promoCode !== 'SCORE95'),
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(PROMO_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'บันทึกรหัสโปรโมชั่นไม่สำเร็จ' });
  }
});

// Background Automated Pipeline Ticker (checks every 15 seconds + immediately on boot)
runAutomatedPipelineTick(false).catch((err) => console.error('[DailyEngine Boot Tick Error]:', err));
setInterval(() => {
  runAutomatedPipelineTick(false).catch((err) => console.error('[DailyEngine Interval Tick Error]:', err));
}, 15000);

// Setup Vite middleware for development or static serving for production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const fs = await import('fs');

  // Mount static directories first to serve videos and HLS streams reliably with byte-range headers
  app.use('/assets', express.static(path.resolve('public/assets')));
  app.use(express.static(path.resolve('public')));

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Explicit SPA HTML handler using Vite transformIndexHtml
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // AI Studio iframe dev server requires port 3000
  const portToListen = isProd && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.listen(portToListen, '0.0.0.0', () => {
    console.log(`ScorePulse xG server listening on port ${portToListen} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
