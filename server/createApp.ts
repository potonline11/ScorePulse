import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
  getBangkokServerTime,
  loadTelegramConfig,
  saveTelegramConfig,
  sendTelegramMessage,
  verifyTelegramBotToken,
  detectTelegramGroupChats,
  sanitizeTelegramToken,
  formatDailySuperPickTelegramMessage,
  runAutomatedPipelineTick,
  TelegramConfigData,
  IS_SERVERLESS,
  RUNTIME_DATA_DIR,
} from './dailyEngine.js';

try {
  dotenv.config();
} catch {
  // ignore dotenv errors in serverless environments
}

const PROMO_CONFIG_FILE = path.join(RUNTIME_DATA_DIR, '.promo-config.json');

interface PromoConfigData {
  promoCode: string;
  partnerLink: string;
  customBookingCode: string;
  isConfigured: boolean;
  updatedAt?: string;
}

function readPromoConfig(): PromoConfigData {
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

export function createApiApp() {
  const app = express();
  app.use(express.json());

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

  // 1. AI Deep Tactical & Correct Score Analysis
  app.post('/api/ai/match-analysis', async (req: Request, res: Response) => {
    try {
      const { homeTeam, awayTeam, league, homeXg, awayXg, odds1xBet, currentScore } = req.body;

      if (!ai) {
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

  // 2. AI Soccer Chat Analyst
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

  // 3. Server-Authoritative Daily Engine State (Telegram Group Automation Only)
  app.get('/api/daily-engine/state', async (_req: Request, res: Response) => {
    try {
      const state = await runAutomatedPipelineTick(false, !IS_SERVERLESS);
      const maskedTgToken = state.telegramConfig.botToken
        ? `${state.telegramConfig.botToken.slice(0, 8)}...${state.telegramConfig.botToken.slice(-5)}`
        : '';
      res.json({
        success: true,
        isServerless: IS_SERVERLESS,
        bangkokNow: state.bangkokNow,
        activePick: state.activePick,
        settledRecords: state.settledRecords,
        picksByDate: state.picksByDate,
        pipeline: state.pipeline,
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

  // 4. Force Sync & Pipeline Trigger
  app.post('/api/daily-engine/sync', async (_req: Request, res: Response) => {
    try {
      const state = await runAutomatedPipelineTick(true, true);
      res.json({
        success: true,
        isServerless: IS_SERVERLESS,
        bangkokNow: state.bangkokNow,
        activePick: state.activePick,
        settledRecords: state.settledRecords,
        picksByDate: state.picksByDate,
        pipeline: state.pipeline,
        telegramStatus: {
          enabled: state.telegramConfig.enabled,
          hasToken: Boolean(state.telegramConfig.botToken),
          hasChatId: Boolean(state.telegramConfig.chatId),
          chatId: state.telegramConfig.chatId,
          lastDispatchStatus: state.telegramConfig.lastDispatchStatus,
          verifiedBotUsername: state.telegramConfig.verifiedBotUsername,
          verifiedBotName: state.telegramConfig.verifiedBotName,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Sync failed' });
    }
  });

  // 5. Cron Endpoint (triggered automatically by Vercel Cron / cron-job.org / manual Catch-Up)
  const handleCronTick = async (_req: Request, res: Response) => {
    try {
      const state = await runAutomatedPipelineTick(false, true);
      res.json({
        ok: true,
        bangkokTime: state.bangkokNow.formattedTime,
        operationalDateKey: state.bangkokNow.operationalDateKey,
        activePick: `${state.activePick.matchTitle} (${state.activePick.primaryScore} @${state.activePick.primaryOdds})`,
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

  // 6. Telegram Group Bot Automation API Endpoints
  app.get('/api/telegram/config', (_req: Request, res: Response) => {
    try {
      const config = loadTelegramConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load Telegram config' });
    }
  });

  app.post('/api/telegram/config', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const current = loadTelegramConfig();
      const nextToken =
        typeof body.botToken === 'string' ? sanitizeTelegramToken(body.botToken) : current.botToken;
      let nextChatId = typeof body.chatId === 'string' ? body.chatId.trim() : current.chatId;

      const updated: TelegramConfigData = {
        ...current,
        ...body,
        botToken: nextToken,
        chatId: nextChatId,
        notifyTime: body.notifyTime || current.notifyTime || '06:30',
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
      if (tokenValid && updated.enabled && updated.chatId && !IS_SERVERLESS) {
        try {
          engineState = await runAutomatedPipelineTick(false, true);
        } catch (err) {
          console.warn('[Telegram Save Catch-Up Tick Error]:', err);
        }
      } else {
        try {
          engineState = await runAutomatedPipelineTick(false, false);
        } catch {
          // non-fatal
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
    } catch (err: any) {
      console.error('[Telegram Config Save Error]:', err);
      res.status(500).json({ error: err?.message || 'บันทึกการตั้งค่า Telegram ไม่สำเร็จ' });
    }
  });

  app.post('/api/telegram/verify', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const current = loadTelegramConfig();
      const token = sanitizeTelegramToken(body.botToken || current.botToken);
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
    } catch (err: any) {
      res.status(500).json({ valid: false, error: err?.message || 'ตรวจสอบ Bot Token ไม่สำเร็จ' });
    }
  });

  app.post('/api/telegram/detect-chats', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const current = loadTelegramConfig();
      const token = sanitizeTelegramToken(body.botToken || current.botToken);
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
    } catch (err: any) {
      res.status(500).json({ ok: false, chats: [], error: err?.message || 'สแกนหากลุ่ม Telegram ไม่สำเร็จ' });
    }
  });

  app.get('/api/telegram/preview-message', async (_req: Request, res: Response) => {
    try {
      const state = await runAutomatedPipelineTick(false, false);
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
      const state = await runAutomatedPipelineTick(false, false);
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

      const state = await runAutomatedPipelineTick(false, false);
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

  // 7. 1xBet Partner Promo Code & Booking Code Config Endpoints
  app.get('/api/promo/config', (_req: Request, res: Response) => {
    const data = readPromoConfig();
    res.json(data);
  });

  app.post('/api/promo/config', (req: Request, res: Response) => {
    const current = readPromoConfig();
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

  // Global JSON error handler so API routes never return plain-text/HTML 500 errors
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API Unhandled Error]:', err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({
      ok: false,
      error: err?.message || 'Internal Server Error',
    });
  });

  return app;
}
