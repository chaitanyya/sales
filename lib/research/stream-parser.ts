import {
  LogEntry,
  ClaudeStreamEvent,
  ClaudeContentBlock,
  ClaudeToolResultBlock,
} from "@/lib/types/claude";

const MAX_TOOL_RESULT_LENGTH = 500;

function truncateContent(content: string, maxLength: number = MAX_TOOL_RESULT_LENGTH): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + `... [truncated ${content.length - maxLength} chars]`;
}

function parseSystemEvent(event: ClaudeStreamEvent, timestamp: number): LogEntry {
  if (event.type === "system" && event.subtype === "init") {
    return {
      type: "system",
      content: `Initialized session with model: ${event.model || "unknown"}`,
      timestamp,
    };
  }
  return {
    type: "system",
    content: JSON.stringify(event),
    timestamp,
  };
}

function parseAssistantEvent(event: ClaudeStreamEvent, timestamp: number): LogEntry[] {
  const entries: LogEntry[] = [];

  if (event.type === "assistant" && event.message?.content) {
    for (const block of event.message.content) {
      if (block.type === "text") {
        entries.push({
          type: "assistant",
          content: block.text,
          timestamp,
        });
      } else if (block.type === "tool_use") {
        entries.push({
          type: "tool_use",
          content: `Using tool: ${block.name}`,
          toolName: block.name,
          timestamp,
        });
      }
    }
  }

  return entries;
}

function parseContentBlockStart(block: ClaudeContentBlock, timestamp: number): LogEntry | null {
  if (block.type === "tool_use") {
    return {
      type: "tool_use",
      content: `Using tool: ${block.name}`,
      toolName: block.name,
      timestamp,
    };
  } else if (block.type === "text") {
    return {
      type: "assistant",
      content: block.text,
      timestamp,
    };
  }
  return null;
}

function parseToolResult(event: ClaudeStreamEvent, timestamp: number): LogEntry {
  if (event.type !== "tool_result") {
    return { type: "tool_result", content: "Tool completed", timestamp };
  }

  return {
    type: event.is_error ? "error" : "tool_result",
    content: truncateContent(event.output || "Tool completed"),
    timestamp,
  };
}

function parseUserEvent(event: ClaudeStreamEvent, timestamp: number): LogEntry[] {
  const entries: LogEntry[] = [];

  if (event.type === "user" && "message" in event) {
    const userEvent = event as { message?: { content?: ClaudeToolResultBlock[] } };
    const content = userEvent.message?.content;

    if (content && Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "tool_result") {
          entries.push({
            type: block.is_error ? "error" : "tool_result",
            content: truncateContent(
              typeof block.content === "string" ? block.content : JSON.stringify(block.content)
            ),
            timestamp,
          });
        }
      }
    }
  }

  return entries;
}

function parseResultEvent(event: ClaudeStreamEvent, timestamp: number): LogEntry {
  if (event.type !== "result") {
    return { type: "info", content: "Result event", timestamp };
  }

  const durationSec = event.duration_ms ? (event.duration_ms / 1000).toFixed(1) : "?";

  if (event.subtype === "success") {
    return {
      type: "info",
      content: `Task completed successfully (${durationSec}s)`,
      timestamp,
    };
  } else if (event.subtype === "error") {
    return {
      type: "error",
      content: `Task failed (${durationSec}s)`,
      timestamp,
    };
  }

  return {
    type: "info",
    content: `Task finished (${durationSec}s)`,
    timestamp,
  };
}

function categorizeRawOutput(text: string, timestamp: number): LogEntry | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (/^error:/i.test(trimmed) || /exception|traceback/i.test(trimmed)) {
    return { type: "error", content: trimmed, timestamp };
  }

  if (/^warn(ing)?:/i.test(trimmed)) {
    return { type: "info", content: trimmed, timestamp };
  }

  if (/^(processing|loading|fetching|searching|reading|writing)/i.test(trimmed)) {
    return { type: "progress", content: trimmed, timestamp };
  }

  if (/^(navigat|click|scroll|screenshot|browser)/i.test(trimmed)) {
    return { type: "browser", content: trimmed, timestamp };
  }

  return { type: "info", content: trimmed, timestamp };
}

/**
 * Parse a single JSON line from Claude's streaming output
 */
export function parseStreamJsonEvent(line: string): LogEntry[] {
  const timestamp = Date.now();

  try {
    const event = JSON.parse(line) as ClaudeStreamEvent;
    const entries: LogEntry[] = [];

    switch (event.type) {
      case "system":
        entries.push(parseSystemEvent(event, timestamp));
        break;

      case "assistant":
        entries.push(...parseAssistantEvent(event, timestamp));
        break;

      case "content_block_start":
        if (event.content_block) {
          const entry = parseContentBlockStart(event.content_block, timestamp);
          if (entry) entries.push(entry);
        }
        break;

      case "content_block_delta":
        if (event.delta?.text) {
          entries.push({
            type: "assistant",
            content: event.delta.text,
            timestamp,
          });
        }
        break;

      case "tool_result":
        entries.push(parseToolResult(event, timestamp));
        break;

      case "user":
        entries.push(...parseUserEvent(event, timestamp));
        break;

      case "result":
        entries.push(parseResultEvent(event, timestamp));
        break;

      case "mcp":
      case "browser":
        entries.push({
          type: "browser",
          content: event.message ? String(event.message) : JSON.stringify(event),
          timestamp,
        });
        break;

      case "error":
        entries.push({
          type: "error",
          content: event.error || "Unknown error",
          timestamp,
        });
        break;
    }

    return entries;
  } catch {
    return [];
  }
}

/**
 * Categorize non-JSON raw output from Claude
 */
export function parseRawOutput(text: string): LogEntry | null {
  return categorizeRawOutput(text, Date.now());
}
