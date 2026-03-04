import { create } from 'zustand';
import { Platform, Share } from 'react-native';

const REFERRAL_GOAL = 3;
const REFERRAL_LINK = 'https://pikspeak.app/invite';

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
};

interface ReferralState {
  invitedCount: number;
  goal: number;
  isCompleted: boolean;
  restore: () => Promise<void>;
  shareInvite: (message: string) => Promise<void>;
  addReferral: () => Promise<void>;
}

export const useReferralStore = create<ReferralState>((set, get) => ({
  invitedCount: 0,
  goal: REFERRAL_GOAL,
  isCompleted: false,

  restore: async () => {
    try {
      const count = await storage.getItem('pikspeak_referral_count');
      if (count) {
        const n = parseInt(count, 10);
        set({ invitedCount: n, isCompleted: n >= REFERRAL_GOAL });
      }
    } catch {}
  },

  shareInvite: async (message: string) => {
    try {
      await Share.share({ message });
      // Optimistically count the share as a referral for demo purposes
      // In production, this would be tracked server-side
      const { addReferral } = get();
      await addReferral();
    } catch {}
  },

  addReferral: async () => {
    const { invitedCount } = get();
    const newCount = invitedCount + 1;
    try { await storage.setItem('pikspeak_referral_count', String(newCount)); } catch {}
    set({
      invitedCount: newCount,
      isCompleted: newCount >= REFERRAL_GOAL,
    });
  },
}));
