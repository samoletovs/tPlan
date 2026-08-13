import { normalizeLocale } from '../i18n/languages';

/**
 * Formats a date with the language currently selected in the app instead of
 * the browser default, so dates match the rest of the localized UI.
 * Invalid dates are returned unchanged (as text) rather than as "Invalid Date".
 */
export function formatDate(
  value: string | number | Date,
  locale: string | undefined | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(normalizeLocale(locale), options).format(date);
}

/** Short "12 Mar"-style label used by the dashboard charts. */
export function formatShortDate(value: string | number | Date, locale: string | undefined | null): string {
  return formatDate(value, locale, { month: 'short', day: 'numeric' });
}
