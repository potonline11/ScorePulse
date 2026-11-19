export type TimeframeWindow = '7d' | '14d' | '30d';

export type MarketStrategyId = 'dc' | 'over15' | 'over25' | 'hdp0' | 'hdp05' | 'cs';

export interface HistoricalMatchRecord {
  id: string;
  dateKey: string;
  dateLabel: string;
  matchTitle: string;
  league: string;
  predictedScore: string;
  actualScore: string;
  homeGoals: number;
  awayGoals: number;
  predHome: number;
  predAway: number;
  recommendedSide: 'HOME' | 'AWAY';
  csOdds: number;
  dcOdds: number;       // Double Chance (1X or X2)
  hdp0Odds: number;     // Asian Handicap 0 (DNB - Draw No Bet)
  hdp05Odds: number;    // Asian Handicap -0.5 (Full Time Win)
  over15Odds: number;   // Over 1.5 Goals
  over25Odds: number;   // Over 2.5 Goals
  fixtureError?: boolean;
  note?: string;
}

export type MarketOutcome = 'WIN' | 'LOSS' | 'PUSH';

export interface StrategySummary {
  id: MarketStrategyId;
  shortName: string;
  thaiName: string;
  marketLabel: string;
  description: string;
  totalMatches: number;
  wins: number;
  pushes: number;
  losses: number;
  hitRate: number;      // wins / (wins + losses) %
  rawWinPct: number;    // wins / totalMatches %
  avgOdds: number;
  totalStaked: number;
  netProfit: number;
  roiPct: number;
  maxLosingStreak: number;
  maxWinningStreak: number;
  equityCurve: number[]; // cumulative profit after each match chronologically
  verdictTag: 'BEST_SURVIVAL' | 'BEST_ROI' | 'BALANCED' | 'HIGH_RISK';
}

export interface EvaluatedMatchRow extends HistoricalMatchRecord {
  recommendedDcLabel: string;
  recommendedHdpLabel: string;
  outcomes: Record<MarketStrategyId, MarketOutcome>;
  totalGoals: number;
}

/**
 * 31 Verified Settled Matches spanning 1 full month (19 Oct – 18 Nov 2026)
 * Ordered newest-first for display; reversed internally when computing chronological streaks & equity curves.
 */
