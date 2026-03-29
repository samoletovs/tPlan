import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

interface Props {
  seconds: number;
  onComplete: () => void;
  onSkip: () => void;
}

export default function RestTimer({ seconds, onComplete, onSkip }: Props) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setTimeout(onComplete, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [onComplete]);

  const cls = remaining <= 5 ? 'end' : remaining <= 15 ? 'warn' : '';

  return (
    <div className="card active" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {t('workout.rest')}
      </div>
      <div className={`timer-display ${cls}`}>{fmtTime(remaining)}</div>
      <button className="btn btn-ghost" onClick={onSkip} style={{ marginTop: 16 }}>
        {t('workout.skipRest')} →
      </button>
    </div>
  );
}
