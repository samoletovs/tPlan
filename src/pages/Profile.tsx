import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { updateUser } from '../services/api';
import type { Locale } from '../types';

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'lv', label: 'Latviešu' },
  { code: 'es', label: 'Español' },
];

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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // offline — language still changed locally
    } finally {
      setSaving(false);
    }
  }

  const levels = user?.currentLevels;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('profile.title')}</h2>

      {/* User info */}
      {user && (
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
      )}

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

      {/* Current Levels */}
      {levels && (
        <div className="card">
          <label className="label">{t('profile.currentLevels')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <LevelRow label={t('progression.pushups')} level={levels.pushups.level} sets={levels.pushups.sets} reps={levels.pushups.reps} />
            <LevelRow label={t('progression.legRaises')} level={levels.legRaises.level} sets={levels.legRaises.sets} reps={levels.legRaises.reps} />
            <LevelRow label={t('progression.squats')} level={levels.squats.level} sets={levels.squats.sets} reps={levels.squats.reps} />
            <LevelRow label={t('progression.bridges')} level={levels.bridges.level} sets={levels.bridges.sets} reps={levels.bridges.reps} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-body)' }}>{t('progression.plank')}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{levels.plank.durationSec}s</span>
            </div>
          </div>
        </div>
      )}

      {/* Logout */}
      <button className="btn btn-secondary" onClick={logout} style={{ marginTop: 8 }}>
        {t('auth.logout')}
      </button>
    </div>
  );
}

function LevelRow({ label, level, sets, reps }: { label: string; level: number; sets: number; reps: number }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
      <span style={{ color: 'var(--text-body)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }}>
        {t('progression.level', { n: level })} · {sets}×{reps}
      </span>
    </div>
  );
}