export const ONE_MONTH_SETTLED_MATCHES: HistoricalMatchRecord[] = [
  {
    id: 'hist-nov-18',
    dateKey: '2026-11-18',
    dateLabel: '18 พ.ย.',
    matchTitle: 'Flamengo vs Athletico-PR',
    league: 'Brasileirão Série A',
    predictedScore: '2-0',
    actualScore: '2-1',
    homeGoals: 2,
    awayGoals: 1,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 6.50,
    dcOdds: 1.18,
    hdp0Odds: 1.24,
    hdp05Odds: 1.48,
    over15Odds: 1.28,
    over25Odds: 1.78,
    note: 'ชนะตรงฝั่ง + Over 2.5 เข้า (โดนตีไข่แตก 1 ลูก)',
  },
  {
    id: 'hist-nov-17',
    dateKey: '2026-11-17',
    dateLabel: '17 พ.ย.',
    matchTitle: 'Bosnia & Herz. vs Romania',
    league: 'UEFA Nations League',
    predictedScore: '1-0',
    actualScore: '2-1',
    homeGoals: 2,
    awayGoals: 1,
    predHome: 1,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 6.40,
    dcOdds: 1.34,
    hdp0Odds: 1.54,
    hdp05Odds: 2.02,
    over15Odds: 1.35,
    over25Odds: 1.85,
    note: 'ชนะตรงฝั่ง + Over 2.5 เข้า (เสียประตูแรกนาที 6)',
  },
  {
    id: 'hist-nov-16',
    dateKey: '2026-11-16',
    dateLabel: '16 พ.ย.',
    matchTitle: 'Switzerland vs Scotland',
    league: 'UEFA Nations League',
    predictedScore: '2-0',
    actualScore: '4-0',
    homeGoals: 4,
    awayGoals: 0,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 7.20,
    dcOdds: 1.16,
    hdp0Odds: 1.22,
    hdp05Odds: 1.45,
    over15Odds: 1.25,
    over25Odds: 1.74,
    note: 'ยิงทะลุสกอร์เต็ง 2-0 ไป 4-0',
  },
  {
    id: 'hist-nov-15',
    dateKey: '2026-11-15',
    dateLabel: '15 พ.ย.',
    matchTitle: 'France vs Türkiye',
    league: 'UEFA Nations League',
    predictedScore: '2-0',
    actualScore: '2-1',
    homeGoals: 2,
    awayGoals: 1,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 7.10,
    dcOdds: 1.15,
    hdp0Odds: 1.20,
    hdp05Odds: 1.44,
    over15Odds: 1.24,
    over25Odds: 1.70,
    note: 'ฝรั่งเศสชนะจริงแต่เสีย 1 ประตู',
  },
  {
    id: 'hist-nov-14',
    dateKey: '2026-11-14',
    dateLabel: '14 พ.ย.',
    matchTitle: 'Portugal vs Denmark',
    league: 'UEFA Nations League',
    predictedScore: '2-0',
    actualScore: '1-4',
    homeGoals: 1,
    awayGoals: 4,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 7.00,
    dcOdds: 1.16,
    hdp0Odds: 1.22,
    hdp05Odds: 1.46,
    over15Odds: 1.26,
    over25Odds: 1.76,
    note: 'พลิกล็อกแพ้คาบ้าน แต่ Over 2.5 เข้า',
  },
  {
    id: 'hist-nov-13',
    dateKey: '2026-11-13',
    dateLabel: '13 พ.ย.',
    matchTitle: 'Netherlands vs Greece',
    league: 'UEFA Nations League',
    predictedScore: '2-0',
    actualScore: '7-0',
    homeGoals: 7,
    awayGoals: 0,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 6.80,
    dcOdds: 1.14,
    hdp0Odds: 1.20,
    hdp05Odds: 1.48,
    over15Odds: 1.22,
    over25Odds: 1.68,
    note: 'เนเธอร์แลนด์ถล่ม 7-0 เกินสกอร์เต็ง 2-0',
  },
  {
    id: 'hist-nov-12',
    dateKey: '2026-11-12',
    dateLabel: '12 พ.ย.',
    matchTitle: 'England vs Croatia',
    league: 'UEFA Nations League',
    predictedScore: '2-0',
    actualScore: '2-1',
    homeGoals: 2,
    awayGoals: 1,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 7.40,
    dcOdds: 1.18,
    hdp0Odds: 1.26,
    hdp05Odds: 1.55,
    over15Odds: 1.28,
    over25Odds: 1.80,
    note: 'อังกฤษชนะ 2-1 พลาดคลีนชีตนาที 59',
  },
  {
    id: 'hist-nov-11',
    dateKey: '2026-11-11',
    dateLabel: '11 พ.ย.',
    matchTitle: 'Armenia vs Cyprus',
    league: 'International Friendly',
    predictedScore: '2-1',
    actualScore: '1-1',
    homeGoals: 1,
    awayGoals: 1,
    predHome: 2,
    predAway: 1,
    recommendedSide: 'HOME',
    csOdds: 8.20,
    dcOdds: 1.28,
    hdp0Odds: 1.46,
    hdp05Odds: 1.92,
    over15Odds: 1.34,
    over25Odds: 1.95,
    note: 'เสมอ 1-1: 1X เข้าเป้า + HDP 0 คืนทุน',
  },
  {
    id: 'hist-nov-10',
    dateKey: '2026-11-10',
    dateLabel: '10 พ.ย.',
    matchTitle: 'Wycombe vs Crawley Town',
    league: 'EFL Trophy',
    predictedScore: '2-1',
    actualScore: '2-1',
    homeGoals: 2,
    awayGoals: 1,
    predHome: 2,
    predAway: 1,
    recommendedSide: 'HOME',
    csOdds: 8.40,
    dcOdds: 1.22,
    hdp0Odds: 1.35,
    hdp05Odds: 1.68,
    over15Odds: 1.25,
    over25Odds: 1.72,
    note: 'เข้าเป้าทุกตลาดรวม Correct Score 2-1',
  },
  {
    id: 'hist-nov-09',
    dateKey: '2026-11-09',
    dateLabel: '9 พ.ย.',
    matchTitle: 'Rayo Vallecano vs Las Palmas',
    league: 'La Liga',
    predictedScore: '1-0',
    actualScore: '1-0',
    homeGoals: 1,
    awayGoals: 0,
    predHome: 1,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 6.80,
    dcOdds: 1.24,
    hdp0Odds: 1.38,
    hdp05Odds: 1.75,
    over15Odds: 1.36,
    over25Odds: 2.02,
    note: 'ชนะ 1-0 ตรงตัว (แต่สกอร์ต่ำ Under 1.5)',
  },
  {
    id: 'hist-nov-08',
    dateKey: '2026-11-08',
    dateLabel: '8 พ.ย.',
    matchTitle: 'Sunderland vs Chelsea',
    league: 'Premier League',
    predictedScore: '1-2',
    actualScore: '1-2',
    homeGoals: 1,
    awayGoals: 2,
    predHome: 1,
    predAway: 2,
    recommendedSide: 'AWAY',
    csOdds: 8.60,
    dcOdds: 1.25,
    hdp0Odds: 1.40,
    hdp05Odds: 1.72,
    over15Odds: 1.24,
    over25Odds: 1.58,
    note: 'เชลซีชนะ 1-2 เข้าเป้าทุกตลาดครบ',
  },
  {
    id: 'hist-nov-07',
    dateKey: '2026-11-07',
    dateLabel: '7 พ.ย.',
    matchTitle: 'Leeds United vs Tottenham',
    league: 'Premier League',
    predictedScore: '1-2',
    actualScore: '1-1',
    homeGoals: 1,
    awayGoals: 1,
    predHome: 1,
    predAway: 2,
    recommendedSide: 'AWAY',
    csOdds: 8.80,
    dcOdds: 1.38,
    hdp0Odds: 1.56,
    hdp05Odds: 2.05,
    over15Odds: 1.24,
    over25Odds: 1.65,
    note: 'เสมอ 1-1: X2 เข้าเป้า + HDP 0 คืนทุน',
  },
  {
    id: 'hist-nov-06',
    dateKey: '2026-11-06',
    dateLabel: '6 พ.ย.',
    matchTitle: 'Everton vs Coventry (ตารางผิด)',
    league: 'Premier League',
    predictedScore: '2-1',
    actualScore: '3-1',
    homeGoals: 3,
    awayGoals: 1,
    predHome: 2,
    predAway: 1,
    recommendedSide: 'HOME',
    csOdds: 8.60,
    dcOdds: 1.20,
    hdp0Odds: 1.32,
    hdp05Odds: 1.65,
    over15Odds: 1.24,
    over25Odds: 1.68,
    fixtureError: true,
    note: 'เกิดความผิดพลาดระบุคู่แข่ง (ผลบอลจริง 3-1)',
  },
  {
    id: 'hist-nov-05',
    dateKey: '2026-11-05',
    dateLabel: '5 พ.ย.',
    matchTitle: 'Bayer Leverkusen vs Marseille',
    league: 'UEFA Europa League',
    predictedScore: '2-1',
    actualScore: '0-1',
    homeGoals: 0,
    awayGoals: 1,
    predHome: 2,
    predAway: 1,
    recommendedSide: 'HOME',
    csOdds: 8.80,
    dcOdds: 1.20,
    hdp0Odds: 1.30,
    hdp05Odds: 1.62,
    over15Odds: 1.24,
    over25Odds: 1.65,
    note: 'เลเวอร์คูเซ่นแพ้คาบ้าน 0-1 (พลาดทุกตลาด)',
  },
  {
    id: 'hist-nov-04',
    dateKey: '2026-11-04',
    dateLabel: '4 พ.ย.',
    matchTitle: 'Fenerbahçe vs Liverpool',
    league: 'UEFA Champions League',
    predictedScore: '1-2',
    actualScore: '3-2',
    homeGoals: 3,
    awayGoals: 2,
    predHome: 1,
    predAway: 2,
    recommendedSide: 'AWAY',
    csOdds: 8.60,
    dcOdds: 1.28,
    hdp0Odds: 1.44,
    hdp05Odds: 1.85,
    over15Odds: 1.22,
    over25Odds: 1.62,
    note: 'เจ้าบ้านพลิกชนะ 3-2 (เข้าเฉพาะ Over 1.5/2.5)',
  },
  {
    id: 'hist-nov-03',
    dateKey: '2026-11-03',
    dateLabel: '3 พ.ย.',
    matchTitle: 'Barcelona vs Aston Villa',
    league: 'UEFA Champions League',
    predictedScore: '3-1',
    actualScore: '3-0',
    homeGoals: 3,
    awayGoals: 0,
    predHome: 3,
    predAway: 1,
    recommendedSide: 'HOME',
    csOdds: 10.50,
    dcOdds: 1.15,
    hdp0Odds: 1.22,
    hdp05Odds: 1.48,
    over15Odds: 1.20,
    over25Odds: 1.58,
    note: 'บาร์ซ่าชนะขาด 3-0 (1X / HDP / Over 2.5 เข้าหมด)',
  },
  {
    id: 'hist-nov-02',
    dateKey: '2026-11-02',
    dateLabel: '2 พ.ย.',
    matchTitle: 'Newcastle vs Everton',
    league: 'Premier League',
    predictedScore: '2-0',
    actualScore: '0-1',
    homeGoals: 0,
    awayGoals: 1,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 7.60,
    dcOdds: 1.22,
    hdp0Odds: 1.34,
    hdp05Odds: 1.68,
    over15Odds: 1.26,
    over25Odds: 1.78,
    note: 'เอฟเวอร์ตันบุกชนะ 0-1 (พลาดทุกตลาด)',
  },
  {
    id: 'hist-nov-01',
    dateKey: '2026-11-01',
    dateLabel: '1 พ.ย.',
    matchTitle: 'Liverpool vs Arsenal',
    league: 'Premier League',
    predictedScore: '2-1',
    actualScore: '0-1',
    homeGoals: 0,
    awayGoals: 1,
    predHome: 2,
    predAway: 1,
    recommendedSide: 'HOME',
    csOdds: 8.60,
    dcOdds: 1.34,
    hdp0Odds: 1.55,
    hdp05Odds: 2.05,
    over15Odds: 1.25,
    over25Odds: 1.72,
    note: 'อาร์เซน่อลบุกชนะ 0-1 (พลาดทุกตลาด)',
  },
  {
    id: 'hist-oct-31',
    dateKey: '2026-10-31',
    dateLabel: '31 ต.ค.',
    matchTitle: 'Chelsea vs Man United',
    league: 'Premier League',
    predictedScore: '2-1',
    actualScore: '1-1',
    homeGoals: 1,
    awayGoals: 1,
    predHome: 2,
    predAway: 1,
    recommendedSide: 'HOME',
    csOdds: 8.80,
    dcOdds: 1.30,
    hdp0Odds: 1.48,
    hdp05Odds: 1.92,
    over15Odds: 1.22,
    over25Odds: 1.64,
    note: 'เสมอ 1-1: 1X & Over 1.5 เข้าเป้า',
  },
  {
    id: 'hist-oct-30',
    dateKey: '2026-10-30',
    dateLabel: '30 ต.ค.',
    matchTitle: 'Villarreal vs Espanyol',
    league: 'La Liga',
    predictedScore: '2-0',
    actualScore: '2-0',
    homeGoals: 2,
    awayGoals: 0,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 7.50,
    dcOdds: 1.18,
    hdp0Odds: 1.28,
    hdp05Odds: 1.55,
    over15Odds: 1.25,
    over25Odds: 1.75,
    note: 'ชนะ 2-0 ตรงตัว (1X / HDP / O1.5 / CS เข้าหมด)',
  },
  {
    id: 'hist-oct-29',
    dateKey: '2026-10-29',
    dateLabel: '29 ต.ค.',
    matchTitle: 'Everton vs Newcastle',
    league: 'Carabao Cup',
    predictedScore: '1-2',
    actualScore: '1-2',
    homeGoals: 1,
    awayGoals: 2,
    predHome: 1,
    predAway: 2,
    recommendedSide: 'AWAY',
    csOdds: 8.50,
    dcOdds: 1.32,
    hdp0Odds: 1.52,
    hdp05Odds: 1.95,
    over15Odds: 1.26,
    over25Odds: 1.78,
    note: 'นิวคาสเซิลชนะ 1-2 เข้าทุกตลาด',
  },
  {
    id: 'hist-oct-28a',
    dateKey: '2026-10-28',
    dateLabel: '28 ต.ค.',
    matchTitle: 'Man City vs Brighton',
    league: 'Carabao Cup',
    predictedScore: '2-0',
    actualScore: '2-2',
    homeGoals: 2,
    awayGoals: 2,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 7.50,
    dcOdds: 1.18,
    hdp0Odds: 1.25,
    hdp05Odds: 1.52,
    over15Odds: 1.20,
    over25Odds: 1.55,
    note: 'เสมอใน 90 นาที 2-2: 1X & Over 2.5 เข้าเป้า',
  },
  {
    id: 'hist-oct-28b',
    dateKey: '2026-10-28',
    dateLabel: '28 ต.ค.',
    matchTitle: 'Venezia vs Inter Milan',
    league: 'Serie A',
    predictedScore: '0-2',
    actualScore: '0-2',
    homeGoals: 0,
    awayGoals: 2,
    predHome: 0,
    predAway: 2,
    recommendedSide: 'AWAY',
    csOdds: 6.80,
    dcOdds: 1.14,
    hdp0Odds: 1.20,
    hdp05Odds: 1.44,
    over15Odds: 1.24,
    over25Odds: 1.70,
    note: 'อินเตอร์ชนะ 0-2 เข้า X2 / HDP / CS',
  },
  {
    id: 'hist-oct-27',
    dateKey: '2026-10-27',
    dateLabel: '27 ต.ค.',
    matchTitle: 'Sassuolo vs Lazio',
    league: 'Serie A',
    predictedScore: '1-2',
    actualScore: '1-2',
    homeGoals: 1,
    awayGoals: 2,
    predHome: 1,
    predAway: 2,
    recommendedSide: 'AWAY',
    csOdds: 8.60,
    dcOdds: 1.30,
    hdp0Odds: 1.48,
    hdp05Odds: 1.90,
    over15Odds: 1.26,
    over25Odds: 1.76,
    note: 'ลาซิโอชนะ 1-2 เข้าทุกตลาด',
  },
  {
    id: 'hist-oct-26',
    dateKey: '2026-10-26',
    dateLabel: '26 ต.ค.',
    matchTitle: 'Sevilla vs Osasuna',
    league: 'La Liga',
    predictedScore: '2-0',
    actualScore: '2-0',
    homeGoals: 2,
    awayGoals: 0,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 8.40,
    dcOdds: 1.26,
    hdp0Odds: 1.42,
    hdp05Odds: 1.82,
    over15Odds: 1.32,
    over25Odds: 1.92,
    note: 'เซบีย่าชนะ 2-0 เข้า 1X / HDP / O1.5 / CS',
  },
  {
    id: 'hist-oct-24',
    dateKey: '2026-10-24',
    dateLabel: '24 ต.ค.',
    matchTitle: 'Buriram Utd vs Bangkok Utd',
    league: 'Thai League 1',
    predictedScore: '2-0',
    actualScore: '2-0',
    homeGoals: 2,
    awayGoals: 0,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 7.50,
    dcOdds: 1.22,
    hdp0Odds: 1.34,
    hdp05Odds: 1.68,
    over15Odds: 1.26,
    over25Odds: 1.78,
    note: 'บุรีรัมย์ชนะ 2-0 เข้า 1X / HDP / O1.5 / CS',
  },
  {
    id: 'hist-oct-23',
    dateKey: '2026-10-23',
    dateLabel: '23 ต.ค.',
    matchTitle: 'Man City vs Sparta Prague',
    league: 'UEFA Champions League',
    predictedScore: '3-1',
    actualScore: '3-1',
    homeGoals: 3,
    awayGoals: 1,
    predHome: 3,
    predAway: 1,
    recommendedSide: 'HOME',
    csOdds: 10.50,
    dcOdds: 1.10,
    hdp0Odds: 1.15,
    hdp05Odds: 1.32,
    over15Odds: 1.18,
    over25Odds: 1.52,
    note: 'ชนะ 3-1 เข้าครบทุกตลาด',
  },
  {
    id: 'hist-oct-22',
    dateKey: '2026-10-22',
    dateLabel: '22 ต.ค.',
    matchTitle: 'Real Madrid vs Dortmund',
    league: 'UEFA Champions League',
    predictedScore: '2-1',
    actualScore: '2-1',
    homeGoals: 2,
    awayGoals: 1,
    predHome: 2,
    predAway: 1,
    recommendedSide: 'HOME',
    csOdds: 8.80,
    dcOdds: 1.20,
    hdp0Odds: 1.32,
    hdp05Odds: 1.62,
    over15Odds: 1.20,
    over25Odds: 1.58,
    note: 'ชนะ 2-1 เข้าครบทุกตลาด',
  },
  {
    id: 'hist-oct-21',
    dateKey: '2026-10-21',
    dateLabel: '21 ต.ค.',
    matchTitle: 'Liverpool vs Chelsea',
    league: 'Premier League',
    predictedScore: '2-1',
    actualScore: '2-1',
    homeGoals: 2,
    awayGoals: 1,
    predHome: 2,
    predAway: 1,
    recommendedSide: 'HOME',
    csOdds: 8.50,
    dcOdds: 1.24,
    hdp0Odds: 1.38,
    hdp05Odds: 1.72,
    over15Odds: 1.22,
    over25Odds: 1.64,
    note: 'ชนะ 2-1 เข้าครบทุกตลาด',
  },
  {
    id: 'hist-oct-20',
    dateKey: '2026-10-20',
    dateLabel: '20 ต.ค.',
    matchTitle: 'Inter Milan vs Roma',
    league: 'Serie A',
    predictedScore: '1-0',
    actualScore: '1-0',
    homeGoals: 1,
    awayGoals: 0,
    predHome: 1,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 6.80,
    dcOdds: 1.20,
    hdp0Odds: 1.30,
    hdp05Odds: 1.60,
    over15Odds: 1.28,
    over25Odds: 1.82,
    note: 'ชนะ 1-0 เข้า 1X / HDP / CS (ต่ำ 1.5)',
  },
  {
    id: 'hist-oct-19',
    dateKey: '2026-10-19',
    dateLabel: '19 ต.ค.',
    matchTitle: 'Arsenal vs Bournemouth',
    league: 'Premier League',
    predictedScore: '2-0',
    actualScore: '0-2',
    homeGoals: 0,
    awayGoals: 2,
    predHome: 2,
    predAway: 0,
    recommendedSide: 'HOME',
    csOdds: 7.20,
    dcOdds: 1.18,
    hdp0Odds: 1.26,
    hdp05Odds: 1.52,
    over15Odds: 1.24,
    over25Odds: 1.72,
    note: 'พลิกล็อกแพ้ 0-2 (เข้าเฉพาะ Over 1.5)',
  },
];

