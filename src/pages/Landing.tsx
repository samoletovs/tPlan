import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { t } = useTranslation();
  const { login, principal, loading } = useAuth();

  useEffect(() => {
    if (principal) {
      window.location.href = '/app';
    }
  }, [principal]);

  if (loading) {
    return (
      <div className="landing">
        <div className="skeleton" style={{ width: 120, height: 20 }} />
      </div>
    );
  }

  if (principal) {
    return null;
  }

  return (
    <div className="landing">
      <div className="lab-badge">{t('landing.labBadge')}</div>

      <h1>
        {t('landing.hero')}
      </h1>
      <p>
        {t('landing.description')}
      </p>

      {/* How it works — 3 steps */}
      <div style={{
        display: 'flex', gap: 32, margin: '32px 0', width: '100%', maxWidth: 560, justifyContent: 'center',
      }}>
        {[
          { step: '1', label: t('landing.step1') },
          { step: '2', label: t('landing.step2') },
          { step: '3', label: t('landing.step3') },
        ].map(({ step, label }) => (
          <div key={step} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-bg)',
              color: 'var(--accent)', fontWeight: 600, fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px',
            }}>
              {step}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-body)', fontWeight: 500 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <h3>{t('landing.features.bookToProgram')}</h3>
          <p>{t('landing.features.bookToProgramDesc')}</p>
        </div>
        <div className="feature-card">
          <h3>{t('landing.features.progression')}</h3>
          <p>{t('landing.features.progressionDesc')}</p>
        </div>
        <div className="feature-card">
          <h3>{t('landing.features.tracking')}</h3>
          <p>{t('landing.features.trackingDesc')}</p>
        </div>
        <div className="feature-card">
          <h3>{t('landing.features.dynamic')}</h3>
          <p>{t('landing.features.dynamicDesc')}</p>
        </div>
      </div>

      <button className="btn btn-primary" onClick={login} style={{ maxWidth: 280 }}>
        {t('auth.login')}
      </button>

      <div style={{ marginTop: 48, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
        tplan.naurolabs.com
      </div>
    </div>
  );
}
