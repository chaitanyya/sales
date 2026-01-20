import { z } from "zod";

/**
 * Environment variable schema
 * Validates and provides type-safe access to environment variables
 */
const envSchema = z.object({
  // Database path (defaults to ./data.db in project root)
  DATABASE_URL: z.string().default("./data.db"),

  // Path to Claude CLI executable (optional, auto-detected if not set)
  CLAUDE_PATH: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * Parsed and validated environment variables
 */
export const env = envSchema.parse(process.env);

/**
 * Type for the environment object
 */
export type Env = z.infer<typeof envSchema>;
