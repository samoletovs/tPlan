import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

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

      <LanguageSwitcher />

      <h1>
        {t('landing.hero')}
      </h1>
      <p>
        {t('landing.description')}
      </p>

      {/* How it works — 3 steps */}
      <div className="steps-row">
        {[
          { step: '1', label: t('landing.step1') },
          { step: '2', label: t('landing.step2') },
          { step: '3', label: t('landing.step3') },
        ].map(({ step, label }) => (
          <div key={step} className="step-item">
            <div className="step-circle">{step}</div>
            <div className="step-label">{label}</div>
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

      <div className="footer-text">
        tplan.naurolabs.com
      </div>
    </div>
  );
}
