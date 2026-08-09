import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { LANGUAGES, SUPPORTED_LOCALES, isSupportedLocale, normalizeLocale } from '../src/i18n/languages';
import i18n from '../src/i18n';

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? flatten(value as Record<string, unknown>, path)
      : [path];
  });
}

function loadLocale(code: string): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL(`../src/i18n/${code}.json`, import.meta.url), 'utf8'));
}

function profileLanguageLabel(code: string): string {
  const profile = loadLocale(code).profile as Record<string, unknown> | undefined;
  const value = profile?.language;
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${code}.json is missing profile.language`);
  }
  return value;
}

describe('i18n — supported languages', () => {
  it('exposes all four supported locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'ru', 'lv', 'es']);
    expect(LANGUAGES.map(l => l.code)).toEqual(SUPPORTED_LOCALES);
  });

  it('gives every language a non-empty label', () => {
    for (const lang of LANGUAGES) {
      expect(lang.label.length).toBeGreaterThan(0);
    }
  });
});

describe('i18n — normalizeLocale', () => {
  it('keeps supported locales', () => {
    expect(normalizeLocale('lv')).toBe('lv');
    expect(normalizeLocale('es')).toBe('es');
  });

  it('strips region subtags and normalizes case', () => {
    expect(normalizeLocale('ru-RU')).toBe('ru');
    expect(normalizeLocale('ES')).toBe('es');
  });

  it('falls back to en for unknown or missing values', () => {
    expect(normalizeLocale('de')).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
    expect(normalizeLocale('')).toBe('en');
  });
});

describe('i18n — isSupportedLocale', () => {
  it('detects supported and unsupported locales', () => {
    expect(isSupportedLocale('lv')).toBe(true);
    expect(isSupportedLocale('de')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
  });
});

describe('i18n — runtime language changes', () => {
  it('switches translations when a supported language is selected', async () => {
    const previous = normalizeLocale(i18n.resolvedLanguage || i18n.language);
    const expectedLabel = profileLanguageLabel('ru');

    expect(expectedLabel).not.toBe(profileLanguageLabel('en'));

    try {
      await i18n.changeLanguage('ru');
      expect(i18n.resolvedLanguage).toBe('ru');
      expect(i18n.t('profile.language')).toBe(expectedLabel);
    } finally {
      await i18n.changeLanguage(previous || 'en');
    }
  });
});

describe('i18n — translation files', () => {
  const enKeys = flatten(loadLocale('en')).sort();

  for (const code of SUPPORTED_LOCALES) {
    it(`${code}.json has the same keys as en.json`, () => {
      expect(flatten(loadLocale(code)).sort()).toEqual(enKeys);
    });
  }
});
