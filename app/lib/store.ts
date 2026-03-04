import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatMessage } from "./types";

interface AppState {
  // Settings
  serverUrl: string;
  apiKey: string;
  language: "en" | "de";

  // Onboarding
  hasCompletedOnboarding: boolean;

  // Watchlist & Search
  watchlist: string[];
  recentSearches: string[];

  // Chat
  chatMessages: ChatMessage[];

  // Connection
  isOnline: boolean;

  // Hydration
  _hasHydrated: boolean;

  // Actions
  setServerUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setLanguage: (lang: "en" | "de") => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  addToWatchlist: (ticker: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  isInWatchlist: (ticker: string) => boolean;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  setChatMessages: (msgs: ChatMessage[]) => void;
  clearChat: () => void;
  setIsOnline: (online: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

const MAX_CHAT_MESSAGES = 100;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Defaults
      serverUrl: "http://localhost:3000/api/v1",
      apiKey: "",
      language: "en",
      hasCompletedOnboarding: false,
      watchlist: [],
      recentSearches: [],
      chatMessages: [],
      isOnline: true,
      _hasHydrated: false,

      // Actions
      setServerUrl: (url) => set({ serverUrl: url }),
      setApiKey: (key) => set({ apiKey: key }),
      setLanguage: (lang) => set({ language: lang }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),

      addToWatchlist: (ticker) => {
        const upper = ticker.toUpperCase();
        const { watchlist } = get();
        if (!watchlist.includes(upper)) {
          set({ watchlist: [...watchlist, upper] });
        }
      },
      removeFromWatchlist: (ticker) => {
        const upper = ticker.toUpperCase();
        set({ watchlist: get().watchlist.filter((t) => t !== upper) });
      },
      isInWatchlist: (ticker) =>
        get().watchlist.includes(ticker.toUpperCase()),

      addRecentSearch: (query) => {
        const upper = query.toUpperCase();
        const { recentSearches } = get();
        const filtered = recentSearches.filter((s) => s !== upper);
        set({ recentSearches: [upper, ...filtered].slice(0, 10) });
      },
      clearRecentSearches: () => set({ recentSearches: [] }),

      addChatMessage: (msg) => {
        const { chatMessages } = get();
        const updated = [...chatMessages, msg].slice(-MAX_CHAT_MESSAGES);
        set({ chatMessages: updated });
      },
      setChatMessages: (msgs) => set({ chatMessages: msgs.slice(-MAX_CHAT_MESSAGES) }),
      clearChat: () => set({ chatMessages: [] }),

      setIsOnline: (online) => set({ isOnline: online }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "dexter-app-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        serverUrl: state.serverUrl,
        apiKey: state.apiKey,
        language: state.language,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        watchlist: state.watchlist,
        recentSearches: state.recentSearches,
        chatMessages: state.chatMessages,
      }),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ _hasHydrated: true });
      },
    }
  )
);
