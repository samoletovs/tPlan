import { useTranslation } from 'react-i18next';
import { LANGUAGES, normalizeLocale } from '../i18n/languages';
import type { Locale } from '../types';

interface LanguageSwitcherProps {
  /** Called after the UI language changed — e.g. to persist it on the server. */
  onChange?: (locale: Locale) => void;
  disabled?: boolean;
}

export default function LanguageSwitcher({ onChange, disabled = false }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const active = normalizeLocale(i18n.resolvedLanguage || i18n.language);

  async function select(code: Locale) {
    if (code === active) return;

    await i18n.changeLanguage(code);
    onChange?.(code);
  }

  return (
    <div className="lang-switcher" role="group" aria-label={t('profile.language')}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`lang-btn${active === lang.code ? ' active' : ''}`}
          onClick={() => void select(lang.code)}
          disabled={disabled}
          aria-pressed={active === lang.code}
          aria-label={lang.label}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
