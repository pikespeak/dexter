import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../services/api.js';

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

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  plan: 'free',

  login: async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    await SecureStore.setItemAsync('auth_token', result.token);
    await SecureStore.setItemAsync('refresh_token', result.refreshToken);
    set({
      user: result.user,
      isAuthenticated: true,
      plan: result.user.plan || 'free',
    });
  },

  register: async (email: string, password: string, displayName?: string) => {
    const result = await authApi.register(email, password, displayName);
    await SecureStore.setItemAsync('auth_token', result.token);
    await SecureStore.setItemAsync('refresh_token', result.refreshToken);
    set({
      user: result.user,
      isAuthenticated: true,
      plan: 'free',
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({
      user: null,
      isAuthenticated: false,
      plan: 'free',
    });
  },

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const result = await authApi.refresh();
        await SecureStore.setItemAsync('auth_token', result.token);
        set({ isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
