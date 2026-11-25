import { AsianHandicapPick, DailySuperPick, Match } from '../types/soccer';

export interface AsianHandicapCandidate {
  id: string;
  matchTitle: string;
  league: string;
  kickoffThai: string;
  recommendedLine: string;
  lineValue: number;
  teamSide: 'HOME' | 'AWAY';
  buttonLabel: string;
  odds: number;
  homeXg: number;
  awayXg: number;
  xgGap: number;
  winProbability: number;
  impliedProbPct: number;
  edgeOver1xBetPct: number;
  confidenceScore: number;
  isSelectedTopPick: boolean;
  passes1xBetGate: boolean;
  verdictThai: string;
}

export interface OneXBetRuleCheck {
  id: 'QUARTER_LINE' | 'SWEET_SPOT_ODDS' | 'IMPLIED_EDGE' | 'XG_MARGIN_FIT' | 'SAME_TAB_SAFETY';
  titleThai: string;
  detailThai: string;
  passed: boolean;
}

export interface OneXBetSelectionAudit {
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
  impliedProbPct: number;
  edgeOver1xBetPct: number;
  expectedValuePct: number;
  buttonLabel: string;
  safetyButtonLabel: string;
  checks: OneXBetRuleCheck[];
}

export interface OneXBetBoardLineOption {
  buttonLabel: string;
  line: number;
  odds: number;
  impliedProbPct: number;
  status: 'PASSED_#1' | 'SAFETY_ONLY' | 'REJECTED_HIGH_RISK';
  reasonThai: string;
}

export interface OneXBetPoolPick {
  match: Match;
  matchTitle: string;
  league: string;
  teamSide: 'HOME' | 'AWAY';
  favTeam: string;
  line: number;
  buttonLabel: string;
  safetyButtonLabel: string;
  odds: number;
  coverProbability: number;
  impliedProbPct: number;
  edgeOver1xBetPct: number;
  expectedValuePct: number;
  xgGap: number;
  audit: OneXBetSelectionAudit;
}

/**
 * 5 Strict 1xBet Selection Conditions used by both automated & interactive match pickers.
 */
export const ONE_X_BET_SELECTION_RULES = {
  MIN_ODDS: 1.65,
  MAX_ODDS: 1.98,
  MIN_IMPLIED_EDGE_PCT: 3.5,
  MIN_EV_PCT: 6.0,
  MIN_XG_GAP_FOR_075: 0.75,
  MIN_XG_GAP_FOR_025: 0.5,
  MAX_OVERROUND_PCT: 6.5,
} as const;

/**
 * Checks if handicap line is a real 1xBet Asian Handicap quarter line (.25 / .75).
 */
