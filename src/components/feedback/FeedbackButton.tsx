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
        className="feedback-fab"
        aria-label={t('feedback.title')}
      >
        💬
      </button>
    );
  }

  return (
    <div className="feedback-panel">
      <div className="flex-between mb-md">
        <h3>{t('feedback.title')}</h3>
        <button className="btn btn-ghost" style={{ width: 'auto', padding: '4px 8px' }} onClick={() => setOpen(false)}>✕</button>
      </div>

      {submitted ? (
        <p className="text-success">{t('feedback.submitted')}</p>
      ) : (
        <>
          <div className="flex gap-xs mb-md">
            {(['bug', 'feature', 'other'] as const).map(tp => (
              <button
                key={tp}
                className={`diff-btn${type === tp ? ' selected sel-normal' : ''}`}
                onClick={() => setType(tp)}
                aria-pressed={type === tp}
                aria-label={t(`feedback.${tp}`)}
              >
                {t(`feedback.${tp}`)}
              </button>
            ))}
          </div>
          <textarea
            className="textarea mb-sm"
            placeholder={t('feedback.placeholder')}
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ minHeight: 60 }}
            aria-label={t('feedback.description')}
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
