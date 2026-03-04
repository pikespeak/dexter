import { create } from 'zustand';
import { predictionsApi, matchesApi, statsApi } from '../services/api';

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

interface PerformanceStats {
  totalPredictions: number;
  correctPredictions: number;
  hitRate: string;
  averageProfitLoss: string;
}

interface PredictionsState {
  todaysPredictions: Prediction[];
  freePrediction: Prediction | null;
  upcomingMatches: Match[];
  performance: PerformanceStats | null;
  isLoading: boolean;
  error: string | null;

  fetchTodaysPredictions: () => Promise<void>;
  fetchFreePrediction: () => Promise<void>;
  fetchUpcomingMatches: () => Promise<void>;
  fetchPerformance: () => Promise<void>;
}

export const usePredictionsStore = create<PredictionsState>((set) => ({
  todaysPredictions: [],
  freePrediction: null,
  upcomingMatches: [],
  performance: null,
  isLoading: false,
  error: null,

  fetchTodaysPredictions: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await predictionsApi.getToday();
      set({
        todaysPredictions: result.predictions as unknown as Prediction[],
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchFreePrediction: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await predictionsApi.getFree();
      set({
        freePrediction: result.prediction as unknown as Prediction | null,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchUpcomingMatches: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await matchesApi.getUpcoming(20);
      set({
        upcomingMatches: result.matches as unknown as Match[],
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchPerformance: async () => {
    try {
      const result = await statsApi.getPerformance();
      set({ performance: result.performance as unknown as PerformanceStats });
    } catch {
      // Performance stats are non-critical
    }
  },
}));
