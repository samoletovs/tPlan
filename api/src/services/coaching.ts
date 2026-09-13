export interface CoachingStep {
  type: string;
  name?: string;
  planned?: number;
}

export interface Coaching {
  motivation: string;
  tips: string[];
  unsupportedAdjustment: boolean;
}

export class InvalidCoachingError extends Error {
  constructor() { super('Invalid coaching response'); }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InvalidCoachingError();
  return value as Record<string, unknown>;
}

function boundedText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length <= limit &&
    !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value);
}

export function parseCoachingResponse({
  response, steps, hasNote,
}: { response: unknown; steps: CoachingStep[]; hasNote: boolean }): Coaching {
  const envelope = object(response);
  if (!Array.isArray(envelope.choices) || !envelope.choices.length) throw new InvalidCoachingError();
  const choice = object(envelope.choices[0]);
  const message = object(choice.message);
  if (choice.finish_reason !== 'stop' || message.refusal || !boundedText(message.content, 20_000)) {
    throw new InvalidCoachingError();
  }
  let payload: Record<string, unknown>;
  try { payload = object(JSON.parse(message.content)); } catch { throw new InvalidCoachingError(); }
  const { motivation, tips, unsupportedAdjustment } = payload;
  if (
    (hasNote && typeof unsupportedAdjustment !== 'boolean') ||
    (!hasNote && unsupportedAdjustment === true) ||
    (unsupportedAdjustment !== undefined && typeof unsupportedAdjustment !== 'boolean') ||
    Object.keys(payload).some(key => !['motivation', 'tips', 'unsupportedAdjustment'].includes(key)) ||
    !boundedText(motivation, 400) || !Array.isArray(tips) || tips.length !== steps.length ||
    !tips.every((tip, index) => boundedText(tip, 240) && (steps[index].type === 'exercise' || tip === ''))
  ) throw new InvalidCoachingError();
  if (unsupportedAdjustment !== true && !motivation.trim() && tips.every(tip => !tip.trim())) {
    throw new InvalidCoachingError();
  }
  return { motivation, tips, unsupportedAdjustment: unsupportedAdjustment === true };
}
