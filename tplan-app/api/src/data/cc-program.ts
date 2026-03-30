/**
 * Convict Conditioning program data — all 6 exercises with 10 levels each.
 * Extracted from Convict Conditioning Vol. 1 (Paul Wade).
 * 
 * Training program templates from Chapter 12:
 * - Good Behavior (3 days/week) — recommended for most athletes
 */

export const CC_PROGRAM = {
  id: 'convict-conditioning',
  name: 'Convict Conditioning',
  description: 'Progressive bodyweight training — the Big Six exercises, 10 levels each. From wall push-ups to one-arm push-ups.',
  type: 'calisthenics' as const,
  source: 'Convict Conditioning Vol. 1 (Paul Wade)',
  progressionRules: {
    repsIncrement: 2,
    consecutiveEasyThreshold: 2,
    levelUpAtMaxReps: true,
  },

  /**
   * Training schedule template: "Good Behavior" (3 days/week)
   * Monday: Push-ups + Leg Raises (push + core)
   * Wednesday: Pull-ups + Squats (pull + legs)  
   * Friday: Handstand Push-ups + Bridges (vertical push + posterior)
   * 
   * The generator picks exercises based on the day's muscle group pairing,
   * not hardcoded A/B slots.
   */
  trainingDays: {
    push_core: { exercises: ['pushups', 'leg-raises'], label: 'Push + Core' },
    pull_legs: { exercises: ['pullups', 'squats'], label: 'Pull + Legs' },
    vertical_posterior: { exercises: ['handstand-pushups', 'bridges'], label: 'Shoulders + Bridges' },
  },

  /** Default weekly schedule (Good Behavior) */
  defaultSchedule: {
    mon: 'push_core',
    tue: null,
    wed: 'pull_legs',
    thu: null,
    fri: 'vertical_posterior',
    sat: null,
    sun: null,
  },

  exercises: [
    {
      id: 'pushups', name: 'Push-ups', type: 'reps' as const,
      technique: 'Full body pressing movement. Control descent (2s), brief pause (1s), press up (2s). Keep body straight as a plank.',
      tempo: '2-1-2', restBetweenSets: 60, defaultSets: 2, defaultReps: 10, startLevel: 1, slots: ['push_core'],
    },
    {
      id: 'squats', name: 'Squats', type: 'reps' as const,
      technique: 'Full depth squat. Control descent (2s), pause at bottom (1s), drive up (2s). Heels flat, back straight.',
      tempo: '2-1-2', restBetweenSets: 90, defaultSets: 2, defaultReps: 10, startLevel: 1, slots: ['pull_legs'],
    },
    {
      id: 'pullups', name: 'Pull-ups', type: 'reps' as const,
      technique: 'Full hang to chin over bar. Control ascent (2s), pause at top (1s), slow descent (2s). No kipping.',
      tempo: '2-1-2', restBetweenSets: 90, defaultSets: 2, defaultReps: 5, startLevel: 1, slots: ['pull_legs'],
    },
    {
      id: 'leg-raises', name: 'Leg Raises', type: 'reps' as const,
      technique: 'Core exercise. Control the movement, no swinging. 2s up, 1s hold, 2s down.',
      tempo: '2-1-2', restBetweenSets: 60, defaultSets: 2, defaultReps: 10, startLevel: 1, slots: ['push_core'],
    },
    {
      id: 'bridges', name: 'Bridges', type: 'reps' as const,
      technique: 'Spinal extension. Control into position (2s), hold briefly (1s), return (2s). Build flexibility gradually.',
      tempo: '2-1-2', restBetweenSets: 60, defaultSets: 2, defaultReps: 10, startLevel: 1, slots: ['vertical_posterior'],
    },
    {
      id: 'handstand-pushups', name: 'Handstand Push-ups', type: 'reps' as const,
      technique: 'Inverted pressing. Wall-supported. Control descent (2s), brief pause (1s), press up (2s).',
      tempo: '2-1-2', restBetweenSets: 120, defaultSets: 2, defaultReps: 5, startLevel: 1, slots: ['vertical_posterior'],
    },
  ],

  levels: [
    // === PUSH-UPS (10 levels) ===
    { exerciseId: 'pushups', level: 1, name: 'Wall Push-ups', technique: 'Face wall, arms straight. Lower forehead to wall, press back. Shoulder-width hands.', beginnerReps: 10, advancedReps: 50 },
    { exerciseId: 'pushups', level: 2, name: 'Incline Push-ups', technique: 'Hands on hip-height surface (desk, table). Lower chest to surface edge.', beginnerReps: 10, advancedReps: 40 },
    { exerciseId: 'pushups', level: 3, name: 'Knee Push-ups', technique: 'On knees, hands shoulder-width. Lower chest to fist height above floor.', beginnerReps: 10, advancedReps: 30 },
    { exerciseId: 'pushups', level: 4, name: 'Half Push-ups', technique: 'Full plank, lower to 90° elbow angle only. Use ball under hips as depth marker.', beginnerReps: 8, advancedReps: 25 },
    { exerciseId: 'pushups', level: 5, name: 'Full Push-ups', technique: 'Lower chest to fist height above floor. Full range of motion. Maintain rigid body.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'pushups', level: 6, name: 'Close Push-ups', technique: 'Index fingers touching. Same depth as full push-ups. Builds tricep and elbow strength.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'pushups', level: 7, name: 'Uneven Push-ups', technique: 'One hand on basketball, one on floor. Distribute weight toward floor hand. Each side.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'pushups', level: 8, name: 'Half One-Arm Push-ups', technique: 'One arm only, other behind back. Lower to 90° elbow angle. Ball under hips.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'pushups', level: 9, name: 'Lever Push-ups', technique: 'One arm on ball extended to side, other does the work. Transitional to one-arm.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'pushups', level: 10, name: 'One-Arm Push-ups', technique: 'Master level. Full push-up on single arm, perfect form. The ultimate pressing goal.', beginnerReps: 5, advancedReps: 100 },

    // === SQUATS (10 levels) ===
    { exerciseId: 'squats', level: 1, name: 'Shoulderstand Squats', technique: 'Lie on back, support hips, bend knees toward face. Builds base leg strength.', beginnerReps: 10, advancedReps: 50 },
    { exerciseId: 'squats', level: 2, name: 'Jackknife Squats', technique: 'Feet on object, hands assist. Torso parallel to ground at bottom.', beginnerReps: 10, advancedReps: 40 },
    { exerciseId: 'squats', level: 3, name: 'Supported Squats', technique: 'Hold support at hip height. Squat fully, assist lightly with hands.', beginnerReps: 10, advancedReps: 30 },
    { exerciseId: 'squats', level: 4, name: 'Half Squats', technique: '90° knee angle. Bodyweight only, heels flat on floor.', beginnerReps: 8, advancedReps: 50 },
    { exerciseId: 'squats', level: 5, name: 'Full Squats', technique: 'Deep squat, hamstrings on calves. Back straight, slow controlled movement.', beginnerReps: 5, advancedReps: 30 },
    { exerciseId: 'squats', level: 6, name: 'Close Squats', technique: 'Feet together, hands in front. Emphasis on quadriceps.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'squats', level: 7, name: 'Uneven Squats', technique: 'One leg on basketball. Weight on standing leg, full depth.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'squats', level: 8, name: 'Half One-Leg Squats', technique: 'One leg raised, squat to 90° on supporting leg.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'squats', level: 9, name: 'Supported One-Leg Squats', technique: 'Full pistol squat with basketball for light support at bottom.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'squats', level: 10, name: 'One-Leg Squats (Pistol)', technique: 'Master level. Full pistol squat, no assistance. The ultimate leg exercise.', beginnerReps: 5, advancedReps: 50 },

    // === PULL-UPS (10 levels) ===
    { exerciseId: 'pullups', level: 1, name: 'Vertical Pulls', technique: 'Stand close to door frame, lean back, pull shoulders to support.', beginnerReps: 10, advancedReps: 40 },
    { exerciseId: 'pullups', level: 2, name: 'Horizontal Pulls', technique: 'Under table, body straight. Pull chest to table edge.', beginnerReps: 10, advancedReps: 30 },
    { exerciseId: 'pullups', level: 3, name: 'Jackknife Pull-ups', technique: 'Feet on chair in front, legs assist slightly. Chin over bar.', beginnerReps: 10, advancedReps: 20 },
    { exerciseId: 'pullups', level: 4, name: 'Half Pull-ups', technique: 'Start from 90° arm bend, pull chin over bar. Upper half only.', beginnerReps: 8, advancedReps: 15 },
    { exerciseId: 'pullups', level: 5, name: 'Full Pull-ups', technique: 'Straight arm hang to chin over bar. Slow, no kipping.', beginnerReps: 5, advancedReps: 10 },
    { exerciseId: 'pullups', level: 6, name: 'Close Pull-ups', technique: 'Hands touching or 10cm apart. More bicep emphasis.', beginnerReps: 5, advancedReps: 10 },
    { exerciseId: 'pullups', level: 7, name: 'Uneven Pull-ups', technique: 'One hand on bar, other grips wrist. Unequal load.', beginnerReps: 5, advancedReps: 9 },
    { exerciseId: 'pullups', level: 8, name: 'Half One-Arm Pull-ups', technique: 'One arm at 90°, pull chin to bar from half position.', beginnerReps: 4, advancedReps: 8 },
    { exerciseId: 'pullups', level: 9, name: 'Assisted One-Arm Pull-ups', technique: 'Towel on bar, pull with one arm, assist with other on towel.', beginnerReps: 3, advancedReps: 7 },
    { exerciseId: 'pullups', level: 10, name: 'One-Arm Pull-ups', technique: 'Master level. Full pull-up, single arm, no assistance.', beginnerReps: 1, advancedReps: 6 },

    // === LEG RAISES (10 levels) ===
    { exerciseId: 'leg-raises', level: 1, name: 'Knee Tucks', technique: 'Seated on edge, pull knees to chest. Controlled movement.', beginnerReps: 10, advancedReps: 40 },
    { exerciseId: 'leg-raises', level: 2, name: 'Lying Knee Raises', technique: 'Flat on back, raise knees until thighs perpendicular. Feet off ground.', beginnerReps: 10, advancedReps: 35 },
    { exerciseId: 'leg-raises', level: 3, name: 'Lying Bent Leg Raises', technique: 'Knees at 45°, raise to vertical. Lock knee angle.', beginnerReps: 10, advancedReps: 30 },
    { exerciseId: 'leg-raises', level: 4, name: 'Frog Raises', technique: 'Extend from bent to straight legs overhead. 4s descent.', beginnerReps: 8, advancedReps: 25 },
    { exerciseId: 'leg-raises', level: 5, name: 'Flat Straight Leg Raises', technique: 'Legs straight, raise to vertical. Min 2s controlled.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'leg-raises', level: 6, name: 'Hanging Knee Raises', technique: 'Hanging from bar, raise knees to hip level. 90° knee angle.', beginnerReps: 5, advancedReps: 15 },
    { exerciseId: 'leg-raises', level: 7, name: 'Hanging Bent Leg Raises', technique: 'Hanging, knees at 45°, raise to hip level.', beginnerReps: 5, advancedReps: 15 },
    { exerciseId: 'leg-raises', level: 8, name: 'Hanging Frog Raises', technique: 'From bent position, extend to straight legs at hip level.', beginnerReps: 5, advancedReps: 15 },
    { exerciseId: 'leg-raises', level: 9, name: 'Partial Straight Leg Raises', technique: 'Hanging, raise straight legs to 45°, hold, descent.', beginnerReps: 5, advancedReps: 15 },
    { exerciseId: 'leg-raises', level: 10, name: 'Full Hanging Leg Raises', technique: 'Master level. Hanging straight leg raise to hip level, full control.', beginnerReps: 5, advancedReps: 30 },

    // === BRIDGES (10 levels) ===
    { exerciseId: 'bridges', level: 1, name: 'Short Bridges', technique: 'On back, feet under body, elevate hips to straight line.', beginnerReps: 10, advancedReps: 50 },
    { exerciseId: 'bridges', level: 2, name: 'Straight Bridges', technique: 'Legs extended, hips elevated, body in straight line.', beginnerReps: 10, advancedReps: 40 },
    { exerciseId: 'bridges', level: 3, name: 'Angled Bridges', technique: 'On bed edge, hands beside head, arch back.', beginnerReps: 8, advancedReps: 30 },
    { exerciseId: 'bridges', level: 4, name: 'Head Bridges', technique: 'Crown of head on floor, hips elevated. Very controlled.', beginnerReps: 8, advancedReps: 25 },
    { exerciseId: 'bridges', level: 5, name: 'Half Bridges', technique: 'Back on ball, hands beside head. Upper range of bridge.', beginnerReps: 8, advancedReps: 20 },
    { exerciseId: 'bridges', level: 6, name: 'Full Bridges', technique: 'Feet near hips, hands beside head, full arm extension, deep arch.', beginnerReps: 6, advancedReps: 15 },
    { exerciseId: 'bridges', level: 7, name: 'Wall Walk-Downs', technique: 'Stand at wall, arch back, walk hands down wall to full bridge.', beginnerReps: 3, advancedReps: 10 },
    { exerciseId: 'bridges', level: 8, name: 'Wall Walk-Ups', technique: 'From bridge at wall, walk hands up, return to standing.', beginnerReps: 2, advancedReps: 8 },
    { exerciseId: 'bridges', level: 9, name: 'Closing Bridges', technique: 'From standing, arch back to bridge without wall. Intense.', beginnerReps: 1, advancedReps: 6 },
    { exerciseId: 'bridges', level: 10, name: 'Stand-to-Stand Bridges', technique: 'Master level. Full bridge from standing to standing and back. Ultimate flexibility.', beginnerReps: 1, advancedReps: 30 },

    // === HANDSTAND PUSH-UPS (10 levels) ===
    { exerciseId: 'handstand-pushups', level: 1, name: 'Headstand Hold', technique: 'Against wall on pillow. Build inverted balance. Hold for time.', beginnerReps: 30, advancedReps: 120 },
    { exerciseId: 'handstand-pushups', level: 2, name: 'Crow Pose', technique: 'Squat, lean forward, knees on arms, feet off ground. Balance hold.', beginnerReps: 10, advancedReps: 60 },
    { exerciseId: 'handstand-pushups', level: 3, name: 'Handstand Hold', technique: 'Full handstand against wall. Straight body, heels touching wall.', beginnerReps: 30, advancedReps: 120 },
    { exerciseId: 'handstand-pushups', level: 4, name: 'Partial Handstand Push-ups', technique: 'Against wall, lower head halfway to ground. Small range.', beginnerReps: 5, advancedReps: 20 },
    { exerciseId: 'handstand-pushups', level: 5, name: 'Full Handstand Push-ups', technique: 'Against wall, lower head to floor. Full controlled movement.', beginnerReps: 5, advancedReps: 15 },
    { exerciseId: 'handstand-pushups', level: 6, name: 'Close Handstand Push-ups', technique: 'Index fingers touching. Narrow placement, tricep emphasis.', beginnerReps: 5, advancedReps: 12 },
    { exerciseId: 'handstand-pushups', level: 7, name: 'Uneven Handstand Push-ups', technique: 'One hand on ball, one on floor. Balance critical.', beginnerReps: 5, advancedReps: 10 },
    { exerciseId: 'handstand-pushups', level: 8, name: 'Half One-Arm HSPU', technique: 'One arm, lower head halfway. Other arm for balance.', beginnerReps: 4, advancedReps: 8 },
    { exerciseId: 'handstand-pushups', level: 9, name: 'Lever HSPU', technique: 'Lever action with one arm providing balance assist. Near one-arm.', beginnerReps: 3, advancedReps: 8 },
    { exerciseId: 'handstand-pushups', level: 10, name: 'One-Arm Handstand Push-ups', technique: 'Master level. Full HSPU on single arm. The pinnacle of pressing strength.', beginnerReps: 1, advancedReps: 5 },
  ],
};

/** 
 * Note for Phase 3 extraction: when the AI extracts a program, it should also extract:
 * - trainingDays: which exercises go together (muscle group pairings)
 * - defaultSchedule: recommended weekly layout
 * The workout generator uses trainingDays to decide what to generate each day,
 * cycling through the pairings. No hardcoded A/B — the program defines its own splits.
 */
