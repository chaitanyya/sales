import { describe, expect, test } from "bun:test";

import modelConfig from "./claude-models.json";

const EXPECTED_SUPPORTED_MODELS = [
  "claude-fable-5",
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-haiku-4-5",
];

describe("Claude model configuration", () => {
  test("contains every generally available Claude model", () => {
    expect(modelConfig.models.map((model) => model.value)).toEqual(EXPECTED_SUPPORTED_MODELS);
  });

  test("uses a configured model as the default", () => {
    expect(EXPECTED_SUPPORTED_MODELS).toContain(modelConfig.defaultModel);
  });

  test("has unique identifiers and display labels", () => {
    expect(new Set(modelConfig.models.map((model) => model.value)).size).toBe(
      modelConfig.models.length
    );
    expect(new Set(modelConfig.models.map((model) => model.label)).size).toBe(
      modelConfig.models.length
    );
  });
});
