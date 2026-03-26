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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <button
        className="btn btn-secondary"
        style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem' }}
        onClick={toggle}
      >
        {done ? t('workout.timerDone') : running ? t('workout.stopTimer') : t('workout.startTimer')}
      </button>
      <span className={cls} style={{
        fontSize: '0.875rem',
        fontVariantNumeric: 'tabular-nums',
        color: done ? 'var(--success)' : remaining <= 5 ? 'var(--error)' : remaining <= 10 ? 'var(--warning)' : 'var(--text-secondary)',
      }}>
        {done ? '✓' : fmtTime(remaining)}
      </span>
    </div>
  );
}