export function evaluateMatchAcrossStrategies(m: HistoricalMatchRecord): EvaluatedMatchRow {
  const isDraw = m.homeGoals === m.awayGoals;
  const sideWon =
    m.recommendedSide === 'HOME' ? m.homeGoals > m.awayGoals : m.awayGoals > m.homeGoals;
  const totalGoals = m.homeGoals + m.awayGoals;

  const dcOutcome: MarketOutcome = sideWon || isDraw ? 'WIN' : 'LOSS';
  const hdp0Outcome: MarketOutcome = sideWon ? 'WIN' : isDraw ? 'PUSH' : 'LOSS';
  const hdp05Outcome: MarketOutcome = sideWon ? 'WIN' : 'LOSS';
  const over15Outcome: MarketOutcome = totalGoals >= 2 ? 'WIN' : 'LOSS';
  const over25Outcome: MarketOutcome = totalGoals >= 3 ? 'WIN' : 'LOSS';
  const csOutcome: MarketOutcome =
    !m.fixtureError && m.homeGoals === m.predHome && m.awayGoals === m.predAway ? 'WIN' : 'LOSS';

  return {
    ...m,
    totalGoals,
    recommendedDcLabel: m.recommendedSide === 'HOME' ? '1X' : 'X2',
    recommendedHdpLabel: m.recommendedSide === 'HOME' ? 'ต่อเจ้าบ้าน' : 'ต่อทีมเยือน',
    outcomes: {
      dc: dcOutcome,
      over15: over15Outcome,
      over25: over25Outcome,
      hdp0: hdp0Outcome,
      hdp05: hdp05Outcome,
      cs: csOutcome,
    },
  };
}

