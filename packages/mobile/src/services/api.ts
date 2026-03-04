import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const REQUEST_TIMEOUT = 15_000; // 15 seconds
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 1000;

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  requiresAuth?: boolean;
  timeout?: number;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the auth token.
 * Returns true if refresh succeeded.
 */
async function refreshAuthToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) return false;

      const data = await response.json();
      await SecureStore.setItemAsync('auth_token', data.token);
      await SecureStore.setItemAsync('refresh_token', data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Fetch with timeout support.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Core API client with automatic token refresh, retry, and timeout.
 */
async function apiCall<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    requiresAuth = true,
    timeout = REQUEST_TIMEOUT,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (requiresAuth) {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetchWithTimeout(
        `${API_BASE_URL}${endpoint}`,
        {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        },
        timeout
      );

      // Handle 401 - attempt token refresh once
      if (response.status === 401 && requiresAuth && attempt === 0) {
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          continue; // Retry with new token
        }
        // Clear tokens if refresh failed
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        throw new Error('Sitzung abgelaufen. Bitte erneut anmelden.');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors or client errors
      if (
        lastError.message.includes('Sitzung abgelaufen') ||
        lastError.message.includes('401') ||
        lastError.message.includes('403') ||
        lastError.message.includes('404')
      ) {
        throw lastError;
      }

      // Retry with exponential backoff for network/server errors
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed');
}

// Auth
export const authApi = {
  register: (email: string, password: string, displayName?: string) =>
    apiCall<{ user: { id: string; email: string; displayName?: string }; token: string; refreshToken: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: { email, password, displayName },
        requiresAuth: false,
      }
    ),

  login: (email: string, password: string) =>
    apiCall<{ user: { id: string; email: string; displayName?: string; plan?: string }; token: string; refreshToken: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: { email, password },
        requiresAuth: false,
      }
    ),

  refresh: () =>
    apiCall<{ token: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
    }),
};

// Predictions
export const predictionsApi = {
  getToday: () =>
    apiCall<{ predictions: Array<Record<string, unknown>>; date: string }>('/predictions/today'),

  getFree: () =>
    apiCall<{ prediction: Record<string, unknown> | null; upgradeMessage?: string }>(
      '/predictions/free',
      { requiresAuth: false }
    ),

  getByMatch: (matchId: string) =>
    apiCall<{ prediction: Record<string, unknown> }>(`/predictions/${matchId}`),

  getHistory: (limit = 20, offset = 0) =>
    apiCall<{ history: Array<Record<string, unknown>> }>(
      `/predictions/history?limit=${limit}&offset=${offset}`
    ),
};

// Matches
export const matchesApi = {
  getUpcoming: (limit = 20) =>
    apiCall<{ matches: Array<Record<string, unknown>> }>(`/matches/upcoming?limit=${limit}`, {
      requiresAuth: false,
    }),

  getById: (id: string) =>
    apiCall<{ match: Record<string, unknown> }>(`/matches/${id}`, {
      requiresAuth: false,
    }),
};

// Subscriptions
export const subscriptionsApi = {
  getStatus: () =>
    apiCall<{ plan: string; status: string; features: string[] }>('/subscriptions/status'),

  getPlans: () =>
    apiCall<{ plans: Array<Record<string, unknown>> }>('/subscriptions/plans', {
      requiresAuth: false,
    }),
};

// Stats
export const statsApi = {
  getPerformance: () =>
    apiCall<{ performance: Record<string, unknown> }>('/stats/performance', {
      requiresAuth: false,
    }),
};

// Push notifications
export const pushApi = {
  registerToken: (token: string, platform: 'ios' | 'android') =>
    apiCall<{ registered: boolean }>('/push/register', {
      method: 'POST',
      body: { token, platform },
    }),

  unregisterToken: (token: string) =>
    apiCall<{ unregistered: boolean }>('/push/unregister', {
      method: 'POST',
      body: { token },
    }),
};
