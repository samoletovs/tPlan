import { describe, it, expect } from 'vitest';
import { formatDate, formatShortDate } from '../src/utils/format';

describe('format — formatDate', () => {
  it('formats using the active app language, not the browser default', () => {
    const en = formatDate('2026-03-12', 'en', { month: 'long' });
    const ru = formatDate('2026-03-12', 'ru', { month: 'long' });
    const es = formatDate('2026-03-12', 'es', { month: 'long' });

    expect(en).toBe('March');
    expect(ru).not.toBe(en);
    expect(es).not.toBe(en);
  });

  it('normalizes region tags and unsupported languages', () => {
    expect(formatDate('2026-03-12', 'ru-RU', { month: 'long' }))
      .toBe(formatDate('2026-03-12', 'ru', { month: 'long' }));
    expect(formatDate('2026-03-12', 'de', { month: 'long' }))
      .toBe(formatDate('2026-03-12', 'en', { month: 'long' }));
  });

  it('accepts Date objects and falls back to the raw value for invalid dates', () => {
    expect(formatDate(new Date('2026-03-12T00:00:00Z'), 'en', { year: 'numeric' })).toBe('2026');
    expect(formatDate('not-a-date', 'en')).toBe('not-a-date');
  });
});

describe('format — formatShortDate', () => {
  it('renders a short month/day label per locale', () => {
    expect(formatShortDate('2026-03-12', 'en')).toMatch(/Mar/);
    expect(formatShortDate('2026-03-12', 'es')).not.toBe(formatShortDate('2026-03-12', 'en'));
  });
});
