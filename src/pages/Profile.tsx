import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateUser } from '../services/api';
import type { Locale, UserPreferences } from '../types';

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];

const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeLanguage(code: Locale) {
    i18n.changeLanguage(code);
    setSaving(true);
    setError(null);
    try {
      await updateUser({ locale: code });
      showSaved();
    } catch {
      setError(t('error.apiError'));
    } finally {
      setSaving(false);
    }
  }

  async function updatePreference(key: keyof UserPreferences, value: UserPreferences[keyof UserPreferences]) {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateUser({
        preferences: { ...user.preferences, [key]: value },
      });
      showSaved();
    } catch {
      setError(t('error.apiError'));
    } finally {
      setSaving(false);
    }
  }

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const prefs = user?.preferences;

  if (!user) {
    return (
      <div>
        <h2 className="mb-lg">{t('profile.title')}</h2>
        <div className="empty-state">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-lg">{t('profile.title')}</h2>

      {error && <div className="error-toast mb-sm">{error}</div>}

      {/* User info */}
      <div className="card">
        <div className="flex gap-md items-center">
          {user.avatarUrl && (
            <img src={user.avatarUrl} alt={user.displayName} className="avatar" />
          )}
          <div>
            <div className="font-medium text-primary">{user.displayName}</div>
            <div className="text-sm text-tertiary">{user.email}</div>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="card">
        <label className="label">{t('profile.language')}</label>
        <div className="lang-switcher">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`lang-btn${i18n.language === lang.code ? ' active' : ''}`}
              onClick={() => changeLanguage(lang.code)}
              disabled={saving}
              aria-label={lang.label}
            >
              {lang.label}
            </button>
          ))}
        </div>
        {saved && (
          <div className="saved-indicator">
            {t('profile.saved')}
          </div>
        )}
      </div>

      {/* Preferences */}
      {prefs && (
        <div className="card">
          <label className="label">{t('profile.preferences')}</label>
          <div className="flex-col gap-md mt-sm">
            {/* Default difficulty */}
            <div>
              <div className="pref-sublabel">{t('profile.defaultDifficulty')}</div>
              <div className="diff-row" role="group" aria-label={t('profile.defaultDifficulty')}>
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    className={`diff-btn${prefs.defaultDifficulty === d ? ` selected sel-${d}` : ''}`}
                    onClick={() => updatePreference('defaultDifficulty', d)}
                    disabled={saving}
                    aria-pressed={prefs.defaultDifficulty === d}
                    aria-label={t(`workout.${d}`)}
                  >
                    {t(`workout.${d}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Rest timer toggle */}
            <div className="pref-row">
              <span className="pref-label">{t('profile.restTimer')}</span>
              <button
                className={`toggle-track${prefs.restTimerEnabled ? ' on' : ''}`}
                onClick={() => updatePreference('restTimerEnabled', !prefs.restTimerEnabled)}
                disabled={saving}
                role="switch"
                aria-checked={prefs.restTimerEnabled}
                aria-label={t('profile.restTimer')}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            {/* Sound toggle */}
            <div className="pref-row">
              <span className="pref-label">{t('profile.sound')}</span>
              <button
                className={`toggle-track${prefs.soundEnabled ? ' on' : ''}`}
                onClick={() => updatePreference('soundEnabled', !prefs.soundEnabled)}
                disabled={saving}
                role="switch"
                aria-checked={prefs.soundEnabled}
                aria-label={t('profile.sound')}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            {/* Week starts on */}
            <div>
              <div className="pref-sublabel">{t('profile.weekStartsOn')}</div>
              <div className="lang-switcher">
                <button
                  className={`lang-btn${prefs.weekStartsOn === 'monday' ? ' active' : ''}`}
                  onClick={() => updatePreference('weekStartsOn', 'monday')}
                  disabled={saving}
                  aria-label={t('profile.monday')}
                >
                  {t('profile.monday')}
                </button>
                <button
                  className={`lang-btn${prefs.weekStartsOn === 'sunday' ? ' active' : ''}`}
                  onClick={() => updatePreference('weekStartsOn', 'sunday')}
                  disabled={saving}
                  aria-label={t('profile.sunday')}
                >
                  {t('profile.sunday')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick links -- Programs & Schedule */}
      <div className="card">
        <div className="flex-col gap-sm">
          <Link to="/app/programs" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="icon-sm">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {t('profile.managePrograms')}
          </Link>
          <Link to="/app/schedule" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="icon-sm">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t('profile.manageSchedule')}
          </Link>
        </div>
      </div>

      {/* Logout */}
      <button className="btn btn-secondary mt-sm" onClick={logout} aria-label={t('auth.logout')}>
        {t('auth.logout')}
      </button>
    </div>
  );
}


