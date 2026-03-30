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

  async function changeLanguage(code: Locale) {
    i18n.changeLanguage(code);
    setSaving(true);
    try {
      await updateUser({ locale: code });
      showSaved();
    } catch {
      // offline — language still changed locally
    } finally {
      setSaving(false);
    }
  }

  async function updatePreference(key: keyof UserPreferences, value: UserPreferences[keyof UserPreferences]) {
    if (!user) return;
    setSaving(true);
    try {
      await updateUser({
        preferences: { ...user.preferences, [key]: value },
      });
      showSaved();
    } catch {
      // silent
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
        <h2 style={{ marginBottom: 24 }}>{t('profile.title')}</h2>
        <div className="empty-state">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>{t('profile.title')}</h2>

      {/* User info */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt=""
              style={{ width: 40, height: 40, borderRadius: '50%' }}
            />
          )}
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.displayName}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>{user.email}</div>
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
          <div style={{ fontSize: '0.8125rem', color: 'var(--success)', marginTop: 8 }}>
            {t('profile.saved')}
          </div>
        )}
      </div>

      {/* Preferences */}
      {prefs && (
        <div className="card">
          <label className="label">{t('profile.preferences')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {/* Default difficulty */}
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-body)', marginBottom: 6 }}>
                {t('profile.defaultDifficulty')}
              </div>
              <div className="diff-row">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    className={`diff-btn${prefs.defaultDifficulty === d ? ` selected sel-${d}` : ''}`}
                    onClick={() => updatePreference('defaultDifficulty', d)}
                    disabled={saving}
                    aria-label={t(`workout.${d}`)}
                  >
                    {t(`workout.${d}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Rest timer toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-body)' }}>{t('profile.restTimer')}</span>
              <button
                onClick={() => updatePreference('restTimerEnabled', !prefs.restTimerEnabled)}
                disabled={saving}
                aria-label={t('profile.restTimer')}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: prefs.restTimerEnabled ? 'var(--accent)' : 'var(--bg-active)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left 0.2s',
                  left: prefs.restTimerEnabled ? 22 : 2,
                }} />
              </button>
            </div>

            {/* Sound toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-body)' }}>{t('profile.sound')}</span>
              <button
                onClick={() => updatePreference('soundEnabled', !prefs.soundEnabled)}
                disabled={saving}
                aria-label={t('profile.sound')}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: prefs.soundEnabled ? 'var(--accent)' : 'var(--bg-active)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left 0.2s',
                  left: prefs.soundEnabled ? 22 : 2,
                }} />
              </button>
            </div>

            {/* Week starts on */}
            <div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-body)', marginBottom: 6 }}>
                {t('profile.weekStartsOn')}
              </div>
              <div className="lang-switcher">
                <button
                  className={`lang-btn${prefs.weekStartsOn === 'monday' ? ' active' : ''}`}
                  onClick={() => updatePreference('weekStartsOn', 'monday')}
                  disabled={saving}
                >
                  {t('profile.monday')}
                </button>
                <button
                  className={`lang-btn${prefs.weekStartsOn === 'sunday' ? ' active' : ''}`}
                  onClick={() => updatePreference('weekStartsOn', 'sunday')}
                  disabled={saving}
                >
                  {t('profile.sunday')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick links — Programs & Schedule */}
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/app/programs" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {t('profile.managePrograms')}
          </Link>
          <Link to="/app/schedule" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t('profile.manageSchedule')}
          </Link>
        </div>
      </div>

      {/* Logout */}
      <button className="btn btn-secondary" onClick={logout} style={{ marginTop: 8 }} aria-label={t('auth.logout')}>
        {t('auth.logout')}
      </button>
    </div>
  );
}


