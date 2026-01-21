// Log entry types
export type LogEntryType =
  | "system"
  | "assistant"
  | "tool_use"
  | "tool_result"
  | "error"
  | "info"
  | "progress"
  | "browser"
  | "redirect"; // WebFetch redirects

// Server-side log entry (numeric timestamp)
export interface LogEntry {
  type: LogEntryType;
  content: string;
  toolName?: string;
  timestamp: number;
  // Extended fields for enhanced logging
  usage?: UsageStats;
  metadata?: ToolResultMetadata;
  toolInput?: Record<string, unknown>;
}

// Client-side log entry (Date object + id)
export interface ClientLogEntry extends Omit<LogEntry, "timestamp"> {
  id: string;
  timestamp: Date;
}

// Job status
export type JobStatus = "running" | "completed" | "error" | "timeout";

// SSE event types
export interface SSELogEvent {
  type: "log";
  logType: LogEntryType;
  content: string;
  toolName?: string;
  timestamp: number;
}

export interface SSECompleteEvent {
  type: "complete";
  message: string;
}

export interface SSEErrorEvent {
  type: "error";
  message: string;
}

export type SSEEvent = SSELogEvent | SSECompleteEvent | SSEErrorEvent;

// Claude CLI stream-json events (raw from CLI)

// Usage info from Claude API
export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  server_tool_use?: {
    web_search_requests?: number;
  };
}

// Aggregated usage stats for display
export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  totalCostUsd?: number;
  webSearchRequests?: number;
}

// Metadata for tool results
export interface ToolResultMetadata {
  durationMs?: number;
  durationSeconds?: number;  // WebSearch uses seconds
  numFiles?: number;
  truncated?: boolean;
  query?: string;           // WebSearch query
  urls?: string[];          // WebSearch result URLs
  tabId?: number;           // Chrome MCP tab ID
}

// Content block types
export interface ClaudeTextBlock {
  type: "text";
  text: string;
}

export interface ClaudeToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | Array<{ type: string; text?: string }>;  // Can be array for MCP
  is_error?: boolean;
}

export type ClaudeContentBlock = ClaudeTextBlock | ClaudeToolUseBlock | ClaudeToolResultBlock;

// System init event
export interface ClaudeSystemInitEvent {
  type: "system";
  subtype: "init";
  cwd: string;
  session_id: string;
  tools: string[];
  model: string;
  mcp_servers?: string[];
  claude_code_version: string;
  agents?: string[];
  uuid: string;
}

// Assistant message event
export interface ClaudeAssistantEvent {
  type: "assistant";
  message: {
    model: string;
    id: string;
    role: "assistant";
    content: ClaudeContentBlock[];
    usage: ClaudeUsage;
  };
  session_id: string;
  uuid: string;
}

// User event (tool results)
export interface ClaudeUserEvent {
  type: "user";
  message: {
    role: "user";
    content: ClaudeToolResultBlock[];
  };
  tool_use_result?: {
    stdout?: string;
    stderr?: string;
    interrupted?: boolean;
  };
  session_id: string;
  uuid: string;
}

// Result event
export interface ClaudeResultEvent {
  type: "result";
  subtype: "success" | "error";
  is_error: boolean;
  duration_ms: number;
  total_cost_usd: number;
  num_turns: number;
  result?: string;
  session_id: string;
  uuid: string;
  usage?: ClaudeUsage;
  permission_denials?: string[];
}

// Content block streaming events
export interface ClaudeContentBlockStartEvent {
  type: "content_block_start";
  content_block: ClaudeContentBlock;
}

export interface ClaudeContentBlockDeltaEvent {
  type: "content_block_delta";
  delta: { text?: string };
}

// Error event
export interface ClaudeErrorEvent {
  type: "error";
  error: string;
}

// Tool result event (legacy format)
export interface ClaudeToolResultEvent {
  type: "tool_result";
  tool_use_id: string;
  output?: string;
  is_error?: boolean;
}

// Browser/MCP events
export interface ClaudeBrowserEvent {
  type: "browser" | "mcp";
  message?: unknown;
}

// Union type of all stream events
export type ClaudeStreamEvent =
  | ClaudeSystemInitEvent
  | ClaudeAssistantEvent
  | ClaudeUserEvent
  | ClaudeResultEvent
  | ClaudeContentBlockStartEvent
  | ClaudeContentBlockDeltaEvent
  | ClaudeErrorEvent
  | ClaudeToolResultEvent
  | ClaudeBrowserEvent;