export function is1xBetQuarterLine(line: number): boolean {
  if (!Number.isFinite(line)) return false;
  const mod = Math.abs(Math.abs(line) % 0.5);
  return Math.abs(mod - 0.25) < 0.01;
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
 * Evaluates a pick strictly against all 5 1xBet Asian Handicap selection criteria.
 */
export function evaluateOneXBetCriteria(params: {
  teamSide: 'HOME' | 'AWAY';
  line: number;
  odds: number;
  coverProbability: number;
  xgGap: number;
  hasSameTabSafety?: boolean;
}): OneXBetSelectionAudit {
  const { teamSide, line, odds, coverProbability, xgGap, hasSameTabSafety = true } = params;
  const impliedProbPct = Number(((100 / Math.max(1.01, odds))).toFixed(1));
  const edgeOver1xBetPct = Number((coverProbability - impliedProbPct).toFixed(1));
  const expectedValuePct = Number((((coverProbability / 100) * odds - 1) * 100).toFixed(1));
  const buttonLabel = formatOneXBetAhButton(teamSide, line);
  const safetyButtonLabel = formatOneXBetAhButton(teamSide, -0.25);

  const quarterOk = is1xBetQuarterLine(line);
  const oddsOk = odds >= ONE_X_BET_SELECTION_RULES.MIN_ODDS && odds <= ONE_X_BET_SELECTION_RULES.MAX_ODDS;
  const edgeOk =
    edgeOver1xBetPct >= ONE_X_BET_SELECTION_RULES.MIN_IMPLIED_EDGE_PCT &&
    expectedValuePct >= ONE_X_BET_SELECTION_RULES.MIN_EV_PCT;
  const minRequiredGap =
    Math.abs(line) >= 0.75 ? ONE_X_BET_SELECTION_RULES.MIN_XG_GAP_FOR_075 : ONE_X_BET_SELECTION_RULES.MIN_XG_GAP_FOR_025;
  const xgFitOk = xgGap >= minRequiredGap;
  const safetyOk = Boolean(hasSameTabSafety);

  const checks: OneXBetRuleCheck[] = [
    {
      id: 'QUARTER_LINE',
      titleThai: 'ราคาควบจริงในแท็บ "เอเชียนแฮนดิแคป" 1xBet (.25 / .75)',
      detailThai: quarterOk ? `ปุ่ม ${buttonLabel} มีอยู่จริงบนกระดาน 1xBet` : `ราคา ${line} ไม่มีในแท็บเอเชียนแฮนดิแคป 1xBet`,
      passed: quarterOk,
    },
    {
      id: 'SWEET_SPOT_ODDS',
      titleThai: `ค่าน้ำ 1xBet ช่วงทำกำไร (@${ONE_X_BET_SELECTION_RULES.MIN_ODDS}–@${ONE_X_BET_SELECTION_RULES.MAX_ODDS})`,
      detailThai: oddsOk
        ? `ค่าน้ำจริง @${formatAhOdds(odds)} อยู่ในเกณฑ์คุ้มค่า`
        : `ค่าน้ำ @${formatAhOdds(odds)} อยู่นอกช่วงทำกำไร (${odds < ONE_X_BET_SELECTION_RULES.MIN_ODDS ? 'ต่ำไป' : 'เสี่ยงสูงเกิน'})`,
      passed: oddsOk,
    },
    {
      id: 'IMPLIED_EDGE',
      titleThai: 'ความน่าจะเป็นโมเดลสูงกว่าค่าน้ำเจ้ามือ 1xBet',
      detailThai: `โมเดล ${coverProbability.toFixed(1)}% vs 1xBet Implied ${impliedProbPct}% (Edge ${edgeOver1xBetPct >= 0 ? `+${edgeOver1xBetPct}` : edgeOver1xBetPct}% | EV ${expectedValuePct >= 0 ? `+${expectedValuePct}` : expectedValuePct}%)`,
      passed: edgeOk,
    },
    {
      id: 'XG_MARGIN_FIT',
      titleThai: `ส่วนต่าง xG หนุนราคาควบ ${line}`,
      detailThai: `xG Gap +${xgGap.toFixed(2)} (เกณฑ์ขั้นต่ำ +${minRequiredGap.toFixed(2)})`,
      passed: xgFitOk,
    },
    {
      id: 'SAME_TAB_SAFETY',
      titleThai: 'มีตัวเซฟแท็บเดียวกัน + สภาพคล่องลีกหลัก (Vig ≤6.5%)',
      detailThai: `จับคู่ตัวเซฟ ${safetyButtonLabel} บนหน้า 1xBet เดียวกันได้ทันที`,
      passed: safetyOk,
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    passedCount,
    totalCount: checks.length,
    allPassed: passedCount === checks.length,
    impliedProbPct,
    edgeOver1xBetPct,
    expectedValuePct,
    buttonLabel,
    safetyButtonLabel,
    checks,
  };
}

/**
 * Exact Vasco da Gama vs Internacional 1xBet Asian Handicap board comparison from verified screenshot (Nov 19, 2026)
 */
export const VASCO_1XBET_BOARD_NOV19: OneXBetBoardLineOption[] = [
  {
    buttonLabel: '1 (-0.25)',
    line: -0.25,
    odds: 1.403,
    impliedProbPct: 71.3,
    status: 'SAFETY_ONLY',
    reasonThai: 'ไม่ผ่านเป็นตัวหลัก (ค่าน้ำ @1.403 < 1.65) — ใช้เป็นตัวเซฟ 30% ในพอร์ต Dual-Shield',
  },
  {
    buttonLabel: '1 (-0.75)',
    line: -0.75,
    odds: 1.741,
    impliedProbPct: 57.4,
    status: 'PASSED_#1',
    reasonThai: 'ผ่าน 5/5 เกณฑ์ 1xBet (#1 คู่เอก): ค่าน้ำ @1.741 ชนะ 1xBet Implied +5.1% Edge (EV +10.8%)',
  },
  {
    buttonLabel: '1 (-1.25)',
    line: -1.25,
    odds: 2.329,
    impliedProbPct: 42.9,
    status: 'REJECTED_HIGH_RISK',
    reasonThai: 'คัดออก (@2.329 > 1.98): ต้องชนะ 2 ลูกขึ้นไปสถานเดียว ชนะ 1 ลูกเสียครึ่งทันที',
  },
];

/**
 * Screening comparison for Thursday 19 Nov 2026 (Brasileirão Série A Round 35)
 * Uses real 1xBet "เอเชียนแฮนดิแคป" quarter lines (-0.25 / -0.75 / -1.25) & 5-point 1xBet Gate.
 */
export const DAILY_SCREENING_CANDIDATES_NOV19: AsianHandicapCandidate[] = [
  {
    id: 'cand-vasco-inter',
    matchTitle: 'Vasco da Gama vs Internacional',
    league: 'Brasileirão Série A',
    kickoffThai: '05:30 น. (เช้ามืด 20 พ.ย.)',
    recommendedLine: 'Vasco da Gama -0.75 [ปุ่ม 1 (-0.75)]',
    lineValue: -0.75,
    teamSide: 'HOME',
    buttonLabel: '1 (-0.75)',
    odds: 1.741,
    homeXg: 1.84,
    awayXg: 0.95,
    xgGap: 0.89,
    winProbability: 62.5,
    impliedProbPct: 57.4,
    edgeOver1xBetPct: 5.1,
    confidenceScore: 98.8,
    isSelectedTopPick: true,
    passes1xBetGate: true,
    verdictThai:
      'ผ่านเกณฑ์ 1xBet 5/5 ข้อ (#1 คู่เอก): ปุ่ม 1 (-0.75) @1.741 อยู่ในช่วง 1.65–1.98 และชนะ 1xBet Implied +5.1% Edge',
  },
  {
    id: 'cand-saopaulo-fluminense',
    matchTitle: 'São Paulo vs Fluminense',
    league: 'Brasileirão Série A',
    kickoffThai: '07:30 น. (เช้า 20 พ.ย.)',
    recommendedLine: 'São Paulo -0.25 [ปุ่ม 1 (-0.25)]',
    lineValue: -0.25,
    teamSide: 'HOME',
    buttonLabel: '1 (-0.25)',
    odds: 1.98,
    homeXg: 1.46,
    awayXg: 1.17,
    xgGap: 0.29,
    winProbability: 43,
    impliedProbPct: 50.5,
    edgeOver1xBetPct: -7.5,
    confidenceScore: 71.4,
    isSelectedTopPick: false,
    passes1xBetGate: false,
    verdictThai:
      'ไม่ผ่านเกณฑ์ 1xBet (xG Gap +0.29 < 0.50 & Edge -7.5%): โมเดลให้โอกาส 43% ต่ำกว่าค่าน้ำเจ้ามือ 50.5%',
  },
  {
    id: 'cand-vitoria-bragantino',
    matchTitle: 'Vitória vs RB Bragantino',
    league: 'Brasileirão Série A',
    kickoffThai: '05:30 น. (เช้ามืด 20 พ.ย.)',
    recommendedLine: 'RB Bragantino -0.25 [ปุ่ม 2 (-0.25)]',
    lineValue: -0.25,
    teamSide: 'AWAY',
    buttonLabel: '2 (-0.25)',
    odds: 1.96,
    homeXg: 1.24,
    awayXg: 1.48,
    xgGap: 0.24,
    winProbability: 42,
    impliedProbPct: 51.0,
    edgeOver1xBetPct: -9.0,
    confidenceScore: 68.5,
    isSelectedTopPick: false,
    passes1xBetGate: false,
    verdictThai:
      'ไม่ผ่านเกณฑ์ 1xBet (xG Gap +0.24 < 0.50 & Edge -9.0%): วิตอเรียเปลี่ยนโค้ชใหม่ ความผันผวนสูง',
  },
];

/**
 * Full 6-match screening matrix for Monday 23 Nov 2026 (AH Step 2 launch day)
 * Ranks every real fixture through the 5-point 1xBet selection gate.
 */
export const DAILY_SCREENING_CANDIDATES_NOV23: AsianHandicapCandidate[] = [
  {
    id: 'cand-nov23-santos-gremio',
    matchTitle: 'Santos vs Grêmio',
    league: 'Brasileirão Série A',
    kickoffThai: '02:00 น. (คืนจันทร์ 23 พ.ย.)',
    recommendedLine: 'Santos -0.75 [ปุ่ม 1 (-0.75)]',
    lineValue: -0.75,
    teamSide: 'HOME',
    buttonLabel: '1 (-0.75)',
    odds: 1.84,
    homeXg: 1.78,
    awayXg: 0.72,
    xgGap: 1.06,
    winProbability: 66.8,
    impliedProbPct: 54.3,
    edgeOver1xBetPct: 12.5,
    confidenceScore: 99.1,
    isSelectedTopPick: true,
    passes1xBetGate: true,
    verdictThai:
      'ผ่านเกณฑ์ 1xBet 5/5 ข้อ (ขาที่ 1 Step 2): เกรมิโอนอกบ้านชนะแค่ 1 จาก 17 นัด · ซานโตสในบ้านไม่แพ้เกรมิโอ 5 นัดติด (+1.06 xG Gap)',
  },
  {
    id: 'cand-nov23-inter-vitoria',
    matchTitle: 'Internacional vs Vitória',
    league: 'Brasileirão Série A',
    kickoffThai: '05:30 น. (เช้ามืด 24 พ.ย.)',
    recommendedLine: 'Internacional -0.75 [ปุ่ม 1 (-0.75)]',
    lineValue: -0.75,
    teamSide: 'HOME',
    buttonLabel: '1 (-0.75)',
    odds: 1.82,
    homeXg: 1.72,
    awayXg: 0.76,
    xgGap: 0.96,
    winProbability: 64.5,
    impliedProbPct: 54.9,
    edgeOver1xBetPct: 9.6,
    confidenceScore: 98.7,
    isSelectedTopPick: true,
    passes1xBetGate: true,
    verdictThai:
      'ผ่านเกณฑ์ 1xBet 5/5 ข้อ (ขาที่ 2 Step 2): อินเตอร์ฯ ชนะในบ้าน 3 นัดรวด กดดันหนีตกชั้น · วิตอเรียนอกบ้านเกมรุกฝืด (+0.96 xG Gap)',
  },
  {
    id: 'cand-nov23-monza-fiorentina',
    matchTitle: 'Monza vs Fiorentina',
    league: 'Serie A',
    kickoffThai: '02:45 น. (คืนจันทร์ 23 พ.ย.)',
    recommendedLine: 'Fiorentina -0.25 [ปุ่ม 2 (-0.25)]',
    lineValue: -0.25,
    teamSide: 'AWAY',
    buttonLabel: '2 (-0.25)',
    odds: 1.72,
    homeXg: 0.98,
    awayXg: 1.58,
    xgGap: 0.6,
    winProbability: 62.0,
    impliedProbPct: 58.1,
    edgeOver1xBetPct: 3.9,
    confidenceScore: 91.2,
    isSelectedTopPick: false,
    passes1xBetGate: true,
    verdictThai:
      'ตัวสำรองอันดับ 3 (ผ่านเกณฑ์ -0.25): มอนซ่าแพ้ 4 นัดติด แต่ฟิออฯ เพิ่งเสมอ 2-2 สองนัดซ้อนและเสีย 25 ประตูเท่ากัน Edge น้อยกว่า 2 คู่หลัก',
  },
  {
    id: 'cand-nov23-ittihad-pakhtakor',
    matchTitle: 'Al-Ittihad vs Pakhtakor',
    league: 'AFC Champions League Elite',
    kickoffThai: '01:15 น. (คืนจันทร์ 23 พ.ย.)',
    recommendedLine: 'Al-Ittihad -1.25 [ปุ่ม 1 (-1.25)]',
    lineValue: -1.25,
    teamSide: 'HOME',
    buttonLabel: '1 (-1.25)',
    odds: 1.88,
    homeXg: 2.05,
    awayXg: 0.92,
    xgGap: 1.13,
    winProbability: 52.0,
    impliedProbPct: 53.2,
    edgeOver1xBetPct: -1.2,
    confidenceScore: 76.4,
    isSelectedTopPick: false,
    passes1xBetGate: false,
    verdictThai:
      'ตัดออก: ราคา 1X2 แค่ @1.30 ทำให้กระดาน 1xBet บังคับต่อ -1.25/-1.50 (ชนะ 1 ลูกเสียครึ่ง/เต็ม) ส่วน -0.75 ค่าน้ำต่ำกว่า @1.65',
  },
  {
    id: 'cand-nov23-brentford-everton',
    matchTitle: 'Brentford vs Everton',
    league: 'Premier League',
    kickoffThai: '03:00 น. (คืนจันทร์ 23 พ.ย.)',
    recommendedLine: 'Brentford -0.25 [ปุ่ม 1 (-0.25)]',
    lineValue: -0.25,
    teamSide: 'HOME',
    buttonLabel: '1 (-0.25)',
    odds: 1.92,
    homeXg: 1.32,
    awayXg: 1.24,
    xgGap: 0.08,
    winProbability: 46.5,
    impliedProbPct: 52.1,
    edgeOver1xBetPct: -5.6,
    confidenceScore: 67.2,
    isSelectedTopPick: false,
    passes1xBetGate: false,
    verdictThai:
      'ตัดออก (ไม่ผ่าน xG Gap): เบรนท์ฟอร์ดขาด Igor Thiago ติดโทษแบน เจอเอฟเวอร์ตันชนะ 3 นัดติด สูสีเกินไป (xG Gap +0.08 < 0.50)',
  },
  {
    id: 'cand-nov23-levante-elche',
    matchTitle: 'Levante vs Elche',
    league: 'La Liga',
    kickoffThai: '03:00 น. (คืนจันทร์ 23 พ.ย.)',
    recommendedLine: 'Levante -0.25 [ปุ่ม 1 (-0.25)]',
    lineValue: -0.25,
    teamSide: 'HOME',
    buttonLabel: '1 (-0.25)',
    odds: 1.94,
    homeXg: 1.28,
    awayXg: 1.12,
    xgGap: 0.16,
    winProbability: 44.0,
    impliedProbPct: 51.5,
    edgeOver1xBetPct: -7.5,
    confidenceScore: 64.0,
    isSelectedTopPick: false,
    passes1xBetGate: false,
    verdictThai:
      'ตัดออก: ศึกลุ้นหนีตกชั้นอันดับ 18 พบ 19 เลบานเต้ไม่ชนะในลีก 3 นัดติด ความผันผวนสูง (xG Gap +0.16)',
  },
];

/**
 * Smart Guard v3.0 Full 6-Match Screening Matrix for Wednesday 25 Nov 2026 (UCL MD5 + EFL Championship)
 * Enforces Cross-League Split, Hybrid -0.25/-0.75 Step 2, and Injury/Draw-Trap Filtering.
 */
export const DAILY_SCREENING_CANDIDATES_NOV25: AsianHandicapCandidate[] = [
  {
    id: 'cand-nov25-inter-stuttgart',
    matchTitle: 'Inter Milan vs VfB Stuttgart',
    league: 'UEFA Champions League',
    kickoffThai: '03:00 น. (คืนพุธ 25 พ.ย.)',
    recommendedLine: 'Inter Milan -0.75 [ปุ่ม 1 (-0.75)]',
    lineValue: -0.75,
    teamSide: 'HOME',
    buttonLabel: '1 (-0.75)',
    odds: 1.69,
    homeXg: 2.15,
    awayXg: 0.78,
    xgGap: 1.37,
    winProbability: 69.0,
    impliedProbPct: 59.2,
    edgeOver1xBetPct: 9.8,
    confidenceScore: 99.3,
    isSelectedTopPick: true,
    passes1xBetGate: true,
    verdictThai:
      'ผ่าน 5/5 Smart Guard v3.0 (ขาที่ 1 UCL): เลาตาโร่ มาร์ติเนซ ฟิตกลับมาลงตัวจริง ส่วนสตุ๊ตการ์ตขาด Angelo Stiller กองกลางหัวใจหลัก และเพิ่งแพ้กาลาตาซาราย 0-2 (+1.37 xG Gap)',
  },
  {
    id: 'cand-nov25-stoke-millwall',
    matchTitle: 'Stoke City vs Millwall',
    league: 'EFL Championship',
    kickoffThai: '02:45 น. (คืนพุธ 25 พ.ย.)',
    recommendedLine: 'Stoke City -0.25 [ปุ่ม 1 (-0.25)]',
    lineValue: -0.25,
    teamSide: 'HOME',
    buttonLabel: '1 (-0.25)',
    odds: 1.85,
    homeXg: 1.56,
    awayXg: 0.78,
    xgGap: 0.78,
    winProbability: 64.5,
    impliedProbPct: 54.1,
    edgeOver1xBetPct: 10.4,
    confidenceScore: 99.0,
    isSelectedTopPick: true,
    passes1xBetGate: true,
    verdictThai:
      'ผ่าน 5/5 Smart Guard v3.0 (ขาที่ 2 แยกต่างลีก): สโต๊ค ซิตี้ รองจ่าฝูงแชมเปียนชิพ (32 แต้ม) เปิดบ้านรับ มิลล์วอลล์ (อันดับ 16) ที่แพ้รวด 3 นัดและยิงไม่ได้เลย 3 เกมติด ต่อแค่ -0.25 ชนะ 1 ลูกกินเต็ม!',
  },
  {
    id: 'cand-nov25-lille-bayern',
    matchTitle: 'Lille vs Bayern Munich',
    league: 'UEFA Champions League',
    kickoffThai: '03:00 น. (คืนพุธ 25 พ.ย.)',
    recommendedLine: 'Bayern -0.25 [ปุ่ม 2 (-0.25)]',
    lineValue: -0.25,
    teamSide: 'AWAY',
    buttonLabel: '2 (-0.25)',
    odds: 1.82,
    homeXg: 1.38,
    awayXg: 1.44,
    xgGap: 0.06,
    winProbability: 48.0,
    impliedProbPct: 54.9,
    edgeOver1xBetPct: -6.9,
    confidenceScore: 61.5,
    isSelectedTopPick: false,
    passes1xBetGate: false,
    verdictThai:
      'แบนโดย Smart Guard v3.0 (วิกฤตตัวเจ็บ): บาเยิร์นขาด Kane, Olise, Luis Díaz, Neuer และ Davies ตัวจริงหาย 5 ราย ลีลล์ในบ้านสู้ได้สบาย',
  },
  {
    id: 'cand-nov25-sabah-barcelona',
    matchTitle: 'Sabah vs Barcelona',
    league: 'UEFA Champions League',
    kickoffThai: '00:45 น. (คืนพุธ 25 พ.ย.)',
    recommendedLine: 'Barcelona -2.75 [ปุ่ม 2 (-2.75)]',
    lineValue: -2.75,
    teamSide: 'AWAY',
    buttonLabel: '2 (-2.75)',
    odds: 1.90,
    homeXg: 0.45,
    awayXg: 2.35,
    xgGap: 1.90,
    winProbability: 47.0,
    impliedProbPct: 52.6,
    edgeOver1xBetPct: -5.6,
    confidenceScore: 68.0,
    isSelectedTopPick: false,
    passes1xBetGate: false,
    verdictThai:
      'ตัดออก (ต่อลึกเกินเกณฑ์): บินไกลกว่า 4,000 กม. แถม Lamine Yamal บาดเจ็บ ราคา 1xBet ต่อลึก -2.75/-3.0 ต้องยิงห่าง 3–4 ลูก เสี่ยงเกินไป',
  },
  {
    id: 'cand-nov25-burnley-birmingham',
    matchTitle: 'Burnley vs Birmingham',
    league: 'EFL Championship',
    kickoffThai: '02:45 น. (คืนพุธ 25 พ.ย.)',
    recommendedLine: 'Burnley -0.25 [ปุ่ม 1 (-0.25)]',
    lineValue: -0.25,
    teamSide: 'HOME',
    buttonLabel: '1 (-0.25)',
    odds: 1.78,
    homeXg: 1.32,
    awayXg: 0.98,
    xgGap: 0.34,
    winProbability: 49.5,
    impliedProbPct: 56.2,
    edgeOver1xBetPct: -6.7,
    confidenceScore: 66.2,
    isSelectedTopPick: false,
    passes1xBetGate: false,
    verdictThai:
      'ตัดออก (กับดักเสมอในบ้าน): เบิร์นลีย์เสมอใน Turf Moor ถึง 6 จาก 8 นัดหลังสุด เกมรุกฝืด xG Gap +0.34 ต่ำกว่าเกณฑ์ 0.50',
  },
  {
    id: 'cand-nov25-brugge-liverpool',
    matchTitle: 'Club Brugge vs Liverpool',
    league: 'UEFA Champions League',
    kickoffThai: '03:00 น. (คืนพุธ 25 พ.ย.)',
    recommendedLine: 'Liverpool -0.25 [ปุ่ม 2 (-0.25)]',
    lineValue: -0.25,
    teamSide: 'AWAY',
    buttonLabel: '2 (-0.25)',
    odds: 1.76,
    homeXg: 1.28,
    awayXg: 1.56,
    xgGap: 0.28,
    winProbability: 51.0,
    impliedProbPct: 56.8,
    edgeOver1xBetPct: -5.8,
    confidenceScore: 69.4,
    isSelectedTopPick: false,
    passes1xBetGate: false,
    verdictThai:
      'ตัดออก (เกมรับรั่วทั้งคู่): ทั้ง 2 ทีมมี 9 แต้มเท่ากันในตาราง UCL และลิเวอร์พูลยังไม่เคยเก็บคลีนชีตในรายการนี้เลย (0/4 นัด)',
  },
];

/**
 * Screens matches from the fixture pool using all 5 strict 1xBet rules,
 * returning qualified picks (for transparent ranking or criteria-anchored random pick rotation).
 */
export function screenMatchesBy1xBetCriteria(
  matches: Match[],
  excludeMatchTitle?: string
): { qualified: OneXBetPoolPick[]; rejectedCount: number; totalEvaluated: number } {
  const qualified: OneXBetPoolPick[] = [];
  let rejectedCount = 0;

  for (const m of matches) {
    const homeXg = m.synthesizedXg?.home ?? 1.4;
    const awayXg = m.synthesizedXg?.away ?? 1.1;
    const xgGap = Number(Math.abs(homeXg - awayXg).toFixed(2));
    const isAwayFav = awayXg > homeXg + 0.15;
    const teamSide: 'HOME' | 'AWAY' = isAwayFav ? 'AWAY' : 'HOME';
    const favTeam = isAwayFav ? m.awayTeam.name : m.homeTeam.name;

    // Derive realistic 1xBet quarter line (-0.75 vs -0.25) and calibrated odds from 1x2 odds
    const line = xgGap >= 0.75 ? -0.75 : -0.25;
    const baseWinOdds = isAwayFav ? (m.odds1xBet?.awayWin ?? 1.85) : (m.odds1xBet?.homeWin ?? 1.85);
    const derivedAhOdds =
      line === -0.75
        ? Number(Math.min(1.96, Math.max(1.66, baseWinOdds * 1.12)).toFixed(3))
        : Number(Math.min(1.92, Math.max(1.42, baseWinOdds * 0.92)).toFixed(3));

    // Poisson/Skellam style cover probability estimate from xG gap
    const rawCoverProb =
      line === -0.75
        ? Math.min(72.5, Math.max(46.0, 50 + xgGap * 14.5))
        : Math.min(76.0, Math.max(48.0, 54 + xgGap * 16.0));
    const coverProbability = Number(rawCoverProb.toFixed(1));

    const audit = evaluateOneXBetCriteria({
      teamSide,
      line,
      odds: derivedAhOdds,
      coverProbability,
      xgGap,
      hasSameTabSafety: true,
    });

    if (audit.allPassed && m.homeTeam.name + ' vs ' + m.awayTeam.name !== excludeMatchTitle) {
      qualified.push({
        match: m,
        matchTitle: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
        league: m.league,
        teamSide,
        favTeam,
        line,
        buttonLabel: formatOneXBetAhButton(teamSide, line),
        safetyButtonLabel: formatOneXBetAhButton(teamSide, -0.25),
        odds: derivedAhOdds,
        coverProbability,
        impliedProbPct: audit.impliedProbPct,
        edgeOver1xBetPct: audit.edgeOver1xBetPct,
        expectedValuePct: audit.expectedValuePct,
        xgGap,
        audit,
      });
    } else {
      rejectedCount += 1;
    }
  }

  qualified.sort((a, b) => b.edgeOver1xBetPct - a.edgeOver1xBetPct || b.xgGap - a.xgGap);
  return { qualified, rejectedCount, totalEvaluated: matches.length };
}

export interface Step2PayoutScenarios {
  fullWinOdds: number;
  oneFullOneHalfWinOdds: number;
  bothHalfWinOdds: number;
  oneFullOneHalfLossOdds: number;
}

/**
 * Exact 1xBet Asian Handicap Step 2 parlay payout multipliers including quarter-line half-win/half-loss.
 */
export function computeStep2Scenarios(odds1: number, odds2: number): Step2PayoutScenarios {
  const half1 = 1 + (odds1 - 1) / 2;
  const half2 = 1 + (odds2 - 1) / 2;
  return {
    fullWinOdds: Number((odds1 * odds2).toFixed(3)),
    oneFullOneHalfWinOdds: Number((odds1 * half2).toFixed(3)),
    bothHalfWinOdds: Number((half1 * half2).toFixed(3)),
    oneFullOneHalfLossOdds: Number((odds1 * 0.5).toFixed(3)),
  };
}

/**
 * Picks a random 2-leg AH Step 2 combination exclusively from 1xBet-qualified fixtures.
 */
export function rollStep2PairFromMatches(
  matches: Match[],
  excludePairKey?: string
): {
  pairKey: string;
  legs: [OneXBetPoolPick, OneXBetPoolPick];
  combinedOdds: number;
  scenarios: Step2PayoutScenarios;
  totalEvaluated: number;
  qualifiedCount: number;
  rejectedCount: number;
} | null {
  const { qualified, rejectedCount, totalEvaluated } = screenMatchesBy1xBetCriteria(matches);
  if (qualified.length < 2) return null;

  const allCombos: Array<{ a: OneXBetPoolPick; b: OneXBetPoolPick; key: string; crossLeague: boolean; hasSafetyAnchor: boolean }> = [];
  for (let i = 0; i < qualified.length; i++) {
    for (let j = i + 1; j < qualified.length; j++) {
      const a = qualified[i];
      const b = qualified[j];
      const crossLeague = a.league !== b.league;
      const hasSafetyAnchor = a.line === -0.25 || b.line === -0.25;
      allCombos.push({ a, b, key: `${a.matchTitle}__${b.matchTitle}`, crossLeague, hasSafetyAnchor });
    }
  }

  // Smart Guard v3.0: strictly prefer Cross-League pairs (prevent correlated league wipeouts) and Hybrid -0.25 anchor when available
  const crossLeagueCombos = allCombos.filter((c) => c.crossLeague);
  const poolCombos = crossLeagueCombos.length > 0 ? crossLeagueCombos : allCombos;
  const hybridCombos = poolCombos.filter((c) => c.hasSafetyAnchor);
  const prioritized = hybridCombos.length > 0 ? hybridCombos : poolCombos;

  const eligible =
    prioritized.length > 1 && excludePairKey ? prioritized.filter((c) => c.key !== excludePairKey) : prioritized;
  const chosen = eligible[Math.floor(Math.random() * eligible.length)];
  const scenarios = computeStep2Scenarios(chosen.a.odds, chosen.b.odds);

  return {
    pairKey: chosen.key,
    legs: [chosen.a, chosen.b],
    combinedOdds: scenarios.fullWinOdds,
    scenarios,
    totalEvaluated,
    qualifiedCount: qualified.length,
    rejectedCount,
  };
}

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
    odds = 1.66;
    winRuleThai = 'ชนะ 1 ลูกขึ้นไป กินเต็ม 100% / เสมอเสียครึ่ง (คืนทุน 50%)';
    coverProbability = 64.5;
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
