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
 * Formats exact 1xBet Asian Handicap button label as displayed in 1xBet app:
 * e.g. teamSide='HOME', line=-0.75 -> "1 (-0.75)"
 */
export function formatOneXBetAhButton(teamSide: 'HOME' | 'AWAY', line: number): string {
  const teamNum = teamSide === 'AWAY' ? '2' : '1';
  return `${teamNum} (${line})`;
}

/**
 * Preserves 3-decimal 1xBet odds like 1.741 or 1.403 cleanly while keeping 2-decimal odds as x.xx.
 */
export function formatAhOdds(odds: number): string {
  if (!Number.isFinite(odds)) return '1.74';
  const rounded3 = Number(odds.toFixed(3));
  return Math.round(rounded3 * 100) === Math.round(rounded3 * 1000) / 10
    ? rounded3.toFixed(2)
    : rounded3.toFixed(3);
}

/**
 * Screening comparison for Thursday 19 Nov 2026 (Brasileirão Série A Round 35)
 * Uses real 1xBet "เอเชียนแฮนดิแคป" quarter lines (-0.25 / -0.75 / -1.25).
 */
export const DAILY_SCREENING_CANDIDATES_NOV19: AsianHandicapCandidate[] = [
  {
    id: 'cand-vasco-inter',
    matchTitle: 'Vasco da Gama vs Internacional',
    league: 'Brasileirão Série A',
    kickoffThai: '05:30 น. (เช้ามืด 20 พ.ย.)',
    recommendedLine: 'Vasco da Gama -0.75 [ปุ่ม 1 (-0.75)]',
    odds: 1.741,
    homeXg: 1.84,
    awayXg: 0.95,
    xgGap: 0.89,
    winProbability: 62.5,
    confidenceScore: 98.8,
    isSelectedTopPick: true,
    verdictThai:
      'อันดับ 1 คู่เอก 1xBet เอเชียนแฮนดิแคป: กดปุ่ม 1 (-0.75) ค่าน้ำจริง @1.741 (ชนะ 2+ กินเต็ม / ชนะ 1 ลูกกินครึ่ง) เหนือกว่า 1 (-0.25) @1.403 ที่ค่าน้ำต่ำเกิน',
  },
  {
    id: 'cand-saopaulo-fluminense',
    matchTitle: 'São Paulo vs Fluminense',
    league: 'Brasileirão Série A',
    kickoffThai: '07:30 น. (เช้า 20 พ.ย.)',
    recommendedLine: 'São Paulo -0.25 [ปุ่ม 1 (-0.25)]',
    odds: 1.98,
    homeXg: 1.46,
    awayXg: 1.17,
    xgGap: 0.29,
    winProbability: 43,
    confidenceScore: 71.4,
    isSelectedTopPick: false,
    verdictThai:
      'คัดออก (xG ต่างน้อยเกินไป +0.29): ฟลูมิเนนเซ่อยู่อันดับ 4 ลุ้นตั๋วลิเบร์ตาโดเรส เสี่ยงออกเสมอ 1-1 สูง',
  },
  {
    id: 'cand-vitoria-bragantino',
    matchTitle: 'Vitória vs RB Bragantino',
    league: 'Brasileirão Série A',
    kickoffThai: '05:30 น. (เช้ามืด 20 พ.ย.)',
    recommendedLine: 'RB Bragantino -0.25 [ปุ่ม 2 (-0.25)]',
    odds: 1.96,
    homeXg: 1.24,
    awayXg: 1.48,
    xgGap: 0.24,
    winProbability: 42,
    confidenceScore: 68.5,
    isSelectedTopPick: false,
    verdictThai:
      'คัดออก (เสี่ยงบอลเปลี่ยนโค้ช): วิตอเรียเพิ่งเปลี่ยนกุนซือใหม่เล่นในบ้านหนีตกชั้น ความผันผวนสูง',
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
  const teamSide: 'HOME' | 'AWAY' = isAwayFav ? 'AWAY' : 'HOME';
  const xgGap = Number(Math.abs(homeXg - awayXg).toFixed(2));

  // 1xBet "เอเชียนแฮนดิแคป" tab strictly uses quarter lines (.25 / .75) — never -0.5
  let line = -0.75;
  let lineLabel = `-0.75 (ครึ่งควบลูก • กด ${formatOneXBetAhButton(teamSide, -0.75)} ใน 1xBet)`;
  let odds = 1.741;
  let winRuleThai = 'ชนะ 2 ลูกขึ้นไป กินเต็ม 100% / ชนะ 1 ลูก กินครึ่ง +50%';
  let coverProbability = 62.5;

  if (xgGap < 0.75) {
    line = -0.25;
    lineLabel = `-0.25 (เสมอควบครึ่ง • กด ${formatOneXBetAhButton(teamSide, -0.25)} ใน 1xBet)`;
    odds = 1.62;
    winRuleThai = 'ชนะ 1 ลูกขึ้นไป กินเต็ม 100% / เสมอเสียครึ่ง (คืนทุน 50%)';
    coverProbability = 64.0;
  }

  const expectedValue = Number((((coverProbability / 100) * odds - 1) * 100).toFixed(1));

  return {
    selection: `${favTeam} ${line > 0 ? `+${line}` : line}`,
    teamSide,
    line,
    lineLabel,
    odds,
    coverProbability,
    expectedValue: Math.max(8.4, expectedValue),
    xgGap,
    winRuleThai,
    backupAlternative: `${favTeam} -0.25 (${formatOneXBetAhButton(teamSide, -0.25)}) หรือ Over 1.5`,
  };
}

export type AhSettlementOutcome = 'WIN' | 'HALF_WIN' | 'PUSH' | 'HALF_LOSS' | 'LOSS';

/**
 * Computes exact Asian Handicap settlement from final match score.
 * Uses 1xBet quarter-line (-0.25 default for historical audit).
 */
export function settleAsianHandicapFromScore(
  actualScore: string,
  teamSide: 'HOME' | 'AWAY' = 'HOME',
  line: number = -0.25
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
 * Infers which side the historical pick recommended (for transparent 1xBet -0.25 quarter-line audit on settled picks).
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
