import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const REPO_OWNER = 'samoletovs';
const REPO_NAME = 'tPlan';

const typeConfig = {
  bug: { emoji: '🐛', label: 'Bug Report', ghLabel: 'bug' },
  feature: { emoji: '💡', label: 'Feature Idea', ghLabel: 'enhancement' },
  other: { emoji: '📝', label: 'Improvement', ghLabel: 'enhancement' },
} as const;

export default function FeedbackButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<keyof typeof typeConfig>('bug');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (!description.trim()) return;
    const info = typeConfig[type];
    const title = `${info.emoji} ${info.label}: ${description.slice(0, 80)}`;
    const body = `## ${info.label}\n\n${description}\n\n---\n*Submitted via tPlan in-app feedback*`;
    window.open(
      `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent(info.ghLabel)}`,
      '_blank',
    );
    setSubmitted(true);
    setTimeout(() => { setOpen(false); setSubmitted(false); setDescription(''); }, 2000);
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
            disabled={!description.trim()}
          >
            {t('feedback.submit')}
          </button>
        </>
      )}
    </div>
  );
}
