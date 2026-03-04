import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  requiresAuth?: boolean;
}

/**
 * Core API client for communicating with the PiksPeak backend.
 */
async function apiCall<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, requiresAuth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Auth
export const authApi = {
  register: (email: string, password: string, displayName?: string) =>
    apiCall<{ user: any; token: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
      requiresAuth: false,
    }),

  login: (email: string, password: string) =>
    apiCall<{ user: any; token: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
      requiresAuth: false,
    }),

  refresh: () =>
    apiCall<{ token: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
    }),
};

// Predictions
export const predictionsApi = {
  getToday: () =>
    apiCall<{ predictions: any[]; date: string }>('/predictions/today'),

  getFree: () =>
    apiCall<{ prediction: any; upgradeMessage?: string }>('/predictions/free', {
      requiresAuth: false,
    }),

  getByMatch: (matchId: string) =>
    apiCall<{ prediction: any }>(`/predictions/${matchId}`),

  getHistory: (limit = 20, offset = 0) =>
    apiCall<{ history: any[] }>(`/predictions/history?limit=${limit}&offset=${offset}`),
};

// Matches
export const matchesApi = {
  getUpcoming: (limit = 20) =>
    apiCall<{ matches: any[] }>(`/matches/upcoming?limit=${limit}`, {
      requiresAuth: false,
    }),

  getById: (id: string) =>
    apiCall<{ match: any }>(`/matches/${id}`, {
      requiresAuth: false,
    }),
};

// Subscriptions
export const subscriptionsApi = {
  getStatus: () =>
    apiCall<{ plan: string; status: string; features: string[] }>('/subscriptions/status'),

  getPlans: () =>
    apiCall<{ plans: any[] }>('/subscriptions/plans', {
      requiresAuth: false,
    }),
};

// Stats
export const statsApi = {
  getPerformance: () =>
    apiCall<{ performance: any }>('/stats/performance', {
      requiresAuth: false,
    }),
};
