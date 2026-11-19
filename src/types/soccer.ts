export interface XgBreakdown {
  home: number;
  away: number;
}

export interface MatchEvent {
  id: string;
  minute: number;
  type: 'GOAL' | 'YELLOW' | 'RED' | 'SUB' | 'VAR';
  team: 'home' | 'away';
  player: string;
  detail?: string;
  xgValue?: number;
}

export interface CorrectScorePrediction {
  score: string; // e.g. "2-1"
  homeGoals: number;
  awayGoals: number;
  rawProbability: number; // Raw Poisson %
  calibratedProbability: number; // After Platt Scaling & Isotonic %
  odds1xBet: number; // Decimal odds e.g. 8.50
  expectedValue: number; // EV % e.g. +14.2%
  isValueBet: boolean; // True if EV > 0
  rank: number;
}

export interface MatchStats {
  possession: [number, number]; // [home%, away%]
  shots: [number, number];
  shotsOnTarget: [number, number];
  dangerousAttacks: [number, number];
  corners: [number, number];
  fouls: [number, number];
  runningXg: Array<{ minute: number; homeXg: number; awayXg: number }>;
}

export interface TeamInfo {
  name: string;
  shortName: string;
  code: string;
  logo: string;
  color: string;
  form: string[]; // e.g. ['W', 'W', 'D', 'W', 'L']
}

export interface Match {
  id: string;
  league: string;
  leagueFlag: string;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  minute?: number;
  homeScore?: number;
  awayScore?: number;
  penaltyScore?: { home: number; away: number };
  kickoffTime: string; // e.g. "20:00" or "Live"
  venue: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  
  // Multi-source xG
  understatXg: XgBreakdown;
  optaXg: XgBreakdown;
  fbrefXg: XgBreakdown;
  synthesizedXg: XgBreakdown; // Blended master xG

  // 1xBet bookmaker odds
  odds1xBet: {
    homeWin: number;
    draw: number;
    awayWin: number;
    over25: number;
    under25: number;
    bttsYes: number;
    bttsNo: number;
    correctScores: Record<string, number>;
  };

  // Correct Score Tips & Predictions
  predictions: CorrectScorePrediction[];

  // Calibration metrics (< 5% error)
  calibration: {
    brierScore: number; // e.g. 0.082
    expectedCalibrationError: number; // e.g. 3.4% (< 5%)
    confidenceIndex: number; // e.g. 88%
    plattAlpha: number;
    plattBeta: number;
  };

  events: MatchEvent[];
  stats: MatchStats;

  // AI Tactical breakdown (Gemini generated or cached)
  aiSummary?: {
    headline: string;
    tacticalReasoning: string;
    keyFactors: string[];
    topPick: string;
    safeAlternative: string;
    oneXbetInsight: string;
  };
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  time: string;
  text: string;
  tipShare?: {
    matchId: string;
    matchTitle: string;
    score: string;
    odds: number;
    confidence: number;
  };
  reactions: {
    fire: number;
    ball: number;
    target: number;
    claps: number;
  };
  isVerifiedTipster?: boolean;
}

export interface BetSlipItem {
  id: string;
  matchId: string;
  matchTitle: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  betType: 'ASIAN_HANDICAP' | 'CORRECT_SCORE' | 'OVER_UNDER' | '1X2';
  selection: string; // e.g. "Vasco da Gama -0.5" or "Correct Score 2-1"
  odds: number;
  stake: number;
  potentialReturn: number;
  calibratedProb: number;
  isValueBet: boolean;
}

export interface GoalAlert {
  id: string;
  matchId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  scoringTeam: 'home' | 'away';
  teamName: string;
  teamLogo: string;
  player: string;
  minute: number;
  newScore: string;
  timestamp: number;
}

