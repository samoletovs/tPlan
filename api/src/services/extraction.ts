/**
 * AI-powered training program extraction from book text.
 * Uses Azure OpenAI GPT-4o in a two-pass approach:
 *   Pass 1 — compact inventory: names, sets, reps, type, muscle groups (fits in ~2K tokens)
 *   Pass 2 — enrich batches: levels, techniques, tempos, scheduling (batched to fit 16K output)
 * This ensures books with 40-50+ exercises are fully extracted.
 */

// ── Pass 1: lightweight inventory ──────────────────────────────────────────
const INVENTORY_PROMPT = `You are an expert fitness coach and training program analyst.
Given the text of a training methodology book, produce a COMPLETE inventory of every exercise.

Return a JSON object:
{
  "name": "Program name",
  "description": "1-2 sentence summary",
  "type": "calisthenics" | "weights" | "custom",
  "progressionRules": {
    "repsIncrement": 2,
    "consecutiveEasyThreshold": 2,
    "levelUpAtMaxReps": true,
    "maxExercisesPerSession": 8,
    "restDaysBetweenSameMuscle": 1
  },
  "exercises": [
    {
      "id": "lowercase-kebab-case-id",
      "name": "Exercise Name",
      "type": "reps" | "timed",
      "defaultSets": 3,
      "defaultReps": 10,
      "muscleGroup": "arms" | "chest" | "back" | "shoulders" | "legs" | "core" | "neck" | "full-body",
      "hasProgressions": true,
      "restDaysBetween": 1
    }
  ]
}

CRITICAL RULES:
- List EVERY exercise in the book — do NOT skip, truncate, or summarize.
- If there are 40 exercises, return all 40. If 60, return all 60.
- Look for numbered exercises (e.g. "Упражнение 1", "Exercise 1", "#1") — count them and ensure ALL are listed.
- Many OCR books use spaced-out headings or mixed formatting — scan the ENTIRE text.
- Keep output compact: no technique text, no levels, no scheduling in this pass.
- "type" is "timed" ONLY for isometric holds. Everything else is "reps".
- "hasProgressions" is true if the book describes multiple levels/variations for that exercise.
- Set "type" field: "calisthenics" for bodyweight, "weights" for barbell/dumbbell, "custom" for mixed.
- "restDaysBetween": number of rest days needed before repeating this exercise (1 = skip one day, 0 = can do daily). Default 1 for strength exercises, 0 for light mobility/stretching.
- "maxExercisesPerSession": max exercises per training session (typically 6-10). If a training day has more exercises than this, the workout generator will rotate subsets across sessions.
- "restDaysBetweenSameMuscle": rest days between training the same muscle group (typically 1-2 days).`;

