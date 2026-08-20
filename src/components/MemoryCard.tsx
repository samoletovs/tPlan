import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMemory, forgetMemory } from '../services/api';
import type { UserMemory } from '../types';

interface MemoryCardProps {
  onError: (message: string) => void;
}

/**
 * Everything the coach believes about this user, with a way to delete any of it.
 *
 * This is not a nicety. tPlan now feeds remembered facts into the prompt that writes
 * a user's coaching tips, and a belief the user can neither see nor remove is one they
 * cannot correct when it is wrong - a stale injury note would quietly shape their plans
 * forever. The store is only defensible because this screen exists.
 */
export function MemoryCard({ onError }: MemoryCardProps) {
  const { t } = useTranslation();
  const [memories, setMemories] = useState<UserMemory[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    // Failing to list memory must not break the profile page, so an error reads as
    // "nothing remembered" rather than taking the surrounding settings down with it.
    getMemory()
      .catch(() => [] as UserMemory[])
      .then(setMemories);
  }, []);

  // Auto-reset delete confirmation, matching the pattern used on the Programs page.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(null), 5000);
    return () => clearTimeout(timer);
  }, [confirming]);

  async function forget(id: string) {
    // Drops it locally first so the list responds immediately; a failure reloads
    // rather than leaving the user believing something was forgotten.
    setConfirming(null);
    setMemories((current) => (current || []).filter((item) => item.id !== id));
    try {
      await forgetMemory(id);
    } catch {
      onError(t('error.apiError'));
      getMemory()
        .catch(() => [] as UserMemory[])
        .then(setMemories);
    }
  }

  return (
    <div className="card">
      <h3 className="mb-sm">{t('memory.title')}</h3>
      <p className="pref-sublabel mb-sm">{t('memory.description')}</p>

      {memories === null ? (
        <>
          <div className="skeleton mb-sm" style={{ height: 40 }} />
          <div className="skeleton" style={{ height: 40 }} />
        </>
      ) : memories.length === 0 ? (
        <p className="pref-sublabel">{t('memory.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {memories.map((item) => (
            <li key={item.id} className="flex-start gap-sm">
              <span>
                <strong className="pref-sublabel">{t(`memory.kind.${item.kind}`)}</strong>
                {item.needsReview && (
                  <>
                    {' '}
                    <span className="pref-sublabel" title={t('memory.staleHint')}>
                      · {t('memory.stale')}
                    </span>
                  </>
                )}
                <br />
                {item.text}
              </span>
              {confirming === item.id ? (
                <button
                  className="btn btn-danger"
                  onClick={() => forget(item.id)}
                  aria-label={`${t('memory.forgetConfirm')} ${item.text}`}
                >
                  {t('memory.forgetConfirm')}
                </button>
              ) : (
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirming(item.id)}
                  aria-label={`${t('memory.forget')}: ${item.text}`}
                >
                  {t('memory.forget')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default MemoryCard;
