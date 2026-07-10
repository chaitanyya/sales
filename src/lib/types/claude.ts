// Log entry types
export type LogEntryType =
  | "system"
  | "assistant"
  | "thinking"
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

interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  server_tool_use?: {
    web_search_requests?: number;
  };
}

// Aggregated usage stats for display
interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  totalCostUsd?: number;
  webSearchRequests?: number;
}

// Metadata for tool results
interface ToolResultMetadata {
  durationMs?: number;
  durationSeconds?: number; // WebSearch uses seconds
  numFiles?: number;
  truncated?: boolean;
  query?: string; // WebSearch query
  urls?: string[]; // WebSearch result URLs
  tabId?: number; // Chrome MCP tab ID
}

// Content block types
interface ClaudeTextBlock {
  type: "text";
  text: string;
}

interface ClaudeToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ClaudeThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface ClaudeToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | Array<{ type: string; text?: string }>; // Can be array for MCP
  is_error?: boolean;
}

export type ClaudeContentBlock =
  ClaudeTextBlock | ClaudeToolUseBlock | ClaudeThinkingBlock | ClaudeToolResultBlock;

// System init event
interface ClaudeSystemInitEvent {
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

interface ClaudeTaskStartedEvent {
  type: "system";
  subtype: "task_started";
  task_id: string;
  description: string;
  subagent_type?: string;
  skip_transcript?: boolean;
}

interface ClaudeTaskProgressEvent {
  type: "system";
  subtype: "task_progress";
  task_id: string;
  description: string;
  summary?: string;
  last_tool_name?: string;
  skip_transcript?: boolean;
}

interface ClaudeTaskUpdatedEvent {
  type: "system";
  subtype: "task_updated";
  task_id: string;
  patch: {
    status?: "pending" | "running" | "completed" | "failed" | "killed" | "paused";
    description?: string;
    error?: string;
  };
}

interface ClaudeTaskNotificationEvent {
  type: "system";
  subtype: "task_notification";
  task_id: string;
  status: "completed" | "failed" | "stopped";
  summary: string;
  skip_transcript?: boolean;
}

// Assistant message event
interface ClaudeAssistantEvent {
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
interface ClaudeUserEvent {
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
interface ClaudeResultEvent {
  type: "result";
  subtype:
    | "success"
    | "error_during_execution"
    | "error_max_turns"
    | "error_max_budget_usd"
    | "error_max_structured_output_retries";
  is_error: boolean;
  duration_ms: number;
  total_cost_usd: number;
  num_turns: number;
  result?: string;
  session_id: string;
  uuid: string;
  usage?: ClaudeUsage;
  permission_denials?: Array<{
    tool_name: string;
    tool_use_id: string;
    tool_input: Record<string, unknown>;
  }>;
  errors?: string[];
}

// Content block streaming events
interface ClaudeContentBlockStartEvent {
  type: "content_block_start";
  content_block: ClaudeContentBlock;
}

interface ClaudeContentBlockDeltaEvent {
  type: "content_block_delta";
  delta: { text?: string };
}

// Error event
interface ClaudeErrorEvent {
  type: "error";
  error: string;
}

// Tool result event (legacy format)
interface ClaudeToolResultEvent {
  type: "tool_result";
  tool_use_id: string;
  output?: string;
  is_error?: boolean;
}

// Browser/MCP events
interface ClaudeBrowserEvent {
  type: "browser" | "mcp";
  message?: unknown;
}

// Union type of all stream events
export type ClaudeStreamEvent =
  | ClaudeSystemInitEvent
  | ClaudeTaskStartedEvent
  | ClaudeTaskProgressEvent
  | ClaudeTaskUpdatedEvent
  | ClaudeTaskNotificationEvent
  | ClaudeAssistantEvent
  | ClaudeUserEvent
  | ClaudeResultEvent
  | ClaudeContentBlockStartEvent
  | ClaudeContentBlockDeltaEvent
  | ClaudeErrorEvent
  | ClaudeToolResultEvent
  | ClaudeBrowserEvent;
