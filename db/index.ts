import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { env } from "@/lib/env";

// Resolve database path (supports relative and absolute paths)
const dbPath = path.isAbsolute(env.DATABASE_URL)
  ? env.DATABASE_URL
  : path.join(process.cwd(), env.DATABASE_URL);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

export * from "./schema";
