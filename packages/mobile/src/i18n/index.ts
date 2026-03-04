/**
 * i18n — Lightweight internationalization
 *
 * Supports: DE, EN, FR, ES, IT
 * Detects device locale at startup.
 * User can override via settings.
 */

import { create } from 'zustand';
import { Platform, NativeModules } from 'react-native';
import { de } from './locales/de';
import { en } from './locales/en';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { it } from './locales/it';

export type Locale = 'de' | 'en' | 'fr' | 'es' | 'it';
export type TranslationKey = keyof typeof en;

const locales: Record<Locale, Record<string, string>> = { de, en, fr, es, it };

export const LOCALE_LABELS: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Fran\u00E7ais',
  es: 'Espa\u00F1ol',
  it: 'Italiano',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  de: '\uD83C\uDDE9\uD83C\uDDEA',
  en: '\uD83C\uDDEC\uD83C\uDDE7',
  fr: '\uD83C\uDDEB\uD83C\uDDF7',
  es: '\uD83C\uDDEA\uD83C\uDDF8',
  it: '\uD83C\uDDEE\uD83C\uDDF9',
};

// Storage wrapper — localStorage on web, SecureStore on native
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

function getDeviceLocale(): Locale {
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
    const code = nav.substring(0, 2).toLowerCase();
    return (code in locales) ? code as Locale : 'en';
  }
  let deviceLang = 'en';
  if (Platform.OS === 'ios') {
    deviceLang = NativeModules.SettingsManager?.settings?.AppleLocale
      || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      || 'en';
  } else {
    deviceLang = NativeModules.I18nManager?.localeIdentifier || 'en';
  }
  const code = deviceLang.substring(0, 2).toLowerCase();
  return (code in locales) ? code as Locale : 'en';
}

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  restoreLocale: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const useI18n = create<I18nState>((set, get) => ({
  locale: getDeviceLocale(),

  setLocale: async (locale: Locale) => {
    set({ locale });
    try { await storage.setItem('pikspeak_locale', locale); } catch {}
  },

  restoreLocale: async () => {
    try {
      const stored = await storage.getItem('pikspeak_locale');
      if (stored && stored in locales) {
        set({ locale: stored as Locale });
      }
    } catch {
      // Use default
    }
  },

  t: (key: string, params?: Record<string, string | number>): string => {
    const { locale } = get();
    let text = locales[locale]?.[key] || locales.en[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{{${k}}}`, String(v));
      }
    }
    return text;
  },
}));
