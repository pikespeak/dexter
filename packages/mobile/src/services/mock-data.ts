/**
 * Mock data for all API endpoints.
 * Used when MOCK_MODE is active (no backend configured).
 */

// Helpers for dynamic dates relative to today
function daysFromNow(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const today = (hour: number, minute = 0) => daysFromNow(0, hour, minute);

// ─── Auth ────────────────────────────────────────────────────────────

export const mockUser = {
  id: 'mock-1',
  email: 'demo@pikspeak.app',
  displayName: 'Demo User',
  plan: 'pro',
};

export const mockTokens = {
  token: 'mock-jwt-token-abc123',
  refreshToken: 'mock-refresh-token-xyz789',
};

export const mockAuthResponse = {
  user: mockUser,
  ...mockTokens,
};

// ─── Predictions (Today) ────────────────────────────────────────────

export const mockPredictionsToday = {
  predictions: [
    {
      id: 'pred-1',
      match: {
        id: 'match-1',
        homeTeam: 'Liverpool',
        awayTeam: 'Manchester City',
        league: 'Premier League',
        kickoff: today(17, 30),
        venue: 'Anfield',
      },
      prediction: {
        homeWinProb: 45,
        drawProb: 27,
        awayWinProb: 28,
        confidence: 78,
        overUnder25: 'over',
        btts: true,
        predictedScore: '2-1',
      },
      isValueBet: true,
    },
    {
      id: 'pred-2',
      match: {
        id: 'match-2',
        homeTeam: 'Bayern München',
        awayTeam: 'Borussia Dortmund',
        league: 'Bundesliga',
        kickoff: today(18, 30),
        venue: 'Allianz Arena',
      },
      prediction: {
        homeWinProb: 55,
        drawProb: 22,
        awayWinProb: 23,
        confidence: 85,
        overUnder25: 'over',
        btts: true,
        predictedScore: '3-1',
      },
      isValueBet: true,
    },
    {
      id: 'pred-3',
      match: {
        id: 'match-3',
        homeTeam: 'FC Barcelona',
        awayTeam: 'Real Madrid',
        league: 'La Liga',
        kickoff: today(21, 0),
        venue: 'Spotify Camp Nou',
      },
      prediction: {
        homeWinProb: 40,
        drawProb: 30,
        awayWinProb: 30,
        confidence: 72,
        overUnder25: 'over',
        btts: true,
        predictedScore: '2-2',
      },
      isValueBet: true,
    },
    {
      id: 'pred-4',
      match: {
        id: 'match-4',
        homeTeam: 'Inter Milan',
        awayTeam: 'Juventus',
        league: 'Serie A',
        kickoff: today(20, 45),
        venue: 'San Siro',
      },
      prediction: {
        homeWinProb: 38,
        drawProb: 34,
        awayWinProb: 28,
        confidence: 65,
        overUnder25: 'under',
        btts: false,
        predictedScore: '1-0',
      },
      isValueBet: true,
    },
    {
      id: 'pred-5',
      match: {
        id: 'match-5',
        homeTeam: 'Paris Saint-Germain',
        awayTeam: 'Olympique Marseille',
        league: 'Ligue 1',
        kickoff: today(21, 0),
        venue: 'Parc des Princes',
      },
      prediction: {
        homeWinProb: 65,
        drawProb: 20,
        awayWinProb: 15,
        confidence: 92,
        overUnder25: 'over',
        btts: false,
        predictedScore: '3-0',
      },
      isValueBet: false,
    },
  ],
  date: new Date().toISOString().split('T')[0],
};

// ─── Free Prediction ─────────────────────────────────────────────────

export const mockFreePrediction = {
  prediction: mockPredictionsToday.predictions[0],
  upgradeMessage: 'Upgrade to Pro to unlock all 5 predictions daily, detailed analysis, and value bet alerts.',
};

// ─── Prediction Detail ───────────────────────────────────────────────

export function getMockPredictionDetail(matchId: string) {
  const pred = mockPredictionsToday.predictions.find((p) => p.match.id === matchId);
  const match = pred?.match ?? mockPredictionsToday.predictions[0].match;
  const basePred = pred?.prediction ?? mockPredictionsToday.predictions[0].prediction;

  return {
    prediction: {
      id: pred?.id ?? 'pred-detail-1',
      match,
      prediction: {
        summary: `Our model projects a competitive match between ${match.homeTeam} and ${match.awayTeam}. ${match.homeTeam}'s home advantage and recent form give them a slight edge, but ${match.awayTeam}'s defensive organization makes this a close contest.`,
        keyFactors: [
          `${match.homeTeam} unbeaten in last 8 home matches`,
          `${match.awayTeam} have conceded only 3 goals in last 5 away games`,
          'Both teams have scored in 7 of the last 10 meetings',
          'Key midfielder returned from injury for the home side',
          'Weather conditions favor attacking football',
        ],
        homeStrengths: [
          'Strong home record this season (W9 D2 L1)',
          'Top scorer in the league with 47 goals at home',
          'High pressing intensity (PPDA: 8.2)',
        ],
        awayStrengths: [
          'Best away defense in the league (12 goals conceded)',
          'Dangerous on the counter-attack (3.2 fast breaks per game)',
          'Set-piece threat — 8 goals from corners this season',
        ],
        injuries: `${match.homeTeam}: Starting CB questionable (hamstring). ${match.awayTeam}: No major injury concerns.`,
        formAnalysis: `${match.homeTeam} are in excellent form with 4 wins from their last 5 matches. ${match.awayTeam} have been solid with 3 wins, 1 draw, and 1 loss in their recent run.`,
        headToHeadInsight: `In the last 10 meetings, ${match.homeTeam} have won 4, drawn 3, and lost 3. The average total goals in these fixtures is 2.7.`,
      },
      probabilities: {
        homeWin: basePred.homeWinProb,
        draw: basePred.drawProb,
        awayWin: basePred.awayWinProb,
      },
      overUnder25: basePred.overUnder25,
      btts: basePred.btts,
      predictedScore: basePred.predictedScore,
      confidence: basePred.confidence,
      valueBets: getValueBetsForMatch(matchId),
    },
  };
}

function getValueBetsForMatch(matchId: string): Array<{
  betType: string;
  ourProbability: number;
  bestOdds: number;
  bookmaker: string;
  edge: number;
  kellyStake: number;
}> {
  const valueBetMap: Record<string, Array<{
    betType: string;
    ourProbability: number;
    bestOdds: number;
    bookmaker: string;
    edge: number;
    kellyStake: number;
  }>> = {
    'match-1': [
      { betType: '1X2_Home', ourProbability: 45, bestOdds: 2.45, bookmaker: 'Bet365', edge: 10.3, kellyStake: 4.5 },
      { betType: 'Over 2.5', ourProbability: 68, bestOdds: 1.95, bookmaker: 'Unibet', edge: 7.8, kellyStake: 3.2 },
    ],
    'match-2': [
      { betType: 'Over 2.5', ourProbability: 72, bestOdds: 1.90, bookmaker: 'Unibet', edge: 9.1, kellyStake: 5.1 },
      { betType: '1X2_Home', ourProbability: 55, bestOdds: 1.75, bookmaker: 'Betfair', edge: 3.8, kellyStake: 2.0 },
    ],
    'match-3': [
      { betType: 'BTTS', ourProbability: 70, bestOdds: 1.85, bookmaker: 'DraftKings', edge: 8.5, kellyStake: 4.0 },
      { betType: '1X2_Draw', ourProbability: 30, bestOdds: 3.80, bookmaker: 'William Hill', edge: 6.2, kellyStake: 1.8 },
    ],
    'match-4': [
      { betType: '1X2_Draw', ourProbability: 34, bestOdds: 3.40, bookmaker: 'William Hill', edge: 5.6, kellyStake: 1.5 },
      { betType: 'Under 2.5', ourProbability: 58, bestOdds: 2.05, bookmaker: 'Bet365', edge: 6.9, kellyStake: 2.8 },
    ],
    'match-5': [
      { betType: '1X2_Home', ourProbability: 65, bestOdds: 1.55, bookmaker: 'Betfair', edge: 4.2, kellyStake: 2.5 },
    ],
  };

  return valueBetMap[matchId] ?? valueBetMap['match-1'];
}

// ─── Upcoming Matches ────────────────────────────────────────────────

export const mockUpcomingMatches = {
  matches: [
    {
      id: 'upcoming-1',
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      league: 'Premier League',
      kickoff: daysFromNow(1, 15, 0),
      venue: 'Emirates Stadium',
    },
    {
      id: 'upcoming-2',
      homeTeam: 'RB Leipzig',
      awayTeam: 'Bayer Leverkusen',
      league: 'Bundesliga',
      kickoff: daysFromNow(1, 18, 30),
      venue: 'Red Bull Arena',
    },
    {
      id: 'upcoming-3',
      homeTeam: 'Atletico Madrid',
      awayTeam: 'Real Sociedad',
      league: 'La Liga',
      kickoff: daysFromNow(2, 21, 0),
      venue: 'Civitas Metropolitano',
    },
    {
      id: 'upcoming-4',
      homeTeam: 'AC Milan',
      awayTeam: 'Napoli',
      league: 'Serie A',
      kickoff: daysFromNow(2, 20, 45),
      venue: 'San Siro',
    },
    {
      id: 'upcoming-5',
      homeTeam: 'Manchester United',
      awayTeam: 'Tottenham',
      league: 'Premier League',
      kickoff: daysFromNow(3, 17, 30),
      venue: 'Old Trafford',
    },
    {
      id: 'upcoming-6',
      homeTeam: 'Olympique Lyon',
      awayTeam: 'AS Monaco',
      league: 'Ligue 1',
      kickoff: daysFromNow(3, 21, 0),
      venue: 'Groupama Stadium',
    },
    {
      id: 'upcoming-7',
      homeTeam: 'Freiburg',
      awayTeam: 'VfB Stuttgart',
      league: 'Bundesliga',
      kickoff: daysFromNow(4, 15, 30),
      venue: 'Europa-Park Stadion',
    },
    {
      id: 'upcoming-8',
      homeTeam: 'Sevilla',
      awayTeam: 'Valencia',
      league: 'La Liga',
      kickoff: daysFromNow(5, 18, 0),
      venue: 'Ramón Sánchez-Pizjuán',
    },
  ],
};

// ─── Performance Stats ───────────────────────────────────────────────

export const mockPerformance = {
  performance: {
    totalPredictions: 1247,
    correctPredictions: 854,
    hitRate: '68.5%',
    averageProfitLoss: '+12.34',
  },
};

// ─── Subscriptions ───────────────────────────────────────────────────

export const mockSubscriptionStatus = {
  plan: 'pro',
  status: 'active',
  features: ['daily_predictions', 'value_bets', 'detailed_analysis', 'push_notifications'],
};

export const mockSubscriptionPlans = {
  plans: [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: 'month',
      features: ['1 prediction per day', 'Basic match stats'],
    },
    {
      id: 'pro_monthly',
      name: 'Pro Monthly',
      price: 9.99,
      interval: 'month',
      features: ['All daily predictions', 'Value bet alerts', 'Detailed analysis', 'Push notifications'],
    },
    {
      id: 'pro_yearly',
      name: 'Pro Yearly',
      price: 79.99,
      interval: 'year',
      features: ['All daily predictions', 'Value bet alerts', 'Detailed analysis', 'Push notifications', '33% savings'],
    },
  ],
};

// ─── Push ────────────────────────────────────────────────────────────

export const mockPushRegister = { registered: true };
export const mockPushUnregister = { unregistered: true };
