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
      <h1>{t('landing.hero')}</h1>
      <p>{t('landing.description')}</p>

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
          <h3>{t('landing.features.challenges')}</h3>
          <p>{t('landing.features.challengesDesc')}</p>
        </div>
      </div>

      <button className="btn btn-primary" onClick={login} style={{ maxWidth: 280 }}>
        {t('auth.login')}
      </button>
    </div>
  );
}