// ── Pass 2: enrich a batch of exercises with full details ─────────────────
const ENRICH_PROMPT = `You are an expert fitness coach. Given book text and a list of exercise IDs/names,
return detailed information for EACH exercise listed.

Return a JSON object:
{
  "exercises": [
    {
      "id": "matching-exercise-id",
      "technique": "Technique description from the book (1-3 sentences)",
      "tempo": "2-1-2",
      "restBetweenSets": 60,
      "startLevel": 1
    }
  ],
  "levels": [
    {
      "exerciseId": "matching-exercise-id",
      "level": 1,
      "name": "Level name from book",
      "technique": "Specific technique for this level (1 sentence)",
      "beginnerReps": 5,
      "advancedReps": 20
    }
  ],
  "trainingDays": {
    "day_type_id": { "exercises": ["exercise-id-1", "exercise-id-2"], "label": "Day label" }
  },
  "defaultSchedule": {
    "mon": "day_type_id or null", "tue": "day_type_id or null",
    "wed": "day_type_id or null", "thu": "day_type_id or null",
    "fri": "day_type_id or null", "sat": "day_type_id or null",
    "sun": "day_type_id or null"
  }
}

Rules:
- Return details for ALL exercises in the provided list — do not skip any.
- Keep technique descriptions to 1-3 sentences — concise but faithful to the book.
- If the book describes progression levels for an exercise, include them all.
- If no progressions exist, create a single level per exercise.
- Only include trainingDays and defaultSchedule in the FIRST batch response.
- If the book mentions specific tempos or rest periods, use them; otherwise use sensible defaults.`;
// ── Text pre-processing: fix OCR artifacts ───────────────────────────────────────────
function normalizeOcrText(text: string): string {
  // Fix spaced-out Cyrillic words from OCR (e.g. "У п р а ж н е н и е" → "Упражнение")
  // Only collapse spaces in sequences of 3+ single Cyrillic letters (lookbehind avoids normal words)
  let result = text.replace(
    /(?<=[\u0400-\u04FF])\s(?=[\u0400-\u04FF]\s[\u0400-\u04FF])/g,
    '',
  );
  // Second pass: collapse the final remaining pair
  result = result.replace(
    /(?<=[\u0400-\u04FF]{2})\s(?=[\u0400-\u04FF](?:\s|\d))/g,
    '',
  );
  // Ensure normalized headings are on their own line
  result = result.replace(
    /(?:\n|^)\s*(Упражнение\s+\d+)/gi,
    '\n\n$1',
  );
  // Collapse excessive blank lines
  result = result.replace(/\n{4,}/g, '\n\n\n');
  return result;
}
// ── Helper: call Azure OpenAI ─────────────────────────────────────────────
async function callAI(
  endpoint: string,
  key: string,
  deployment: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
): Promise<{ content: string; truncated: boolean }> {
  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`AI extraction failed (${res.status}): ${errBody.slice(0, 200)}`);
  }

  const data: any = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content) throw new Error('AI returned empty response');

  return { content, truncated: choice.finish_reason === 'length' };
}

