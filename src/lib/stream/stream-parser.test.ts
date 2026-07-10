import { describe, expect, test } from "bun:test";

import { parseStreamJsonEvent } from "./stream-parser";

function parse(event: Record<string, unknown>) {
  return parseStreamJsonEvent(JSON.stringify(event));
}

describe("Claude stream parsing", () => {
  test("parses MCP tool commands and their input", () => {
    const [entry] = parse({
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            id: "tool-1",
            name: "mcp__claude-in-chrome__get_page_text",
            input: { tabId: 42 },
          },
        ],
      },
    });

    expect(entry).toMatchObject({
      type: "tool_use",
      toolName: "Chrome: Get Page Text",
      content: "tab 42",
      toolInput: { tabId: 42 },
    });
  });

  test("parses the full task lifecycle", () => {
    expect(
      parse({
        type: "system",
        subtype: "task_started",
        task_id: "task-1",
        description: "Research account",
        subagent_type: "researcher",
      })[0]
    ).toMatchObject({
      type: "progress",
      content: "Started task: Research account",
      toolName: "researcher",
    });

    expect(
      parse({
        type: "system",
        subtype: "task_progress",
        task_id: "task-1",
        description: "Reading sources",
        summary: "Comparing three sources",
        last_tool_name: "WebSearch",
      })[0]
    ).toMatchObject({
      type: "progress",
      content: "Comparing three sources",
      toolName: "Web Search",
    });

    expect(
      parse({
        type: "system",
        subtype: "task_updated",
        task_id: "task-1",
        patch: { status: "failed", error: "Network unavailable" },
      })[0]
    ).toMatchObject({ type: "error", content: "Task failed: Network unavailable" });

    expect(
      parse({
        type: "system",
        subtype: "task_notification",
        task_id: "task-1",
        status: "completed",
        summary: "Research complete",
      })[0]
    ).toMatchObject({ type: "info", content: "Task completed: Research complete" });
  });

  test("does not report current Claude execution errors as successful tasks", () => {
    const entries = parse({
      type: "result",
      subtype: "error_during_execution",
      is_error: true,
      duration_ms: 1250,
      num_turns: 2,
      errors: ["Process exited unexpectedly"],
      permission_denials: [
        { tool_name: "Bash", tool_use_id: "tool-2", tool_input: { command: "false" } },
      ],
    });

    expect(entries[0]).toMatchObject({
      type: "error",
      content: "Failed after 1.3s: Process exited unexpectedly",
    });
    expect(entries[1]).toMatchObject({ type: "error", content: "Permission denied: Bash" });
  });

  test("hides task events marked as transcript noise", () => {
    expect(
      parse({
        type: "system",
        subtype: "task_started",
        task_id: "ambient",
        description: "Housekeeping",
        skip_transcript: true,
      })
    ).toEqual([]);
  });
});
