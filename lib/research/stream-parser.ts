import {
  LogEntry,
  ClaudeStreamEvent,
  ClaudeContentBlock,
  ClaudeToolResultBlock,
} from "@/lib/types/claude";

const MAX_TOOL_RESULT_LENGTH = 500;

/**
 * Extract text content from tool result content (handles MCP array format)
 */
function extractToolResultContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter(
        (c): c is { type: string; text: string } =>
          typeof c === "object" && c !== null && c.type === "text" && typeof c.text === "string"
      )
      .map((c) => c.text)
      .join("\n");
  }

  return JSON.stringify(content);
}

/**
 * Format tool names for display (handles MCP prefixes and snake_case)
 * Examples:
 *   "mcp__claude-in-chrome__get_page_text" → "Chrome: Get Page Text"
 *   "mcp__some-server__do_something" → "Some Server: Do Something"
 *   "WebSearch" → "Web Search"
 *   "Read" → "Read"
 */
function formatToolName(toolName: string): string {
  // Handle MCP tools: mcp__server-name__tool_name
  if (toolName.startsWith("mcp__")) {
    const parts = toolName.replace("mcp__", "").split("__");
    if (parts.length >= 2) {
      const serverName = parts[0]
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
        .replace("Claude In Chrome", "Chrome"); // Shorten common ones

      const actionName = parts
        .slice(1)
        .join("_")
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return `${serverName}: ${actionName}`;
    }
  }

  // Handle camelCase/PascalCase: "WebSearch" → "Web Search"
  const spacedName = toolName.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Handle snake_case: "get_page_text" → "Get Page Text"
  return spacedName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Create a human-readable summary of tool input parameters
 */
function summarizeToolInput(toolName: string, input: Record<string, unknown>): string {
  // WebSearch - show query
  if (toolName === "WebSearch" && input.query) {
    return `Searching: "${input.query}"`;
  }

  // WebFetch - show URL
  if (toolName === "WebFetch" && input.url) {
    return `Fetching: ${input.url}`;
  }

  // Read - show path
  if (toolName === "Read" && input.file_path) {
    return String(input.file_path);
  }

  // Glob - show pattern
  if (toolName === "Glob" && input.pattern) {
    return String(input.pattern);
  }

  // Grep - show pattern
  if (toolName === "Grep" && input.pattern) {
    return `grep: ${input.pattern}`;
  }

  // Bash - show command
  if (toolName === "Bash" && input.command) {
    return truncateContent(String(input.command), 80);
  }

  // Chrome MCP tools - show relevant params
  if (toolName.startsWith("mcp__claude-in-chrome__")) {
    if (input.url) return String(input.url);
    if (input.query) return String(input.query);
    if (input.tabId) return `tab ${input.tabId}`;
    return "";
  }

  // Default: show first string value or empty
  const firstValue = Object.values(input).find((v) => typeof v === "string");
  return firstValue ? truncateContent(String(firstValue), 80) : "";
}

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
        const displayName = formatToolName(block.name);
        const inputSummary = block.input ? summarizeToolInput(block.name, block.input) : "";

        entries.push({
          type: "tool_use",
          content: inputSummary,
          toolName: displayName,
          toolInput: block.input,
          timestamp,
        });
      }
    }
  }

  return entries;
}

function parseContentBlockStart(block: ClaudeContentBlock, timestamp: number): LogEntry | null {
  if (block.type === "tool_use") {
    const displayName = formatToolName(block.name);
    const inputSummary = block.input ? summarizeToolInput(block.name, block.input) : "";

    return {
      type: "tool_use",
      content: inputSummary,
      toolName: displayName,
      toolInput: block.input,
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
          // Extract content using helper (handles MCP array format)
          const contentStr = extractToolResultContent(block.content);

          // Check for WebFetch redirect
          if (contentStr.startsWith("REDIRECT DETECTED:")) {
            const urlMatch = contentStr.match(/Redirect URL: (https?:\/\/[^\s]+)/);
            entries.push({
              type: "redirect",
              content: urlMatch
                ? `Redirecting to ${urlMatch[1]}`
                : "Redirect detected - follow-up fetch needed",
              timestamp,
            });
            continue;
          }

          entries.push({
            type: block.is_error ? "error" : "tool_result",
            content: truncateContent(contentStr),
            timestamp,
          });
        }
      }
    }
  }

  return entries;
}

function parseResultEvent(event: ClaudeStreamEvent, timestamp: number): LogEntry[] {
  if (event.type !== "result") {
    return [{ type: "info", content: "Result event", timestamp }];
  }

  const entries: LogEntry[] = [];
  const durationSec = event.duration_ms ? (event.duration_ms / 1000).toFixed(1) : "?";

  if (event.subtype === "success") {
    entries.push({
      type: "info",
      content: `Completed in ${durationSec}s (${event.num_turns || "?"} turns)`,
      timestamp,
    });
  } else if (event.subtype === "error") {
    entries.push({
      type: "error",
      content: `Failed after ${durationSec}s`,
      timestamp,
    });
  } else {
    entries.push({
      type: "info",
      content: `Task finished (${durationSec}s)`,
      timestamp,
    });
  }

  if (event.permission_denials && event.permission_denials.length > 0) {
    entries.push({
      type: "error",
      content: `Permission denied: ${event.permission_denials.join(", ")}`,
      timestamp,
    });
  }

  return entries;
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
        entries.push(...parseResultEvent(event, timestamp));
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

      default:
        // Log unknown event types for debugging
        console.warn("[stream-parser] Unknown event type:", (event as { type?: string }).type);
        break;
    }

    return entries;
  } catch (err) {
    console.error("[stream-parser] Failed to parse JSON line:", line.slice(0, 200), err);
    // Return empty rather than error entry to avoid noise from partial chunks
    return [];
  }
}

/**
 * Categorize non-JSON raw output from Claude
 */
export function parseRawOutput(text: string): LogEntry | null {
  return categorizeRawOutput(text, Date.now());
}