// ── Main extraction: two-pass ─────────────────────────────────────────────
export async function extractProgram(
  text: string,
  fileName: string,
): Promise<{ program: any; confidence: number; warnings: string[] }> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const key = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

  if (!endpoint || !key) {
    throw new Error('Azure OpenAI not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY.');
  }

  const maxChars = 80_000;
  const truncated = text.length > maxChars;
  let inputText = truncated ? text.slice(0, maxChars) : text;

  const warnings: string[] = [];
  if (truncated) {
    warnings.push(`Book text was truncated from ${text.length} to ${maxChars} characters. Some exercises at the end may be missing.`);
  }

  // Pre-process: normalize OCR-spaced headings (e.g. "У п р а ж н е н и е  1" → "Упражнение 1")
  inputText = normalizeOcrText(inputText);

  // ── Pass 1: compact inventory ──────────────────────────────────────────
  const inventoryResult = await callAI(
    endpoint, key, deployment, INVENTORY_PROMPT,
    `Extract every exercise from this book.\n\nFile: ${fileName}\n\n---\n\n${inputText}`,
    8192,
  );
  if (inventoryResult.truncated) {
    warnings.push('Exercise inventory was truncated — some exercises may be missing.');
  }
  const inventory = JSON.parse(inventoryResult.content);

  if (!inventory.exercises || inventory.exercises.length === 0) {
    throw new Error('No exercises found in the book text.');
  }

  // ── Pass 2: enrich in batches of ~15 exercises ─────────────────────────
  const BATCH_SIZE = 15;
  const allEnrichedExercises: any[] = [];
  const allLevels: any[] = [];
  let trainingDays: any = {};
  let defaultSchedule: any = {};

  const batches: any[][] = [];
  for (let i = 0; i < inventory.exercises.length; i += BATCH_SIZE) {
    batches.push(inventory.exercises.slice(i, i + BATCH_SIZE));
  }

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const exerciseList = batch.map((e: any) => `- ${e.id}: "${e.name}" (${e.type}, ${e.defaultSets}×${e.defaultReps}, progressions: ${e.hasProgressions})`).join('\n');

    const isFirst = batchIdx === 0;
    const enrichMessage = `Enrich these exercises from the book text.${isFirst ? ' Also include trainingDays and defaultSchedule.' : ' Do NOT include trainingDays or defaultSchedule.'}\n\nExercises to enrich:\n${exerciseList}\n\n---\n\nBook text:\n${inputText}`;

    const enrichResult = await callAI(
      endpoint, key, deployment, ENRICH_PROMPT,
      enrichMessage,
      16384,
    );
    if (enrichResult.truncated) {
      warnings.push(`Enrichment batch ${batchIdx + 1}/${batches.length} was truncated — some details may be missing.`);
    }

    const enriched = JSON.parse(enrichResult.content);

    // Merge enrichment data back into inventory exercises
    const enrichMap = new Map((enriched.exercises || []).map((e: any) => [e.id, e]));
    for (const ex of batch) {
      const details = enrichMap.get(ex.id) || {};
      allEnrichedExercises.push({
        id: ex.id,
        name: ex.name,
        type: ex.type,
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
        muscleGroup: ex.muscleGroup || 'full-body',
        restDaysBetween: ex.restDaysBetween ?? 1,
        technique: details.technique || '',
        tempo: details.tempo || '2-1-2',
        restBetweenSets: details.restBetweenSets || 60,
        startLevel: details.startLevel || 1,
        slots: [],
      });
    }

    if (enriched.levels) allLevels.push(...enriched.levels);
    if (isFirst && enriched.trainingDays) trainingDays = enriched.trainingDays;
    if (isFirst && enriched.defaultSchedule) defaultSchedule = enriched.defaultSchedule;
  }

  // Assign exercise slots from trainingDays
  for (const [dayId, dayData] of Object.entries(trainingDays)) {
    const day = dayData as any;
    for (const exId of (day.exercises || [])) {
      const ex = allEnrichedExercises.find((e: any) => e.id === exId);
      if (ex && !ex.slots.includes(dayId)) ex.slots.push(dayId);
    }
  }

  const program = {
    name: inventory.name || fileName,
    description: inventory.description || '',
    type: inventory.type || 'custom',
    source: fileName,
    exercises: allEnrichedExercises,
    levels: allLevels,
    trainingDays,
    defaultSchedule,
    progressionRules: inventory.progressionRules || {
      repsIncrement: 2,
      consecutiveEasyThreshold: 2,
      levelUpAtMaxReps: true,
    },
  };

  const validationWarnings = validateExtraction(program);
  warnings.push(...validationWarnings);
  const confidence = calculateConfidence(program, validationWarnings);

  return { program, confidence, warnings };
}

function validateExtraction(program: any): string[] {
  const warnings: string[] = [];

  if (!program.name) warnings.push('Missing program name');
  if (!program.exercises || program.exercises.length === 0) {
    warnings.push('No exercises extracted — the text may not contain a training program');
  }

  if (program.exercises) {
    for (const ex of program.exercises) {
      if (!ex.id) warnings.push(`Exercise "${ex.name}" missing ID`);
      if (!ex.name) warnings.push('Exercise missing name');
      if (!ex.technique || ex.technique.length < 10) {
        warnings.push(`Exercise "${ex.name}" has minimal technique description`);
      }
    }

    // Check that levels reference valid exercise IDs
    const exerciseIds = new Set(program.exercises.map((e: any) => e.id));
    if (program.levels) {
      for (const level of program.levels) {
        if (!exerciseIds.has(level.exerciseId)) {
          warnings.push(`Level references unknown exercise: ${level.exerciseId}`);
        }
      }
    }
  }

  if (!program.progressionRules) {
    warnings.push('No progression rules extracted — using defaults');
  }

  return warnings;
}

function calculateConfidence(program: any, warnings: string[]): number {
  let score = 100;

  // Deduct for missing/bad data
  if (!program.name) score -= 10;
  if (!program.exercises || program.exercises.length === 0) score -= 50;
  if (!program.levels || program.levels.length === 0) score -= 15;
  if (!program.progressionRules) score -= 10;

  // Deduct per warning
  score -= warnings.length * 3;

  // Bonus for rich data
  if (program.exercises?.length >= 5) score += 5;
  if (program.levels?.length >= 10) score += 5;

  return Math.max(0, Math.min(100, score));
}
