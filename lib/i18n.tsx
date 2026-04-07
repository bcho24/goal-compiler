'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import en from '@/locales/en.json';
import ptPT from '@/locales/pt-PT.json';
import es from '@/locales/es.json';
import ko from '@/locales/ko.json';
import ja from '@/locales/ja.json';
import zhCN from '@/locales/zh-CN.json';
import zhTW from '@/locales/zh-TW.json';

export const LOCALES = ['en', 'pt-PT', 'es', 'ko', 'ja', 'zh-CN', 'zh-TW'] as const;
export type Locale = (typeof LOCALES)[number];

/** Labels shown in the language selector (native full names). */
export const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'pt-PT', label: 'Português (Portugal)' },
  { value: 'es', label: 'Español' },
  { value: 'ko', label: '한국어' },
  { value: 'ja', label: '日本語' },
  { value: 'zh-CN', label: '中文（简体）' },
  { value: 'zh-TW', label: '中文（繁體）' },
];

export function getLocaleLabel(locale: Locale): string {
  const found = LOCALE_OPTIONS.find((o) => o.value === locale);
  return found?.label ?? locale;
}

const locales: Record<Locale, Record<string, unknown>> = {
  en,
  'pt-PT': ptPT,
  es,
  ko,
  ja,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

const STORAGE_KEY = 'gte-locale';

const LOCALE_SET = new Set<string>(LOCALES);

function normalizeStoredLocale(raw: string | null): Locale | null {
  if (raw == null || raw === '') return null;
  if (raw === 'zh') return 'zh-CN';
  if (LOCALE_SET.has(raw)) return raw as Locale;
  return null;
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh-CN');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = normalizeStoredLocale(raw);
    if (raw === 'zh' && saved === 'zh-CN') {
      localStorage.setItem(STORAGE_KEY, 'zh-CN');
    }
    if (saved) setLocaleState(saved);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let value = getNestedValue(locales[locale], key);
      if (value == null && locale !== 'en') {
        value = getNestedValue(locales.en, key);
      }
      if (value == null) return key;
      return vars ? interpolate(value, vars) : value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