export interface TacticalBlindSpot {
  tag: string;
  title: string;
  description: string;
  impactLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface BlindSpotAudit {
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  scoreTrueProbability: number; // e.g. 13.9%
  consensusClarification: string;
  summary: string;
  tacticalBlindSpots: TacticalBlindSpot[];
  modelLimitations: string[];
  recommendedHedges: {
    market: string;
    selection: string;
    odds: number;
    reason: string;
    hedgeRatio: string;
  }[];
}

export interface AsianHandicapPick {
  selection: string;      // e.g. "Vasco da Gama -0.5"
  teamSide: 'HOME' | 'AWAY';
  line: number;           // e.g. -0.5, -0.75, -0.25, 0
  lineLabel: string;      // e.g. "-0.5 (ต่อครึ่งลูก)"
  odds: number;           // e.g. 1.68
  coverProbability: number; // e.g. 68.5 (%)
  expectedValue: number;  // e.g. +15.1 (%)
  xgGap: number;          // e.g. +0.89
  winRuleThai: string;    // e.g. "ชนะ 1 ลูกขึ้นไป กินเต็ม 100%"
  backupAlternative: string;
}

export interface DailySuperPick {
  id: string;
  matchId: string;
  matchTitle: string;
  league: string;
  kickoffTime: string;
  venue: string;
  dateText: string;
  badge: string; // e.g. "SUPER LOCK 96.8%"
  consensusRate: number; // e.g. 96.8% (> 95%)
  sourceBreakdown: {
    understat: number;
    opta: number;
    fbref: number;
    dixonColes: number;
  };
  primaryScore: string;
  primaryOdds: number;
  expectedValue: number;
  backupScore: string;
  backupOdds: number;
  safeOption: string;
  calibrationError: number;
  brierScore: number;
  isRealMatchTonight: boolean;
  homeTeam: {
    name: string;
    code: string;
    logo: string;
    color: string;
    form: string[];
    expectedGoals: number;
  };
  awayTeam: {
    name: string;
    code: string;
    logo: string;
    color: string;
    form: string[];
    expectedGoals: number;
  };
  analysisRationale: string;
  keyReasons: string[];
  bookingCode1xBet: string;
  asianHandicap?: AsianHandicapPick;
  blindSpotAudit?: BlindSpotAudit;
  tenSourceConsensus?: TenSourceConsensusAudit;
  slipNumber?: string;
  isSettled?: boolean;
  settledResult?: 'WIN' | 'LOSS' | 'PUSH';
  settledScore?: string;
  settledNotes?: string;
}

export interface AnalyticalSourcePrediction {
  id: string;
  name: string;
  institution: string;
  badge: string;
  predictedScore: string;
  confidence: number;
  weightPercent: number;
  concurrence: boolean;
  statusLabel: 'เห็นพ้องตรงกัน 100%' | 'เห็นพ้อง (อยู่ในกรอบ)' | 'เห็นต่าง';
  tacticalPoint: string;
}

export interface ConsensusFactorAudit {
  name: string;
  category: string;
  score: number; // e.g. 98.4%
  passed: boolean; // >= 98.0
  detail: string;
}

export interface GlobalConsensusAudit {
  totalSources: number; // 25
  concurringCount: number; // e.g. 25
  agreementPercentage: number; // e.g. 98.6
  thresholdRequired: number; // 98.0
  isCertifiedSuperPick: boolean; // true if >= 98.0
  certificationBadge: string;
  consensusScore: string;
  odds1xBet: number; // e.g. 7.50
  slipNumber?: string; // e.g. "№ 89762433405"
  sources: AnalyticalSourcePrediction[];
  factorAudits?: ConsensusFactorAudit[];
  rigorousRiskReductionAnalysis: string;
  disqualificationReason?: string;
}

export type TenSourceConsensusAudit = GlobalConsensusAudit;

export interface PastPickHistory {
  id: string;
  date: string;
  matchTitle: string;
  league: string;
  predictedScore: string;
  actualScore: string;
  odds: number;
  consensusScore: number;
  result: 'WIN' | 'LOSS';
}

export interface LiveStreamChannel {
  id: string;
  matchId: string;
  title: string;
  league: string;
  status: 'LIVE' | 'STANDBY' | 'ENDED';
  viewersCount: number;
  quality: string;
  commentaryLanguage: 'TH' | 'EN';
  videoSources: {
    label: string;
    url: string;
    type: 'mp4' | 'hls' | 'youtube' | 'canvas' | 'onexbet' | 'real_stream';
    description?: string;
  }[];
  embedUrl?: string;
  matchMinute?: number;
  homeScore?: number;
  awayScore?: number;
  homeTeam: {
    name: string;
    code: string;
    color: string;
    logo: string;
  };
  awayTeam: {
    name: string;
    code: string;
    color: string;
    logo: string;
  };
  inPlayOdds?: {
    nextGoalHome: number;
    noMoreGoals: number;
    nextGoalAway: number;
    favCorrectScore: string;
    favCorrectScoreOdds: number;
  };
}

