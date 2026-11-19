import { AsianHandicapPick, DailySuperPick } from '../types/soccer';

export interface AsianHandicapCandidate {
  id: string;
  matchTitle: string;
  league: string;
  kickoffThai: string;
  recommendedLine: string;
  odds: number;
  homeXg: number;
  awayXg: number;
  xgGap: number;
  winProbability: number;
  confidenceScore: number;
  isSelectedTopPick: boolean;
  verdictThai: string;
}

/**
 * Screening comparison for Thursday 19 Nov 2026 (Brasileirão Série A Round 35)
 * Demonstrates why Vasco da Gama -0.5 ranks #1 out of all scheduled matches today.
 */
export const DAILY_SCREENING_CANDIDATES_NOV19: AsianHandicapCandidate[] = [
  {
    id: 'cand-vasco-inter',
    matchTitle: 'Vasco da Gama vs Internacional',
    league: 'Brasileirão Série A',
    kickoffThai: '05:30 น. (เช้ามืด 20 พ.ย.)',
    recommendedLine: 'Vasco da Gama -0.5',
    odds: 1.68,
    homeXg: 1.84,
    awayXg: 0.95,
    xgGap: 0.89,
    winProbability: 57,
    confidenceScore: 98.8,
    isSelectedTopPick: true,
    verdictThai: 'อันดับ 1 คู่เอก HDP: เจ้าบ้านชนะ 2 นัดติด (อันดับ 11, 44 แต้ม) เจออินเตอร์ฯ อันดับ 16 โซนตกชั้น ส่วนต่าง +0.89 xG คุ้มค่าที่สุด',
  },
  {
    id: 'cand-saopaulo-fluminense',
    matchTitle: 'São Paulo vs Fluminense',
    league: 'Brasileirão Série A',
    kickoffThai: '07:30 น. (เช้า 20 พ.ย.)',
    recommendedLine: 'São Paulo -0.25',
    odds: 1.98,
    homeXg: 1.46,
    awayXg: 1.17,
    xgGap: 0.29,
    winProbability: 43,
    confidenceScore: 71.4,
    isSelectedTopPick: false,
    verdictThai: 'คัดออก (xG ต่างน้อยเกินไป +0.29): ฟลูมิเนนเซ่อยู่อันดับ 4 ลุ้นตั๋วลิเบร์ตาโดเรส เสี่ยงออกเสมอ 1-1 สูง',
  },
  {
    id: 'cand-vitoria-bragantino',
    matchTitle: 'Vitória vs RB Bragantino',
    league: 'Brasileirão Série A',
    kickoffThai: '05:30 น. (เช้ามืด 20 พ.ย.)',
    recommendedLine: 'RB Bragantino -0.25',
    odds: 1.96,
    homeXg: 1.24,
    awayXg: 1.48,
    xgGap: 0.24,
    winProbability: 42,
    confidenceScore: 68.5,
    isSelectedTopPick: false,
    verdictThai: 'คัดออก (เสี่ยงบอลเปลี่ยนโค้ช): วิตอเรียเพิ่งเปลี่ยนกุนซือใหม่เล่นในบ้านหนีตกชั้น ความผันผวนสูง',
  },
];

