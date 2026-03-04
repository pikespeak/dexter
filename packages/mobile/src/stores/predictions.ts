import { create } from 'zustand';
import { predictionsApi, matchesApi, statsApi } from '../services/api.js';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  venue?: string;
  status?: string;
}

interface Prediction {
  id: string;
  match: Match;
  prediction: {
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    overUnder25?: string;
    btts?: boolean;
    predictedScore?: string;
    confidence: number;
    details?: Record<string, unknown>;
  };
}

interface PredictionsState {
  todaysPredictions: Prediction[];
  upcomingMatches: Match[];
  performance: {
    totalPredictions: number;
    correctPredictions: number;
    hitRate: string;
    averageProfitLoss: string;
  } | null;
  isLoading: boolean;
  error: string | null;

  fetchTodaysPredictions: () => Promise<void>;
  fetchFreePrediction: () => Promise<Prediction | null>;
  fetchUpcomingMatches: () => Promise<void>;
  fetchPerformance: () => Promise<void>;
}

export const usePredictionsStore = create<PredictionsState>((set) => ({
  todaysPredictions: [],
  upcomingMatches: [],
  performance: null,
  isLoading: false,
  error: null,

  fetchTodaysPredictions: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await predictionsApi.getToday();
      set({ todaysPredictions: result.predictions, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchFreePrediction: async () => {
    try {
      const result = await predictionsApi.getFree();
      return result.prediction;
    } catch {
      return null;
    }
  },

  fetchUpcomingMatches: async () => {
    set({ isLoading: true });
    try {
      const result = await matchesApi.getUpcoming(20);
      set({ upcomingMatches: result.matches, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchPerformance: async () => {
    try {
      const result = await statsApi.getPerformance();
      set({ performance: result.performance });
    } catch {
      // Performance stats are non-critical
    }
  },
}));
