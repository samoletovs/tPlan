/**
 * AI-powered training program extraction from book text.
 * Uses Azure OpenAI GPT-4o to parse training methodology and produce
 * a structured Program object (exercises, levels, progression rules).
 */

const EXTRACTION_PROMPT = `You are an expert fitness coach and training program analyst.
Given the text of a training methodology book (or excerpt), extract a structured program.

Return a JSON object with EXACTLY this shape:
{
  "name": "Program name (from the book title or content)",
  "description": "Brief 1-2 sentence summary of the methodology",
  "type": "calisthenics" | "weights" | "custom",
  "source": "(will be filled by the system)",
  "exercises": [
    {
      "id": "lowercase-kebab-case-id",
      "name": "Exercise Name",
      "type": "reps" | "timed",
      "technique": "Detailed technique description from the book",
      "tempo": "2-1-2 (down-pause-up in seconds, or 'hold' for timed)",
      "restBetweenSets": 60,
      "defaultSets": 2,
      "defaultReps": 5,
      "startLevel": 1,
      "slots": ["A"]
    }
  ],
  "levels": [
    {
      "exerciseId": "matching-exercise-id",
      "level": 1,
      "name": "Level/variation name from the book",
      "technique": "Specific technique for this level",
      "beginnerReps": 5,
      "advancedReps": 20
    }
  ],
  "progressionRules": {
    "repsIncrement": 2,
    "consecutiveEasyThreshold": 2,
    "levelUpAtMaxReps": true
  }
}

Rules:
- Extract ALL exercises mentioned with progressive levels
- Each exercise should have multiple levels if the book describes progressions
- For books with alternating days (A/B splits), use slots ["A"] and ["B"]
- For evening/separate sessions, use slot ["evening"]
- If the book has specific progression conditions (e.g., "when you can do 3x50, advance"), encode them in beginnerReps/advancedReps
- "type" is "timed" ONLY for holds (planks, wall sits). Everything else is "reps"
- Generate meaningful exercise IDs (e.g., "push-ups", "barbell-squat", "warrior-pose")
- Keep technique descriptions faithful to the original book text
- If the book mentions specific tempos or rest periods, use them
- If no progressions exist, create a single level per exercise
- Set "type" field based on content: "calisthenics" for bodyweight, "weights" for barbell/dumbbell, "custom" for mixed/other`;

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

  // Truncate very long texts to fit context window (keep first ~80K chars ≈ 20K tokens)
  const maxChars = 80_000;
  const truncated = text.length > maxChars;
  const inputText = truncated ? text.slice(0, maxChars) : text;

  const warnings: string[] = [];
  if (truncated) {
    warnings.push(`Book text was truncated from ${text.length} to ${maxChars} characters. Some exercises at the end may be missing.`);
  }

  const res = await fetch(
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          {
            role: 'user',
            content: `Extract a structured training program from this book text.\n\nFile: ${fileName}\n\n---\n\n${inputText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`AI extraction failed (${res.status}): ${errBody.slice(0, 200)}`);
  }

  const data: any = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned empty response');
  }

  const parsed = JSON.parse(content);

  // Validate required fields
  const validationWarnings = validateExtraction(parsed);
  warnings.push(...validationWarnings);

  // Calculate confidence based on extraction quality
  const confidence = calculateConfidence(parsed, validationWarnings);

  // Ensure source is set
  parsed.source = fileName;

  return { program: parsed, confidence, warnings };
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