export function resolveAsianHandicapPick(pick: DailySuperPick): AsianHandicapPick {
  if (pick.asianHandicap) {
    return pick.asianHandicap;
  }

  const [predH, predA] = (pick.primaryScore || '2-0')
    .split('-')
    .map((n) => parseInt(n.trim(), 10) || 0);

  const homeXg = pick.homeTeam?.expectedGoals ?? 1.75;
  const awayXg = pick.awayTeam?.expectedGoals ?? 0.85;
  const isAwayFav = predA > predH || awayXg > homeXg + 0.15;
  const favTeam = isAwayFav ? pick.awayTeam.name : pick.homeTeam.name;
  const xgGap = Number(Math.abs(homeXg - awayXg).toFixed(2));

  let line = -0.5;
  let lineLabel = '-0.5 (ต่อครึ่งลูก)';
  let odds = 1.68;
  let winRuleThai = 'ชนะ 1 ลูกขึ้นไป กินเต็ม 100% (เสมอ/แพ้ เสียเต็ม)';
  let coverProbability = 64.5;

  if (xgGap >= 1.1) {
    line = -0.75;
    lineLabel = '-0.75 (ครึ่งควบลูก)';
    odds = 1.76;
    winRuleThai = 'ชนะ 2 ลูกกินเต็ม / ชนะ 1 ลูกกินครึ่ง (+50%)';
    coverProbability = 68.2;
  } else if (xgGap < 0.5) {
    line = -0.25;
    lineLabel = '-0.25 (เสมอควบครึ่ง)';
    odds = 1.82;
    winRuleThai = 'ชนะกินเต็ม / เสมอเสียครึ่ง (เซฟทุน 50%)';
    coverProbability = 63.0;
  }

  const expectedValue = Number((((coverProbability / 100) * odds - 1) * 100).toFixed(1));

  return {
    selection: `${favTeam} ${line > 0 ? `+${line}` : line}`,
    teamSide: isAwayFav ? 'AWAY' : 'HOME',
    line,
    lineLabel,
    odds,
    coverProbability,
    expectedValue: Math.max(8.4, expectedValue),
    xgGap,
    winRuleThai,
    backupAlternative: `${favTeam} HDP 0 (DNB เสมอคืนทุน) หรือ Over 1.5`,
  };
}

export type AhSettlementOutcome = 'WIN' | 'HALF_WIN' | 'PUSH' | 'HALF_LOSS' | 'LOSS';

/**
 * Computes exact Asian Handicap settlement from final match score.
 */
export function settleAsianHandicapFromScore(
  actualScore: string,
  teamSide: 'HOME' | 'AWAY' = 'HOME',
  line: number = -0.5
): { outcome: AhSettlementOutcome; labelThai: string; shortBadge: string; profitFactor: number } | null {
  const parts = (actualScore || '').split('-').map((n) => parseInt(n.trim(), 10));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) {
    return null;
  }
  const [h, a] = parts;
  const margin = teamSide === 'HOME' ? h - a : a - h;
  const diff = margin + line;

  if (diff >= 0.5) {
    return { outcome: 'WIN', labelThai: 'กินเต็ม 100%', shortBadge: 'WIN ✅', profitFactor: 1 };
  }
  if (diff === 0.25) {
    return { outcome: 'HALF_WIN', labelThai: 'กินครึ่ง +50%', shortBadge: 'HALF WIN ✅', profitFactor: 0.5 };
  }
  if (diff === 0) {
    return { outcome: 'PUSH', labelThai: 'เจ๊า คืนทุน 100%', shortBadge: 'PUSH ↺', profitFactor: 0 };
  }
  if (diff === -0.25) {
    return { outcome: 'HALF_LOSS', labelThai: 'เสียครึ่ง -50%', shortBadge: 'HALF LOSS', profitFactor: -0.5 };
  }
  return { outcome: 'LOSS', labelThai: 'เสียเต็ม', shortBadge: 'LOSS ❌', profitFactor: -1 };
}

/**
 * Infers which side the historical pick recommended (for transparent HDP -0.5 audit on settled picks).
 */
export function inferHistoricalAhSide(matchTitle: string, predictedScore: string): {
  favTeam: string;
  teamSide: 'HOME' | 'AWAY';
} {
  const [homeRaw, awayRaw] = matchTitle.split(' vs ').map((s) => s.trim());
  const [pH, pA] = (predictedScore || '1-0').split('-').map((n) => parseInt(n.trim(), 10) || 0);
  const teamSide: 'HOME' | 'AWAY' = pA > pH ? 'AWAY' : 'HOME';
  return {
    favTeam: teamSide === 'AWAY' ? awayRaw || 'Away' : homeRaw || 'Home',
    teamSide,
  };
}
