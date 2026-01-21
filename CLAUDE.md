# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun run dev          # Start Next.js dev server at localhost:3000
bun run build        # Production build
bun run lint         # ESLint
bun run lint:fix     # ESLint with auto-fix
bun run format       # Prettier format all files

# Database (SQLite with Drizzle ORM)
bun run db:push      # Push schema changes to database
bun run db:seed      # Seed prompts and scoring config
bun run db:studio    # Open Drizzle Studio browser
bun run db:reset     # Delete and recreate database with seed data
```

## Architecture

This is a lead research and qualification system that uses Claude CLI to research companies and score leads.

### Core Data Flow

1. User triggers research via `/api/research` → Job initialized with unique ID
2. Claude CLI spawned as child process with `--output-format stream-json`
3. Output buffered in memory (`lib/research/job-state.ts`) → Polled via SSE at `/api/research/[jobId]/stream`
4. Client maintains EventSource connection with retry logic (`lib/stream/`)
5. On completion: output files parsed → DB updated → UI revalidated

### Key Directories

- **`/app/api`** - REST endpoints for research, scoring, conversation generation
- **`/lib/research`** - Claude CLI integration with Effect-based job queue (max 5 concurrent)
- **`/lib/db`** - Drizzle queries with React `cache()` wrapper
- **`/lib/prompts`** - Prompt builders for research, scoring, conversation
- **`/lib/stream`** - SSE client with exponential backoff retry
- **`/lib/store`** - Zustand store for stream panel UI state (persisted to localStorage)
- **`/db/schema.ts`** - Database schema: leads, people, prompts, scoringConfig, leadScores

### Research System

The research engine in `/lib/research/effect-runtime.ts` manages Claude CLI processes:
- Semaphore-based concurrency (max 5 jobs)
- 30s queue timeout, 10min job timeout
- Graceful shutdown with SIGTERM/SIGKILL fallback
- Global state persists across HMR via `globalThis`

Research outputs are written to temp directories:
- Company research → `profile.md` + `people.json`
- Person research → stored directly in person record

### Database Schema

- **leads** - Companies with research status, profile markdown, industry tags
- **people** - Contacts per lead with LinkedIn, title, management level
- **prompts** - Configurable templates (company, person, overview types)
- **scoringConfig** - Required characteristics, demand signifiers, tier thresholds
- **leadScores** - Qualification results with tier (hot/warm/nurture/disqualified)

### Streaming Pattern

Stream panels use Zustand with localStorage persistence. The `StreamManager` singleton manages EventSource connections with:
- Connection status tracking
- Exponential backoff (250ms base, 2x multiplier, 10s max)
- Auto-resume from last event index on page reload

### Environment

- `DATABASE_URL` - SQLite path (default: `./data.db`)
- `CLAUDE_PATH` - Optional explicit path to Claude CLI
