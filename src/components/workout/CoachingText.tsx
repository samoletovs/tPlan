import { useTranslation } from 'react-i18next';
import type { Workout } from '../../types';

export function CoachingTip({ value }: { value: unknown }) {
  if (typeof value !== 'string' || !value.trim() || value.length > 240) return null;
  return <div className="exercise-prev">{value}</div>;
}

export function WorkoutCoaching({ workout }: { workout: Pick<Workout, 'motivation' | 'coachingStatus'> }) {
  const { t } = useTranslation();
  const validMotivation = typeof workout.motivation === 'string' &&
    workout.motivation.trim().length > 0 && workout.motivation.length <= 400;
  const unavailable = workout.coachingStatus === 'unavailable' ||
    workout.coachingStatus === 'invalid_response' ||
    (workout.motivation !== undefined && !validMotivation);
  return (
    <>
      {unavailable && <p className="text-sm text-secondary mb-md" role="status">{t('workout.coachingUnavailable')}</p>}
      {validMotivation && (
        <div className="card mb-md">
          <div className="text-sm text-secondary">{workout.motivation}</div>
        </div>
      )}
    </>
  );
}
