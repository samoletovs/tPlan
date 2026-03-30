import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { timerAlert } from '../../utils/audio';

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
          timerAlert();
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
    <div className="card active text-center">
      <div className="big-number-label mb-sm">{t('workout.rest')}</div>
      <div className={`timer-display ${cls}`}>{fmtTime(remaining)}</div>
      <button className="btn btn-ghost mt-md" onClick={onSkip} aria-label={t('workout.skipRest')}>
        {t('workout.skipRest')} →
      </button>
    </div>
  );
}
