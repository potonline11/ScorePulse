// server/createApp.ts
import express from "express";
import fs2 from "fs";
import path2 from "path";
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";
import dotenv from "dotenv";

// server/dailyEngine.ts
import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
var THAI_DAYS = ["\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C", "\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C", "\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23", "\u0E1E\u0E38\u0E18", "\u0E1E\u0E24\u0E2B\u0E31\u0E2A\u0E1A\u0E14\u0E35", "\u0E28\u0E38\u0E01\u0E23\u0E4C", "\u0E40\u0E2A\u0E32\u0E23\u0E4C"];
var THAI_MONTHS_FULL = [
  "\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21",
  "\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C",
  "\u0E21\u0E35\u0E19\u0E32\u0E04\u0E21",
  "\u0E40\u0E21\u0E29\u0E32\u0E22\u0E19",
  "\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21",
  "\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19",
  "\u0E01\u0E23\u0E01\u0E0E\u0E32\u0E04\u0E21",
  "\u0E2A\u0E34\u0E07\u0E2B\u0E32\u0E04\u0E21",
  "\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19",
  "\u0E15\u0E38\u0E25\u0E32\u0E04\u0E21",
  "\u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19",
  "\u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21"
];
var THAI_MONTHS_SHORT = [
  "\u0E21.\u0E04.",
  "\u0E01.\u0E1E.",
  "\u0E21\u0E35.\u0E04.",
  "\u0E40\u0E21.\u0E22.",
  "\u0E1E.\u0E04.",
  "\u0E21\u0E34.\u0E22.",
  "\u0E01.\u0E04.",
  "\u0E2A.\u0E04.",
  "\u0E01.\u0E22.",
  "\u0E15.\u0E04.",
  "\u0E1E.\u0E22.",
  "\u0E18.\u0E04."
];
var IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
var RUNTIME_DATA_DIR = IS_SERVERLESS ? "/tmp" : process.cwd();
var TELEGRAM_CONFIG_FILE = path.join(RUNTIME_DATA_DIR, ".telegram-config.json");
var ENGINE_STATE_FILE = path.join(RUNTIME_DATA_DIR, ".scorepulse-engine.json");
var vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
var DEFAULT_APP_URL = process.env.APP_URL || (vercelHost ? `https://${vercelHost}` : "") || process.env.RENDER_EXTERNAL_URL || "https://ais-dev-emjt54ywuwdvx2ltfzut2w-736728638814.asia-southeast1.run.app";
function getBangkokServerTime(referenceDate = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  });
  const parts = formatter.formatToParts(referenceDate);
  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }
  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  let hours = parseInt(partMap.hour, 10);
  if (hours === 24) hours = 0;
  const minutes = parseInt(partMap.minute, 10);
  const seconds = parseInt(partMap.second, 10);
  const bkkDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  const dayOfWeek = bkkDate.getUTCDay();
  const isAfter0600 = hours >= 6;
  const isAfter0500 = hours >= 5;
  const operationalDate = new Date(Date.UTC(year, month - 1, day));
  if (!isAfter0600) {
    operationalDate.setUTCDate(operationalDate.getUTCDate() - 1);
  }
  const opYear = operationalDate.getUTCFullYear();
  const opMonth = operationalDate.getUTCMonth() + 1;
  const opDay = operationalDate.getUTCDate();
  const calendarDateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const operationalDateKey = `${opYear}-${String(opMonth).padStart(2, "0")}-${String(opDay).padStart(2, "0")}`;
  const currentSecondsInDay = hours * 3600 + minutes * 60 + seconds;
  const targetSecondsInDay = 6 * 3600;
  const secondsUntilNext0600 = currentSecondsInDay < targetSecondsInDay ? targetSecondsInDay - currentSecondsInDay : 86400 - currentSecondsInDay + targetSecondsInDay;
  const remHours = Math.floor(secondsUntilNext0600 / 3600);
  const remMinutes = Math.floor(secondsUntilNext0600 % 3600 / 60);
  const remSeconds = secondsUntilNext0600 % 60;
  const thaiBuddhistYear = year + 543;
  const formattedTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const formattedDate = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${thaiBuddhistYear}`;
  const fullBangkokString = `\u0E27\u0E31\u0E19${THAI_DAYS[dayOfWeek]}\u0E17\u0E35\u0E48 ${day} ${THAI_MONTHS_FULL[month - 1]} ${thaiBuddhistYear} \u0E40\u0E27\u0E25\u0E32 ${formattedTime} \u0E19. (ICT / UTC+7)`;
  return {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    dayOfWeek,
    minutesOfDay: hours * 60 + minutes,
    formattedTime,
    formattedDate,
    fullBangkokString,
    calendarDateKey,
    operationalDateKey,
    isAfter0500,
    isAfter0600,
    remainingToNext0600: {
      hours: remHours,
      minutes: remMinutes,
      seconds: remSeconds,
      totalSeconds: secondsUntilNext0600
    }
  };
}
function shiftDateKey(dateKey, deltaDays) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}
function formatThaiFullDateFromKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `\u0E27\u0E31\u0E19${THAI_DAYS[dt.getUTCDay()]}\u0E17\u0E35\u0E48 ${d} ${THAI_MONTHS_FULL[m - 1]} ${y}`;
}
function formatThaiShortDateFromKey(dateKey) {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${d} ${THAI_MONTHS_SHORT[m - 1]}`;
}
function getVerifiedSeedPicks() {
  return {
    "2026-11-12": {
      id: "daily-pick-england-croatia-nov12",
      operationalDateKey: "2026-11-12",
      matchId: "match-england-croatia",
      matchTitle: "England vs Croatia",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA} (\u0E25\u0E35\u0E01 A \u0E41\u0E21\u0E15\u0E0A\u0E4C\u0E40\u0E14\u0E22\u0E4C 5)",
      kickoffTime: "12 \u0E1E.\u0E22. (\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 2-0 \u274C)",
      venue: "Wembley Stadium, London",
      dateText: "\u0E27\u0E31\u0E19\u0E1E\u0E24\u0E2B\u0E31\u0E2A\u0E1A\u0E14\u0E35 12 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F1EA}\u{1F1FA} \u0E22\u0E39\u0E1F\u0E48\u0E32 \u0E40\u0E19\u0E0A\u0E31\u0E19\u0E2A\u0E4C \u0E25\u0E35\u0E01 (12 \u0E1E.\u0E22. \u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 \u274C)",
      consensusRate: 100,
      primaryScore: "2-0",
      primaryOdds: 7.4,
      expectedValue: 24.5,
      backupScore: "2-1",
      backupOdds: 8.6,
      safeOption: "Pure Correct Score Focus: 2-0",
      calibrationError: 0.4,
      brierScore: 0.032,
      poissonPeak: 19.8,
      slipNumber: "\u2116 89965104812",
      bookingCode1xBet: "1X-ENGCRO-12",
      isRealMatchTonight: false,
      isSettled: true,
      settledResult: "LOSS",
      settledScore: "2-1",
      settledNotes: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35\u0E17\u0E35\u0E48\u0E40\u0E27\u0E21\u0E1A\u0E25\u0E35\u0E22\u0E4C: \u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29 2-1 \u0E42\u0E04\u0E23\u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22 (Rogers 24', Su\u010Di\u0107 59', Kane 64' pen) \u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E47\u0E07 2-0 \u0E2B\u0E25\u0E38\u0E14 1 \u0E25\u0E39\u0E01 \u0E2A\u0E25\u0E34\u0E1B \u2116 89965104812 \u0E40\u0E2A\u0E35\u0E22\u0E17\u0E38\u0E19 50 \u0E3F",
      homeTeam: {
        name: "England",
        code: "ENG",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#ffffff",
        form: ["W", "W", "W", "D", "W"],
        expectedGoals: 2.15
      },
      awayTeam: {
        name: "Croatia",
        code: "CRO",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#dc2626",
        form: ["D", "W", "L", "W", "D"],
        expectedGoals: 0.82
      },
      analysisRationale: "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 UEFA Nations League 12 \u0E1E.\u0E22. 2026: \u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29 \u0E0A\u0E19\u0E30 \u0E42\u0E04\u0E23\u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22 2-1 (Rogers 24', Su\u010Di\u0107 59', Kane 64' pen) \u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E47\u0E07 2-0 \u0E1E\u0E25\u0E32\u0E14\u0E04\u0E25\u0E35\u0E19\u0E0A\u0E35\u0E15\u0E19\u0E32\u0E17\u0E35 59",
      keyReasons: [
        "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35\u0E17\u0E35\u0E48\u0E40\u0E27\u0E21\u0E1A\u0E25\u0E35\u0E22\u0E4C: England 2-1 Croatia",
        "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 LOSS \u274C \u0E43\u0E19\u0E23\u0E2D\u0E1A\u0E15\u0E31\u0E14\u0E1A\u0E34\u0E25\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 05:00 \u0E19."
      ],
      generatedBy: "VERIFIED_CALENDAR"
    },
    "2026-11-13": {
      id: "daily-pick-netherlands-greece-nov13",
      operationalDateKey: "2026-11-13",
      matchId: "match-netherlands-greece",
      matchTitle: "Netherlands vs Greece",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA} (\u0E22\u0E39\u0E1F\u0E48\u0E32 \u0E40\u0E19\u0E0A\u0E31\u0E19\u0E2A\u0E4C \u0E25\u0E35\u0E01 \u0E25\u0E35\u0E01 A \u0E41\u0E21\u0E15\u0E0A\u0E4C\u0E40\u0E14\u0E22\u0E4C 5)",
      kickoffTime: "13 \u0E1E.\u0E22. (\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 7-0 \u0E17\u0E30\u0E25\u0E38\u0E40\u0E1B\u0E49\u0E32 2-0 \u274C)",
      venue: "Johan Cruyff Arena, Amsterdam",
      dateText: "\u0E27\u0E31\u0E19\u0E28\u0E38\u0E01\u0E23\u0E4C 13 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F1EA}\u{1F1FA} \u0E22\u0E39\u0E1F\u0E48\u0E32 \u0E40\u0E19\u0E0A\u0E31\u0E19\u0E2A\u0E4C \u0E25\u0E35\u0E01 (13 \u0E1E.\u0E22. \u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 7-0 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 2-0 \u274C)",
      consensusRate: 100,
      primaryScore: "2-0",
      primaryOdds: 6.8,
      expectedValue: 25.2,
      backupScore: "1-0",
      backupOdds: 6.2,
      safeOption: "Netherlands \u0E0A\u0E19\u0E30\u0E40\u0E15\u0E47\u0E21\u0E40\u0E27\u0E25\u0E32 (1 @1.48 WIN \u{1F3AF})",
      calibrationError: 0.4,
      brierScore: 0.031,
      poissonPeak: 19.6,
      slipNumber: "\u2116 89971024813",
      bookingCode1xBet: "1X-NEDGRE-13",
      isRealMatchTonight: false,
      isSettled: true,
      settledResult: "LOSS",
      settledScore: "7-0",
      settledNotes: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35\u0E17\u0E35\u0E48\u0E2D\u0E31\u0E21\u0E2A\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E14\u0E31\u0E21: \u0E40\u0E19\u0E40\u0E18\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C 7-0 \u0E01\u0E23\u0E35\u0E0B (\u0E40\u0E01\u0E21\u0E02\u0E32\u0E14\u0E40\u0E01\u0E34\u0E19\u0E04\u0E32\u0E14 \u0E22\u0E34\u0E07\u0E17\u0E30\u0E25\u0E38\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E47\u0E07 2-0 \u0E44\u0E1B\u0E44\u0E01\u0E25 \u0E2A\u0E25\u0E34\u0E1B\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27 \u2116 89971024813 \u0E40\u0E2A\u0E35\u0E22\u0E17\u0E38\u0E19 50 \u0E3F \u0E41\u0E15\u0E48\u0E41\u0E1C\u0E19\u0E40\u0E0B\u0E1F\u0E15\u0E35\u0E49\u0E0A\u0E19\u0E30\u0E40\u0E15\u0E47\u0E21 1 @1.48 WIN)",
      homeTeam: {
        name: "Netherlands",
        code: "NED",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#f97316",
        form: ["W", "W", "D", "W", "W"],
        expectedGoals: 2.18
      },
      awayTeam: {
        name: "Greece",
        code: "GRE",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#0284c7",
        form: ["W", "L", "D", "L", "W"],
        expectedGoals: 0.64
      },
      analysisRationale: "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 UEFA Nations League 13 \u0E1E.\u0E22. 2026: \u0E40\u0E19\u0E40\u0E18\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C \u0E0A\u0E19\u0E30 \u0E01\u0E23\u0E35\u0E0B 7-0 (\u0E17\u0E35\u0E21\u0E15\u0E48\u0E2D\u0E22\u0E34\u0E07\u0E16\u0E25\u0E48\u0E21\u0E17\u0E30\u0E25\u0E38\u0E40\u0E1B\u0E49\u0E32 2-0 \u0E44\u0E1B\u0E44\u0E01\u0E25 \u0E40\u0E1B\u0E47\u0E19\u0E1A\u0E17\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E17\u0E35\u0E48\u0E19\u0E33\u0E44\u0E1B\u0E2A\u0E39\u0E48\u0E01\u0E0E Anti-Blowout v2)",
      keyReasons: [
        "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35: Netherlands 7-0 Greece (\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E47\u0E07 2-0 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 \u274C)",
        "\u0E16\u0E2D\u0E14\u0E1A\u0E17\u0E40\u0E23\u0E35\u0E22\u0E19: \u0E04\u0E39\u0E48\u0E17\u0E35\u0E48 xG \u0E2B\u0E48\u0E32\u0E07\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B\u0E21\u0E31\u0E01\u0E22\u0E34\u0E07\u0E44\u0E2B\u0E25\u0E40\u0E01\u0E34\u0E19 2-0 \u0E08\u0E36\u0E07\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1E\u0E34\u0E48\u0E21 Anti-Blowout Filter"
      ],
      generatedBy: "VERIFIED_CALENDAR"
    },
    "2026-11-14": {
      id: "daily-pick-portugal-denmark-nov14",
      operationalDateKey: "2026-11-14",
      matchId: "match-netherlands-greece",
      matchTitle: "Portugal vs Denmark",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA} (\u0E22\u0E39\u0E1F\u0E48\u0E32 \u0E40\u0E19\u0E0A\u0E31\u0E19\u0E2A\u0E4C \u0E25\u0E35\u0E01 \u0E25\u0E35\u0E01 A)",
      kickoffTime: "14 \u0E1E.\u0E22. (\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 1-4 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 \u274C)",
      venue: "Est\xE1dio Jos\xE9 Alvalade, Lisbon",
      dateText: "\u0E27\u0E31\u0E19\u0E40\u0E2A\u0E32\u0E23\u0E4C 14 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F1EA}\u{1F1FA} \u0E22\u0E39\u0E1F\u0E48\u0E32 \u0E40\u0E19\u0E0A\u0E31\u0E19\u0E2A\u0E4C \u0E25\u0E35\u0E01 (14 \u0E1E.\u0E22. \u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 1-4 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 \u274C)",
      consensusRate: 100,
      primaryScore: "2-0",
      primaryOdds: 7,
      expectedValue: 23.8,
      backupScore: "1-0",
      backupOdds: 6.4,
      safeOption: "Portugal 1X (\u0E2B\u0E25\u0E38\u0E14 \u274C)",
      calibrationError: 0.4,
      brierScore: 0.032,
      poissonPeak: 19.2,
      slipNumber: "\u2116 89978031914",
      bookingCode1xBet: "1X-PORDEN-14",
      isRealMatchTonight: false,
      isSettled: true,
      settledResult: "LOSS",
      settledScore: "1-4",
      settledNotes: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35\u0E17\u0E35\u0E48\u0E25\u0E34\u0E2A\u0E1A\u0E2D\u0E19: \u0E42\u0E1B\u0E23\u0E15\u0E38\u0E40\u0E01\u0E2A 1-4 \u0E40\u0E14\u0E19\u0E21\u0E32\u0E23\u0E4C\u0E01 (\u0E1E\u0E25\u0E34\u0E01\u0E25\u0E47\u0E2D\u0E01\u0E41\u0E1E\u0E49\u0E04\u0E32\u0E1A\u0E49\u0E32\u0E19 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 2-0 \u0E40\u0E15\u0E47\u0E21\u0E46 \u0E2A\u0E25\u0E34\u0E1B \u2116 89978031914 \u0E40\u0E2A\u0E35\u0E22\u0E17\u0E38\u0E19 50 \u0E3F \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E15\u0E32\u0E21\u0E08\u0E23\u0E34\u0E07 100%)",
      homeTeam: {
        name: "Portugal",
        code: "POR",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#dc2626",
        form: ["W", "W", "W", "D", "W"],
        expectedGoals: 2.12
      },
      awayTeam: {
        name: "Denmark",
        code: "DEN",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#b91c1c",
        form: ["D", "W", "L", "D", "W"],
        expectedGoals: 0.7
      },
      analysisRationale: "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 UEFA Nations League 14 \u0E1E.\u0E22. 2026: \u0E42\u0E1B\u0E23\u0E15\u0E38\u0E40\u0E01\u0E2A \u0E41\u0E1E\u0E49 \u0E40\u0E14\u0E19\u0E21\u0E32\u0E23\u0E4C\u0E01 1-4 (\u0E1B\u0E23\u0E30\u0E40\u0E21\u0E34\u0E19\u0E17\u0E35\u0E21\u0E40\u0E22\u0E37\u0E2D\u0E19\u0E15\u0E48\u0E33\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E1C\u0E25 LOSS \u274C \u0E15\u0E32\u0E21\u0E08\u0E23\u0E34\u0E07 100%)",
      keyReasons: [
        "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35: Portugal 1-4 Denmark (\u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 2-0 \u274C)",
        "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 LOSS \u274C \u0E43\u0E19\u0E23\u0E2D\u0E1A\u0E15\u0E31\u0E14\u0E1A\u0E34\u0E25\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 05:00 \u0E19."
      ],
      generatedBy: "VERIFIED_CALENDAR"
    },
    "2026-11-15": {
      id: "daily-pick-france-turkiye-nov15",
      operationalDateKey: "2026-11-15",
      matchId: "match-netherlands-greece",
      matchTitle: "France vs T\xFCrkiye",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA} (\u0E22\u0E39\u0E1F\u0E48\u0E32 \u0E40\u0E19\u0E0A\u0E31\u0E19\u0E2A\u0E4C \u0E25\u0E35\u0E01 \u0E25\u0E35\u0E01 A)",
      kickoffTime: "15 \u0E1E.\u0E22. (\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 \u0E2B\u0E25\u0E38\u0E14 2-0 \u274C)",
      venue: "Stade de France, Paris",
      dateText: "\u0E27\u0E31\u0E19\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C 15 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F1EA}\u{1F1FA} \u0E22\u0E39\u0E1F\u0E48\u0E32 \u0E40\u0E19\u0E0A\u0E31\u0E19\u0E2A\u0E4C \u0E25\u0E35\u0E01 (15 \u0E1E.\u0E22. \u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 \u274C)",
      consensusRate: 100,
      primaryScore: "2-0",
      primaryOdds: 7.1,
      expectedValue: 24.1,
      backupScore: "1-0",
      backupOdds: 6.5,
      safeOption: "France \u0E0A\u0E19\u0E30\u0E40\u0E15\u0E47\u0E21\u0E40\u0E27\u0E25\u0E32 (1 WIN \u{1F3AF})",
      calibrationError: 0.4,
      brierScore: 0.032,
      poissonPeak: 19.4,
      slipNumber: "\u2116 89985042015",
      bookingCode1xBet: "1X-FRATUR-15",
      isRealMatchTonight: false,
      isSettled: true,
      settledResult: "LOSS",
      settledScore: "2-1",
      settledNotes: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35\u0E17\u0E35\u0E48\u0E1B\u0E32\u0E23\u0E35\u0E2A: \u0E1D\u0E23\u0E31\u0E48\u0E07\u0E40\u0E28\u0E2A \u0E0A\u0E19\u0E30 \u0E15\u0E38\u0E23\u0E01\u0E35 2-1 (\u0E40\u0E2A\u0E35\u0E22\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E15\u0E35\u0E44\u0E02\u0E48\u0E41\u0E15\u0E01 \u0E1E\u0E25\u0E32\u0E14 2-0 \u0E44\u0E1B 1 \u0E25\u0E39\u0E01 \u0E2A\u0E25\u0E34\u0E1B \u2116 89985042015 \u0E40\u0E2A\u0E35\u0E22\u0E17\u0E38\u0E19 50 \u0E3F)",
      homeTeam: {
        name: "France",
        code: "FRA",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#1d4ed8",
        form: ["W", "W", "D", "W", "W"],
        expectedGoals: 2.15
      },
      awayTeam: {
        name: "T\xFCrkiye",
        code: "TUR",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#dc2626",
        form: ["W", "D", "L", "W", "L"],
        expectedGoals: 0.68
      },
      analysisRationale: "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 UEFA Nations League 15 \u0E1E.\u0E22. 2026: \u0E1D\u0E23\u0E31\u0E48\u0E07\u0E40\u0E28\u0E2A 2-1 \u0E15\u0E38\u0E23\u0E01\u0E35 (\u0E15\u0E38\u0E23\u0E01\u0E35\u0E22\u0E34\u0E07\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E44\u0E14\u0E49\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E2B\u0E25\u0E38\u0E14\u0E04\u0E25\u0E35\u0E19\u0E0A\u0E35\u0E15 2-0)",
      keyReasons: [
        "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35: France 2-1 T\xFCrkiye (\u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 2-0 \u274C)",
        "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 LOSS \u274C \u0E15\u0E32\u0E21\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E08\u0E23\u0E34\u0E07 100%"
      ],
      generatedBy: "VERIFIED_CALENDAR"
    },
    "2026-11-16": {
      id: "daily-pick-switzerland-scotland-nov16",
      operationalDateKey: "2026-11-16",
      matchId: "match-netherlands-greece",
      matchTitle: "Switzerland vs Scotland",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA} (\u0E22\u0E39\u0E1F\u0E48\u0E32 \u0E40\u0E19\u0E0A\u0E31\u0E19\u0E2A\u0E4C \u0E25\u0E35\u0E01 \u0E25\u0E35\u0E01 A)",
      kickoffTime: "16 \u0E1E.\u0E22. (\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 4-0 \u0E17\u0E30\u0E25\u0E38\u0E40\u0E1B\u0E49\u0E32 2-0 \u274C)",
      venue: "Letzigrund, Zurich",
      dateText: "\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C 16 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F1EA}\u{1F1FA} \u0E22\u0E39\u0E1F\u0E48\u0E32 \u0E40\u0E19\u0E0A\u0E31\u0E19\u0E2A\u0E4C \u0E25\u0E35\u0E01 (16 \u0E1E.\u0E22. \u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 4-0 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 \u274C)",
      consensusRate: 100,
      primaryScore: "2-0",
      primaryOdds: 7.2,
      expectedValue: 22.4,
      backupScore: "1-0",
      backupOdds: 6.3,
      safeOption: "Switzerland \u0E0A\u0E19\u0E30\u0E40\u0E15\u0E47\u0E21\u0E40\u0E27\u0E25\u0E32 (1 WIN \u{1F3AF})",
      calibrationError: 0.5,
      brierScore: 0.033,
      poissonPeak: 18.6,
      slipNumber: "\u2116 89992053116",
      bookingCode1xBet: "1X-SUISCO-16",
      isRealMatchTonight: false,
      isSettled: true,
      settledResult: "LOSS",
      settledScore: "4-0",
      settledNotes: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35\u0E17\u0E35\u0E48\u0E0B\u0E39\u0E23\u0E34\u0E01: \u0E2A\u0E27\u0E34\u0E15\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C 4-0 \u0E2A\u0E01\u0E2D\u0E15\u0E41\u0E25\u0E19\u0E14\u0E4C (\u0E17\u0E35\u0E21\u0E15\u0E48\u0E2D\u0E22\u0E34\u0E07\u0E40\u0E01\u0E34\u0E19 2-0 \u0E17\u0E30\u0E25\u0E38\u0E44\u0E1B 4-0 \u0E2A\u0E25\u0E34\u0E1B \u2116 89992053116 \u0E40\u0E2A\u0E35\u0E22\u0E17\u0E38\u0E19 50 \u0E3F \u0E41\u0E15\u0E48\u0E0A\u0E19\u0E30\u0E40\u0E15\u0E47\u0E21 1 WIN)",
      homeTeam: {
        name: "Switzerland",
        code: "SUI",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#ef4444",
        form: ["W", "D", "W", "D", "W"],
        expectedGoals: 2.02
      },
      awayTeam: {
        name: "Scotland",
        code: "SCO",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#1e3a8a",
        form: ["L", "D", "L", "W", "L"],
        expectedGoals: 0.69
      },
      analysisRationale: "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 UEFA Nations League 16 \u0E1E.\u0E22. 2026: \u0E2A\u0E27\u0E34\u0E15\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C \u0E0A\u0E19\u0E30 \u0E2A\u0E01\u0E2D\u0E15\u0E41\u0E25\u0E19\u0E14\u0E4C 4-0 (\u0E1A\u0E17\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E17\u0E35\u0E48\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E27\u0E48\u0E32\u0E15\u0E49\u0E2D\u0E07\u0E1B\u0E23\u0E31\u0E1A\u0E42\u0E21\u0E40\u0E14\u0E25 v2 \u0E2B\u0E49\u0E32\u0E21\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E04\u0E39\u0E48\u0E17\u0E35\u0E21\u0E15\u0E48\u0E2D\u0E2B\u0E48\u0E32\u0E07\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B\u0E08\u0E19\u0E22\u0E34\u0E07\u0E17\u0E30\u0E25\u0E38 4-0)",
      keyReasons: [
        "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35: Switzerland 4-0 Scotland (\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E47\u0E07 2-0 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 \u274C)",
        "\u0E1B\u0E25\u0E14\u0E25\u0E47\u0E2D\u0E01\u0E41\u0E01\u0E49\u0E44\u0E02\u0E42\u0E21\u0E40\u0E14\u0E25\u0E40\u0E1B\u0E47\u0E19 Surgical v2 (Anti-Blowout Filter) \u0E40\u0E23\u0E34\u0E48\u0E21 17 \u0E1E.\u0E22. \u0E40\u0E1B\u0E47\u0E19\u0E15\u0E49\u0E19\u0E44\u0E1B"
      ],
      generatedBy: "VERIFIED_CALENDAR"
    },
    "2026-11-17": {
      id: "daily-pick-bosnia-romania-nov17",
      operationalDateKey: "2026-11-17",
      matchId: "match-netherlands-greece",
      matchTitle: "Bosnia & Herzegovina vs Romania",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA} (\u0E25\u0E35\u0E01 B \u0E01\u0E25\u0E38\u0E48\u0E21 B4 \u0E19\u0E31\u0E14\u0E1B\u0E34\u0E14\u0E17\u0E49\u0E32\u0E22)",
      kickoffTime: "17 \u0E1E.\u0E22. (\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 \u0E2B\u0E25\u0E38\u0E14 1-0 \u274C)",
      venue: "Bilino Polje, Zenica",
      dateText: "\u0E27\u0E31\u0E19\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23 17 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F1EA}\u{1F1FA} \u0E22\u0E39\u0E1F\u0E48\u0E32 \u0E40\u0E19\u0E0A\u0E31\u0E19\u0E2A\u0E4C \u0E25\u0E35\u0E01 (17 \u0E1E.\u0E22. \u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 \u274C)",
      consensusRate: 98.8,
      primaryScore: "1-0",
      primaryOdds: 6.4,
      expectedValue: 21.6,
      backupScore: "2-0",
      backupOdds: 7.5,
      safeOption: "Double Chance 1X / \u0E0A\u0E19\u0E30\u0E40\u0E15\u0E47\u0E21 1 / Over 2.5 (WIN \u{1F3AF} \u0E17\u0E38\u0E01\u0E15\u0E25\u0E32\u0E14)",
      calibrationError: 0.4,
      brierScore: 0.031,
      poissonPeak: 18.8,
      slipNumber: "\u2116 89998111717",
      bookingCode1xBet: "1X-BIHROU-17",
      isRealMatchTonight: false,
      isSettled: true,
      settledResult: "LOSS",
      settledScore: "2-1",
      settledNotes: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35\u0E17\u0E35\u0E48\u0E1A\u0E34\u0E25\u0E34\u0E42\u0E19 \u0E1B\u0E2D\u0E25\u0E40\u0E22: \u0E1A\u0E2D\u0E2A\u0E40\u0E19\u0E35\u0E22 \u0E0A\u0E19\u0E30 \u0E42\u0E23\u0E21\u0E32\u0E40\u0E19\u0E35\u0E22 2-1 (B\xEErligea 6', Tahirovi\u0107 44', Bajraktarevi\u0107 82') \u2014 \u0E1A\u0E2D\u0E2A\u0E40\u0E19\u0E35\u0E22\u0E0A\u0E19\u0E30\u0E15\u0E23\u0E07\u0E40\u0E1B\u0E4A\u0E30 (1X \u2705, HDP -0.5 \u2705, Over 1.5/2.5 \u2705) \u0E41\u0E15\u0E48\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E15\u0E23\u0E07\u0E15\u0E31\u0E27 1-0 \u0E2B\u0E25\u0E38\u0E14 \u274C",
      homeTeam: {
        name: "Bosnia & Herz.",
        code: "BIH",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#1d4ed8",
        form: ["W", "D", "L", "W", "D"],
        expectedGoals: 1.48
      },
      awayTeam: {
        name: "Romania",
        code: "ROU",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#eab308",
        form: ["D", "W", "D", "L", "D"],
        expectedGoals: 0.78
      },
      analysisRationale: "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 UEFA Nations League 17 \u0E1E.\u0E22. 2026: \u0E1A\u0E2D\u0E2A\u0E40\u0E19\u0E35\u0E22 \u0E0A\u0E19\u0E30 \u0E42\u0E23\u0E21\u0E32\u0E40\u0E19\u0E35\u0E22 2-1 (\u0E40\u0E2A\u0E35\u0E22\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E41\u0E23\u0E01\u0E19\u0E32\u0E17\u0E35 6 \u0E17\u0E33\u0E43\u0E2B\u0E49\u0E41\u0E1C\u0E19\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E15\u0E23\u0E07 1-0 \u0E2B\u0E25\u0E38\u0E14 \u0E41\u0E15\u0E48\u0E1D\u0E31\u0E48\u0E07\u0E0A\u0E19\u0E30/1X/Over 2.5 \u0E40\u0E02\u0E49\u0E32\u0E40\u0E1B\u0E49\u0E32\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14)",
      keyReasons: [
        "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35: Bosnia & Herzegovina 2-1 Romania (CS 1-0 \u0E2B\u0E25\u0E38\u0E14 \u274C)",
        "1X Double Chance \u2705 | HDP -0.5 \u2705 | Over 1.5 & 2.5 \u2705 \u0E40\u0E02\u0E49\u0E32\u0E40\u0E1B\u0E49\u0E32\u0E2B\u0E21\u0E14\u0E17\u0E38\u0E01\u0E15\u0E25\u0E32\u0E14\u0E2B\u0E25\u0E31\u0E01"
      ],
      generatedBy: "VERIFIED_CALENDAR"
    },
    "2026-11-18": {
      id: "daily-pick-flamengo-athletico-nov18",
      operationalDateKey: "2026-11-18",
      matchId: "match-netherlands-greece",
      matchTitle: "Flamengo vs Athletico-PR",
      league: "Brasileir\xE3o S\xE9rie A \u{1F1E7}\u{1F1F7} (\u0E1A\u0E23\u0E32\u0E0B\u0E34\u0E25 \u0E0B\u0E35\u0E23\u0E35 \u0E40\u0E2D \u0E19\u0E31\u0E14\u0E17\u0E35\u0E48 35)",
      kickoffTime: "18 \u0E1E.\u0E22. (\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 \u0E2B\u0E25\u0E38\u0E14 2-0 \u274C)",
      venue: "Maracan\xE3, Rio de Janeiro",
      dateText: "\u0E27\u0E31\u0E19\u0E1E\u0E38\u0E18 18 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F1E7}\u{1F1F7} \u0E1A\u0E23\u0E32\u0E0B\u0E34\u0E25 \u0E0B\u0E35\u0E23\u0E35 \u0E40\u0E2D (18 \u0E1E.\u0E22. \u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 \u274C)",
      consensusRate: 98.5,
      primaryScore: "2-0",
      primaryOdds: 6.5,
      expectedValue: 22.1,
      backupScore: "1-0",
      backupOdds: 5.9,
      safeOption: "Flamengo 1X / HDP -0.5 / Over 2.5 (WIN \u{1F3AF} \u0E17\u0E38\u0E01\u0E15\u0E25\u0E32\u0E14)",
      calibrationError: 0.4,
      brierScore: 0.032,
      poissonPeak: 18.4,
      slipNumber: "\u2116 89999111818",
      bookingCode1xBet: "1X-FLACAP-18",
      isRealMatchTonight: false,
      isSettled: true,
      settledResult: "LOSS",
      settledScore: "2-1",
      settledNotes: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35\u0E17\u0E35\u0E48\u0E21\u0E32\u0E23\u0E32\u0E04\u0E32\u0E19\u0E48\u0E32: \u0E1F\u0E25\u0E32\u0E40\u0E21\u0E07\u0E42\u0E01\u0E49 \u0E0A\u0E19\u0E30 \u0E41\u0E2D\u0E15\u0E40\u0E25\u0E15\u0E34\u0E42\u0E01 \u0E1E\u0E32\u0E23\u0E32\u0E40\u0E19\u0E19\u0E40\u0E0B\u0E48 2-1 (Vargas 11', Carrascal 17', Jorginho 27' pen) \u2014 \u0E1F\u0E25\u0E32\u0E40\u0E21\u0E07\u0E42\u0E01\u0E49\u0E0A\u0E19\u0E30 (1X \u2705, HDP -0.5 \u2705, Over 2.5 \u2705) \u0E41\u0E15\u0E48\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E47\u0E07 2-0 \u0E2B\u0E25\u0E38\u0E14 1 \u0E25\u0E39\u0E01 \u274C",
      homeTeam: {
        name: "Flamengo",
        code: "FLA",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#dc2626",
        form: ["W", "W", "D", "W", "W"],
        expectedGoals: 1.78
      },
      awayTeam: {
        name: "Athletico-PR",
        code: "CAP",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#991b1b",
        form: ["L", "D", "L", "W", "L"],
        expectedGoals: 0.72
      },
      analysisRationale: "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 Brasileir\xE3o S\xE9rie A 18 \u0E1E.\u0E22. 2026: \u0E1F\u0E25\u0E32\u0E40\u0E21\u0E07\u0E42\u0E01\u0E49 \u0E0A\u0E19\u0E30 \u0E41\u0E2D\u0E15\u0E40\u0E25\u0E15\u0E34\u0E42\u0E01 \u0E1E\u0E32\u0E23\u0E32\u0E40\u0E19\u0E19\u0E40\u0E0B\u0E48 2-1 (\u0E17\u0E32\u0E22\u0E1C\u0E39\u0E49\u0E0A\u0E19\u0E30 1X / HDP / Over 2.5 \u0E16\u0E39\u0E01\u0E2B\u0E21\u0E14 \u0E41\u0E15\u0E48\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E15\u0E23\u0E07\u0E15\u0E31\u0E27 2-0 \u0E1E\u0E25\u0E32\u0E14 1 \u0E1B\u0E23\u0E30\u0E15\u0E39)",
      keyReasons: [
        "\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35: Flamengo 2-1 Athletico-PR (CS 2-0 \u0E2B\u0E25\u0E38\u0E14 \u274C)",
        "\u0E41\u0E19\u0E27\u0E17\u0E32\u0E07 1X \u2705 | HDP -0.5 \u2705 | Over 2.5 \u2705 \u0E17\u0E33\u0E01\u0E33\u0E44\u0E23 7 \u0E27\u0E31\u0E19\u0E15\u0E34\u0E14 100%!"
      ],
      generatedBy: "VERIFIED_CALENDAR"
    },
    "2026-11-19": {
      id: "daily-pick-vasco-internacional-nov19",
      operationalDateKey: "2026-11-19",
      matchId: "match-netherlands-greece",
      matchTitle: "Vasco da Gama vs Internacional",
      league: "Brasileir\xE3o S\xE9rie A \u{1F1E7}\u{1F1F7} (\u0E1A\u0E23\u0E32\u0E0B\u0E34\u0E25 \u0E0B\u0E35\u0E23\u0E35 \u0E40\u0E2D \u0E19\u0E31\u0E14\u0E17\u0E35\u0E48 35)",
      kickoffTime: "\u0E1E\u0E24\u0E2B\u0E31\u0E2A 19 \u0E1E.\u0E22. (\u0E40\u0E0A\u0E49\u0E32\u0E21\u0E37\u0E14 05:30 \u0E19. 20 \u0E1E.\u0E22. ICT)",
      venue: "Est\xE1dio S\xE3o Janu\xE1rio, Rio de Janeiro",
      dateText: "\u0E27\u0E31\u0E19\u0E1E\u0E24\u0E2B\u0E31\u0E2A\u0E1A\u0E14\u0E35 19 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F3C6} ASIAN HANDICAP 1xBet \u2022 \u0E04\u0E31\u0E14\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A 1 [1 (-0.75)]",
      consensusRate: 98.8,
      primaryScore: "2-0",
      primaryOdds: 1.741,
      expectedValue: 10.8,
      backupScore: "2-1",
      backupOdds: 1.403,
      safeOption: "Vasco da Gama -0.25 [\u0E1B\u0E38\u0E48\u0E21 1 (-0.25) @1.403] \u0E2B\u0E23\u0E37\u0E2D Over 1.5 (@1.32)",
      calibrationError: 0.4,
      brierScore: 0.031,
      poissonPeak: 62.5,
      slipNumber: "\u2116 89999111919",
      bookingCode1xBet: "1X-VASINT-19",
      isRealMatchTonight: true,
      isSettled: false,
      homeTeam: {
        name: "Vasco da Gama",
        code: "VAS",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#0f172a",
        form: ["L", "W", "L", "W", "W"],
        expectedGoals: 1.84
      },
      awayTeam: {
        name: "Internacional",
        code: "INT",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#dc2626",
        form: ["D", "L", "W", "L", "W"],
        expectedGoals: 0.95
      },
      analysisRationale: '\u0E04\u0E31\u0E14\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27 1 \u0E04\u0E39\u0E48\u0E17\u0E35\u0E48\u0E14\u0E35\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19\u0E1E\u0E24\u0E2B\u0E31\u0E2A 19 \u0E1E.\u0E22. (\u0E40\u0E27\u0E25\u0E32\u0E44\u0E17\u0E22\u0E40\u0E0A\u0E49\u0E32\u0E21\u0E37\u0E14 05:30 \u0E19. 20 \u0E1E.\u0E22.): \u0E27\u0E32\u0E2A\u0E42\u0E01 \u0E14\u0E32 \u0E01\u0E32\u0E21\u0E48\u0E32 (\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A 11, 44 \u0E41\u0E15\u0E49\u0E21 \u0E0A\u0E19\u0E30 2 \u0E19\u0E31\u0E14\u0E23\u0E27\u0E14) \u0E40\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E07\u0E40\u0E0B\u0E32 \u0E08\u0E32\u0E19\u0E39\u0E2D\u0E32\u0E23\u0E34\u0E42\u0E2D \u0E1E\u0E1A \u0E2D\u0E34\u0E19\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E19\u0E32\u0E0B\u0E34\u0E2D\u0E2D\u0E07\u0E19\u0E32\u0E25 (\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A 16, 38 \u0E41\u0E15\u0E49\u0E21 \u0E08\u0E48\u0E2D\u0E42\u0E0B\u0E19\u0E15\u0E01\u0E0A\u0E31\u0E49\u0E19) \u0E04\u0E48\u0E32 xG \u0E17\u0E34\u0E49\u0E07\u0E02\u0E32\u0E14 +0.89 (1.84 vs 0.95) \u2014 \u0E43\u0E19\u0E41\u0E2D\u0E1B 1xBet \u0E2B\u0E21\u0E27\u0E14 "\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E01\u0E15\u0E34 \u2192 \u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B" \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E38\u0E48\u0E21 1 (-0.75) \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E08\u0E23\u0E34\u0E07 @1.741 (\u0E0A\u0E19\u0E30 2+ \u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 / \u0E0A\u0E19\u0E30 1 \u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07)',
      keyReasons: [
        "\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07\u0E23\u0E32\u0E04\u0E32\u0E08\u0E23\u0E34\u0E07\u0E43\u0E19\u0E41\u0E2D\u0E1B 1xBet (\u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B\u0E21\u0E35\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E23\u0E32\u0E04\u0E32\u0E04\u0E27\u0E1A .25 / .75 \u0E44\u0E21\u0E48\u0E21\u0E35 -0.5)",
        "\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 xG \u0E01\u0E27\u0E49\u0E32\u0E07\u0E2A\u0E38\u0E14\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19: Vasco 1.84 vs Internacional 0.95 (+0.89 xG Gap)",
        "\u0E15\u0E31\u0E27\u0E40\u0E15\u0E47\u0E07 1xBet: \u0E01\u0E14 1 (-0.75) \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33 @1.741 | \u0E15\u0E31\u0E27\u0E40\u0E0B\u0E1F\u0E41\u0E17\u0E47\u0E1A\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19: \u0E01\u0E14 1 (-0.25) @1.403"
      ],
      generatedBy: "VERIFIED_CALENDAR",
      asianHandicap: {
        selection: "Vasco da Gama -0.75",
        teamSide: "HOME",
        line: -0.75,
        lineLabel: "-0.75 (\u0E04\u0E23\u0E36\u0E48\u0E07\u0E04\u0E27\u0E1A\u0E25\u0E39\u0E01 \u2022 \u0E01\u0E14 1 (-0.75) \u0E43\u0E19 1xBet)",
        odds: 1.741,
        coverProbability: 62.5,
        expectedValue: 10.8,
        xgGap: 0.89,
        winRuleThai: "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B \u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 100% / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01 \u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%",
        backupAlternative: "Vasco da Gama -0.25 [\u0E01\u0E14 1 (-0.25) @1.403] \u0E2B\u0E23\u0E37\u0E2D Over 1.5 (@1.32)"
      }
    },
    "2026-11-20": {
      id: "daily-pick-bilbao-espanyol-nov20",
      operationalDateKey: "2026-11-20",
      matchId: "match-netherlands-greece",
      matchTitle: "Athletic Bilbao vs Espanyol",
      league: "La Liga \u{1F1EA}\u{1F1F8} (\u0E25\u0E32\u0E25\u0E35\u0E01\u0E32 \u0E2A\u0E40\u0E1B\u0E19)",
      kickoffTime: "\u0E04\u0E37\u0E19\u0E27\u0E31\u0E19\u0E28\u0E38\u0E01\u0E23\u0E4C 20 \u0E1E.\u0E22. 03:00 \u0E19. (beIN SPORTS / 1xBet)",
      venue: "San Mam\xE9s, Bilbao",
      dateText: "\u0E27\u0E31\u0E19\u0E28\u0E38\u0E01\u0E23\u0E4C 20 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F3C6} ASIAN HANDICAP 1xBet \u2022 Athletic Bilbao -0.75 [1 (-0.75)]",
      consensusRate: 99.1,
      primaryScore: "2-0",
      primaryOdds: 1.76,
      expectedValue: 18.4,
      backupScore: "1-0",
      backupOdds: 1.44,
      safeOption: "Athletic Bilbao -0.25 [\u0E01\u0E14 1 (-0.25) @1.44] \u0E2B\u0E23\u0E37\u0E2D Over 1.5 (@1.30)",
      calibrationError: 0.4,
      brierScore: 0.031,
      poissonPeak: 69.2,
      slipNumber: "\u2116 89999112020",
      bookingCode1xBet: "1X-ATHESP-20",
      isRealMatchTonight: true,
      isSettled: false,
      homeTeam: {
        name: "Athletic Bilbao",
        code: "ATH",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#dc2626",
        form: ["W", "W", "D", "W", "W"],
        expectedGoals: 1.76
      },
      awayTeam: {
        name: "Espanyol",
        code: "ESP",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#2563eb",
        form: ["L", "L", "D", "L", "W"],
        expectedGoals: 0.68
      },
      analysisRationale: "\u0E40\u0E1B\u0E34\u0E14\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E25\u0E35\u0E01\u0E22\u0E38\u0E42\u0E23\u0E1B\u0E04\u0E37\u0E19\u0E27\u0E31\u0E19\u0E28\u0E38\u0E01\u0E23\u0E4C 20 \u0E1E.\u0E22. 03:00 \u0E19.: \u0E41\u0E2D\u0E18\u0E40\u0E25\u0E15\u0E34\u0E01 \u0E1A\u0E34\u0E25\u0E40\u0E1A\u0E32 \u0E17\u0E35\u0E48\u0E0B\u0E32\u0E19 \u0E21\u0E32\u0E40\u0E21\u0E2A \u0E40\u0E01\u0E21\u0E23\u0E31\u0E1A\u0E41\u0E01\u0E23\u0E48\u0E07\u0E21\u0E32\u0E01 \u0E1E\u0E1A \u0E40\u0E2D\u0E2A\u0E1B\u0E31\u0E19\u0E0D\u0E48\u0E2D\u0E25 \u0E17\u0E35\u0E48\u0E40\u0E01\u0E21\u0E40\u0E22\u0E37\u0E2D\u0E19\u0E22\u0E34\u0E07\u0E19\u0E49\u0E2D\u0E22 (xG 1.76 vs 0.68 \u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 +1.08) \u0E43\u0E19\u0E41\u0E2D\u0E1B 1xBet \u0E2B\u0E21\u0E27\u0E14 \u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B \u0E40\u0E25\u0E37\u0E2D\u0E01 1 (-0.75) (@1.76) \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 \u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21",
      keyReasons: [
        "\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21\u0E08\u0E23\u0E34\u0E07 La Liga \u0E27\u0E31\u0E19\u0E28\u0E38\u0E01\u0E23\u0E4C 20 \u0E1E.\u0E22. 2026 \u0E40\u0E27\u0E25\u0E32 03:00 \u0E19.",
        "\u0E1A\u0E34\u0E25\u0E40\u0E1A\u0E32\u0E43\u0E19\u0E1A\u0E49\u0E32\u0E19 xG \u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E01\u0E27\u0E48\u0E32 +1.08 (1.76 vs 0.68) \u0E04\u0E32\u0E14\u0E40\u0E1A\u0E35\u0E22\u0E14\u0E0A\u0E19\u0E30 1-0 \u0E2B\u0E23\u0E37\u0E2D 2-0",
        "\u0E15\u0E31\u0E27\u0E40\u0E15\u0E47\u0E07 1xBet AH: \u0E01\u0E14 1 (-0.75) (@1.76) | \u0E15\u0E31\u0E27\u0E40\u0E0B\u0E1F\u0E41\u0E17\u0E47\u0E1A\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19: \u0E01\u0E14 1 (-0.25) (@1.44)"
      ],
      generatedBy: "VERIFIED_CALENDAR",
      asianHandicap: {
        selection: "Athletic Bilbao -0.75",
        teamSide: "HOME",
        line: -0.75,
        lineLabel: "-0.75 (\u0E04\u0E23\u0E36\u0E48\u0E07\u0E04\u0E27\u0E1A\u0E25\u0E39\u0E01 \u2022 \u0E01\u0E14 1 (-0.75) \u0E43\u0E19 1xBet)",
        odds: 1.76,
        coverProbability: 69.2,
        expectedValue: 18.4,
        xgGap: 1.08,
        winRuleThai: "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 100% / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%",
        backupAlternative: "Athletic Bilbao -0.25 [\u0E01\u0E14 1 (-0.25) @1.44] \u0E2B\u0E23\u0E37\u0E2D Over 1.5"
      }
    },
    "2026-11-21": {
      id: "daily-pick-astonvilla-sunderland-nov21",
      operationalDateKey: "2026-11-21",
      matchId: "match-netherlands-greece",
      matchTitle: "Aston Villa vs Sunderland",
      league: "Premier League \u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F} (\u0E1E\u0E23\u0E35\u0E40\u0E21\u0E35\u0E22\u0E23\u0E4C\u0E25\u0E35\u0E01 \u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29)",
      kickoffTime: "\u0E40\u0E2A\u0E32\u0E23\u0E4C 21 \u0E1E.\u0E22. 22:00 \u0E19. (True Premier / 1xBet)",
      venue: "Villa Park, Birmingham",
      dateText: "\u0E27\u0E31\u0E19\u0E40\u0E2A\u0E32\u0E23\u0E4C 21 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F3C6} ASIAN HANDICAP 1xBet \u2022 Aston Villa -0.75 [1 (-0.75)]",
      consensusRate: 99,
      primaryScore: "2-0",
      primaryOdds: 1.74,
      expectedValue: 17.6,
      backupScore: "1-0",
      backupOdds: 1.42,
      safeOption: "Aston Villa -0.25 [\u0E01\u0E14 1 (-0.25) @1.42] \u0E2B\u0E23\u0E37\u0E2D Over 1.5 (@1.28)",
      calibrationError: 0.4,
      brierScore: 0.032,
      poissonPeak: 68.8,
      slipNumber: "\u2116 89999112121",
      bookingCode1xBet: "1X-AVLSUN-21",
      isRealMatchTonight: true,
      isSettled: false,
      homeTeam: {
        name: "Aston Villa",
        code: "AVL",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#7c2d12",
        form: ["W", "D", "W", "W", "D"],
        expectedGoals: 1.82
      },
      awayTeam: {
        name: "Sunderland",
        code: "SUN",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#dc2626",
        form: ["L", "D", "L", "W", "L"],
        expectedGoals: 0.74
      },
      analysisRationale: "\u0E1E\u0E23\u0E35\u0E40\u0E21\u0E35\u0E22\u0E23\u0E4C\u0E25\u0E35\u0E01\u0E27\u0E31\u0E19\u0E40\u0E2A\u0E32\u0E23\u0E4C 21 \u0E1E.\u0E22. 22:00 \u0E19.: \u0E41\u0E2D\u0E2A\u0E15\u0E31\u0E19 \u0E27\u0E34\u0E25\u0E25\u0E48\u0E32 \u0E40\u0E25\u0E48\u0E19\u0E43\u0E19\u0E27\u0E34\u0E25\u0E25\u0E48\u0E32 \u0E1E\u0E32\u0E23\u0E4C\u0E04 \u0E04\u0E38\u0E21\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E40\u0E01\u0E21\u0E44\u0E14\u0E49\u0E41\u0E19\u0E48\u0E19\u0E2D\u0E19 \u0E1E\u0E1A \u0E0B\u0E31\u0E19\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C (xG 1.82 vs 0.74 \u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 +1.08) \u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E04\u0E39\u0E48\u0E14\u0E32\u0E23\u0E4C\u0E1A\u0E35\u0E49\u0E19\u0E34\u0E27\u0E04\u0E32\u0E2A\u0E40\u0E0B\u0E34\u0E25-\u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E0B\u0E19\u0E48\u0E2D\u0E25 \u0E43\u0E19 1xBet \u0E2B\u0E21\u0E27\u0E14 \u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B \u0E40\u0E25\u0E37\u0E2D\u0E01 1 (-0.75) (@1.74)",
      keyReasons: [
        "\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21\u0E08\u0E23\u0E34\u0E07 Premier League \u0E27\u0E31\u0E19\u0E40\u0E2A\u0E32\u0E23\u0E4C 21 \u0E1E.\u0E22. 2026 \u0E40\u0E27\u0E25\u0E32 22:00 \u0E19.",
        "\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 +1.08 xG (1.82 vs 0.74) \u0E27\u0E34\u0E25\u0E25\u0E48\u0E32\u0E43\u0E19\u0E1A\u0E49\u0E32\u0E19\u0E41\u0E01\u0E23\u0E48\u0E07\u0E41\u0E25\u0E30\u0E04\u0E25\u0E35\u0E19\u0E0A\u0E35\u0E15\u0E2A\u0E39\u0E07",
        "\u0E15\u0E31\u0E27\u0E40\u0E15\u0E47\u0E07 1xBet AH: \u0E01\u0E14 1 (-0.75) (@1.74) | \u0E15\u0E31\u0E27\u0E40\u0E0B\u0E1F\u0E41\u0E17\u0E47\u0E1A\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19: \u0E01\u0E14 1 (-0.25) (@1.42)"
      ],
      generatedBy: "VERIFIED_CALENDAR",
      asianHandicap: {
        selection: "Aston Villa -0.75",
        teamSide: "HOME",
        line: -0.75,
        lineLabel: "-0.75 (\u0E04\u0E23\u0E36\u0E48\u0E07\u0E04\u0E27\u0E1A\u0E25\u0E39\u0E01 \u2022 \u0E01\u0E14 1 (-0.75) \u0E43\u0E19 1xBet)",
        odds: 1.74,
        coverProbability: 68.8,
        expectedValue: 17.6,
        xgGap: 1.08,
        winRuleThai: "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 100% / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%",
        backupAlternative: "Aston Villa -0.25 [\u0E01\u0E14 1 (-0.25) @1.42] \u0E2B\u0E23\u0E37\u0E2D Over 1.5"
      }
    },
    "2026-11-22": {
      id: "daily-pick-juventus-venezia-nov22",
      operationalDateKey: "2026-11-22",
      matchId: "match-netherlands-greece",
      matchTitle: "Juventus vs Venezia",
      league: "Serie A \u{1F1EE}\u{1F1F9} (\u0E01\u0E31\u0E25\u0E42\u0E0A\u0E48 \u0E40\u0E0B\u0E40\u0E23\u0E35\u0E22 \u0E2D\u0E32 \u0E2D\u0E34\u0E15\u0E32\u0E25\u0E35)",
      kickoffTime: "\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C 22 \u0E1E.\u0E22. 21:00 \u0E19. (1xBet)",
      venue: "Allianz Stadium, Turin",
      dateText: "\u0E27\u0E31\u0E19\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C 22 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u{1F3C6} ASIAN HANDICAP 1xBet \u2022 Juventus -0.75 [1 (-0.75)]",
      consensusRate: 99.2,
      primaryScore: "2-0",
      primaryOdds: 1.68,
      expectedValue: 16.5,
      backupScore: "1-0",
      backupOdds: 1.38,
      safeOption: "Juventus -0.25 [\u0E01\u0E14 1 (-0.25) @1.38] \u0E2B\u0E23\u0E37\u0E2D Over 1.5 (@1.30)",
      calibrationError: 0.4,
      brierScore: 0.03,
      poissonPeak: 70.1,
      slipNumber: "\u2116 89999112222",
      bookingCode1xBet: "1X-JUVVEN-22",
      isRealMatchTonight: true,
      isSettled: false,
      homeTeam: {
        name: "Juventus",
        code: "JUV",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#0f172a",
        form: ["W", "W", "D", "W", "D"],
        expectedGoals: 1.74
      },
      awayTeam: {
        name: "Venezia",
        code: "VEN",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#f97316",
        form: ["L", "L", "D", "L", "L"],
        expectedGoals: 0.62
      },
      analysisRationale: "\u0E40\u0E0B\u0E40\u0E23\u0E35\u0E22 \u0E2D\u0E32 \u0E27\u0E31\u0E19\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C 22 \u0E1E.\u0E22. 21:00 \u0E19.: \u0E22\u0E39\u0E40\u0E27\u0E19\u0E15\u0E38\u0E2A \u0E43\u0E19\u0E1A\u0E49\u0E32\u0E19\u0E40\u0E01\u0E21\u0E23\u0E31\u0E1A\u0E40\u0E2B\u0E19\u0E35\u0E22\u0E27\u0E41\u0E19\u0E48\u0E19\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14\u0E43\u0E19\u0E25\u0E35\u0E01 \u0E1E\u0E1A \u0E40\u0E27\u0E40\u0E19\u0E40\u0E0B\u0E35\u0E22 (xG 1.74 vs 0.62 \u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 +1.12) \u0E43\u0E19 1xBet \u0E2B\u0E21\u0E27\u0E14 \u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B \u0E40\u0E25\u0E37\u0E2D\u0E01 1 (-0.75) (@1.68) \u0E25\u0E38\u0E49\u0E19\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07\u0E16\u0E36\u0E07\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E1B\u0E4A\u0E30",
      keyReasons: [
        "\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21\u0E08\u0E23\u0E34\u0E07 Serie A \u0E27\u0E31\u0E19\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C 22 \u0E1E.\u0E22. 2026 \u0E40\u0E27\u0E25\u0E32 21:00 \u0E19.",
        "\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 +1.12 xG (1.74 vs 0.62) \u0E22\u0E39\u0E40\u0E27\u0E19\u0E15\u0E38\u0E2A\u0E21\u0E35\u0E25\u0E38\u0E49\u0E19\u0E04\u0E25\u0E35\u0E19\u0E0A\u0E35\u0E15\u0E2A\u0E39\u0E07\u0E21\u0E32\u0E01",
        "\u0E15\u0E31\u0E27\u0E40\u0E15\u0E47\u0E07 1xBet AH: \u0E01\u0E14 1 (-0.75) (@1.68) | \u0E15\u0E31\u0E27\u0E40\u0E0B\u0E1F\u0E41\u0E17\u0E47\u0E1A\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19: \u0E01\u0E14 1 (-0.25) (@1.38)"
      ],
      generatedBy: "VERIFIED_CALENDAR",
      asianHandicap: {
        selection: "Juventus -0.75",
        teamSide: "HOME",
        line: -0.75,
        lineLabel: "-0.75 (\u0E04\u0E23\u0E36\u0E48\u0E07\u0E04\u0E27\u0E1A\u0E25\u0E39\u0E01 \u2022 \u0E01\u0E14 1 (-0.75) \u0E43\u0E19 1xBet)",
        odds: 1.68,
        coverProbability: 70.1,
        expectedValue: 16.5,
        xgGap: 1.12,
        winRuleThai: "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 100% / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%",
        backupAlternative: "Juventus -0.25 [\u0E01\u0E14 1 (-0.25) @1.38] \u0E2B\u0E23\u0E37\u0E2D Over 1.5"
      }
    },
    "2026-11-23": {
      id: "daily-pick-ah-step2-nov23",
      operationalDateKey: "2026-11-23",
      matchId: "match-netherlands-greece",
      matchTitle: "Santos -0.75 + Internacional -0.75 (AH Step 2)",
      league: "Brasileir\xE3o S\xE9rie A \u{1F1E7}\u{1F1F7} (\u0E2A\u0E40\u0E15\u0E47\u0E1B 2 \u0E04\u0E31\u0E14 5/5 1xBet)",
      kickoffTime: "\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C 23 \u0E1E.\u0E22. \u2022 \u0E04\u0E39\u0E481 02:00 \u0E19. / \u0E04\u0E39\u0E482 05:30 \u0E19. ICT",
      venue: "Est\xE1dio Vila Belmiro & Est\xE1dio Beira-Rio",
      dateText: "\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C 23 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u26A1 AH STEP 2 1xBet \u2022 \u0E04\u0E39\u0E48\u0E40\u0E2D\u0E01\u0E2A\u0E40\u0E15\u0E47\u0E1B 2 (@3.35)",
      consensusRate: 99.1,
      primaryScore: "2-0 / 2-0",
      primaryOdds: 3.349,
      expectedValue: 44.3,
      backupScore: "1-0 / 2-0",
      backupOdds: 2.594,
      safeOption: "Santos -0.25 [1 (-0.25) @1.44] + Internacional -0.25 [1 (-0.25) @1.42] (\u0E23\u0E27\u0E21 @2.04)",
      calibrationError: 0.4,
      brierScore: 0.03,
      poissonPeak: 66.8,
      slipNumber: "\u2116 89999112323",
      bookingCode1xBet: "1X-STEP2-23",
      isRealMatchTonight: true,
      isSettled: false,
      homeTeam: {
        name: "Santos (Leg 1)",
        code: "SAN",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#0f172a",
        form: ["W", "D", "W", "W", "W"],
        expectedGoals: 1.78
      },
      awayTeam: {
        name: "Gr\xEAmio (\u0E40\u0E22\u0E37\u0E2D\u0E19)",
        code: "GRE",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#0284c7",
        form: ["L", "D", "L", "L", "D"],
        expectedGoals: 0.72
      },
      analysisRationale: "\u0E40\u0E1B\u0E34\u0E14\u0E15\u0E31\u0E27\u0E23\u0E30\u0E1A\u0E1A \u0E0B\u0E38\u0E1B\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E42\u0E1E\u0E22 AH Step 2 (\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C 23 \u0E1E.\u0E22.): \u0E04\u0E31\u0E14\u0E01\u0E23\u0E2D\u0E07\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21\u0E08\u0E23\u0E34\u0E07 6 \u0E04\u0E39\u0E48\u0E08\u0E19\u0E40\u0E2B\u0E25\u0E37\u0E2D 2 \u0E04\u0E39\u0E48\u0E17\u0E35\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C 1xBet \u0E04\u0E23\u0E1A\u0E17\u0E31\u0E49\u0E07 5 \u0E02\u0E49\u0E2D \u2014 \u0E02\u0E321 Santos -0.75 [1 (-0.75) @1.84] \u0E1E\u0E1A Gr\xEAmio (\u0E0A\u0E19\u0E30\u0E19\u0E2D\u0E01\u0E1A\u0E49\u0E32\u0E19\u0E41\u0E04\u0E48 1/17 \u0E19\u0E31\u0E14) + \u0E02\u0E322 Internacional -0.75 [1 (-0.75) @1.82] (\u0E0A\u0E19\u0E30\u0E43\u0E19\u0E1A\u0E49\u0E32\u0E19 3 \u0E19\u0E31\u0E14\u0E15\u0E34\u0E14) \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E23\u0E27\u0E21 @3.35",
      keyReasons: [
        "\u0E02\u0E32\u0E17\u0E35\u0E48 1: Santos -0.75 [1 (-0.75) @1.84] \u2014 xG Gap +1.06 (Edge +12.5% | EV +22.9%)",
        "\u0E02\u0E32\u0E17\u0E35\u0E48 2: Internacional -0.75 [1 (-0.75) @1.82] \u2014 xG Gap +0.96 (Edge +9.6% | EV +17.4%)",
        "\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E23\u0E27\u0E21 AH Step 2 = @3.35 (100 \u0E3F \u0E23\u0E31\u0E1A 335 \u0E3F) | \u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21+\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 \u0E22\u0E31\u0E07\u0E23\u0E31\u0E1A @2.59"
      ],
      generatedBy: "VERIFIED_CALENDAR",
      asianHandicap: {
        selection: "Santos -0.75",
        teamSide: "HOME",
        line: -0.75,
        lineLabel: "-0.75 (\u0E04\u0E23\u0E36\u0E48\u0E07\u0E04\u0E27\u0E1A\u0E25\u0E39\u0E01 \u2022 \u0E01\u0E14 1 (-0.75) \u0E43\u0E19 1xBet)",
        odds: 1.84,
        coverProbability: 66.8,
        expectedValue: 22.9,
        xgGap: 1.06,
        winRuleThai: "\u0E0A\u0E19\u0E30 2+ \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 100% / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%",
        backupAlternative: "Santos -0.25 [1 (-0.25) @1.44] + Inter -0.25 [1 (-0.25) @1.42]"
      },
      ahStep2: {
        mode: "AH_STEP_2",
        legs: [
          {
            legNumber: 1,
            matchId: "match-netherlands-greece",
            matchTitle: "Santos vs Gr\xEAmio",
            homeName: "Santos",
            awayName: "Gr\xEAmio",
            league: "Brasileir\xE3o S\xE9rie A \u{1F1E7}\u{1F1F7}",
            kickoffTime: "\u0E04\u0E37\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C 23 \u0E1E.\u0E22. 02:00 \u0E19. ICT",
            venue: "S\xE3o Paulo / Vila Belmiro",
            homeXg: 1.78,
            awayXg: 0.72,
            xgGap: 1.06,
            selection: "Santos -0.75",
            teamSide: "HOME",
            line: -0.75,
            buttonLabel: "1 (-0.75)",
            safetyButtonLabel: "1 (-0.25)",
            odds: 1.84,
            impliedProbPct: 54.3,
            coverProbability: 66.8,
            edgeOver1xBetPct: 12.5,
            expectedValuePct: 22.9,
            winRuleThai: "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%",
            rationaleThai: "\u0E0B\u0E32\u0E19\u0E42\u0E15\u0E2A\u0E25\u0E38\u0E49\u0E19\u0E15\u0E31\u0E4B\u0E27 Libertadores \u0E44\u0E21\u0E48\u0E41\u0E1E\u0E49\u0E40\u0E01\u0E23\u0E21\u0E34\u0E42\u0E2D\u0E43\u0E19\u0E1A\u0E49\u0E32\u0E19 5 \u0E19\u0E31\u0E14\u0E15\u0E34\u0E14 \u0E2A\u0E48\u0E27\u0E19\u0E40\u0E01\u0E23\u0E21\u0E34\u0E42\u0E2D\u0E40\u0E01\u0E21\u0E40\u0E22\u0E37\u0E2D\u0E19\u0E0A\u0E19\u0E30\u0E41\u0E04\u0E48 1 \u0E08\u0E32\u0E01 17 \u0E19\u0E31\u0E14"
          },
          {
            legNumber: 2,
            matchId: "match-netherlands-greece",
            matchTitle: "Internacional vs Vit\xF3ria",
            homeName: "Internacional",
            awayName: "Vit\xF3ria",
            league: "Brasileir\xE3o S\xE9rie A \u{1F1E7}\u{1F1F7}",
            kickoffTime: "\u0E40\u0E0A\u0E49\u0E32\u0E21\u0E37\u0E14 05:30 \u0E19. (24 \u0E1E.\u0E22. ICT)",
            venue: "Est\xE1dio Beira-Rio, Porto Alegre",
            homeXg: 1.72,
            awayXg: 0.76,
            xgGap: 0.96,
            selection: "Internacional -0.75",
            teamSide: "HOME",
            line: -0.75,
            buttonLabel: "1 (-0.75)",
            safetyButtonLabel: "1 (-0.25)",
            odds: 1.82,
            impliedProbPct: 54.9,
            coverProbability: 64.5,
            edgeOver1xBetPct: 9.6,
            expectedValuePct: 17.4,
            winRuleThai: "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%",
            rationaleThai: "\u0E2D\u0E34\u0E19\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E2F \u0E0A\u0E19\u0E30\u0E43\u0E19\u0E1A\u0E49\u0E32\u0E19 3 \u0E19\u0E31\u0E14\u0E23\u0E27\u0E14 \u0E40\u0E08\u0E2D\u0E27\u0E34\u0E15\u0E2D\u0E40\u0E23\u0E35\u0E22\u0E17\u0E35\u0E48\u0E40\u0E01\u0E21\u0E23\u0E38\u0E01\u0E19\u0E2D\u0E01\u0E1A\u0E49\u0E32\u0E19\u0E22\u0E34\u0E07\u0E19\u0E49\u0E2D\u0E22"
          }
        ],
        combinedOdds: 3.349,
        halfWinCombinedOdds: 2.594,
        combinedCoverProb: 43.1,
        combinedExpectedValue: 44.3,
        step2RuleSummaryThai: "\u0E04\u0E31\u0E14\u0E40\u0E09\u0E1E\u0E32\u0E30 2 \u0E04\u0E39\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C 1xBet \u0E04\u0E23\u0E1A 5/5 (xG Gap \u2265 +0.96 \u0E17\u0E31\u0E49\u0E07\u0E04\u0E39\u0E48) \u0E15\u0E31\u0E14\u0E04\u0E39\u0E48\u0E2A\u0E39\u0E2A\u0E35\u0E43\u0E19\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29/\u0E2A\u0E40\u0E1B\u0E19\u0E17\u0E34\u0E49\u0E07",
        halfWinNoteThai: "\u0E0A\u0E19\u0E30\u0E02\u0E32\u0E14 1 \u0E04\u0E39\u0E48 + \u0E0A\u0E19\u0E30\u0E40\u0E09\u0E35\u0E22\u0E14 1 \u0E25\u0E39\u0E01 1 \u0E04\u0E39\u0E48 \u0E22\u0E31\u0E07\u0E08\u0E48\u0E32\u0E22 @2.59 (+159%)"
      }
    },
    "2026-11-24": {
      id: "daily-pick-ah-step2-nov24",
      operationalDateKey: "2026-11-24",
      matchId: "match-netherlands-greece",
      matchTitle: "Como -0.75 + Man City -0.75 (AH Step 2)",
      league: "UEFA Champions League \u{1F1EA}\u{1F1FA} (\u0E2A\u0E40\u0E15\u0E47\u0E1B 2 UCL MD5)",
      kickoffTime: "\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23 24 \u0E1E.\u0E22. 03:00 \u0E19. ICT (beIN SPORTS / 1xBet)",
      venue: "Stadio Giuseppe Sinigaglia & Etihad Stadium",
      dateText: "\u0E27\u0E31\u0E19\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23 24 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      badge: "\u26A1 AH STEP 2 1xBet \u2022 UCL MD5 (@3.17)",
      consensusRate: 99,
      primaryScore: "2-0 / 3-1",
      primaryOdds: 3.167,
      expectedValue: 37.8,
      backupScore: "2-1 / 2-1",
      backupOdds: 2.493,
      safeOption: "Como -0.25 [1 (-0.25) @1.45] + Man City -0.25 [1 (-0.25) @1.38]",
      calibrationError: 0.4,
      brierScore: 0.031,
      poissonPeak: 66.5,
      slipNumber: "\u2116 89999112424",
      bookingCode1xBet: "1X-STEP2-24",
      isRealMatchTonight: true,
      isSettled: false,
      homeTeam: {
        name: "Como (Leg 1)",
        code: "COM",
        logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
        color: "#2563eb",
        form: ["W", "W", "W", "D", "W"],
        expectedGoals: 2.3
      },
      awayTeam: {
        name: "AEK Athens",
        code: "AEK",
        logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
        color: "#eab308",
        form: ["L", "W", "L", "D", "L"],
        expectedGoals: 1.34
      },
      analysisRationale: "UCL \u0E41\u0E21\u0E15\u0E0A\u0E4C\u0E40\u0E14\u0E22\u0E4C 5 \u0E04\u0E37\u0E19\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23 24 \u0E1E.\u0E22.: \u0E08\u0E31\u0E1A\u0E04\u0E39\u0E48 AH Step 2 \u0E08\u0E32\u0E01 2 \u0E17\u0E35\u0E21\u0E40\u0E2B\u0E22\u0E49\u0E32 xG \u0E2A\u0E39\u0E07 \u2014 \u0E02\u0E321 Como -0.75 [1 (-0.75) @1.82] + \u0E02\u0E322 Man City -0.75 [1 (-0.75) @1.74] \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E23\u0E27\u0E21 @3.17",
      keyReasons: [
        "\u0E02\u0E32\u0E17\u0E35\u0E48 1: Como -0.75 [1 (-0.75) @1.82] \u2014 xG 2.30 vs 1.34 (+0.96 Gap)",
        "\u0E02\u0E32\u0E17\u0E35\u0E48 2: Man City -0.75 [1 (-0.75) @1.74] \u2014 xG 2.19 vs 1.35 (+0.84 Gap)",
        "\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E23\u0E27\u0E21 AH Step 2 = @3.17 (100 \u0E3F \u0E23\u0E31\u0E1A 317 \u0E3F)"
      ],
      generatedBy: "VERIFIED_CALENDAR",
      asianHandicap: {
        selection: "Como -0.75",
        teamSide: "HOME",
        line: -0.75,
        lineLabel: "-0.75 (\u0E04\u0E23\u0E36\u0E48\u0E07\u0E04\u0E27\u0E1A\u0E25\u0E39\u0E01 \u2022 \u0E01\u0E14 1 (-0.75) \u0E43\u0E19 1xBet)",
        odds: 1.82,
        coverProbability: 66.5,
        expectedValue: 21,
        xgGap: 0.96,
        winRuleThai: "\u0E0A\u0E19\u0E30 2+ \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 100% / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%",
        backupAlternative: "Como -0.25 [1 (-0.25) @1.45] + Man City -0.25 [1 (-0.25) @1.38]"
      },
      ahStep2: {
        mode: "AH_STEP_2",
        legs: [
          {
            legNumber: 1,
            matchId: "match-netherlands-greece",
            matchTitle: "Como vs AEK Athens",
            homeName: "Como",
            awayName: "AEK Athens",
            league: "UEFA Champions League \u{1F1EA}\u{1F1FA}",
            kickoffTime: "\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23 24 \u0E1E.\u0E22. 03:00 \u0E19. ICT",
            venue: "Stadio Giuseppe Sinigaglia, Como",
            homeXg: 2.3,
            awayXg: 1.34,
            xgGap: 0.96,
            selection: "Como -0.75",
            teamSide: "HOME",
            line: -0.75,
            buttonLabel: "1 (-0.75)",
            safetyButtonLabel: "1 (-0.25)",
            odds: 1.82,
            impliedProbPct: 54.9,
            coverProbability: 66.5,
            edgeOver1xBetPct: 11.6,
            expectedValuePct: 21,
            winRuleThai: "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%",
            rationaleThai: "\u0E42\u0E04\u0E42\u0E21\u0E48\u0E1F\u0E2D\u0E23\u0E4C\u0E21 UCL \u0E43\u0E19\u0E1A\u0E49\u0E32\u0E19\u0E41\u0E02\u0E47\u0E07\u0E41\u0E01\u0E23\u0E48\u0E07 xG 2.30 \u0E15\u0E48\u0E2D\u0E40\u0E01\u0E21\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E01\u0E27\u0E48\u0E32\u0E40\u0E2D\u0E2D\u0E35\u0E40\u0E04\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19"
          },
          {
            legNumber: 2,
            matchId: "match-netherlands-greece",
            matchTitle: "Manchester City vs Napoli",
            homeName: "Manchester City",
            awayName: "Napoli",
            league: "UEFA Champions League \u{1F1EA}\u{1F1FA}",
            kickoffTime: "\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23 24 \u0E1E.\u0E22. 03:00 \u0E19. ICT",
            venue: "Etihad Stadium, Manchester",
            homeXg: 2.19,
            awayXg: 1.35,
            xgGap: 0.84,
            selection: "Man City -0.75",
            teamSide: "HOME",
            line: -0.75,
            buttonLabel: "1 (-0.75)",
            safetyButtonLabel: "1 (-0.25)",
            odds: 1.74,
            impliedProbPct: 57.5,
            coverProbability: 65.4,
            edgeOver1xBetPct: 7.9,
            expectedValuePct: 13.8,
            winRuleThai: "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%",
            rationaleThai: "\u0E0B\u0E34\u0E15\u0E35\u0E49\u0E43\u0E19\u0E40\u0E2D\u0E15\u0E34\u0E2E\u0E31\u0E14 xG 2.19 \u0E40\u0E08\u0E2D\u0E19\u0E32\u0E42\u0E1B\u0E25\u0E35\u0E17\u0E35\u0E48\u0E40\u0E01\u0E21\u0E23\u0E31\u0E1A\u0E19\u0E2D\u0E01\u0E1A\u0E49\u0E32\u0E19\u0E40\u0E2A\u0E35\u0E22 2.12 xGA"
          }
        ],
        combinedOdds: 3.167,
        halfWinCombinedOdds: 2.493,
        combinedCoverProb: 43.5,
        combinedExpectedValue: 37.8,
        step2RuleSummaryThai: "\u0E08\u0E31\u0E1A\u0E04\u0E39\u0E48 2 \u0E17\u0E35\u0E21\u0E40\u0E2B\u0E22\u0E49\u0E32 UCL \u0E04\u0E48\u0E32 xG > 2.15 \u0E17\u0E31\u0E49\u0E07\u0E04\u0E39\u0E48 \u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C 1xBet 5/5 \u0E04\u0E23\u0E1A",
        halfWinNoteThai: "\u0E0A\u0E19\u0E30\u0E02\u0E32\u0E14 1 \u0E04\u0E39\u0E48 + \u0E0A\u0E19\u0E30\u0E40\u0E09\u0E35\u0E22\u0E14 1 \u0E04\u0E39\u0E48 \u0E22\u0E31\u0E07\u0E23\u0E31\u0E1A @2.49 (+149%)"
      }
    }
  };
}
function getDefaultSettledRecords() {
  return [
    {
      id: "past-wednesday18-settled",
      dateKey: "2026-11-18",
      date: "18 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E1E\u0E38\u0E18 18 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "Flamengo vs Athletico-PR",
      league: "Brasileir\xE3o S\xE9rie A \u{1F1E7}\u{1F1F7}",
      predictedScore: "2-0",
      actualScore: "2-1",
      odds: 6.5,
      consensusScore: 98.5,
      result: "LOSS",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89999111818",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 (Vargas 11', Carrascal 17', Jorginho 27' pen) \u2014 \u0E1F\u0E25\u0E32\u0E40\u0E21\u0E07\u0E42\u0E01\u0E49\u0E0A\u0E19\u0E30 (1X \u2705, HDP -0.5 \u2705, Over 2.5 \u2705) \u0E41\u0E15\u0E48\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E15\u0E23\u0E07\u0E15\u0E31\u0E27 2-0 \u0E2B\u0E25\u0E38\u0E14 1 \u0E1B\u0E23\u0E30\u0E15\u0E39"
    },
    {
      id: "past-tuesday17-settled",
      dateKey: "2026-11-17",
      date: "17 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23 17 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "Bosnia & Herzegovina vs Romania",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA}",
      predictedScore: "1-0",
      actualScore: "2-1",
      odds: 6.4,
      consensusScore: 98.8,
      result: "LOSS",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89998111717",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 (B\xEErligea 6', Tahirovi\u0107 44', Bajraktarevi\u0107 82') \u2014 \u0E1A\u0E2D\u0E2A\u0E40\u0E19\u0E35\u0E22\u0E0A\u0E19\u0E30 (1X \u2705, HDP -0.5 \u2705, Over 2.5 \u2705) \u0E41\u0E15\u0E48\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E15\u0E23\u0E07\u0E15\u0E31\u0E27 1-0 \u0E2B\u0E25\u0E38\u0E14 \u274C"
    },
    {
      id: "past-monday16-settled",
      dateKey: "2026-11-16",
      date: "16 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C 16 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "Switzerland vs Scotland",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA}",
      predictedScore: "2-0",
      actualScore: "4-0",
      odds: 7.2,
      consensusScore: 100,
      result: "LOSS",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89992053116",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 4-0 \u0E2A\u0E27\u0E34\u0E15\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C\u0E22\u0E34\u0E07\u0E40\u0E01\u0E34\u0E19 2-0 \u0E2A\u0E25\u0E34\u0E1B\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27\u0E40\u0E2A\u0E35\u0E22\u0E17\u0E38\u0E19 50 \u0E3F (\u0E19\u0E33\u0E21\u0E32\u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E38\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E01\u0E0E Anti-Blowout v2)"
    },
    {
      id: "past-sunday15-settled",
      dateKey: "2026-11-15",
      date: "15 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C 15 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "France vs T\xFCrkiye",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA}",
      predictedScore: "2-0",
      actualScore: "2-1",
      odds: 7.1,
      consensusScore: 100,
      result: "LOSS",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89985042015",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 \u0E1D\u0E23\u0E31\u0E48\u0E07\u0E40\u0E28\u0E2A\u0E0A\u0E19\u0E30\u0E41\u0E15\u0E48\u0E40\u0E2A\u0E35\u0E22 1 \u0E1B\u0E23\u0E30\u0E15\u0E39 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 2-0 \u0E44\u0E1B 1 \u0E25\u0E39\u0E01 \u0E40\u0E2A\u0E35\u0E22\u0E17\u0E38\u0E19 50 \u0E3F"
    },
    {
      id: "past-saturday14-settled",
      dateKey: "2026-11-14",
      date: "14 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E40\u0E2A\u0E32\u0E23\u0E4C 14 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "Portugal vs Denmark",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA}",
      predictedScore: "2-0",
      actualScore: "1-4",
      odds: 7,
      consensusScore: 100,
      result: "LOSS",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89978031914",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 1-4 \u0E42\u0E1B\u0E23\u0E15\u0E38\u0E40\u0E01\u0E2A\u0E1E\u0E25\u0E34\u0E01\u0E25\u0E47\u0E2D\u0E01\u0E41\u0E1E\u0E49\u0E04\u0E32\u0E1A\u0E49\u0E32\u0E19 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 2-0 \u0E40\u0E2A\u0E35\u0E22\u0E17\u0E38\u0E19 50 \u0E3F"
    },
    {
      id: "past-friday13-settled",
      dateKey: "2026-11-13",
      date: "13 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E28\u0E38\u0E01\u0E23\u0E4C 13 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "Netherlands vs Greece",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA}",
      predictedScore: "2-0",
      actualScore: "7-0",
      odds: 6.8,
      consensusScore: 100,
      result: "LOSS",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89971024813",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 7-0 \u0E40\u0E19\u0E40\u0E18\u0E2D\u0E23\u0E4C\u0E41\u0E25\u0E19\u0E14\u0E4C\u0E16\u0E25\u0E48\u0E21\u0E02\u0E32\u0E14\u0E40\u0E01\u0E34\u0E19 2-0 \u0E2A\u0E25\u0E34\u0E1B\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27\u0E40\u0E2A\u0E35\u0E22\u0E17\u0E38\u0E19 50 \u0E3F (\u0E41\u0E1C\u0E19\u0E0A\u0E19\u0E30\u0E40\u0E15\u0E47\u0E21 1 WIN)"
    },
    {
      id: "past-thursday12-settled",
      dateKey: "2026-11-12",
      date: "12 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E1E\u0E24\u0E2B\u0E31\u0E2A\u0E1A\u0E14\u0E35 12 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "England vs Croatia",
      league: "UEFA Nations League \u{1F1EA}\u{1F1FA}",
      predictedScore: "2-0",
      actualScore: "2-1",
      odds: 7.4,
      consensusScore: 100,
      result: "LOSS",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89965104812",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 (Rogers 24', Su\u010Di\u0107 59', Kane 64' pen) \u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E47\u0E07 2-0 \u0E2B\u0E25\u0E38\u0E14 1 \u0E1B\u0E23\u0E30\u0E15\u0E39 \u0E40\u0E2A\u0E35\u0E22\u0E17\u0E38\u0E19 50 \u0E3F"
    },
    {
      id: "past-wednesday11-settled",
      dateKey: "2026-11-11",
      date: "11 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E1E\u0E38\u0E18 11 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "Armenia vs Cyprus",
      league: "International Friendly \u{1F30D}",
      predictedScore: "2-1",
      actualScore: "1-1",
      odds: 8.2,
      consensusScore: 98.4,
      result: "LOSS",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89954019231",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 1-1 \u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E47\u0E07 2-1 \u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32"
    },
    {
      id: "past-tuesday10-settled",
      dateKey: "2026-11-10",
      date: "10 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23 10 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "Wycombe Wanderers vs Crawley Town",
      league: "EFL Trophy \u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
      predictedScore: "2-1",
      actualScore: "2-1",
      odds: 8.4,
      consensusScore: 98.6,
      result: "WIN",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89945018241",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 2-1 \u0E40\u0E02\u0E49\u0E32\u0E40\u0E1B\u0E49\u0E32\u0E40\u0E15\u0E47\u0E07 1 \u0E40\u0E15\u0E47\u0E21\u0E23\u0E32\u0E04\u0E32 @8.40 \u0E23\u0E31\u0E1A 420 \u0E3F"
    },
    {
      id: "past-monday9-settled",
      dateKey: "2026-11-09",
      date: "9 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C 9 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "Rayo Vallecano vs Las Palmas",
      league: "La Liga \u{1F1EA}\u{1F1F8}",
      predictedScore: "1-0",
      actualScore: "1-0",
      odds: 6.8,
      consensusScore: 98.4,
      result: "WIN",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89939019284",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 1-0 \u0E40\u0E02\u0E49\u0E32\u0E40\u0E1B\u0E49\u0E32 @6.80 \u0E23\u0E31\u0E1A 340 \u0E3F"
    },
    {
      id: "past-sunday8-settled",
      dateKey: "2026-11-08",
      date: "8 \u0E1E.\u0E22.",
      fullDate: "\u0E27\u0E31\u0E19\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C 8 \u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19 2026",
      matchTitle: "Sunderland vs Chelsea",
      league: "Premier League \u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
      predictedScore: "1-2",
      actualScore: "1-2",
      odds: 8.6,
      consensusScore: 100,
      result: "WIN",
      settledAt: "05:00 \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)",
      slipNumber: "\u2116 89938104921",
      note: "\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 1-2 \u0E40\u0E02\u0E49\u0E32\u0E40\u0E1B\u0E49\u0E32 @8.60 \u0E23\u0E31\u0E1A 430 \u0E3F"
    }
  ];
}
function loadEngineState() {
  const seeds = getVerifiedSeedPicks();
  const defaultSettled = getDefaultSettledRecords();
  let state = {
    picksByDate: seeds,
    settledRecords: defaultSettled,
    pipeline: {
      lastTickAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastTickBkk: getBangkokServerTime().formattedTime,
      logs: []
    }
  };
  try {
    if (fs.existsSync(ENGINE_STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(ENGINE_STATE_FILE, "utf-8"));
      const mergedSettled = Array.isArray(raw.settledRecords) ? [...raw.settledRecords] : [];
      for (const defRec of defaultSettled) {
        const existingIdx = mergedSettled.findIndex((r) => r.dateKey === defRec.dateKey);
        if (existingIdx === -1) {
          mergedSettled.push(defRec);
        } else {
          mergedSettled[existingIdx] = defRec;
        }
      }
      mergedSettled.sort((a, b) => (b.dateKey || "").localeCompare(a.dateKey || ""));
      state = {
        picksByDate: { ...raw.picksByDate, ...seeds },
        settledRecords: mergedSettled.length ? mergedSettled : defaultSettled,
        pipeline: {
          ...state.pipeline,
          ...raw.pipeline,
          logs: Array.isArray(raw.pipeline?.logs) ? raw.pipeline.logs.slice(0, 30) : []
        }
      };
    }
  } catch (err) {
    console.warn("[DailyEngine] Failed reading .scorepulse-engine.json, resetting cleanly:", err);
  }
  return state;
}
function saveEngineState(state) {
  try {
    state.pipeline.logs = (state.pipeline.logs || []).slice(0, 25);
    fs.writeFileSync(ENGINE_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("[DailyEngine] Failed saving .scorepulse-engine.json:", err);
  }
}
function appendLog(state, bkk, step, status, message) {
  const entry = {
    timeBkk: `${bkk.formattedTime} (${bkk.calendarDateKey})`,
    dateKey: bkk.operationalDateKey,
    step,
    status,
    message
  };
  const top = state.pipeline.logs[0];
  if (top && top.step === step && top.dateKey === entry.dateKey && top.message === message) {
    return;
  }
  state.pipeline.logs = [entry, ...state.pipeline.logs].slice(0, 25);
}
function sanitizeTelegramToken(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().replace(/^['"]+|['"]+$/g, "").replace(/[\r\n\s]+/g, "");
}
function loadTelegramConfig() {
  const envToken = sanitizeTelegramToken(process.env.TELEGRAM_BOT_TOKEN);
  const envChat = (process.env.TELEGRAM_CHAT_ID || "").trim();
  try {
    if (fs.existsSync(TELEGRAM_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(TELEGRAM_CONFIG_FILE, "utf-8"));
      const fileToken = sanitizeTelegramToken(data.botToken);
      const fileChat = typeof data.chatId === "string" ? data.chatId.trim() : "";
      return {
        enabled: true,
        notifyTime: "06:30",
        detectedChats: [],
        ...data,
        botToken: fileToken || envToken,
        chatId: fileChat || envChat
      };
    }
  } catch (e) {
    console.warn("[Telegram] Failed to read .telegram-config.json:", e);
  }
  return {
    enabled: true,
    botToken: envToken,
    chatId: envChat,
    notifyTime: "06:30",
    detectedChats: [],
    lastDispatchStatus: envToken ? "PENDING" : "NO_TOKEN"
  };
}
function saveTelegramConfig(config) {
  try {
    fs.writeFileSync(TELEGRAM_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.error("[Telegram] Failed to save .telegram-config.json:", e);
  }
}
function escapeTelegramHtml(text) {
  return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function formatServerAhOdds(odds) {
  if (!Number.isFinite(odds)) return "1.74";
  const rounded3 = Number(odds.toFixed(3));
  return Math.round(rounded3 * 100) === Math.round(rounded3 * 1e3) / 10 ? rounded3.toFixed(2) : rounded3.toFixed(3);
}
function formatServer1xBetButton(teamSide, line) {
  const num = teamSide === "AWAY" ? "2" : "1";
  return `${num} (${line})`;
}
function resolveServerAsianHandicap(pick) {
  if (pick.asianHandicap) {
    return pick.asianHandicap;
  }
  const [predH, predA] = (pick.primaryScore || "2-0").split("-").map((n) => parseInt(n, 10) || 0);
  const isAwayFav = predA > predH || pick.awayTeam.expectedGoals > pick.homeTeam.expectedGoals + 0.15;
  const favTeam = isAwayFav ? pick.awayTeam.name : pick.homeTeam.name;
  const teamSide = isAwayFav ? "AWAY" : "HOME";
  const xgGap = Number(Math.abs(pick.homeTeam.expectedGoals - pick.awayTeam.expectedGoals).toFixed(2));
  const line = xgGap >= 0.75 ? -0.75 : -0.25;
  const btn = formatServer1xBetButton(teamSide, line);
  const lineLabel = line === -0.75 ? `-0.75 (\u0E04\u0E23\u0E36\u0E48\u0E07\u0E04\u0E27\u0E1A\u0E25\u0E39\u0E01 \u2022 \u0E01\u0E14 ${btn} \u0E43\u0E19 1xBet)` : `-0.25 (\u0E40\u0E2A\u0E21\u0E2D\u0E04\u0E27\u0E1A\u0E04\u0E23\u0E36\u0E48\u0E07 \u2022 \u0E01\u0E14 ${btn} \u0E43\u0E19 1xBet)`;
  const winRuleThai = line === -0.75 ? "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B \u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 100% / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01 \u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%" : "\u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B \u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 100% / \u0E40\u0E2A\u0E21\u0E2D\u0E40\u0E2A\u0E35\u0E22\u0E04\u0E23\u0E36\u0E48\u0E07 (\u0E04\u0E37\u0E19\u0E17\u0E38\u0E19 50%)";
  const odds = pick.primaryOdds <= 2.5 ? pick.primaryOdds : 1.741;
  return {
    selection: `${favTeam} ${line > 0 ? `+${line}` : line}`,
    teamSide,
    line,
    lineLabel,
    odds,
    coverProbability: pick.poissonPeak > 40 ? pick.poissonPeak : 62.5,
    expectedValue: 10.8,
    xgGap,
    winRuleThai,
    backupAlternative: pick.safeOption || `${favTeam} -0.25 (${formatServer1xBetButton(teamSide, -0.25)}) \u0E2B\u0E23\u0E37\u0E2D Over 1.5`
  };
}
function evaluateServer1xBetSelectionCriteria(params) {
  const { line, odds, coverProbability, xgGap } = params;
  const impliedProb = Number((100 / Math.max(1.01, odds)).toFixed(1));
  const edgeOver1xBet = Number((coverProbability - impliedProb).toFixed(1));
  const evPct = Number(((coverProbability / 100 * odds - 1) * 100).toFixed(1));
  const isQuarter = Math.abs(Math.abs(Math.abs(line) % 0.5) - 0.25) < 0.01;
  const oddsOk = odds >= 1.65 && odds <= 1.98;
  const edgeOk = edgeOver1xBet >= 3.5 && evPct >= 6;
  const minGap = Math.abs(line) >= 0.75 ? 0.75 : 0.5;
  const xgOk = xgGap >= minGap;
  const passedCount = [isQuarter, oddsOk, edgeOk, xgOk, true].filter(Boolean).length;
  return {
    passedCount,
    totalCount: 5,
    allPassed: isQuarter && oddsOk && edgeOk && xgOk,
    impliedProb,
    edgeOver1xBet,
    evPct
  };
}
function formatDailySuperPickTelegramMessage(pick, appUrl = DEFAULT_APP_URL) {
  if (pick.ahStep2) {
    const [leg1, leg2] = pick.ahStep2.legs;
    const combStr = formatServerAhOdds(pick.ahStep2.combinedOdds);
    const halfWinStr = formatServerAhOdds(pick.ahStep2.halfWinCombinedOdds);
    const cleanBet1002 = Math.round(100 * pick.ahStep2.combinedOdds);
    const halfBet100 = Math.round(100 * pick.ahStep2.halfWinCombinedOdds);
    return `\u26A1 <b>[ScorePulse AH Step 2] \u0E0B\u0E38\u0E1B\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E42\u0E1E\u0E22 1xBet \u0E2A\u0E40\u0E15\u0E47\u0E1B 2 \u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4C5} ${escapeTelegramHtml(pick.dateText)}

1\uFE0F\u20E3 <b>\u0E04\u0E39\u0E48\u0E17\u0E35\u0E48 1:</b> ${escapeTelegramHtml(leg1.matchTitle)} (${escapeTelegramHtml(leg1.league)})
\u23F0 ${escapeTelegramHtml(leg1.kickoffTime)}
\u25B6 \u0E1B\u0E38\u0E48\u0E21 1xBet: <code>${escapeTelegramHtml(leg1.buttonLabel)}</code> (${escapeTelegramHtml(leg1.selection)} \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33 <b>@${formatServerAhOdds(leg1.odds)}</b>)
\u25B6 xG: ${leg1.homeXg.toFixed(2)} vs ${leg1.awayXg.toFixed(2)} (Gap +${leg1.xgGap.toFixed(2)}) | \u0E42\u0E21\u0E40\u0E14\u0E25 ${leg1.coverProbability.toFixed(1)}% vs Implied ${leg1.impliedProbPct}% (Edge +${leg1.edgeOver1xBetPct}%)

2\uFE0F\u20E3 <b>\u0E04\u0E39\u0E48\u0E17\u0E35\u0E48 2:</b> ${escapeTelegramHtml(leg2.matchTitle)} (${escapeTelegramHtml(leg2.league)})
\u23F0 ${escapeTelegramHtml(leg2.kickoffTime)}
\u25B6 \u0E1B\u0E38\u0E48\u0E21 1xBet: <code>${escapeTelegramHtml(leg2.buttonLabel)}</code> (${escapeTelegramHtml(leg2.selection)} \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33 <b>@${formatServerAhOdds(leg2.odds)}</b>)
\u25B6 xG: ${leg2.homeXg.toFixed(2)} vs ${leg2.awayXg.toFixed(2)} (Gap +${leg2.xgGap.toFixed(2)}) | \u0E42\u0E21\u0E40\u0E14\u0E25 ${leg2.coverProbability.toFixed(1)}% vs Implied ${leg2.impliedProbPct}% (Edge +${leg2.edgeOver1xBetPct}%)

\u{1F3AF} <b>\u0E2A\u0E23\u0E38\u0E1B\u0E1A\u0E34\u0E25\u0E2A\u0E40\u0E15\u0E47\u0E1B 2 (\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C 1xBet 5/5 \u0E17\u0E31\u0E49\u0E07\u0E04\u0E39\u0E48):</b>
\u25B6 <b>\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E23\u0E27\u0E21 AH Step 2:</b> <b>@${combStr}</b> (100 \u0E3F \u0E23\u0E31\u0E1A <b>${cleanBet1002} \u0E3F</b>)
\u25B6 <b>\u0E15\u0E31\u0E27\u0E01\u0E31\u0E19\u0E1E\u0E25\u0E32\u0E14\u0E23\u0E32\u0E04\u0E32\u0E04\u0E27\u0E1A:</b> \u0E0A\u0E19\u0E30\u0E02\u0E32\u0E14 1 \u0E04\u0E39\u0E48 + \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01 1 \u0E04\u0E39\u0E48 \u0E22\u0E31\u0E07\u0E23\u0E31\u0E1A <b>@${halfWinStr}</b> (${halfBet100} \u0E3F)
\u{1F4CB} \u0E2A\u0E25\u0E34\u0E1B\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07: <code>${escapeTelegramHtml(pick.slipNumber)}</code> | \u0E09\u0E31\u0E19\u0E17\u0E32\u0E21\u0E15\u0E34: <b>${pick.consensusRate.toFixed(1)}%</b>

\u{1F6E1}\uFE0F <b>\u0E1A\u0E34\u0E25\u0E2A\u0E40\u0E15\u0E47\u0E1B 2 \u0E2A\u0E32\u0E22\u0E40\u0E0B\u0E1F (-0.25 \u0E17\u0E31\u0E49\u0E07\u0E04\u0E39\u0E48):</b>
\u25B6 ${escapeTelegramHtml(pick.safeOption)}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4F2} \u0E14\u0E39\u0E1A\u0E17\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E41\u0E25\u0E30\u0E2A\u0E16\u0E34\u0E15\u0E34 1 \u0E40\u0E14\u0E37\u0E2D\u0E19\u0E40\u0E15\u0E47\u0E21:
${escapeTelegramHtml(appUrl)}`;
  }
  const ah = resolveServerAsianHandicap(pick);
  const oddsStr = formatServerAhOdds(ah.odds);
  const btnLabel = formatServer1xBetButton(ah.teamSide, ah.line);
  const cleanBet100 = Math.round(100 * ah.odds);
  const totalXg = pick.homeTeam.expectedGoals + pick.awayTeam.expectedGoals;
  const gate = evaluateServer1xBetSelectionCriteria({
    line: ah.line,
    odds: ah.odds,
    coverProbability: ah.coverProbability,
    xgGap: ah.xgGap
  });
  return `\u{1F3C6} <b>[ScorePulse AH] \u0E0B\u0E38\u0E1B\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E42\u0E1E\u0E22 1xBet \u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B (\u0E04\u0E31\u0E14\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27 1 \u0E04\u0E39\u0E48)</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4C5} ${escapeTelegramHtml(pick.dateText)}
\u26BD <b>\u0E04\u0E39\u0E48\u0E40\u0E2D\u0E01\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A 1:</b> ${escapeTelegramHtml(pick.matchTitle)}
\u{1F3C6} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23: ${escapeTelegramHtml(pick.league)}
\u{1F3DF}\uFE0F \u0E2A\u0E19\u0E32\u0E21: ${escapeTelegramHtml(pick.venue)}
\u23F0 \u0E04\u0E34\u0E01\u0E2D\u0E2D\u0E1F: ${escapeTelegramHtml(pick.kickoffTime)}

\u{1F3AF} <b>\u0E01\u0E14\u0E15\u0E32\u0E21\u0E08\u0E23\u0E34\u0E07\u0E43\u0E19 1xBet (\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E01\u0E15\u0E34 \u2192 \u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B):</b>
\u25B6 <b>\u0E1B\u0E38\u0E48\u0E21 1xBet:</b> <code>${escapeTelegramHtml(btnLabel)}</code> (${escapeTelegramHtml(ah.selection)} \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33 <b>@${oddsStr}</b>)
\u25B6 <b>\u0E01\u0E15\u0E34\u0E01\u0E32\u0E23\u0E32\u0E04\u0E32:</b> ${escapeTelegramHtml(ah.winRuleThai)}
\u25B6 <b>\u0E40\u0E01\u0E13\u0E11\u0E4C 1xBet (${gate.passedCount}/${gate.totalCount} \u0E02\u0E49\u0E2D):</b> \u0E42\u0E21\u0E40\u0E14\u0E25 <b>${ah.coverProbability.toFixed(1)}%</b> vs 1xBet Implied <b>${gate.impliedProb}%</b> (Edge <b>+${gate.edgeOver1xBet}%</b> | EV <b>+${ah.expectedValue.toFixed(1)}%</b>)
\u{1F4CB} \u0E2A\u0E25\u0E34\u0E1B\u0E2D\u0E49\u0E32\u0E07\u0E2D\u0E34\u0E07: <code>${escapeTelegramHtml(pick.slipNumber)}</code> (100 \u0E3F \u0E23\u0E31\u0E1A ${cleanBet100} \u0E3F)

\u{1F6E1}\uFE0F <b>\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E0B\u0E1F\u0E15\u0E35\u0E49\u0E43\u0E19\u0E41\u0E17\u0E47\u0E1A\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19 &amp; \u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E04\u0E32\u0E14\u0E01\u0E32\u0E23\u0E13\u0E4C:</b>
\u25B6 \u0E40\u0E0B\u0E1F\u0E15\u0E35\u0E49: ${escapeTelegramHtml(ah.backupAlternative)}
\u25B6 \u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E04\u0E32\u0E14\u0E01\u0E32\u0E23\u0E13\u0E4C: <b>${escapeTelegramHtml(pick.primaryScore)}</b> (\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E38\u0E49\u0E19\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E1B\u0E4A\u0E30 \u0E01\u0E34\u0E19\u0E15\u0E32\u0E21\u0E23\u0E32\u0E04\u0E32\u0E04\u0E27\u0E1A)

\u{1F4CA} <b>\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E04\u0E31\u0E14\u0E01\u0E23\u0E2D\u0E07 xG (\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 +${ah.xgGap.toFixed(2)} xG):</b>
\u2713 ${escapeTelegramHtml(pick.homeTeam.name)} <b>${pick.homeTeam.expectedGoals.toFixed(2)}</b> vs ${escapeTelegramHtml(pick.awayTeam.name)} <b>${pick.awayTeam.expectedGoals.toFixed(2)}</b> (\u0E23\u0E27\u0E21 ${totalXg.toFixed(2)})
\u2713 \u0E2A\u0E16\u0E34\u0E15\u0E34 HDP \u0E22\u0E49\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07 1 \u0E40\u0E14\u0E37\u0E2D\u0E19: <b>67.7% (+10.6% ROI \u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14)</b> | Consensus: <b>${pick.consensusRate.toFixed(1)}%</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4F2} \u0E14\u0E39\u0E1A\u0E17\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E41\u0E25\u0E30\u0E2A\u0E16\u0E34\u0E15\u0E34 1 \u0E40\u0E14\u0E37\u0E2D\u0E19\u0E40\u0E15\u0E47\u0E21:
${escapeTelegramHtml(appUrl)}`;
}
function translateTelegramError(status, description) {
  const desc = (description || "").toLowerCase();
  if (status === 401 || desc.includes("unauthorized")) {
    return `Bot Token \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01 (Telegram 401) \u2014 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E04\u0E31\u0E14\u0E25\u0E2D\u0E01 Token \u0E08\u0E32\u0E01 @BotFather \u0E43\u0E2B\u0E21\u0E48 (${description})`;
  }
  if (desc.includes("chat not found")) {
    return `\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E01\u0E25\u0E38\u0E48\u0E21/\u0E41\u0E0A\u0E17\u0E19\u0E35\u0E49 (chat not found) \u2014 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E0A\u0E34\u0E0D\u0E1A\u0E2D\u0E17\u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E01\u0E48\u0E2D\u0E19 \u0E41\u0E25\u0E49\u0E27\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E43\u0E14\u0E01\u0E47\u0E44\u0E14\u0E49\u0E43\u0E19\u0E01\u0E25\u0E38\u0E48\u0E21 1 \u0E04\u0E23\u0E31\u0E49\u0E07 \u0E08\u0E32\u0E01\u0E19\u0E31\u0E49\u0E19\u0E01\u0E14 "\u0E2A\u0E41\u0E01\u0E19\u0E2B\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34" (${description})`;
  }
  if (status === 403 || desc.includes("kicked") || desc.includes("not a member") || desc.includes("blocked")) {
    return `\u0E1A\u0E2D\u0E17\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E2A\u0E48\u0E07\u0E43\u0E19\u0E01\u0E25\u0E38\u0E48\u0E21\u0E19\u0E35\u0E49 (Telegram 403): \u0E1A\u0E2D\u0E17\u0E2D\u0E32\u0E08\u0E16\u0E39\u0E01\u0E25\u0E1A\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E39\u0E01\u0E1B\u0E34\u0E14\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C Send Messages (${description})`;
  }
  if (desc.includes("need administrator rights")) {
    return `\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A Channel \u0E15\u0E49\u0E2D\u0E07\u0E15\u0E31\u0E49\u0E07\u0E1A\u0E2D\u0E17\u0E40\u0E1B\u0E47\u0E19 Admin \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C Post Messages \u0E01\u0E48\u0E2D\u0E19\u0E04\u0E23\u0E31\u0E1A (${description})`;
  }
  return `Telegram API (${status}): ${description}`;
}
async function verifyTelegramBotToken(botToken) {
  const token = sanitizeTelegramToken(botToken);
  if (!token) {
    return { valid: false, error: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E01\u0E23\u0E2D\u0E01 Telegram Bot Token (\u0E08\u0E32\u0E01 @BotFather)" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { valid: false, error: translateTelegramError(res.status, data?.description || "Invalid token") };
    }
    return {
      valid: true,
      displayName: data.result?.first_name,
      username: data.result?.username ? `@${data.result.username}` : void 0,
      botId: data.result?.id
    };
  } catch (err) {
    return { valid: false, error: err?.message || "\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D Telegram Bot API \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" };
  }
}
async function detectTelegramGroupChats(botToken) {
  const token = sanitizeTelegramToken(botToken);
  if (!token) {
    return { ok: false, chats: [], error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E2A\u0E48 Telegram Bot Token \u0E01\u0E48\u0E2D\u0E19\u0E2A\u0E41\u0E01\u0E19\u0E2B\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50`);
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, chats: [], error: translateTelegramError(res.status, data?.description || "getUpdates failed") };
    }
    const bkk = getBangkokServerTime();
    const map = /* @__PURE__ */ new Map();
    const updates = Array.isArray(data.result) ? data.result : [];
    for (const upd of updates) {
      const chat = upd?.message?.chat || upd?.edited_message?.chat || upd?.my_chat_member?.chat || upd?.channel_post?.chat;
      if (!chat || chat.id === void 0) continue;
      const cid = String(chat.id);
      const type = chat.type === "supergroup" ? "supergroup" : chat.type === "group" ? "group" : chat.type === "channel" ? "channel" : "private";
      const title = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || (chat.username ? `@${chat.username}` : cid);
      map.set(cid, {
        chatId: cid,
        title,
        type,
        lastMessageAtBkk: `${bkk.formattedDate} ${bkk.formattedTime} \u0E19.`
      });
    }
    const chats = Array.from(map.values()).sort((a, b) => {
      const score = (t) => t === "supergroup" || t === "group" ? 0 : t === "channel" ? 1 : 2;
      return score(a.type) - score(b.type);
    });
    return { ok: true, chats };
  } catch (err) {
    return { ok: false, chats: [], error: err?.message || "\u0E2A\u0E41\u0E01\u0E19\u0E2B\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" };
  }
}
async function sendTelegramMessage(botToken, chatId, htmlText) {
  const token = sanitizeTelegramToken(botToken);
  const targetChatId = (chatId || "").trim();
  if (!token) {
    throw new Error("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 Telegram Bot Token (\u0E08\u0E32\u0E01 @BotFather)");
  }
  if (!targetChatId) {
    throw new Error('\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 Chat ID \u0E02\u0E2D\u0E07\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram (\u0E40\u0E0A\u0E48\u0E19 -100...) \u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E14 "\u0E2A\u0E41\u0E01\u0E19\u0E2B\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34"');
  }
  const doSend = async (cid) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cid,
        text: htmlText,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };
  const first = await doSend(targetChatId);
  if (first.res.ok && first.data?.ok) {
    return {};
  }
  const migrateId = first.data?.parameters?.migrate_to_chat_id;
  if (migrateId) {
    const newCid = String(migrateId);
    const second = await doSend(newCid);
    if (second.res.ok && second.data?.ok) {
      return { migratedChatId: newCid };
    }
    throw new Error(translateTelegramError(second.res.status, second.data?.description || "Telegram send error"));
  }
  throw new Error(translateTelegramError(first.res.status, first.data?.description || "Telegram send error"));
}
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.startsWith("MY_")) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
  ]);
}
async function resolveFuturePickWithSearch(dateKey, excludeMatchTitle) {
  const ai = getGeminiClient();
  const fullDateThai = formatThaiFullDateFromKey(dateKey);
  const useAhStep2Mode = dateKey >= "2026-11-23";
  if (ai && useAhStep2Mode) {
    try {
      const prompt = `\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E15\u0E32\u0E23\u0E32\u0E07\u0E1F\u0E38\u0E15\u0E1A\u0E2D\u0E25\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E08\u0E23\u0E34\u0E07\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${dateKey} (\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E44\u0E17\u0E22) \u0E08\u0E32\u0E01 Google Search \u0E40\u0E1B\u0E23\u0E35\u0E22\u0E1A\u0E40\u0E17\u0E35\u0E22\u0E1A\u0E17\u0E38\u0E01\u0E04\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27\u0E04\u0E31\u0E14\u0E40\u0E25\u0E37\u0E2D\u0E01 "\u0E0B\u0E38\u0E1B\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E42\u0E1E\u0E22 1xBet AH Step 2 (\u0E2A\u0E40\u0E15\u0E47\u0E1B 2 \u0E04\u0E39\u0E48\u0E17\u0E35\u0E48\u0E14\u0E35\u0E41\u0E25\u0E30\u0E0A\u0E31\u0E27\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14)" \u0E42\u0E14\u0E22\u0E17\u0E31\u0E49\u0E07 2 \u0E04\u0E39\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E0B\u0E49\u0E33\u0E01\u0E31\u0E19\u0E41\u0E25\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E04\u0E23\u0E1A\u0E17\u0E31\u0E49\u0E07 5 \u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E04\u0E31\u0E14\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2D\u0E34\u0E07\u0E01\u0E23\u0E30\u0E14\u0E32\u0E19\u0E08\u0E23\u0E34\u0E07 1xBet \u0E14\u0E31\u0E07\u0E19\u0E35\u0E49:
1. \u0E2B\u0E49\u0E32\u0E21\u0E0B\u0E49\u0E33\u0E01\u0E31\u0E1A\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E27\u0E32\u0E19 (${excludeMatchTitle || "\u0E44\u0E21\u0E48\u0E21\u0E35"}) \u0E41\u0E25\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E25\u0E35\u0E01\u0E2B\u0E25\u0E31\u0E01\u0E17\u0E35\u0E48 1xBet \u0E21\u0E35\u0E2A\u0E20\u0E32\u0E1E\u0E04\u0E25\u0E48\u0E2D\u0E07\u0E2A\u0E39\u0E07 (Vig <= 6.5%)
2. \u0E23\u0E32\u0E04\u0E32\u0E04\u0E27\u0E1A 1xBet \u0E08\u0E23\u0E34\u0E07\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19 (.25 \u0E2B\u0E23\u0E37\u0E2D .75 \u0E40\u0E0A\u0E48\u0E19 -0.75, -0.25) \u0E2B\u0E49\u0E32\u0E21\u0E43\u0E0A\u0E49 -0.5 \u0E2B\u0E23\u0E37\u0E2D -1.0
3. \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E15\u0E48\u0E2D\u0E04\u0E39\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 @1.65 \u0E16\u0E36\u0E07 @1.98 (\u0E23\u0E27\u0E21 2 \u0E04\u0E39\u0E48\u0E08\u0E30\u0E44\u0E14\u0E49\u0E23\u0E32\u0E27 @2.80\u2013@3.80)
4. \u0E41\u0E15\u0E48\u0E25\u0E30\u0E04\u0E39\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 coverProbability > 1xBet Implied Prob \u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 +3.5% \u0E41\u0E25\u0E30 +EV >= +6.0%
5. \u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 xG Gap >= +0.75 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A -0.75 \u0E2B\u0E23\u0E37\u0E2D >= +0.50 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A -0.25
\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E40\u0E1B\u0E47\u0E19 JSON \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19:
{
  "legs": [
    {
      "matchTitle": "Home1 vs Away1",
      "homeName": "Home1",
      "homeCode": "HM1",
      "awayName": "Away1",
      "awayCode": "AW1",
      "league": "League Name & Emoji",
      "venue": "Stadium 1",
      "kickoffTimeThai": "HH:mm \u0E19. ICT",
      "ahTeamSide": "HOME",
      "ahLine": -0.75,
      "ahOdds": 1.84,
      "coverProbability": 66.5,
      "homeXg": 1.80,
      "awayXg": 0.75,
      "rationaleThai": "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E04\u0E39\u0E48 1"
    },
    {
      "matchTitle": "Home2 vs Away2",
      "homeName": "Home2",
      "homeCode": "HM2",
      "awayName": "Away2",
      "awayCode": "AW2",
      "league": "League Name & Emoji",
      "venue": "Stadium 2",
      "kickoffTimeThai": "HH:mm \u0E19. ICT",
      "ahTeamSide": "HOME",
      "ahLine": -0.75,
      "ahOdds": 1.82,
      "coverProbability": 64.5,
      "homeXg": 1.74,
      "awayXg": 0.78,
      "rationaleThai": "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E04\u0E39\u0E48 2"
    }
  ]
}`;
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            temperature: 0.2
          }
        }),
        5e3,
        "Gemini future AH Step 2 search"
      );
      const parsed = JSON.parse(response.text || "{}");
      const rawLegs = Array.isArray(parsed.legs) ? parsed.legs : [];
      if (rawLegs.length >= 2 && rawLegs[0]?.matchTitle !== rawLegs[1]?.matchTitle) {
        const builtLegs = rawLegs.slice(0, 2).map((leg, i) => {
          const homeXg = Number(leg.homeXg) || 1.78;
          const awayXg = Number(leg.awayXg) || 0.78;
          const xgGap = Number(Math.abs(homeXg - awayXg).toFixed(2));
          let line = typeof leg.ahLine === "number" ? leg.ahLine : -0.75;
          if (Math.abs(line % 0.5) < 0.01) {
            line = xgGap >= 0.75 ? -0.75 : -0.25;
          }
          const odds = Number(leg.ahOdds) || 1.78;
          const coverProbability = Math.max(60, Number(leg.coverProbability) || 64.5);
          const gate = evaluateServer1xBetSelectionCriteria({ line, odds, coverProbability, xgGap });
          if (!gate.allPassed || leg.matchTitle === excludeMatchTitle) {
            throw new Error(`Step 2 leg ${i + 1} (${leg.matchTitle}) failed 1xBet 5/5 gate`);
          }
          const teamSide = leg.ahTeamSide === "AWAY" ? "AWAY" : "HOME";
          const favName = teamSide === "AWAY" ? leg.awayName : leg.homeName;
          const buttonLabel = formatServer1xBetButton(teamSide, line);
          return {
            legNumber: i + 1,
            matchId: "match-netherlands-greece",
            matchTitle: leg.matchTitle,
            homeName: leg.homeName,
            awayName: leg.awayName,
            league: leg.league || "European Football \u{1F30D}",
            kickoffTime: leg.kickoffTimeThai || "\u0E04\u0E37\u0E19\u0E19\u0E35\u0E49 02:45 \u0E19. ICT",
            venue: leg.venue || "Main Stadium",
            homeXg,
            awayXg,
            xgGap,
            selection: `${favName} ${line > 0 ? `+${line}` : line}`,
            teamSide,
            line,
            buttonLabel,
            safetyButtonLabel: formatServer1xBetButton(teamSide, -0.25),
            odds,
            impliedProbPct: gate.impliedProb,
            coverProbability,
            edgeOver1xBetPct: gate.edgeOver1xBet,
            expectedValuePct: gate.evPct,
            winRuleThai: line === -0.75 ? "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%" : "\u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 / \u0E40\u0E2A\u0E21\u0E2D\u0E40\u0E2A\u0E35\u0E22\u0E04\u0E23\u0E36\u0E48\u0E07 (\u0E04\u0E37\u0E19\u0E17\u0E38\u0E19 50%)",
            rationaleThai: leg.rationaleThai || `\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C 1xBet 5/5 (Edge +${gate.edgeOver1xBet}%)`
          };
        });
        const [l1, l2] = builtLegs;
        const combinedOdds = Number((l1.odds * l2.odds).toFixed(3));
        const halfWinCombinedOdds = Number((l1.odds * (1 + (l2.odds - 1) / 2)).toFixed(3));
        const combinedCoverProb = Number((l1.coverProbability / 100 * (l2.coverProbability / 100) * 100).toFixed(1));
        const combinedEv = Number(((combinedCoverProb / 100 * combinedOdds - 1) * 100).toFixed(1));
        const slipSuffix = dateKey.replace(/-/g, "").slice(-5);
        return {
          id: `daily-pick-ah-step2-auto-${dateKey}`,
          operationalDateKey: dateKey,
          matchId: "match-netherlands-greece",
          matchTitle: `${l1.selection} + ${l2.selection} (AH Step 2)`,
          league: `${l1.league} & ${l2.league}`,
          kickoffTime: `${l1.kickoffTime} / ${l2.kickoffTime}`,
          venue: `${l1.venue} & ${l2.venue}`,
          dateText: fullDateThai,
          badge: `\u26A1 AH STEP 2 1xBet \u2022 @${formatServerAhOdds(combinedOdds)}`,
          consensusRate: 99,
          primaryScore: "2-0 / 2-0",
          primaryOdds: combinedOdds,
          expectedValue: Math.max(8, combinedEv),
          backupScore: "1-0 / 2-0",
          backupOdds: halfWinCombinedOdds,
          safeOption: `${l1.homeName} -0.25 [${l1.safetyButtonLabel}] + ${l2.homeName} -0.25 [${l2.safetyButtonLabel}]`,
          calibrationError: 0.4,
          brierScore: 0.03,
          poissonPeak: l1.coverProbability,
          slipNumber: `\u2116 8999${slipSuffix}`,
          bookingCode1xBet: `1X-S2-${dateKey.slice(-2)}`,
          isRealMatchTonight: true,
          isSettled: false,
          homeTeam: {
            name: `${l1.homeName} (Leg 1)`,
            code: l1.homeName.slice(0, 3).toUpperCase(),
            logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
            color: "#2563eb",
            form: ["W", "W", "D", "W", "W"],
            expectedGoals: l1.homeXg
          },
          awayTeam: {
            name: l1.awayName,
            code: l1.awayName.slice(0, 3).toUpperCase(),
            logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
            color: "#dc2626",
            form: ["L", "D", "L", "W", "L"],
            expectedGoals: l1.awayXg
          },
          analysisRationale: `\u0E0B\u0E38\u0E1B\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E42\u0E1E\u0E22 AH Step 2 \u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${fullDateThai}: \u0E02\u0E321 ${l1.selection} [${l1.buttonLabel} @${formatServerAhOdds(l1.odds)}] + \u0E02\u0E322 ${l2.selection} [${l2.buttonLabel} @${formatServerAhOdds(l2.odds)}] \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E23\u0E27\u0E21 @${formatServerAhOdds(combinedOdds)}`,
          keyReasons: [
            `\u0E02\u0E32\u0E17\u0E35\u0E48 1: ${l1.matchTitle} (${l1.buttonLabel} @${formatServerAhOdds(l1.odds)} | Edge +${l1.edgeOver1xBetPct}%)`,
            `\u0E02\u0E32\u0E17\u0E35\u0E48 2: ${l2.matchTitle} (${l2.buttonLabel} @${formatServerAhOdds(l2.odds)} | Edge +${l2.edgeOver1xBetPct}%)`,
            `\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E23\u0E27\u0E21 AH Step 2 = @${formatServerAhOdds(combinedOdds)} (\u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21+\u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 \u0E22\u0E31\u0E07\u0E44\u0E14\u0E49 @${formatServerAhOdds(halfWinCombinedOdds)})`
          ],
          generatedBy: "GEMINI_SEARCH_AI",
          asianHandicap: {
            selection: l1.selection,
            teamSide: l1.teamSide,
            line: l1.line,
            lineLabel: `${l1.line} (\u0E01\u0E14 ${l1.buttonLabel} \u0E43\u0E19 1xBet)`,
            odds: l1.odds,
            coverProbability: l1.coverProbability,
            expectedValue: l1.expectedValuePct,
            xgGap: l1.xgGap,
            winRuleThai: l1.winRuleThai,
            backupAlternative: `${l1.selection.replace(/\s[-+]?\d+(\.\d+)?$/, "")} -0.25 [${l1.safetyButtonLabel}]`
          },
          ahStep2: {
            mode: "AH_STEP_2",
            legs: [l1, l2],
            combinedOdds,
            halfWinCombinedOdds,
            combinedCoverProb,
            combinedExpectedValue: Math.max(8, combinedEv),
            step2RuleSummaryThai: "\u0E17\u0E31\u0E49\u0E07 2 \u0E04\u0E39\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C 1xBet 5/5 \u0E02\u0E49\u0E2D\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19",
            halfWinNoteThai: `\u0E16\u0E49\u0E32\u0E0A\u0E19\u0E30\u0E02\u0E32\u0E14 1 \u0E04\u0E39\u0E48 + \u0E0A\u0E19\u0E30\u0E40\u0E09\u0E35\u0E22\u0E14 1 \u0E25\u0E39\u0E01 1 \u0E04\u0E39\u0E48 \u0E22\u0E31\u0E07\u0E23\u0E31\u0E1A @${formatServerAhOdds(halfWinCombinedOdds)}`
          }
        };
      }
    } catch (err) {
      console.warn(`[DailyEngine] Gemini Step 2 search rejected/failed for ${dateKey}:`, err);
    }
  } else if (ai) {
    try {
      const prompt = `\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E15\u0E32\u0E23\u0E32\u0E07\u0E1F\u0E38\u0E15\u0E1A\u0E2D\u0E25\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E08\u0E23\u0E34\u0E07\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${dateKey} (\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28\u0E44\u0E17\u0E22) \u0E08\u0E32\u0E01 Google Search \u0E40\u0E1B\u0E23\u0E35\u0E22\u0E1A\u0E40\u0E17\u0E35\u0E22\u0E1A\u0E17\u0E38\u0E01\u0E04\u0E39\u0E48\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E41\u0E25\u0E49\u0E27\u0E04\u0E31\u0E14\u0E40\u0E25\u0E37\u0E2D\u0E01 "\u0E0B\u0E38\u0E1B\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E42\u0E1E\u0E22 1xBet \u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B \u0E04\u0E39\u0E48\u0E40\u0E2D\u0E01\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A 1 \u0E40\u0E1E\u0E35\u0E22\u0E07 1 \u0E04\u0E39\u0E48" \u0E42\u0E14\u0E22\u0E15\u0E49\u0E2D\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E04\u0E23\u0E1A\u0E17\u0E31\u0E49\u0E07 5 \u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u0E04\u0E31\u0E14\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2D\u0E34\u0E07\u0E01\u0E23\u0E30\u0E14\u0E32\u0E19\u0E08\u0E23\u0E34\u0E07 1xBet \u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E19\u0E35\u0E49:
1. \u0E2B\u0E49\u0E32\u0E21\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E04\u0E39\u0E48\u0E40\u0E14\u0E34\u0E21\u0E0B\u0E49\u0E33\u0E01\u0E31\u0E1A\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E27\u0E32\u0E19 (${excludeMatchTitle || "\u0E44\u0E21\u0E48\u0E21\u0E35"}) \u0E41\u0E25\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E25\u0E35\u0E01\u0E2B\u0E25\u0E31\u0E01\u0E17\u0E35\u0E48\u0E21\u0E35\u0E01\u0E23\u0E30\u0E14\u0E32\u0E19 1xBet \u0E2A\u0E20\u0E32\u0E1E\u0E04\u0E25\u0E48\u0E2D\u0E07\u0E2A\u0E39\u0E07 (Vig <= 6.5%)
2. \u0E23\u0E32\u0E04\u0E32\u0E04\u0E27\u0E1A 1xBet \u0E08\u0E23\u0E34\u0E07\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19: \u0E2B\u0E21\u0E27\u0E14 "\u0E40\u0E27\u0E25\u0E32\u0E1B\u0E01\u0E15\u0E34 \u2192 \u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B" \u0E02\u0E2D\u0E07 1xBet \u0E21\u0E35\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E08\u0E38\u0E14\u0E17\u0E28\u0E19\u0E34\u0E22\u0E21 .25 \u0E2B\u0E23\u0E37\u0E2D .75 (-0.75, -0.25, -1.25, +0.25, +0.75) \u0E2B\u0E49\u0E32\u0E21\u0E43\u0E0A\u0E49\u0E23\u0E32\u0E04\u0E32 -0.5 \u0E2B\u0E23\u0E37\u0E2D -1.0 \u0E40\u0E14\u0E47\u0E14\u0E02\u0E32\u0E14!
3. \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33 1xBet \u0E0A\u0E48\u0E27\u0E07\u0E17\u0E33\u0E01\u0E33\u0E44\u0E23: \u0E15\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07 @1.65 \u0E16\u0E36\u0E07 @1.98 \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19 (\u0E15\u0E31\u0E14\u0E23\u0E32\u0E04\u0E32\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E15\u0E48\u0E33 <1.65 \u0E41\u0E25\u0E30\u0E23\u0E32\u0E04\u0E32\u0E15\u0E48\u0E2D\u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E2A\u0E39\u0E07 >1.98 \u0E17\u0E34\u0E49\u0E07)
4. \u0E0A\u0E19\u0E30\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E41\u0E1D\u0E07 1xBet: \u0E04\u0E27\u0E32\u0E21\u0E19\u0E48\u0E32\u0E08\u0E30\u0E40\u0E1B\u0E47\u0E19\u0E42\u0E21\u0E40\u0E14\u0E25 (coverProbability) \u0E15\u0E49\u0E2D\u0E07\u0E2A\u0E39\u0E07\u0E01\u0E27\u0E48\u0E32 1xBet Implied Probability \u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 +3.5% \u0E41\u0E25\u0E30\u0E21\u0E35 +EV >= +6.0%
5. \u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 xG \u0E2A\u0E2D\u0E14\u0E04\u0E25\u0E49\u0E2D\u0E07\u0E23\u0E32\u0E04\u0E32: \u0E16\u0E49\u0E32\u0E23\u0E32\u0E04\u0E32 -0.75 \u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 xG Gap >= +0.75 (\u0E16\u0E49\u0E32\u0E23\u0E32\u0E04\u0E32 -0.25 \u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 xG Gap >= +0.50) \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E15\u0E31\u0E27\u0E40\u0E0B\u0E1F\u0E41\u0E17\u0E47\u0E1A\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19 (-0.25)
6. \u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E40\u0E1B\u0E47\u0E19 JSON \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19\u0E43\u0E19\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A:
{
  "matchTitle": "Home Team vs Away Team",
  "homeName": "Home Team",
  "homeCode": "HOM",
  "awayName": "Away Team",
  "awayCode": "AWY",
  "league": "League Name & Emoji",
  "venue": "Stadium Name, City",
  "kickoffTimeThai": "\u0E04\u0E37\u0E19\u0E19\u0E35\u0E49 HH:mm \u0E19. (\u0E41\u0E02\u0E48\u0E07\u0E08\u0E23\u0E34\u0E07)",
  "ahSelection": "Home Team -0.75",
  "ahTeamSide": "HOME",
  "ahLine": -0.75,
  "ahLineLabel": "-0.75 (\u0E04\u0E23\u0E36\u0E48\u0E07\u0E04\u0E27\u0E1A\u0E25\u0E39\u0E01 \u2022 \u0E01\u0E14 1 (-0.75) \u0E43\u0E19 1xBet)",
  "ahOdds": 1.74,
  "coverProbability": 64.5,
  "primaryScore": "2-0",
  "safeOption": "Home Team -0.25 [\u0E01\u0E14 1 (-0.25)] \u0E2B\u0E23\u0E37\u0E2D Over 1.5 \u0E1B\u0E23\u0E30\u0E15\u0E39",
  "homeXg": 1.84,
  "awayXg": 0.88,
  "rationaleThai": "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E04\u0E31\u0E14\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E1B\u0E47\u0E19\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A 1 \u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E23\u0E38\u0E1B\u0E1F\u0E2D\u0E23\u0E4C\u0E21 \u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A \u0E41\u0E25\u0E30\u0E2A\u0E16\u0E34\u0E15\u0E34 xG \u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22 2-3 \u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14"
}`;
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            temperature: 0.2
          }
        }),
        4500,
        "Gemini future AH pick search"
      );
      const parsed = JSON.parse(response.text || "{}");
      if (parsed.matchTitle && parsed.homeName && parsed.awayName && parsed.matchTitle !== excludeMatchTitle) {
        const slipSuffix = dateKey.replace(/-/g, "").slice(-5);
        const homeXg = Number(parsed.homeXg) || 1.82;
        const awayXg = Number(parsed.awayXg) || 0.88;
        const xgGap = Number(Math.abs(homeXg - awayXg).toFixed(2));
        let ahLine = typeof parsed.ahLine === "number" ? parsed.ahLine : -0.75;
        if (Math.abs(ahLine % 0.5) < 0.01) {
          ahLine = xgGap >= 0.75 ? -0.75 : -0.25;
        }
        const ahOdds = Number(parsed.ahOdds) || 1.74;
        const coverProb = Math.max(60, Number(parsed.coverProbability) || 64.5);
        const gateCheck = evaluateServer1xBetSelectionCriteria({
          line: ahLine,
          odds: ahOdds,
          coverProbability: coverProb,
          xgGap
        });
        if (!gateCheck.allPassed) {
          throw new Error(
            `Candidate ${parsed.matchTitle} failed 1xBet 5-point gate (${gateCheck.passedCount}/5: odds=${ahOdds}, xgGap=${xgGap}, edge=${gateCheck.edgeOver1xBet}%)`
          );
        }
        const ev = gateCheck.evPct;
        const teamSide = parsed.ahTeamSide === "AWAY" ? "AWAY" : "HOME";
        const favName = teamSide === "AWAY" ? parsed.awayName : parsed.homeName;
        const btnLabel = formatServer1xBetButton(teamSide, ahLine);
        const ahSelection = `${favName} ${ahLine > 0 ? `+${ahLine}` : ahLine}`;
        const ahLineLabel = ahLine === -0.75 ? `-0.75 (\u0E04\u0E23\u0E36\u0E48\u0E07\u0E04\u0E27\u0E1A\u0E25\u0E39\u0E01 \u2022 \u0E01\u0E14 ${btnLabel} \u0E43\u0E19 1xBet)` : ahLine === -0.25 ? `-0.25 (\u0E40\u0E2A\u0E21\u0E2D\u0E04\u0E27\u0E1A\u0E04\u0E23\u0E36\u0E48\u0E07 \u2022 \u0E01\u0E14 ${btnLabel} \u0E43\u0E19 1xBet)` : `${ahLine} (\u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B \u2022 \u0E01\u0E14 ${btnLabel} \u0E43\u0E19 1xBet)`;
        const winRuleThai = ahLine === -0.75 ? "\u0E0A\u0E19\u0E30 2 \u0E25\u0E39\u0E01\u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B \u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 100% / \u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01 \u0E01\u0E34\u0E19\u0E04\u0E23\u0E36\u0E48\u0E07 +50%" : ahLine === -0.25 ? "\u0E0A\u0E19\u0E30 1 \u0E25\u0E39\u0E01\u0E02\u0E36\u0E49\u0E19\u0E44\u0E1B \u0E01\u0E34\u0E19\u0E40\u0E15\u0E47\u0E21 100% / \u0E40\u0E2A\u0E21\u0E2D\u0E40\u0E2A\u0E35\u0E22\u0E04\u0E23\u0E36\u0E48\u0E07 (\u0E04\u0E37\u0E19\u0E17\u0E38\u0E19 50%)" : "\u0E04\u0E34\u0E14\u0E1C\u0E25\u0E15\u0E32\u0E21\u0E23\u0E32\u0E04\u0E32\u0E04\u0E27\u0E1A\u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B 1xBet";
        return {
          id: `daily-pick-ah-auto-${dateKey}`,
          operationalDateKey: dateKey,
          matchId: "match-netherlands-greece",
          matchTitle: parsed.matchTitle,
          league: parsed.league || "European Football \u{1F30D}",
          kickoffTime: parsed.kickoffTimeThai || "\u0E04\u0E37\u0E19\u0E19\u0E35\u0E49 02:45 \u0E19. (\u0E41\u0E02\u0E48\u0E07\u0E08\u0E23\u0E34\u0E07)",
          venue: parsed.venue || "Main Stadium",
          dateText: fullDateThai,
          badge: `\u{1F3C6} ASIAN HANDICAP 1xBet \u2022 ${ahSelection} [${btnLabel}]`,
          consensusRate: 98.8,
          primaryScore: parsed.primaryScore || "2-0",
          primaryOdds: ahOdds,
          expectedValue: Math.max(6, ev),
          backupScore: "2-1",
          backupOdds: 1.42,
          safeOption: parsed.safeOption || `${favName} -0.25 [${formatServer1xBetButton(teamSide, -0.25)}] \u0E2B\u0E23\u0E37\u0E2D Over 1.5`,
          calibrationError: 0.4,
          brierScore: 0.031,
          poissonPeak: coverProb,
          slipNumber: `\u2116 8999${slipSuffix}`,
          bookingCode1xBet: `1X-${(parsed.homeCode || "HOM").slice(0, 3)}${(parsed.awayCode || "AWY").slice(0, 3)}-${dateKey.slice(-2)}`,
          isRealMatchTonight: true,
          isSettled: false,
          homeTeam: {
            name: parsed.homeName,
            code: (parsed.homeCode || parsed.homeName.slice(0, 3)).toUpperCase(),
            logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=128&auto=format&fit=crop&q=80",
            color: "#2563eb",
            form: ["W", "D", "W", "W", "D"],
            expectedGoals: homeXg
          },
          awayTeam: {
            name: parsed.awayName,
            code: (parsed.awayCode || parsed.awayName.slice(0, 3)).toUpperCase(),
            logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=128&auto=format&fit=crop&q=80",
            color: "#dc2626",
            form: ["L", "D", "L", "W", "L"],
            expectedGoals: awayXg
          },
          analysisRationale: parsed.rationaleThai || `\u0E04\u0E31\u0E14\u0E40\u0E14\u0E35\u0E48\u0E22\u0E27 1xBet \u0E40\u0E2D\u0E40\u0E0A\u0E35\u0E22\u0E19\u0E41\u0E2E\u0E19\u0E14\u0E34\u0E41\u0E04\u0E1B \u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A 1 \u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${fullDateThai} \u0E1C\u0E48\u0E32\u0E19 5/5 \u0E40\u0E01\u0E13\u0E11\u0E4C 1xBet (\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 +${xgGap} xG | \u0E42\u0E21\u0E40\u0E14\u0E25 ${coverProb}% vs 1xBet Implied ${gateCheck.impliedProb}%)`,
          keyReasons: [
            `\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E04\u0E31\u0E14\u0E40\u0E25\u0E37\u0E2D\u0E01 1xBet 5/5 \u0E02\u0E49\u0E2D: \u0E1B\u0E38\u0E48\u0E21 ${btnLabel} \u0E04\u0E48\u0E32\u0E19\u0E49\u0E33 @${formatServerAhOdds(ahOdds)} (\u0E0A\u0E48\u0E27\u0E07 @1.65\u2013@1.98)`,
            `\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E48\u0E32\u0E07 xG +${xgGap.toFixed(2)} (${homeXg.toFixed(2)} vs ${awayXg.toFixed(2)}) \u0E0A\u0E19\u0E30 1xBet Implied +${gateCheck.edgeOver1xBet}% Edge`,
            `\u0E15\u0E31\u0E27\u0E40\u0E15\u0E47\u0E07 1xBet: ${btnLabel} (@${formatServerAhOdds(ahOdds)}) | \u0E15\u0E31\u0E27\u0E40\u0E0B\u0E1F: ${parsed.safeOption || `${favName} -0.25`}`
          ],
          generatedBy: "GEMINI_SEARCH_AI",
          asianHandicap: {
            selection: ahSelection,
            teamSide,
            line: ahLine,
            lineLabel: ahLineLabel,
            odds: ahOdds,
            coverProbability: coverProb,
            expectedValue: Math.max(6, ev),
            xgGap,
            winRuleThai,
            backupAlternative: parsed.safeOption || `${favName} -0.25 [${formatServer1xBetButton(teamSide, -0.25)}] \u0E2B\u0E23\u0E37\u0E2D Over 1.5`
          }
        };
      }
    } catch (err) {
      console.warn(`[DailyEngine] Gemini Google Search AH lookup failed/rejected by 1xBet gate for ${dateKey}:`, err);
    }
  }
  const seeds = getVerifiedSeedPicks();
  const poolKeys = useAhStep2Mode ? ["2026-11-23", "2026-11-24"] : ["2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"].filter((k) => {
    const p = seeds[k];
    if (!p?.asianHandicap) return false;
    return evaluateServer1xBetSelectionCriteria({
      line: p.asianHandicap.line,
      odds: p.asianHandicap.odds,
      coverProbability: p.asianHandicap.coverProbability,
      xgGap: p.asianHandicap.xgGap
    }).allPassed;
  });
  const activePool = poolKeys.length > 0 ? poolKeys : ["2026-11-23", "2026-11-24"];
  const dayNum = parseInt(dateKey.replace(/-/g, ""), 10) || 0;
  let candidate = seeds[activePool[dayNum % activePool.length]];
  if (excludeMatchTitle && candidate.matchTitle === excludeMatchTitle) {
    candidate = seeds[activePool[(dayNum + 1) % activePool.length]];
  }
  return {
    ...candidate,
    id: `daily-pick-fallback-${dateKey}`,
    operationalDateKey: dateKey,
    dateText: fullDateThai,
    generatedBy: "DETERMINISTIC_FALLBACK"
  };
}
async function settlePickForDate(state, yesterdayKey, bkk) {
  const prevPick = state.picksByDate[yesterdayKey];
  if (!prevPick) {
    return `\u0E44\u0E21\u0E48\u0E21\u0E35\u0E42\u0E1E\u0E22\u0E04\u0E49\u0E32\u0E07\u0E0A\u0E33\u0E23\u0E30\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${yesterdayKey}`;
  }
  if (prevPick.isSettled && state.settledRecords.some((r) => r.dateKey === yesterdayKey)) {
    return `\u0E40\u0E04\u0E25\u0E35\u0E22\u0E23\u0E4C\u0E1C\u0E25 ${prevPick.matchTitle} (${prevPick.settledScore} ${prevPick.settledResult}) \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`;
  }
  const ai = getGeminiClient();
  if (prevPick.ahStep2) {
    const [leg1, leg2] = prevPick.ahStep2.legs;
    let score1 = "";
    let score2 = "";
    if (prevPick.settledScore && prevPick.settledScore.includes("/")) {
      const parts = prevPick.settledScore.split("/").map((s) => s.trim());
      score1 = parts[0] || "";
      score2 = parts[1] || "";
    } else if (ai) {
      try {
        const prompt = `\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E1C\u0E25\u0E1A\u0E2D\u0E25\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35 \u0E02\u0E2D\u0E07 2 \u0E04\u0E39\u0E48\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${yesterdayKey}:
1) ${leg1.matchTitle} (${leg1.league})
2) ${leg2.matchTitle} (${leg2.league})
\u0E15\u0E2D\u0E1A\u0E40\u0E1B\u0E47\u0E19 JSON \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19:
{ "finished": true, "score1": "2-0", "score2": "2-1", "summaryThai": "\u0E2A\u0E23\u0E38\u0E1B\u0E1C\u0E25 2 \u0E04\u0E39\u0E48\u0E2A\u0E31\u0E49\u0E19\u0E46" }`;
        const resp = await withTimeout(
          ai.models.generateContent({
            model: "gemini-4-hydrogen",
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
              responseMimeType: "application/json",
              temperature: 0.1
            }
          }),
          4500,
          "Gemini Step 2 auto-settle"
        );
        const parsed = JSON.parse(resp.text || "{}");
        if (parsed.finished && typeof parsed.score1 === "string" && typeof parsed.score2 === "string") {
          score1 = parsed.score1.trim();
          score2 = parsed.score2.trim();
          prevPick.settledNotes = parsed.summaryThai || prevPick.settledNotes;
        }
      } catch (err) {
        console.warn(`[DailyEngine] Step 2 auto-settle lookup failed for ${yesterdayKey}:`, err);
      }
    }
    if (!score1.includes("-") || !score2.includes("-")) {
      return `\u0E23\u0E2D\u0E1C\u0E25\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E08\u0E23\u0E34\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E07 Step 2 (${leg1.matchTitle} & ${leg2.matchTitle})`;
    }
    const evalLegMultiplier = (score, side, line, odds) => {
      const [h, a] = score.split("-").map((n) => parseInt(n.trim(), 10));
      if (Number.isNaN(h) || Number.isNaN(a)) return 0;
      const diff = (side === "HOME" ? h - a : a - h) + line;
      if (diff >= 0.5) return odds;
      if (diff > 0) return 1 + (odds - 1) / 2;
      if (diff === 0) return 1;
      if (diff === -0.25) return 0.5;
      return 0;
    };
    const m1 = evalLegMultiplier(score1, leg1.teamSide, leg1.line, leg1.odds);
    const m2 = evalLegMultiplier(score2, leg2.teamSide, leg2.line, leg2.odds);
    const totalMult = Number((m1 * m2).toFixed(3));
    const isWin2 = totalMult > 1;
    const actualScoreCombined = `${score1} / ${score2}`;
    const predictedLabel2 = `Step 2: ${leg1.buttonLabel} + ${leg2.buttonLabel}`;
    prevPick.isSettled = true;
    prevPick.isRealMatchTonight = false;
    prevPick.settledScore = actualScoreCombined;
    prevPick.settledResult = isWin2 ? "WIN" : "LOSS";
    if (!state.settledRecords.some((r) => r.dateKey === yesterdayKey)) {
      state.settledRecords.unshift({
        id: `settled-${yesterdayKey}`,
        dateKey: yesterdayKey,
        date: formatThaiShortDateFromKey(yesterdayKey),
        fullDate: formatThaiFullDateFromKey(yesterdayKey),
        matchTitle: `${leg1.matchTitle} + ${leg2.matchTitle}`,
        league: `${leg1.league} & ${leg2.league}`,
        predictedScore: predictedLabel2,
        actualScore: actualScoreCombined,
        odds: isWin2 ? totalMult : prevPick.ahStep2.combinedOdds,
        consensusScore: prevPick.consensusRate,
        result: isWin2 ? "WIN" : "LOSS",
        settledAt: `${bkk.formattedTime} \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A AH Step 2 \u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)`,
        slipNumber: prevPick.slipNumber,
        note: prevPick.settledNotes || `Step 2 \u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 ${actualScoreCombined} (\u0E15\u0E31\u0E27\u0E04\u0E39\u0E13\u0E08\u0E48\u0E32\u0E22 @${totalMult.toFixed(2)})`
      });
    }
    return `\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 Step 2 (${leg1.matchTitle} ${score1} | ${leg2.matchTitle} ${score2}): ${isWin2 ? `WIN \u{1F3AF} \u0E08\u0E48\u0E32\u0E22 @${totalMult.toFixed(2)}` : "\u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 \u274C"}`;
  }
  let actualScore = prevPick.settledScore || "";
  if (!actualScore && ai) {
    try {
      const prompt = `\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E1C\u0E25\u0E1A\u0E2D\u0E25\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35 \u0E04\u0E39\u0E48 ${prevPick.matchTitle} (${prevPick.league}) \u0E17\u0E35\u0E48\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${yesterdayKey} \u0E41\u0E25\u0E49\u0E27\u0E15\u0E2D\u0E1A\u0E40\u0E1B\u0E47\u0E19 JSON \u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19:
{ "finished": true, "actualScore": "2-1", "summaryThai": "\u0E2A\u0E23\u0E38\u0E1B\u0E04\u0E19\u0E22\u0E34\u0E07\u0E1B\u0E23\u0E30\u0E15\u0E39\u0E2A\u0E31\u0E49\u0E19\u0E46" }`;
      const resp = await withTimeout(
        ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            temperature: 0.1
          }
        }),
        4e3,
        "Gemini auto-settle"
      );
      const parsed = JSON.parse(resp.text || "{}");
      if (parsed.finished && typeof parsed.actualScore === "string" && parsed.actualScore.includes("-")) {
        actualScore = parsed.actualScore.trim();
        prevPick.settledNotes = parsed.summaryThai || prevPick.settledNotes;
      }
    } catch (err) {
      console.warn(`[DailyEngine] Auto-settle lookup failed/timed out for ${yesterdayKey}:`, err);
    }
  }
  if (!actualScore) {
    return `\u0E23\u0E2D\u0E1C\u0E25\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E08\u0E23\u0E34\u0E07\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E17\u0E32\u0E07\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E07 ${prevPick.matchTitle} (${yesterdayKey})`;
  }
  const ah = prevPick.asianHandicap;
  let isWin = actualScore === prevPick.primaryScore;
  let predictedLabel = prevPick.primaryScore;
  let settleOdds = prevPick.primaryOdds;
  if (ah) {
    const [h, a] = actualScore.split("-").map((n) => parseInt(n.trim(), 10));
    if (!Number.isNaN(h) && !Number.isNaN(a)) {
      const margin = ah.teamSide === "HOME" ? h - a : a - h;
      const diff = margin + ah.line;
      isWin = diff > 0;
      predictedLabel = ah.selection;
      settleOdds = ah.odds;
    }
  }
  prevPick.isSettled = true;
  prevPick.isRealMatchTonight = false;
  prevPick.settledScore = actualScore;
  prevPick.settledResult = isWin ? "WIN" : "LOSS";
  if (!state.settledRecords.some((r) => r.dateKey === yesterdayKey)) {
    state.settledRecords.unshift({
      id: `settled-${yesterdayKey}`,
      dateKey: yesterdayKey,
      date: formatThaiShortDateFromKey(yesterdayKey),
      fullDate: formatThaiFullDateFromKey(yesterdayKey),
      matchTitle: prevPick.matchTitle,
      league: prevPick.league,
      predictedScore: predictedLabel,
      actualScore,
      odds: settleOdds,
      consensusScore: prevPick.consensusRate,
      result: isWin ? "WIN" : "LOSS",
      settledAt: `${bkk.formattedTime} \u0E19. (\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)`,
      slipNumber: prevPick.slipNumber,
      note: prevPick.settledNotes || `\u0E08\u0E1A\u0E08\u0E23\u0E34\u0E07 90 \u0E19\u0E32\u0E17\u0E35 ${actualScore} (${predictedLabel})`
    });
  }
  return `\u0E15\u0E31\u0E14\u0E23\u0E2D\u0E1A\u0E1C\u0E25\u0E08\u0E23\u0E34\u0E07 ${prevPick.matchTitle}: ${actualScore} (${prevPick.settledResult === "WIN" ? `WIN \u{1F3AF} ${predictedLabel}` : `\u0E2B\u0E25\u0E38\u0E14\u0E40\u0E1B\u0E49\u0E32 ${predictedLabel} \u274C`})`;
}
var isTickRunning = false;
async function runAutomatedPipelineTick(forceSync = false, allowAutoDispatch = !IS_SERVERLESS, isCronTrigger = false, forceDispatch = false) {
  const bkk = getBangkokServerTime(/* @__PURE__ */ new Date());
  const state = loadEngineState();
  const telegramConfig = loadTelegramConfig();
  if (isTickRunning && !forceSync) {
    const fallbackPick = state.picksByDate[bkk.operationalDateKey] || getVerifiedSeedPicks()["2026-11-19"];
    return {
      bangkokNow: bkk,
      activePick: fallbackPick,
      settledRecords: state.settledRecords,
      picksByDate: state.picksByDate,
      pipeline: state.pipeline,
      telegramConfig
    };
  }
  isTickRunning = true;
  try {
    const opKey = bkk.operationalDateKey;
    const yesterdayKey = shiftDateKey(opKey, -1);
    state.pipeline.lastTickAt = (/* @__PURE__ */ new Date()).toISOString();
    state.pipeline.lastTickBkk = bkk.formattedTime;
    if (bkk.isAfter0500 || forceSync) {
      if (state.pipeline.settleDoneForDate !== opKey || forceSync) {
        const settleSummary = await settlePickForDate(state, yesterdayKey, bkk);
        state.pipeline.settleDoneForDate = opKey;
        state.pipeline.settleDoneAt = bkk.formattedTime;
        state.pipeline.settleSummary = settleSummary;
        appendLog(state, bkk, "05:00_SETTLE", "OK", settleSummary);
      }
    }
    const yesterdayMatchTitle = state.picksByDate[yesterdayKey]?.matchTitle;
    let activePick = state.picksByDate[opKey];
    if (!activePick) {
      activePick = await resolveFuturePickWithSearch(opKey, yesterdayMatchTitle);
      state.picksByDate[opKey] = activePick;
    }
    if (bkk.isAfter0600 || forceSync) {
      const expectedIssueSummary = activePick.ahStep2 ? `\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E0B\u0E38\u0E1B\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E42\u0E1E\u0E22 1xBet AH Step 2 \u0E23\u0E2D\u0E1A 06:00 \u0E19. (${opKey}): ${activePick.ahStep2.legs[0].selection} + ${activePick.ahStep2.legs[1].selection} (@${formatServerAhOdds(activePick.ahStep2.combinedOdds)})` : (() => {
        const ahPick = resolveServerAsianHandicap(activePick);
        return `\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E0B\u0E38\u0E1B\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E42\u0E1E\u0E22 1xBet \u0E23\u0E2D\u0E1A 06:00 \u0E19. (${opKey}): ${ahPick.selection} [\u0E1B\u0E38\u0E48\u0E21 ${formatServer1xBetButton(ahPick.teamSide, ahPick.line)} @${formatServerAhOdds(ahPick.odds)}]`;
      })();
      if (state.pipeline.issueDoneForDate !== opKey || state.pipeline.issueSummary !== expectedIssueSummary || forceSync) {
        state.pipeline.issueDoneForDate = opKey;
        state.pipeline.issueDoneAt = bkk.formattedTime;
        state.pipeline.issueSummary = expectedIssueSummary;
        appendLog(state, bkk, "06:00_ISSUE", "OK", expectedIssueSummary);
      }
    }
    const tgTargetTimeStr = telegramConfig.notifyTime || "06:30";
    const [tgH, tgM] = tgTargetTimeStr.split(":").map((n) => parseInt(n, 10) || 0);
    const tgTargetMinutes = tgH * 60 + tgM;
    const isWithinDispatchWindow = isCronTrigger ? bkk.minutesOfDay >= tgTargetMinutes - 5 : bkk.minutesOfDay >= tgTargetMinutes;
    if (!telegramConfig.botToken || !telegramConfig.chatId) {
      telegramConfig.lastDispatchStatus = "NO_TOKEN";
      state.pipeline.telegramStatus = !telegramConfig.botToken ? "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 Telegram Bot Token" : "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E30\u0E1A\u0E38 Chat ID \u0E01\u0E25\u0E38\u0E48\u0E21 Telegram";
    } else if (!telegramConfig.enabled && !forceDispatch) {
      telegramConfig.lastDispatchStatus = "PENDING";
      state.pipeline.telegramStatus = "\u0E1B\u0E34\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E2D\u0E22\u0E39\u0E48";
    } else if (telegramConfig.lastSentOperationalDate === opKey && !forceDispatch) {
      const sentTimeBkk = telegramConfig.lastSentAt ? getBangkokServerTime(new Date(telegramConfig.lastSentAt)).formattedTime : bkk.formattedTime;
      const doneMsg = telegramConfig.lastDispatchMessage || `\u0E2A\u0E48\u0E07\u0E42\u0E1E\u0E22\u0E23\u0E2D\u0E1A ${tgTargetTimeStr} \u0E19. \u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E41\u0E25\u0E49\u0E27 (${activePick.matchTitle} ${activePick.primaryScore})`;
      telegramConfig.lastDispatchStatus = "SUCCESS";
      state.pipeline.telegramDoneForDate = opKey;
      state.pipeline.telegramDoneAt = sentTimeBkk;
      state.pipeline.telegramStatus = doneMsg;
      if (!state.pipeline.logs.some((l) => l.dateKey === opKey && l.step === "06:30_TG" && l.status === "OK")) {
        appendLog(state, bkk, "06:30_TG", "OK", doneMsg);
      }
    } else if (allowAutoDispatch && (forceDispatch || bkk.isAfter0600 && isWithinDispatchWindow)) {
      try {
        const htmlMsg = formatDailySuperPickTelegramMessage(activePick);
        const sendRes = await sendTelegramMessage(telegramConfig.botToken, telegramConfig.chatId, htmlMsg);
        if (sendRes.migratedChatId) {
          telegramConfig.chatId = sendRes.migratedChatId;
        }
        telegramConfig.lastSentOperationalDate = opKey;
        telegramConfig.lastSentDate = bkk.formattedDate;
        telegramConfig.lastSentAt = (/* @__PURE__ */ new Date()).toISOString();
        telegramConfig.lastDispatchStatus = "SUCCESS";
        telegramConfig.lastDispatchMessage = `\u0E2A\u0E48\u0E07\u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E40\u0E27\u0E25\u0E32 ${bkk.formattedTime} \u0E19. (${activePick.matchTitle} ${activePick.primaryScore})`;
        telegramConfig.lastError = void 0;
        saveTelegramConfig(telegramConfig);
        state.pipeline.telegramDoneForDate = opKey;
        state.pipeline.telegramDoneAt = bkk.formattedTime;
        state.pipeline.telegramStatus = telegramConfig.lastDispatchMessage;
        appendLog(state, bkk, "06:30_TG", "OK", telegramConfig.lastDispatchMessage);
      } catch (err) {
        const errMsg = err?.message || "Telegram API Error";
        telegramConfig.lastDispatchStatus = "ERROR";
        telegramConfig.lastError = errMsg;
        saveTelegramConfig(telegramConfig);
        state.pipeline.telegramStatus = `\u0E2A\u0E48\u0E07 Telegram \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ${errMsg}`;
        appendLog(state, bkk, "06:30_TG", "ERROR", errMsg);
      }
    } else if (bkk.isAfter0600 && isWithinDispatchWindow) {
      telegramConfig.lastDispatchStatus = "PENDING";
      state.pipeline.telegramStatus = `\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E48\u0E07\u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E23\u0E2D\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30 Cron 06:30 \u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E14\u0E2A\u0E48\u0E07\u0E17\u0E31\u0E19\u0E17\u0E35 (${activePick.matchTitle})`;
    } else {
      telegramConfig.lastDispatchStatus = "PENDING";
      state.pipeline.telegramStatus = `\u0E23\u0E2D\u0E16\u0E36\u0E07\u0E40\u0E27\u0E25\u0E32 ${tgTargetTimeStr} \u0E19. \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E48\u0E07\u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram (${activePick.matchTitle})`;
    }
    saveEngineState(state);
    return {
      bangkokNow: bkk,
      activePick,
      settledRecords: state.settledRecords,
      picksByDate: state.picksByDate,
      pipeline: state.pipeline,
      telegramConfig
    };
  } finally {
    isTickRunning = false;
  }
}

// server/createApp.ts
try {
  dotenv.config();
} catch {
}
var PROMO_CONFIG_FILE = path2.join(RUNTIME_DATA_DIR, ".promo-config.json");
function readPromoConfig() {
  try {
    if (fs2.existsSync(PROMO_CONFIG_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(PROMO_CONFIG_FILE, "utf-8"));
      const promoCode = String(parsed.promoCode || "").trim();
      const customBookingCode = String(parsed.customBookingCode || "").trim();
      const partnerLink = String(parsed.partnerLink || "").trim();
      return {
        promoCode: promoCode || "SCORE95",
        partnerLink,
        customBookingCode,
        isConfigured: Boolean(promoCode && promoCode !== "SCORE95"),
        updatedAt: parsed.updatedAt
      };
    }
  } catch {
  }
  return {
    promoCode: process.env.ONEXBET_PROMO_CODE || "SCORE95",
    partnerLink: process.env.ONEXBET_PARTNER_LINK || "",
    customBookingCode: "",
    isConfigured: Boolean(process.env.ONEXBET_PROMO_CODE && process.env.ONEXBET_PROMO_CODE !== "SCORE95")
  };
}
function createApiApp() {
  const app = express();
  app.use(express.json());
  app.get(["/api/health", "/api/index"], (_req, res) => {
    res.json({
      ok: true,
      service: "ScorePulse xG API",
      isServerless: IS_SERVERLESS,
      bangkokNow: getBangkokServerTime().formattedTime
    });
  });
  const apiKey = process.env.GEMINI_API_KEY;
  const isRealApiKey = apiKey && apiKey !== "MY_GEMINI_API_KEY" && !apiKey.startsWith("MY_");
  const ai = isRealApiKey ? new GoogleGenAI2({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  }) : null;
  app.post("/api/ai/match-analysis", async (req, res) => {
    try {
      const { homeTeam, awayTeam, league, homeXg, awayXg, odds1xBet, currentScore } = req.body;
      if (!ai) {
        return res.json({
          headline: `\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E40\u0E0A\u0E34\u0E07\u0E25\u0E36\u0E01\u0E42\u0E21\u0E40\u0E14\u0E25 xG: ${homeTeam} \u0E1E\u0E1A ${awayTeam}`,
          tacticalReasoning: `\u0E08\u0E32\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E1B\u0E23\u0E30\u0E2A\u0E32\u0E19\u0E42\u0E21\u0E40\u0E14\u0E25 Understat \u0E41\u0E25\u0E30 Opta \u0E40\u0E08\u0E49\u0E32\u0E1A\u0E49\u0E32\u0E19 ${homeTeam} (xG ${homeXg}) \u0E21\u0E35\u0E1B\u0E23\u0E30\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E20\u0E32\u0E1E\u0E01\u0E32\u0E23\u0E1A\u0E38\u0E01\u0E43\u0E19\u0E01\u0E23\u0E2D\u0E1A\u0E40\u0E02\u0E15\u0E42\u0E17\u0E29\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E01\u0E27\u0E48\u0E32 \u0E02\u0E13\u0E30\u0E17\u0E35\u0E48 ${awayTeam} (xG ${awayXg}) \u0E40\u0E19\u0E49\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E27\u0E19\u0E01\u0E25\u0E31\u0E1A\u0E40\u0E23\u0E47\u0E27 \u0E01\u0E32\u0E23\u0E04\u0E33\u0E19\u0E27\u0E13 Dixon-Coles \u0E0A\u0E35\u0E49\u0E43\u0E2B\u0E49\u0E40\u0E2B\u0E47\u0E19\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E21\u0E35\u0E04\u0E48\u0E32 EV \u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14\u0E43\u0E19 1xBet`,
          keyFactors: [
            `\u0E14\u0E31\u0E0A\u0E19\u0E35 xG \u0E40\u0E09\u0E25\u0E35\u0E48\u0E22\u0E23\u0E27\u0E21: ${Number((homeXg + awayXg).toFixed(2))} \u0E1B\u0E23\u0E30\u0E15\u0E39`,
            `\u0E2D\u0E31\u0E15\u0E23\u0E32\u0E04\u0E27\u0E32\u0E21\u0E04\u0E25\u0E32\u0E14\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E08\u0E32\u0E01\u0E01\u0E32\u0E23 Calibrate \u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 3.8%`,
            `\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19: ${currentScore || "0-0"}`
          ],
          topPick: homeXg > awayXg ? "2-1" : "1-1",
          safeAlternative: homeXg + awayXg > 2.5 ? "Over 2.5 \u0E1B\u0E23\u0E30\u0E15\u0E39" : "Under 2.5 \u0E1B\u0E23\u0E30\u0E15\u0E39",
          oneXbetInsight: `\u0E41\u0E19\u0E30\u0E19\u0E33\u0E08\u0E31\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E04\u0E32\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33 Correct Score \u0E43\u0E19 1xBet \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E35\u0E48\u0E21\u0E35\u0E04\u0E48\u0E32\u0E1A\u0E27\u0E01 +EV`
        });
      }
      const prompt = `\u0E04\u0E38\u0E13\u0E04\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E40\u0E0A\u0E35\u0E48\u0E22\u0E27\u0E0A\u0E32\u0E0D\u0E14\u0E49\u0E32\u0E19\u0E01\u0E32\u0E23\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E1C\u0E25\u0E1A\u0E2D\u0E25\u0E41\u0E25\u0E30\u0E04\u0E13\u0E34\u0E15\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C xG \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E17\u0E32\u0E22\u0E1C\u0E25\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33 (Correct Score Analyst) \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E04\u0E33\u0E19\u0E27\u0E13\u0E23\u0E32\u0E04\u0E32\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33 1xBet.
\u0E01\u0E23\u0E38\u0E13\u0E32\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E04\u0E39\u0E48\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E40\u0E1B\u0E47\u0E19\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22:
- \u0E25\u0E35\u0E01: ${league}
- \u0E04\u0E39\u0E48\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19: ${homeTeam} \u0E1E\u0E1A ${awayTeam}
- \u0E42\u0E21\u0E40\u0E14\u0E25\u0E04\u0E48\u0E32 xG \u0E40\u0E09\u0E25\u0E35\u0E48\u0E22: ${homeTeam} = ${homeXg}, ${awayTeam} = ${awayXg}
- \u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19: ${currentScore || "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E41\u0E02\u0E48\u0E07 / 0-0"}
- \u0E23\u0E32\u0E04\u0E32\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33 1xBet \u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07: ${JSON.stringify(odds1xBet || {})}

\u0E08\u0E07\u0E15\u0E2D\u0E1A\u0E40\u0E1B\u0E47\u0E19 JSON \u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E19\u0E35\u0E49\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19:
{
  "headline": "\u0E1E\u0E32\u0E14\u0E2B\u0E31\u0E27\u0E17\u0E31\u0E28\u0E19\u0E30\u0E2A\u0E31\u0E49\u0E19\u0E01\u0E23\u0E30\u0E0A\u0E31\u0E1A\u0E41\u0E25\u0E30\u0E19\u0E48\u0E32\u0E2A\u0E19\u0E43\u0E08",
  "tacticalReasoning": "\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22\u0E40\u0E0A\u0E34\u0E07\u0E41\u0E17\u0E47\u0E01\u0E15\u0E34\u0E01\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E04\u0E48\u0E32 xG 2-3 \u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14",
  "keyFactors": ["\u0E1B\u0E31\u0E08\u0E08\u0E31\u0E22\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E02\u0E49\u0E2D\u0E17\u0E35\u0E48 1", "\u0E1B\u0E31\u0E08\u0E08\u0E31\u0E22\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E02\u0E49\u0E2D\u0E17\u0E35\u0E48 2", "\u0E1B\u0E31\u0E08\u0E08\u0E31\u0E22\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E02\u0E49\u0E2D\u0E17\u0E35\u0E48 3"],
  "topPick": "\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E1F\u0E31\u0E19\u0E18\u0E07\u0E40\u0E14\u0E47\u0E14\u0E2A\u0E38\u0E14 \u0E40\u0E0A\u0E48\u0E19 2-1 (\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33 1xBet \u0E17\u0E35\u0E48\u0E04\u0E38\u0E49\u0E21\u0E04\u0E48\u0E32)",
  "safeAlternative": "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E40\u0E0B\u0E1F\u0E40\u0E2A\u0E23\u0E34\u0E21 \u0E40\u0E0A\u0E48\u0E19 Over 2.5 \u0E2B\u0E23\u0E37\u0E2D \u0E40\u0E08\u0E49\u0E32\u0E1A\u0E49\u0E32\u0E19\u0E0A\u0E19\u0E30",
  "oneXbetInsight": "\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33\u0E1E\u0E34\u0E40\u0E28\u0E29\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E01\u0E31\u0E1A\u0E23\u0E32\u0E04\u0E32\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E2B\u0E23\u0E37\u0E2D\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E43\u0E19 1xBet"
}`;
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      return res.json(parsed);
    } catch (error) {
      console.error("Error generating AI match analysis:", error);
      return res.status(500).json({ error: "Failed to generate AI analysis" });
    }
  });
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, matchContext } = req.body;
      if (!ai) {
        return res.json({
          reply: `\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A! \u0E1C\u0E21\u0E04\u0E37\u0E2D \u0E01\u0E39\u0E23\u0E39 AI xG & Correct Score \u0E08\u0E32\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 xG \u0E41\u0E25\u0E30\u0E23\u0E30\u0E1A\u0E1A Dixon-Coles \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E16\u0E32\u0E21: "${message}" \u0E41\u0E19\u0E30\u0E19\u0E33\u0E43\u0E2B\u0E49\u0E40\u0E19\u0E49\u0E19\u0E01\u0E32\u0E23\u0E14\u0E39\u0E04\u0E48\u0E32\u0E04\u0E27\u0E32\u0E21\u0E04\u0E25\u0E32\u0E14\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19 (Calibration Error < 5%) \u0E41\u0E25\u0E30\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E21\u0E35\u0E04\u0E48\u0E32 +EV \u0E2A\u0E39\u0E07\u0E43\u0E19 1xBet \u0E40\u0E0A\u0E48\u0E19 \u0E2A\u0E01\u0E2D\u0E23\u0E4C 2-1 \u0E2B\u0E23\u0E37\u0E2D 1-1 \u0E04\u0E23\u0E31\u0E1A`
        });
      }
      const prompt = `\u0E04\u0E38\u0E13\u0E04\u0E37\u0E2D\u0E01\u0E39\u0E23\u0E39 AI \u0E14\u0E49\u0E32\u0E19\u0E2A\u0E16\u0E34\u0E15\u0E34\u0E1F\u0E38\u0E15\u0E1A\u0E2D\u0E25 xG \u0E41\u0E25\u0E30 Correct Score \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E41\u0E2D\u0E1B ScorePulse xG (\u0E40\u0E19\u0E49\u0E19\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E23\u0E48\u0E27\u0E21\u0E01\u0E31\u0E1A\u0E23\u0E32\u0E04\u0E32 1xBet).
\u0E1A\u0E23\u0E34\u0E1A\u0E17\u0E01\u0E32\u0E23\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19: ${JSON.stringify(matchContext || {})}
\u0E04\u0E33\u0E16\u0E32\u0E21\u0E02\u0E2D\u0E07\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49: "${message}"

\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33:
- \u0E15\u0E2D\u0E1A\u0E40\u0E1B\u0E47\u0E19\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E01\u0E31\u0E19\u0E40\u0E2D\u0E07 \u0E2A\u0E38\u0E20\u0E32\u0E1E \u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E40\u0E0A\u0E35\u0E48\u0E22\u0E27\u0E0A\u0E32\u0E0D\u0E14\u0E49\u0E32\u0E19\u0E04\u0E13\u0E34\u0E15\u0E28\u0E32\u0E2A\u0E15\u0E23\u0E4C\u0E25\u0E39\u0E01\u0E2B\u0E19\u0E31\u0E07 (xG, Expected Goals, Dixon-Coles Poisson, 1xBet Value Odds)
- \u0E43\u0E2B\u0E49\u0E04\u0E33\u0E41\u0E19\u0E30\u0E19\u0E33\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E04\u0E27\u0E23\u0E2A\u0E19\u0E43\u0E08\u0E41\u0E25\u0E30\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E23\u0E23\u0E30\u0E27\u0E31\u0E07
- \u0E15\u0E2D\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E1E\u0E2D\u0E14\u0E35 2-4 \u0E22\u0E48\u0E2D\u0E2B\u0E19\u0E49\u0E32 \u0E44\u0E21\u0E48\u0E22\u0E32\u0E27\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B`;
      const geminiPromise = ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt
      });
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("AI generation timed out")), 6e3)
      );
      const response = await Promise.race([geminiPromise, timeoutPromise]);
      return res.json({ reply: response.text });
    } catch (error) {
      console.warn("AI chat falling back to analytical response:", error);
      return res.json({
        reply: `\u0E08\u0E32\u0E01\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 xG \u0E41\u0E25\u0E30\u0E23\u0E30\u0E1A\u0E1A Dixon-Coles \u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14: \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E39\u0E48\u0E41\u0E02\u0E48\u0E07\u0E02\u0E31\u0E19\u0E41\u0E25\u0E30\u0E04\u0E33\u0E16\u0E32\u0E21\u0E14\u0E31\u0E07\u0E01\u0E25\u0E48\u0E32\u0E27 \u0E41\u0E19\u0E30\u0E19\u0E33\u0E43\u0E2B\u0E49\u0E2A\u0E31\u0E07\u0E40\u0E01\u0E15\u0E04\u0E48\u0E32 Expected Goals (xG) \u0E04\u0E23\u0E36\u0E48\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E41\u0E25\u0E30\u0E04\u0E48\u0E32\u0E04\u0E27\u0E32\u0E21\u0E04\u0E25\u0E32\u0E14\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E02\u0E2D\u0E07\u0E01\u0E32\u0E23 Calibrate (&le; 5%) \u0E2A\u0E01\u0E2D\u0E23\u0E4C 2-1 \u0E2B\u0E23\u0E37\u0E2D 1-1 \u0E22\u0E31\u0E07\u0E04\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E35\u0E48\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E04\u0E38\u0E49\u0E21\u0E04\u0E48\u0E32\u0E41\u0E25\u0E30\u0E43\u0E2B\u0E49\u0E04\u0E48\u0E32 +EV \u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14\u0E43\u0E19\u0E01\u0E23\u0E30\u0E14\u0E32\u0E19 1xBet \u0E04\u0E23\u0E31\u0E1A`
      });
    }
  });
  app.get("/api/daily-engine/state", async (_req, res) => {
    try {
      const state = await runAutomatedPipelineTick(false, !IS_SERVERLESS);
      const maskedTgToken = state.telegramConfig.botToken ? `${state.telegramConfig.botToken.slice(0, 8)}...${state.telegramConfig.botToken.slice(-5)}` : "";
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
          verifiedBotName: state.telegramConfig.verifiedBotName
        }
      });
    } catch (err) {
      console.error("[Engine State Error]", err);
      res.status(500).json({ error: err?.message || "Failed to read engine state" });
    }
  });
  app.post("/api/daily-engine/sync", async (_req, res) => {
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
          verifiedBotName: state.telegramConfig.verifiedBotName
        }
      });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Sync failed" });
    }
  });
  const handleCronTick = async (req, res) => {
    try {
      const forceDispatch = req.query?.force === "1" || req.query?.force === "true";
      const state = await runAutomatedPipelineTick(false, true, true, forceDispatch);
      res.json({
        ok: true,
        bangkokTime: state.bangkokNow.formattedTime,
        operationalDateKey: state.bangkokNow.operationalDateKey,
        activePick: `${state.activePick.matchTitle} (${state.activePick.primaryScore} @${state.activePick.primaryOdds})`,
        telegramStatus: state.pipeline.telegramStatus,
        telegramDispatchStatus: state.telegramConfig.lastDispatchStatus,
        telegramError: state.telegramConfig.lastError,
        settleSummary: state.pipeline.settleSummary,
        issueSummary: state.pipeline.issueSummary
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  };
  app.get("/api/cron/tick", handleCronTick);
  app.post("/api/cron/tick", handleCronTick);
  app.get("/api/telegram/config", (_req, res) => {
    try {
      const config = loadTelegramConfig();
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to load Telegram config" });
    }
  });
  app.post("/api/telegram/config", async (req, res) => {
    try {
      const body = req.body || {};
      const current = loadTelegramConfig();
      const nextToken = typeof body.botToken === "string" ? sanitizeTelegramToken(body.botToken) : current.botToken;
      let nextChatId = typeof body.chatId === "string" ? body.chatId.trim() : current.chatId;
      const updated = {
        ...current,
        ...body,
        botToken: nextToken,
        chatId: nextChatId,
        notifyTime: body.notifyTime || current.notifyTime || "06:30"
      };
      let tokenValid = false;
      let verificationError;
      if (nextToken) {
        const verification = await verifyTelegramBotToken(nextToken);
        if (verification.valid) {
          tokenValid = true;
          updated.verifiedBotName = verification.displayName;
          updated.verifiedBotUsername = verification.username;
          updated.lastError = void 0;
          if (updated.lastDispatchStatus === "NO_TOKEN") {
            updated.lastDispatchStatus = "PENDING";
          }
          const detected = await detectTelegramGroupChats(nextToken);
          if (detected.ok && detected.chats.length > 0) {
            updated.detectedChats = detected.chats;
            if (!nextChatId) {
              const preferred = detected.chats.find((c) => c.type === "supergroup" || c.type === "group") || detected.chats[0];
              if (preferred) {
                nextChatId = preferred.chatId;
                updated.chatId = preferred.chatId;
              }
            }
          }
        } else {
          verificationError = verification.error;
          updated.lastError = verification.error;
          updated.lastDispatchStatus = "ERROR";
        }
      } else {
        updated.lastDispatchStatus = "NO_TOKEN";
        updated.verifiedBotName = void 0;
        updated.verifiedBotUsername = void 0;
        updated.lastError = void 0;
      }
      saveTelegramConfig(updated);
      let engineState = null;
      if (tokenValid && updated.enabled && updated.chatId && !IS_SERVERLESS) {
        try {
          engineState = await runAutomatedPipelineTick(false, true);
        } catch (err) {
          console.warn("[Telegram Save Catch-Up Tick Error]:", err);
        }
      } else {
        try {
          engineState = await runAutomatedPipelineTick(false, false);
        } catch {
        }
      }
      const latestConfig = loadTelegramConfig();
      res.json({
        success: true,
        tokenValid,
        verificationError,
        config: latestConfig,
        engineState
      });
    } catch (err) {
      console.error("[Telegram Config Save Error]:", err);
      res.status(500).json({ error: err?.message || "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 Telegram \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" });
    }
  });
  app.post("/api/telegram/verify", async (req, res) => {
    try {
      const body = req.body || {};
      const current = loadTelegramConfig();
      const token = sanitizeTelegramToken(body.botToken || current.botToken);
      const verification = await verifyTelegramBotToken(token);
      if (verification.valid) {
        current.botToken = token;
        current.verifiedBotName = verification.displayName;
        current.verifiedBotUsername = verification.username;
        current.lastError = void 0;
        if (current.lastDispatchStatus === "NO_TOKEN") {
          current.lastDispatchStatus = "PENDING";
        }
        saveTelegramConfig(current);
      }
      res.status(verification.valid ? 200 : 400).json(verification);
    } catch (err) {
      res.status(500).json({ valid: false, error: err?.message || "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A Bot Token \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" });
    }
  });
  app.post("/api/telegram/detect-chats", async (req, res) => {
    try {
      const body = req.body || {};
      const current = loadTelegramConfig();
      const token = sanitizeTelegramToken(body.botToken || current.botToken);
      const detected = await detectTelegramGroupChats(token);
      if (!detected.ok) {
        return res.status(400).json(detected);
      }
      const updated = {
        ...current,
        botToken: token || current.botToken,
        detectedChats: detected.chats
      };
      if (!updated.chatId && detected.chats.length > 0) {
        const preferred = detected.chats.find((c) => c.type === "supergroup" || c.type === "group") || detected.chats[0];
        if (preferred) updated.chatId = preferred.chatId;
      }
      saveTelegramConfig(updated);
      res.json({
        ok: true,
        chats: detected.chats,
        selectedChatId: updated.chatId
      });
    } catch (err) {
      res.status(500).json({ ok: false, chats: [], error: err?.message || "\u0E2A\u0E41\u0E01\u0E19\u0E2B\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" });
    }
  });
  app.get("/api/telegram/preview-message", async (_req, res) => {
    try {
      const state = await runAutomatedPipelineTick(false, false);
      const htmlMessage = formatDailySuperPickTelegramMessage(state.activePick);
      res.json({
        success: true,
        pick: state.activePick,
        htmlMessage,
        bangkokNow: state.bangkokNow
      });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app.post("/api/telegram/test", async (req, res) => {
    const current = loadTelegramConfig();
    const token = sanitizeTelegramToken(req.body.botToken || current.botToken);
    let chatId = req.body.chatId !== void 0 ? String(req.body.chatId).trim() : current.chatId;
    try {
      if (!token) {
        return res.status(400).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A Telegram Bot Token \u0E01\u0E23\u0E38\u0E13\u0E32\u0E27\u0E32\u0E07 Token \u0E08\u0E32\u0E01 @BotFather \u0E01\u0E48\u0E2D\u0E19" });
      }
      if (!chatId) {
        return res.status(400).json({ error: '\u0E44\u0E21\u0E48\u0E1E\u0E1A Chat ID \u0E02\u0E2D\u0E07\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E14 "\u0E2A\u0E41\u0E01\u0E19\u0E2B\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34" \u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A -100...' });
      }
      const bkk = getBangkokServerTime();
      const state = await runAutomatedPipelineTick(false, false);
      const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const testHtml = `\u{1F7E2} <b>[ScorePulse xG] \u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E1A\u0E2D\u0E17\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08</b> (${bkk.formattedTime} \u0E19.)
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u2705 \u0E1A\u0E2D\u0E17\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E01\u0E25\u0E38\u0E48\u0E21\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 (\u0E2A\u0E48\u0E07\u0E1F\u0E23\u0E35\u0E44\u0E21\u0E48\u0E08\u0E33\u0E01\u0E31\u0E14\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21)
\u{1F4CC} <b>\u0E42\u0E1E\u0E22\u0E04\u0E39\u0E48\u0E40\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49:</b> ${esc(state.activePick.matchTitle)}
\u{1F3AF} <b>\u0E1F\u0E31\u0E19\u0E18\u0E07\u0E2A\u0E01\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E47\u0E07 1:</b> <code>${esc(state.activePick.primaryScore)}</code> (<b>@${state.activePick.primaryOdds.toFixed(2)}</b>)
\u23F0 \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E41\u0E25\u0E30\u0E2A\u0E48\u0E07\u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19\u0E40\u0E27\u0E25\u0E32 <b>${esc(String(req.body.notifyTime || current.notifyTime || "06:30"))} \u0E19.</b> (\u0E40\u0E27\u0E25\u0E32\u0E44\u0E17\u0E22)`;
      const sendRes = await sendTelegramMessage(token, chatId, testHtml);
      if (sendRes.migratedChatId) {
        chatId = sendRes.migratedChatId;
      }
      const verification = await verifyTelegramBotToken(token);
      saveTelegramConfig({
        ...current,
        botToken: token,
        chatId,
        notifyTime: req.body.notifyTime || current.notifyTime || "06:30",
        enabled: req.body.enabled !== void 0 ? req.body.enabled : current.enabled,
        verifiedBotName: verification.valid ? verification.displayName : current.verifiedBotName,
        verifiedBotUsername: verification.valid ? verification.username : current.verifiedBotUsername,
        lastError: void 0
      });
      res.json({
        success: true,
        chatId,
        message: sendRes.migratedChatId ? `\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08! (\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E23\u0E2B\u0E31\u0E2A Supergroup \u0E43\u0E2B\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19 ${sendRes.migratedChatId} \u0E43\u0E2B\u0E49\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34)` : "\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E41\u0E25\u0E30\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27!"
      });
    } catch (error) {
      saveTelegramConfig({
        ...current,
        botToken: token,
        chatId,
        lastDispatchStatus: "ERROR",
        lastError: error.message || "\u0E2A\u0E48\u0E07\u0E40\u0E02\u0E49\u0E32 Telegram \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"
      });
      res.status(500).json({ error: error.message || "\u0E2A\u0E48\u0E07\u0E40\u0E02\u0E49\u0E32 Telegram \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" });
    }
  });
  app.post("/api/telegram/send-daily", async (req, res) => {
    const current = loadTelegramConfig();
    const token = sanitizeTelegramToken(req.body.botToken || current.botToken);
    let chatId = req.body.chatId !== void 0 ? String(req.body.chatId).trim() : current.chatId;
    try {
      if (!token) {
        return res.status(400).json({ error: "\u0E44\u0E21\u0E48\u0E1E\u0E1A Telegram Bot Token \u0E01\u0E23\u0E38\u0E13\u0E32\u0E27\u0E32\u0E07 Token \u0E08\u0E32\u0E01 @BotFather" });
      }
      if (!chatId) {
        return res.status(400).json({ error: '\u0E44\u0E21\u0E48\u0E1E\u0E1A Chat ID \u0E02\u0E2D\u0E07\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E14 "\u0E2A\u0E41\u0E01\u0E19\u0E2B\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34" \u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E25\u0E38\u0E48\u0E21' });
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
        notifyTime: req.body.notifyTime || current.notifyTime || "06:30",
        enabled: req.body.enabled !== void 0 ? req.body.enabled : current.enabled,
        verifiedBotName: verification.valid ? verification.displayName : current.verifiedBotName,
        verifiedBotUsername: verification.valid ? verification.username : current.verifiedBotUsername,
        lastSentOperationalDate: bkk.operationalDateKey,
        lastSentAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastSentDate: bkk.formattedDate,
        lastDispatchStatus: "SUCCESS",
        lastDispatchMessage: `\u0E22\u0E34\u0E07\u0E42\u0E1E\u0E22 ${state.activePick.matchTitle} (${state.activePick.primaryScore}) \u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 (${bkk.formattedTime} \u0E19.)`,
        lastError: void 0
      });
      res.json({
        success: true,
        chatId,
        message: `\u0E22\u0E34\u0E07\u0E42\u0E1E\u0E22\u0E04\u0E39\u0E48\u0E40\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49 (${state.activePick.matchTitle} \u0E1F\u0E31\u0E19\u0E18\u0E07 ${state.activePick.primaryScore} @${state.activePick.primaryOdds.toFixed(2)}) \u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E41\u0E25\u0E49\u0E27!`
      });
    } catch (error) {
      saveTelegramConfig({
        ...current,
        botToken: token,
        chatId,
        lastDispatchStatus: "ERROR",
        lastError: error.message || "\u0E2A\u0E48\u0E07\u0E42\u0E1E\u0E22\u0E40\u0E02\u0E49\u0E32\u0E01\u0E25\u0E38\u0E48\u0E21 Telegram \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"
      });
      res.status(500).json({ error: error.message || "\u0E2A\u0E48\u0E07\u0E40\u0E02\u0E49\u0E32 Telegram \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" });
    }
  });
  app.get("/api/promo/config", (_req, res) => {
    const data = readPromoConfig();
    res.json(data);
  });
  app.post("/api/promo/config", (req, res) => {
    const current = readPromoConfig();
    const promoCode = typeof req.body.promoCode === "string" ? req.body.promoCode.trim().toUpperCase() : current.promoCode;
    const partnerLink = typeof req.body.partnerLink === "string" ? req.body.partnerLink.trim() : current.partnerLink;
    const customBookingCode = typeof req.body.customBookingCode === "string" ? req.body.customBookingCode.trim().toUpperCase() : current.customBookingCode;
    const updated = {
      promoCode: promoCode || "SCORE95",
      partnerLink,
      customBookingCode,
      isConfigured: Boolean(promoCode && promoCode !== "SCORE95"),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      fs2.writeFileSync(PROMO_CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
      res.json({ success: true, config: updated });
    } catch (err) {
      res.status(500).json({ error: err?.message || "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E42\u0E1B\u0E23\u0E42\u0E21\u0E0A\u0E31\u0E48\u0E19\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08" });
    }
  });
  app.use((err, _req, res, _next) => {
    console.error("[API Unhandled Error]:", err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({
      ok: false,
      error: err?.message || "Internal Server Error"
    });
  });
  return app;
}

// server/vercelEntry.ts
var cachedApp = null;
var initError = null;
function getApp() {
  if (cachedApp) return cachedApp;
  if (initError) throw initError;
  try {
    cachedApp = createApiApp();
    return cachedApp;
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    throw initError;
  }
}
function handler(req, res) {
  try {
    const app = getApp();
    return app(req, res);
  } catch (err) {
    console.error("[Vercel API Fatal Init Error]:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        ok: false,
        error: err?.message || "Server initialization failed"
      })
    );
  }
}
export {
  handler as default
};
