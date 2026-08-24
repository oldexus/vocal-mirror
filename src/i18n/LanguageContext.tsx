/**
 * VocalMirror — LanguageContext & Provider
 * 
 * Zero-dependency, type-safe React Context for bilingual localization (EN / JA).
 * Handles:
 * - Auto-detection from navigator.language
 * - Default language prop override
 * - Persistence to localStorage ('vocal_mirror_lang') with quota error resilience
 * - DOM synchronization (document.documentElement.lang & document.title)
 * - Dot-notation key resolution & template parameter interpolation
 * - React Hooks (useTranslation, useLanguage) with boundary protection
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { en } from './locales/en';
import { ja } from './locales/ja';
import { interpolate } from './interpolate';
import type { Language, TranslationDictionary } from './types';

const STORAGE_KEY = 'vocal_mirror_lang';

const DICTIONARIES: Record<Language, TranslationDictionary> = {
  en,
  ja,
};

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isJapanese: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  dict: TranslationDictionary;
}

export interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function resolveInitialLanguage(defaultLanguage?: Language): Language {
  if (defaultLanguage === 'en' || defaultLanguage === 'ja') {
    return defaultLanguage;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'ja') {
        return stored;
      }
    }
  } catch {
    // Gracefully handle storage quota or private browsing mode errors
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    if (navigator.language.toLowerCase().startsWith('ja')) {
      return 'ja';
    }
  }

  return 'en';
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  defaultLanguage,
}) => {
  const [language, setLanguageState] = useState<Language>(() =>
    resolveInitialLanguage(defaultLanguage)
  );

  // Synchronize state if defaultLanguage prop changes on rerender
  useEffect(() => {
    if (defaultLanguage === 'en' || defaultLanguage === 'ja') {
      setLanguageState(defaultLanguage);
    }
  }, [defaultLanguage]);

  const dict = useMemo(() => DICTIONARIES[language] || DICTIONARIES.en, [language]);

  const setLanguage = useCallback((lang: Language) => {
    if (lang === 'en' || lang === 'ja') {
      setLanguageState(lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'ja' ? 'en' : 'ja'));
  }, []);

  const isJapanese = language === 'ja';

  // Synchronize localStorage and document DOM attributes
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, language);
      }
    } catch {
      // Storage quota or private browsing resilience
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      if (dict && dict.app && dict.app.title) {
        document.title = dict.app.title;
      }
    }
  }, [language, dict]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      if (!key || typeof key !== 'string') {
        return '';
      }

      const parts = key.split('.');
      let current: any = dict;

      for (const part of parts) {
        if (
          current === null ||
          current === undefined ||
          typeof current !== 'object' ||
          part === '__proto__' ||
          part === 'constructor' ||
          part === 'prototype' ||
          !Object.prototype.hasOwnProperty.call(current, part)
        ) {
          current = undefined;
          break;
        }
        current = current[part];
      }

      if (typeof current === 'string') {
        return interpolate(current, params);
      }

      return key;
    },
    [dict]
  );

  const contextValue = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      isJapanese,
      t,
      dict,
    }),
    [language, setLanguage, toggleLanguage, isJapanese, t, dict]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
