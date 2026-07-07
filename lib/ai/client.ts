import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

const client = new Anthropic();

// Configurable so a cost-conscious deploy can step down to Sonnet/Haiku without a code change.
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export class AiGenerationError extends Error {
  status: number;
  retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "AiGenerationError";
    this.status = status;
    this.retryable = retryable;
  }
}

export async function generateStructured<Schema extends z.ZodTypeAny>({
  system,
  prompt,
  schema,
  maxTokens = 4096,
}: {
  system: string;
  prompt: string;
  schema: Schema;
  maxTokens?: number;
}): Promise<z.infer<Schema>> {
  let response;
  try {
    response = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      output_config: {
        effort: "medium",
        format: zodOutputFormat(schema),
      },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      throw new AiGenerationError("Claude is rate-limited right now — try again in a moment.", 429, true);
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new AiGenerationError("Could not reach Claude — try again.", 503, true);
    }
    if (err instanceof Anthropic.APIError) {
      const retryable = err.status === undefined || err.status >= 500;
      throw new AiGenerationError(`Claude API error: ${err.message}`, err.status ?? 502, retryable);
    }
    throw new AiGenerationError("Unexpected error generating AI suggestion.", 500, false);
  }

  if (response.stop_reason === "refusal") {
    throw new AiGenerationError("Claude declined to respond to this request.", 422, false);
  }
  if (response.stop_reason === "max_tokens" || response.parsed_output === null) {
    throw new AiGenerationError("Claude's response was incomplete — try again.", 502, true);
  }

  return response.parsed_output;
}