export function getFilteredMatches(
  windowKey: TimeframeWindow,
  excludeFixtureErrors = false
): EvaluatedMatchRow[] {
  const sliceCount = windowKey === '7d' ? 7 : windowKey === '14d' ? 14 : ONE_MONTH_SETTLED_MATCHES.length;
  const subset = ONE_MONTH_SETTLED_MATCHES.slice(0, sliceCount).filter((m) =>
    excludeFixtureErrors ? !m.fixtureError : true
  );
  return subset.map(evaluateMatchAcrossStrategies);
}

const STRATEGY_META: Record<
  MarketStrategyId,
  { shortName: string; thaiName: string; marketLabel: string; description: string }
> = {
  dc: {
    shortName: '1X / X2',
    thaiName: 'Double Chance (ชนะหรือเสมอ)',
    marketLabel: 'กันเสมอได้เงิน',
    description: 'เลือกฝั่งตามโมเดล + กันเสมอ (เช่น 1X หรือ X2) ลดโอกาสตายจากผล 1-1 / 2-2',
  },
  over15: {
    shortName: 'Over 1.5',
    thaiName: 'สกอร์รวม สูงกว่า 1.5 ประตู',
    marketLabel: 'ยิงรวม ≥ 2 ลูก',
    description: 'ชนะทันทีเมื่อรวมทั้งสองฝั่งยิงได้ตั้งแต่ 2 ประตูขึ้นไป (เช่น 1-1, 2-0, 2-1, 1-4)',
  },
  over25: {
    shortName: 'Over 2.5',
    thaiName: 'สกอร์รวม สูงกว่า 2.5 ประตู',
    marketLabel: 'ยิงรวม ≥ 3 ลูก',
    description: 'ไม่ต้องสนว่าใครจะชนะ ขอแค่ยิงรวม 3 ประตูขึ้นไป — ค่าน้ำสูงช่วง @1.58–@1.95',
  },
  hdp0: {
    shortName: 'HDP 0 (DNB)',
    thaiName: 'Asian Handicap 0 (เสมอคืนทุน)',
    marketLabel: 'ต่อเสมอคืนทุน',
    description: 'ฝั่งโมเดลชนะได้เต็ม เสมอได้เงินคืน 100% แพ้จึงเสีย (ป้องกันนัดเสมอ 1-1, 2-2)',
  },
  hdp05: {
    shortName: 'HDP -0.5',
    thaiName: 'Asian Handicap -0.5 (ชนะเต็มเวลา)',
    marketLabel: 'ต่อครึ่งลูก (1X2)',
    description: 'ฝั่งโมเดลต้องชนะเท่านั้นจึงจะได้เงิน ผลเสมอหรือแพ้ถือว่าเสีย',
  },
  cs: {
    shortName: 'Correct Score',
    thaiName: 'ทายสกอร์ตรงตัว (แนวทางเดิม)',
    marketLabel: 'สกอร์เป๊ะ 1 ตัว',
    description: 'ต้องทายผลสกอร์ให้ถูกเป๊ะทุกประตู (2-0 แล้วออก 2-1 หรือ 4-0 = เสียเต็ม)',
  },
};

