/**
 * Request body for Azure OpenAI chat completions, shared by every raw-fetch call site so the
 * model-specific request shape is decided in exactly one place.
 *
 * Measured against the live deployments (identical on api-version 2024-02-01):
 *   - gpt-6-luna rejects `max_tokens` (HTTP 400), accepts `max_completion_tokens`, and accepts
 *     `temperature` only together with `reasoning_effort: "none"`.
 *   - the older deployments accept `max_completion_tokens` and `temperature` but reject
 *     `reasoning_effort` (HTTP 400).
 * The code ships before the deployment app settings are flipped, so a body built for an older
 * deployment name must stay valid: `reasoning_effort` is added only when the deployment
 * resolved at runtime is exactly gpt-6-luna.
 */
export const LUNA_DEPLOYMENT = 'gpt-6-luna';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface ChatRequestBody {
  messages: ChatMessage[];
  temperature: number;
  max_completion_tokens: number;
  response_format: { type: 'json_object' };
  reasoning_effort?: 'none';
}

export function buildChatBody({
  deployment, messages, temperature, maxCompletionTokens,
}: {
  deployment: string;
  messages: ChatMessage[];
  temperature: number;
  maxCompletionTokens: number;
}): ChatRequestBody {
  const body: ChatRequestBody = {
    messages,
    temperature,
    max_completion_tokens: maxCompletionTokens,
    response_format: { type: 'json_object' },
  };
  if (deployment === LUNA_DEPLOYMENT) body.reasoning_effort = 'none';
  return body;
}
