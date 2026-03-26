import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WarmupStep, CooldownStep } from '../../types';
import InlineTimer from './InlineTimer';

interface Props {
  step: WarmupStep | CooldownStep;
  onComplete: () => void;
}

export default function ChecklistStep({ step, onComplete }: Props) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState<boolean[]>(new Array(step.items.length).fill(false));

  function toggle(i: number) {
    setChecked(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  const label = step.type === 'warmup' ? t('workout.warmup') : t('workout.cooldown');

  return (
    <div className="card active">
      <span className="tag">{label}</span>
      <h3>{step.name}</h3>
      <div style={{ margin: '12px 0' }}>
        {step.items.map((item, i) => (
          <div key={i} className={`check-item${checked[i] ? ' checked' : ''}`}>
            <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} />
            <div>
              <span className="ci-text">{item.text}</span>
              {item.desc && <span className="ci-desc">{item.desc}</span>}
              {item.timer && item.timer > 0 && <InlineTimer totalSec={item.timer} />}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" onClick={onComplete}>
        {t('workout.completeSet')}
      </button>
    </div>
  );
}
