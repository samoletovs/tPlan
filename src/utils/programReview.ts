import type { ExtractionResult, ProgramExercise } from '../types';

export function prepareReviewedProgram({
  program, exercises,
}: { program: ExtractionResult['program']; exercises: ProgramExercise[] }): ExtractionResult['program'] {
  const ids = new Set(exercises.map(exercise => exercise.id));
  const trainingDays = Object.fromEntries(
    Object.entries(program.trainingDays ?? {})
      .map(([id, day]) => [id, { ...day, exercises: day.exercises.filter(exercise => ids.has(exercise)) }] as const)
      .filter(([, day]) => day.exercises.length > 0),
  );
  const defaultSchedule = Object.fromEntries(
    Object.entries(program.defaultSchedule ?? {})
      .map(([day, slot]) => [day, slot && Object.hasOwn(trainingDays, slot) ? slot : null]),
  );
  return {
    ...program,
    exercises: exercises.map(exercise => ({
      ...exercise,
      // Only prune slots for deleted days when this extraction actually has day mappings.
      slots: program.trainingDays && Object.keys(program.trainingDays).length
        ? exercise.slots.filter(slot => Object.hasOwn(trainingDays, slot))
        : exercise.slots,
    })),
    levels: program.levels.filter(level => ids.has(level.exerciseId)),
    trainingDays,
    defaultSchedule,
  };
}
