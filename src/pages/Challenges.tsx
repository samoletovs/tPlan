import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Challenge } from '../types';

export default function Challenges() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as 'en' | 'ru' | 'lv' | 'es';
  const [challenges] = useState<Challenge[]>([]);
  const loading = false;

  if (loading) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>{t('challenges.title')}</h2>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>{t('challenges.title')}</h2>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px' }}>
          {t('challenges.create')}
        </button>
      </div>

      {challenges.length === 0 ? (
        <div className="empty-state">
          <p>{t('challenges.noActive')}</p>
        </div>
      ) : (
        challenges.map(c => (
          <div key={c.id} className="card">
            <h3>{c.title[locale] || c.title.en}</h3>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {t(`challenges.${c.type}`)} &middot; {c.participants.length} {t('challenges.participants').toLowerCase()}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
              {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