export function computeStrategyBacktest(
  windowKey: TimeframeWindow,
  stakePerBet = 100,
  excludeFixtureErrors = false
): {
  rows: EvaluatedMatchRow[];
  summaries: StrategySummary[];
} {
  const rowsNewestFirst = getFilteredMatches(windowKey, excludeFixtureErrors);
  const rowsChronological = [...rowsNewestFirst].reverse(); // oldest -> newest for equity & streaks

  const strategyOrder: MarketStrategyId[] = ['dc', 'over15', 'over25', 'hdp0', 'hdp05', 'cs'];

  const rawSummaries: StrategySummary[] = strategyOrder.map((id) => {
    let wins = 0;
    let pushes = 0;
    let losses = 0;
    let netProfit = 0;
    let oddsSum = 0;
    let curLossStreak = 0;
    let maxLosingStreak = 0;
    let curWinStreak = 0;
    let maxWinningStreak = 0;
    const equityCurve: number[] = [0];

    for (const row of rowsChronological) {
      const outcome = row.outcomes[id];
      const odds =
        id === 'dc'
          ? row.dcOdds
          : id === 'over15'
          ? row.over15Odds
          : id === 'over25'
          ? row.over25Odds
          : id === 'hdp0'
          ? row.hdp0Odds
          : id === 'hdp05'
          ? row.hdp05Odds
          : row.csOdds;

      oddsSum += odds;

      if (outcome === 'WIN') {
        wins += 1;
        netProfit += stakePerBet * (odds - 1);
        curWinStreak += 1;
        curLossStreak = 0;
        if (curWinStreak > maxWinningStreak) maxWinningStreak = curWinStreak;
      } else if (outcome === 'PUSH') {
        pushes += 1;
        // stake refunded, streaks stay neutral
      } else {
        losses += 1;
        netProfit -= stakePerBet;
        curLossStreak += 1;
        curWinStreak = 0;
        if (curLossStreak > maxLosingStreak) maxLosingStreak = curLossStreak;
      }

      equityCurve.push(Math.round(netProfit));
    }

    const totalMatches = rowsChronological.length;
    const settledDecisive = Math.max(1, wins + losses);
    const hitRate = Number(((wins / settledDecisive) * 100).toFixed(1));
    const rawWinPct = Number(((wins / Math.max(1, totalMatches)) * 100).toFixed(1));
    const avgOdds = Number((oddsSum / Math.max(1, totalMatches)).toFixed(2));
    const totalStaked = totalMatches * stakePerBet;
    const roiPct = Number(((netProfit / Math.max(1, totalStaked)) * 100).toFixed(1));

    const meta = STRATEGY_META[id];
    const verdictTag: StrategySummary['verdictTag'] =
      id === 'dc'
        ? 'BEST_SURVIVAL'
        : id === 'over25' || id === 'over15'
        ? 'BEST_ROI'
        : id === 'cs'
        ? 'HIGH_RISK'
        : 'BALANCED';

    return {
      id,
      shortName: meta.shortName,
      thaiName: meta.thaiName,
      marketLabel: meta.marketLabel,
      description: meta.description,
      totalMatches,
      wins,
      pushes,
      losses,
      hitRate,
      rawWinPct,
      avgOdds,
      totalStaked,
      netProfit: Math.round(netProfit),
      roiPct,
      maxLosingStreak,
      maxWinningStreak,
      equityCurve,
      verdictTag,
    };
  });

  return {
    rows: rowsNewestFirst,
    summaries: rawSummaries,
  };
}
