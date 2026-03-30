import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function InlineTimer({ totalSec }: { totalSec: number }) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(totalSec);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggle = useCallback(() => {
    if (done) return;
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false);
      return;
    }
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [running, done]);

  const cls = remaining <= 5 ? 'end' : remaining <= 10 ? 'warn' : '';

  return (
    <div className="inline-timer">
      <button
        className="btn btn-secondary inline-timer-btn"
        onClick={toggle}
        aria-label={done ? t('workout.timerDone') : running ? t('workout.stopTimer') : t('workout.startTimer')}
      >
        {done ? t('workout.timerDone') : running ? t('workout.stopTimer') : t('workout.startTimer')}
      </button>
      <span className={`inline-timer-value ${done ? 'text-success' : cls === 'end' ? 'text-error' : cls === 'warn' ? '' : 'text-secondary'}`}
        style={cls === 'warn' ? { color: 'var(--warning)' } : undefined}
      >
        {done ? '✓' : fmtTime(remaining)}
      </span>
    </div>
  );
}
