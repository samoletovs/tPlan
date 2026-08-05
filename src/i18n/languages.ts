import type { Locale } from '../types';

export interface LanguageOption {
  code: Locale;
  label: string;
}

/** All languages the app ships translations for. */
export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'lv', label: 'Latviešu' },
  { code: 'es', label: 'Español' },
];

export const SUPPORTED_LOCALES: Locale[] = LANGUAGES.map((l) => l.code);

/**
 * Normalizes an arbitrary language tag (e.g. "ru-RU", "ES") to a supported
 * locale, falling back to English when unknown.
 */
export function normalizeLocale(lng: string | undefined | null): Locale {
  const base = (lng || '').toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.find((code) => code === base) ?? 'en';
}

export function isSupportedLocale(lng: string | undefined | null): lng is Locale {
  return SUPPORTED_LOCALES.includes((lng || '') as Locale);
}
