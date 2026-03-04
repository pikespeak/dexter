import { create } from 'zustand';
import { Platform } from 'react-native';
import { authApi } from '../services/api';

// SecureStore wrapper — falls back to localStorage on web
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    const SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};

interface User {
  id: string;
  email: string;
  displayName?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  plan: string;
  hasCompletedOnboarding: boolean;
  favoriteLeague: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setFavoriteLeague: (league: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  plan: 'free',
  hasCompletedOnboarding: false,
  favoriteLeague: null,

  login: async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    await storage.setItem('auth_token', result.token);
    await storage.setItem('refresh_token', result.refreshToken);
    set({
      user: result.user,
      isAuthenticated: true,
      plan: result.user.plan || 'free',
    });
  },

  register: async (email: string, password: string, displayName?: string) => {
    const result = await authApi.register(email, password, displayName);
    await storage.setItem('auth_token', result.token);
    await storage.setItem('refresh_token', result.refreshToken);
    set({
      user: result.user,
      isAuthenticated: true,
      plan: 'free',
    });
  },

  logout: async () => {
    try { await storage.deleteItem('auth_token'); } catch {}
    try { await storage.deleteItem('refresh_token'); } catch {}
    set({
      user: null,
      isAuthenticated: false,
      plan: 'free',
    });
  },

  restoreSession: async () => {
    try {
      const onboarded = await storage.getItem('pikspeak_onboarded');
      const hasCompletedOnboarding = onboarded === 'true';
      const favLeague = await storage.getItem('pikspeak_favorite_league');

      const token = await storage.getItem('auth_token');
      if (token) {
        try {
          const result = await authApi.refresh();
          await storage.setItem('auth_token', result.token);
          set({ isAuthenticated: true, isLoading: false, hasCompletedOnboarding, favoriteLeague: favLeague });
        } catch {
          // Token refresh failed — clear and continue as guest
          try { await storage.deleteItem('auth_token'); } catch {}
          set({ isAuthenticated: false, isLoading: false, hasCompletedOnboarding, favoriteLeague: favLeague });
        }
      } else {
        set({ isLoading: false, hasCompletedOnboarding, favoriteLeague: favLeague });
      }
    } catch {
      // Storage completely unavailable — just proceed
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  completeOnboarding: async () => {
    try { await storage.setItem('pikspeak_onboarded', 'true'); } catch {}
    set({ hasCompletedOnboarding: true });
  },

  setFavoriteLeague: async (league: string) => {
    try { await storage.setItem('pikspeak_favorite_league', league); } catch {}
    set({ favoriteLeague: league });
  },
}));
