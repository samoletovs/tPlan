import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitFeedback } from '../../services/api';

export default function FeedbackButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('bug');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await submitFeedback({ type, description });
      setSubmitted(true);
      setTimeout(() => { setOpen(false); setSubmitted(false); setDescription(''); }, 2000);
    } catch {
      // Failed
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 72, right: 16, zIndex: 60,
          width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)',
          background: 'var(--bg-card)', boxShadow: 'var(--shadow-md)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.125rem', color: 'var(--text-secondary)',
        }}
        aria-label={t('feedback.title')}
      >
        💬
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 72, right: 16, zIndex: 60,
      width: 300, background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: '0.875rem' }}>{t('feedback.title')}</h3>
        <button className="btn btn-ghost" style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setOpen(false)}>✕</button>
      </div>

      {submitted ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--success)' }}>{t('feedback.submitted')}</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {(['bug', 'feature', 'other'] as const).map(tp => (
              <button
                key={tp}
                className={`diff-btn${type === tp ? ' selected sel-normal' : ''}`}
                onClick={() => setType(tp)}
                style={{ fontSize: '0.75rem' }}
              >
                {t(`feedback.${tp}`)}
              </button>
            ))}
          </div>
          <textarea
            className="textarea"
            placeholder={t('feedback.placeholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ marginBottom: 8, minHeight: 60 }}
          />
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !description.trim()}
          >
            {submitting ? t('common.loading') : t('feedback.submit')}
          </button>
        </>
      )}
    </div>
  );
}
