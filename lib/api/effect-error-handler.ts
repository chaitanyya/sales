import { serverError } from "@/lib/api/responses";

interface EffectError {
  _tag?: string;
  message?: string;
}

interface ErrorHandlerOptions {
  onFailure?: () => Promise<void>;
  context?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  QueueTimeoutError: "Server busy - queue timeout. Please try again later.",
  ClaudeNotFoundError: "Claude CLI not found. Please check server configuration.",
  ClaudeSpawnError: "Failed to start process.",
};

export async function handleEffectError(error: unknown, options?: ErrorHandlerOptions) {
  const err = error as EffectError;
  const tag = err._tag || "";

  // Run failure callback if provided
  if (options?.onFailure) {
    await options.onFailure();
  }

  // Check for known Effect error types
  const knownMessage = ERROR_MESSAGES[tag];
  if (knownMessage) {
    return serverError(knownMessage);
  }

  // Log and return generic error
  const context = options?.context || "Operation";
  console.error(`${context} error:`, error);
  return serverError(`Failed to complete ${context.toLowerCase()}`);
}
