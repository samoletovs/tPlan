import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LOCALE,
  LANGUAGE_NAMES,
  SUPPORTED_LOCALES,
  localeFromAcceptLanguage,
  normalizeLocale,
  resolveLocale,
  t,
} from '../api/src/i18n';

const GENERATED_KEYS = [
  'day.0',
  'day.6',
  'warmup.name',
  'warmup.1.text',
  'warmup.5.desc',
  'cooldown.name',
  'cooldown.7.text',
  'meta.hold',
  'meta.set',
  'technique.tempo',
  'workout.restDay',
  'error.userNotFound',
  'error.noSchedule',
];

describe('api i18n — locales', () => {
  it('supports the same locales as the client', () => {
    expect([...SUPPORTED_LOCALES]).toEqual(['en', 'ru', 'lv', 'es']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('names every locale for the AI prompt', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LANGUAGE_NAMES[locale].length).toBeGreaterThan(0);
    }
  });
});

describe('api i18n — normalizeLocale', () => {
  it('strips region subtags and normalizes case', () => {
    expect(normalizeLocale('ru-RU')).toBe('ru');
    expect(normalizeLocale('ES')).toBe('es');
  });

  it('falls back to en for unknown or non-string values', () => {
    expect(normalizeLocale('de')).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
    expect(normalizeLocale(42)).toBe('en');
  });
});

describe('api i18n — localeFromAcceptLanguage', () => {
  it('picks the highest-quality supported language', () => {
    expect(localeFromAcceptLanguage('de-DE,de;q=0.9,lv;q=0.8,en;q=0.5')).toBe('lv');
  });

  it('handles a simple header', () => {
    expect(localeFromAcceptLanguage('ru-RU')).toBe('ru');
  });

  it('returns null when nothing matches', () => {
    expect(localeFromAcceptLanguage('de,fr;q=0.8')).toBeNull();
    expect(localeFromAcceptLanguage('')).toBeNull();
    expect(localeFromAcceptLanguage(undefined)).toBeNull();
  });

  it('ignores languages explicitly refused with q=0', () => {
    expect(localeFromAcceptLanguage('es;q=0, de')).toBeNull();
  });
});

describe('api i18n — resolveLocale', () => {
  it('prefers the saved user locale', () => {
    expect(resolveLocale('lv', 'ru')).toBe('lv');
  });

  it('falls back to the Accept-Language header', () => {
    expect(resolveLocale(undefined, 'es-ES,es;q=0.9')).toBe('es');
    expect(resolveLocale('de', 'ru')).toBe('ru');
  });

  it('falls back to English when nothing is known', () => {
    expect(resolveLocale(undefined, undefined)).toBe('en');
  });
});

describe('api i18n — t', () => {
  // A missing key falls back to English, so "differs from English" is used here
  // as the signal that a translation is actually present. None of the sampled
  // strings are identical across these four languages.
  it('translates generated workout content into every locale', () => {
    for (const key of GENERATED_KEYS) {
      const english = t('en', key);
      expect(english).not.toBe(key);
      for (const locale of SUPPORTED_LOCALES) {
        const value = t(locale, key);
        expect(value.length).toBeGreaterThan(0);
        if (locale !== 'en') expect(value).not.toBe(english);
      }
    }
  });

  it('interpolates parameters', () => {
    expect(t('en', 'meta.set', { level: 5, set: 1, total: 2 })).toBe('Level 5 · Set 1 of 2');
    expect(t('ru', 'meta.set', { level: 5, set: 1, total: 2 })).toBe('Уровень 5 · Подход 1 из 2');
    expect(t('es', 'meta.hold', { seconds: 30 })).toBe('Mantener · 30 s');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(t('en', 'meta.hold')).toBe('Hold · {{seconds}}s');
  });

  it('falls back to English, then to the key itself', () => {
    expect(t('lv', 'unknown.key')).toBe('unknown.key');
  });

  it('localizes day names', () => {
    expect(t('en', 'day.1')).toBe('Monday');
    expect(t('ru', 'day.1')).toBe('Понедельник');
    expect(t('lv', 'day.1')).toBe('Pirmdiena');
    expect(t('es', 'day.1')).toBe('Lunes');
  });
});
