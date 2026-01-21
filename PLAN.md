# Codebase Refactoring Plan

## Overview

This plan identifies areas of code duplication and proposes extracting reusable classes, hooks, and components to improve maintainability. The codebase currently has significant duplication in both the backend API routes and frontend components.

---

## Part 1: Backend Refactoring

### Current State

The backend has **three nearly identical API route handlers** (research, scoring, conversation) totaling ~936 lines with ~40-50% duplication. Additionally, stream routes are 100% duplicated code (320 lines).

### 1.1 Create `JobProcessor` Service Class

**Problem**: The three route handlers (`/api/research`, `/api/scoring`, `/api/conversation`) follow an identical pattern:
1. Parse request with Zod
2. Fetch entity (lead/person)
3. Fetch prompts
4. Create directory with slug
5. Build full prompt
6. Initialize job state
7. Run Effect program with ResearchService
8. Handle errors
9. Handle completion callbacks

**Solution**: Create a unified `JobProcessor` class that handles all job types.

**File**: `lib/services/job-processor.ts`

```typescript
import { Effect } from "effect";

type JobType = "research" | "scoring" | "conversation";

interface JobConfig {
  type: JobType;
  entityId: number;
  entityType: "lead" | "person";
  customPrompt?: string;
  promptTypes: string[];
  outputDir: string;
  onComplete: (result: any) => Promise<void>;
}

class JobProcessor {
  async process(config: JobConfig): Promise<{ jobId: string; status: string }> {
    // 1. Generate jobId
    // 2. Fetch entity and prompts
    // 3. Build full prompt using PromptFormatter
    // 4. Initialize job state
    // 5. Create and run Effect program
    // 6. Return jobId
  }
}
```

**Impact**: Reduces 936 lines → ~400 lines (57% reduction)

---

### 1.2 Create `StreamingService` Class

**Problem**: Three identical stream route handlers (`/api/research/[jobId]/stream`, etc.) with 100% duplication (320 lines).

**Solution**: Single SSE streaming handler.

**File**: `lib/services/streaming-service.ts`

```typescript
class StreamingService {
  async handleStreamRequest(
    jobId: string,
    startIndex: number = 0,
    completionMessage: string = "Job complete"
  ): Promise<ReadableStream> {
    // Unified polling logic
    // SSE event formatting
    // Completion detection
  }
}
```

**Impact**: Reduces 320 lines → ~100 lines (69% reduction)

---

### 1.3 Create `PromptFormatter` Service

**Problem**: Context formatting functions duplicated across routes:
- `formatLeadContext()` - 3 copies
- `formatPersonContext()` - 2 copies

**Solution**: Centralize all prompt/context formatting.

**File**: `lib/services/prompt-formatter.ts`

```typescript
class PromptFormatter {
  formatLead(lead: Lead): string { /* ... */ }
  formatPerson(person: Person): string { /* ... */ }
  formatScoringContext(lead: Lead, config: ScoringConfig): string { /* ... */ }

  buildFullPrompt(opts: {
    systemPrompt: string;
    context: string;
    outputPath: string;
    customPrompt?: string;
  }): string { /* ... */ }
}
```

**Impact**: ~50 lines consolidated, ensures consistent formatting

---

### 1.4 Create `QueryHelpers` Utilities

**Problem**: Multiple similar patterns in `lib/db/queries.ts`:
- `groupByStatus()` - 4 nearly identical functions
- `getAdjacentItems()` - 2 copies
- `getPrompt/savePrompt` - 2 versions each

**Solution**: Generic utility functions.

**File**: `lib/db/query-helpers.ts`

```typescript
// Generic grouping by any status field
export function groupByStatus<T extends { status: string }>(
  items: T[],
  statusValues: string[]
): { grouped: Record<string, T[]>; counts: Record<string, number> } {
  // Unified grouping logic
}

// Generic adjacent item navigation
export function getAdjacentItems<T extends { id: number }>(
  items: T[],
  currentId: number
): { previousId: number | null; nextId: number | null } {
  // Unified navigation logic
}

// Unified prompt handling
export async function getPrompt(type?: string): Promise<Prompt | null> { /* ... */ }
export async function savePrompt(content: string, type?: string): Promise<void> { /* ... */ }
```

**Impact**: ~100 lines reduced in queries.ts

---

### 1.5 Unified Error Handler

**Problem**: Same error handling pattern copy-pasted in all routes:
```typescript
if (err._tag === "QueueTimeoutError") { ... }
if (err._tag === "ClaudeNotFoundError") { ... }
if (err._tag === "ClaudeSpawnError") { ... }
```

**Solution**: Centralize Effect error handling.

**File**: `lib/services/error-handler.ts`

```typescript
export function handleEffectError(error: unknown): NextResponse {
  const err = error as { _tag?: string; message?: string };

  switch (err._tag) {
    case "QueueTimeoutError":
      return serverError("Queue timeout - server is busy");
    case "ClaudeNotFoundError":
      return serverError("Claude CLI not found");
    case "ClaudeSpawnError":
      return serverError(err.message || "Failed to start process");
    default:
      return serverError("An unexpected error occurred");
  }
}
```

**Impact**: ~50 lines consolidated

---

### Backend Summary

| New Abstraction | Location | Estimated Reduction |
|-----------------|----------|---------------------|
| `JobProcessor` | `lib/services/job-processor.ts` | 536 lines |
| `StreamingService` | `lib/services/streaming-service.ts` | 220 lines |
| `PromptFormatter` | `lib/services/prompt-formatter.ts` | 50 lines |
| `QueryHelpers` | `lib/db/query-helpers.ts` | 100 lines |
| `ErrorHandler` | `lib/services/error-handler.ts` | 50 lines |
| **Total** | | **~900 lines (47%)** |

---

## Part 2: Frontend Refactoring

### Current State

The frontend has significant duplication in:
- Job-starting logic (4+ components)
- Empty state UI (5+ instances)
- Markdown rendering (3+ instances)
- Detail page structure (2 nearly identical pages)

### 2.1 Create `useAsyncJob` Hook

**Problem**: Identical job-starting logic in 4+ components:
- `PersonResearchPanel`
- `PersonConversationPanel`
- `LeadResearchPanel`
- `PersonProfileTabs`

All do: set loading → kill existing job → POST to API → add tab → handle errors

**Solution**: Extract into a reusable hook.

**File**: `lib/hooks/use-async-job.ts`

```typescript
interface UseAsyncJobOptions {
  endpoint: string;               // '/api/research', '/api/conversation', etc.
  entityType: 'lead' | 'person';
  entityId: number;
  tabType: 'company' | 'person' | 'conversation';
  label: string;
}

export function useAsyncJob(options: UseAsyncJobOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addTab, setOpen, findTabByEntity, updateStatus } = useStreamPanelStore();

  const startJob = async (customPrompt?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Kill existing job if running
      const existingTab = findTabByEntity(options.entityType, options.entityId);
      if (existingTab?.jobId) {
        await fetch(`${options.endpoint}/${existingTab.jobId}/kill`, { method: 'POST' });
        updateStatus(existingTab.id, 'stopped');
      }

      // 2. Start new job
      const res = await fetch(options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [`${options.entityType}Id`]: options.entityId,
          customPrompt
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start job');
      }

      const { jobId } = await res.json();

      // 3. Add tab and open panel
      addTab({
        type: options.tabType,
        jobId,
        entityId: options.entityId,
        entityType: options.entityType,
        label: options.label,
        status: 'running'
      });
      setOpen(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return { startJob, isLoading, error };
}
```

**Usage**:
```typescript
// In PersonResearchPanel
const { startJob, isLoading, error } = useAsyncJob({
  endpoint: '/api/research',
  entityType: 'person',
  entityId: person.id,
  tabType: 'person',
  label: `Research: ${person.name}`
});

// Just call startJob() on button click
```

**Impact**: Eliminates ~150 lines of duplicated logic

---

### 2.2 Create `AsyncJobEmptyState` Component

**Problem**: Same empty state UI pattern repeated 5+ times:
```tsx
<div className="flex flex-col items-center justify-center py-12">
  <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
  <h3 className="text-lg font-medium mb-2">Title</h3>
  <p className="text-muted-foreground text-center max-w-sm mb-4">Description</p>
  <Button onClick={startJob}>Start Job</Button>
</div>
```

**Solution**: Reusable empty state component.

**File**: `components/ui/async-job-empty-state.tsx`

```typescript
interface AsyncJobEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  buttonLabel: string;
  onButtonClick: () => void;
  isLoading?: boolean;
}

export function AsyncJobEmptyState({
  icon: Icon,
  title,
  description,
  buttonLabel,
  onButtonClick,
  isLoading
}: AsyncJobEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground text-center max-w-sm mb-4">
        {description}
      </p>
      <Button onClick={onButtonClick} disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {buttonLabel}
      </Button>
    </div>
  );
}
```

**Impact**: Eliminates ~100 lines of duplicated UI

---

### 2.3 Create `MarkdownContent` Component

**Problem**: Identical markdown rendering with prose styling in 3+ places:
```tsx
<div className="prose prose-sm max-w-none dark:prose-invert
  prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg...">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

**Solution**: Reusable markdown renderer.

**File**: `components/ui/markdown-content.tsx`

```typescript
interface MarkdownContentProps {
  content: string;
  className?: string;
}

const proseClasses = `
  prose prose-sm max-w-none dark:prose-invert
  prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
  prose-p:text-muted-foreground prose-p:leading-relaxed
  prose-li:text-muted-foreground prose-strong:text-foreground
  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
  prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
`;

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn(proseClasses, className)}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
```

**Impact**: Eliminates ~60 lines, ensures consistent styling

---

### 2.4 Create Detail Page Layout Components

**Problem**: `/app/lead/[id]/page.tsx` and `/app/people/[id]/page.tsx` share nearly identical structure (~350 lines each):
- Header with breadcrumbs, title, navigation
- Property sidebar
- Activity log

**Solution**: Extract shared layout components.

**Files**:
- `components/detail-page/detail-page-header.tsx`
- `components/detail-page/property-panel.tsx`
- `components/detail-page/activity-log.tsx`

```typescript
// detail-page-header.tsx
interface DetailPageHeaderProps {
  breadcrumbs: { label: string; href?: string }[];
  title: string;
  subtitle?: string;
  previousHref?: string;
  nextHref?: string;
  actions?: React.ReactNode;
}

export function DetailPageHeader({ ... }: DetailPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex items-center gap-2">
        {previousHref && <Link href={previousHref}>← Prev</Link>}
        {nextHref && <Link href={nextHref}>Next →</Link>}
        {actions}
      </div>
    </div>
  );
}

// property-panel.tsx
interface Property {
  icon: React.ComponentType;
  label: string;
  value: React.ReactNode;
}

interface PropertyPanelProps {
  title: string;
  properties: Property[];
}

export function PropertyPanel({ title, properties }: PropertyPanelProps) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {properties.map((prop, i) => (
          <div key={i} className="flex items-center gap-2">
            <prop.icon className="h-4 w-4" />
            <span className="text-muted-foreground">{prop.label}:</span>
            <span>{prop.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// activity-log.tsx
interface ActivityLogProps {
  events: { timestamp: string; message: string }[];
}

export function ActivityLog({ events }: ActivityLogProps) {
  return (
    <div className="space-y-2">
      {events.map((event, i) => (
        <div key={i} className="flex gap-2 text-sm">
          <span className="text-muted-foreground">{event.timestamp}</span>
          <span>{event.message}</span>
        </div>
      ))}
    </div>
  );
}
```

**Impact**: Reduces each detail page from ~350 lines to ~150 lines

---

### 2.5 Create `useJsonApi` Hook

**Problem**: Same fetch pattern repeated everywhere:
```typescript
const res = await fetch('/api/endpoint', { method: 'POST', ... });
const data = await res.json();
if (!res.ok) throw new Error(data.error || 'Request failed');
```

**Solution**: Type-safe API wrapper hook.

**File**: `lib/hooks/use-json-api.ts`

```typescript
export function useJsonApi() {
  const request = async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data as T;
  };

  return { request };
}
```

**Impact**: Cleaner API calls, consistent error handling

---

### Frontend Summary

| New Abstraction | Location | Estimated Reduction |
|-----------------|----------|---------------------|
| `useAsyncJob` | `lib/hooks/use-async-job.ts` | 150 lines |
| `AsyncJobEmptyState` | `components/ui/async-job-empty-state.tsx` | 100 lines |
| `MarkdownContent` | `components/ui/markdown-content.tsx` | 60 lines |
| `DetailPageHeader` | `components/detail-page/detail-page-header.tsx` | 100 lines |
| `PropertyPanel` | `components/detail-page/property-panel.tsx` | 80 lines |
| `ActivityLog` | `components/detail-page/activity-log.tsx` | 40 lines |
| `useJsonApi` | `lib/hooks/use-json-api.ts` | 30 lines |
| **Total** | | **~560 lines** |

---

## Implementation Order

### Phase 1: High-Impact Backend (Day 1-2)
1. Create `PromptFormatter` service
2. Create `ErrorHandler` utility
3. Create `JobProcessor` service
4. Refactor `/api/research`, `/api/scoring`, `/api/conversation` to use JobProcessor

### Phase 2: Stream Consolidation (Day 2)
1. Create `StreamingService`
2. Consolidate 3 stream routes into 1 generic handler

### Phase 3: Frontend Hooks (Day 3)
1. Create `useAsyncJob` hook
2. Create `useJsonApi` hook
3. Refactor panels to use new hooks

### Phase 4: Frontend Components (Day 3-4)
1. Create `AsyncJobEmptyState`
2. Create `MarkdownContent`
3. Refactor panels to use new components

### Phase 5: Detail Pages (Day 4)
1. Create `DetailPageHeader`, `PropertyPanel`, `ActivityLog`
2. Refactor lead and person detail pages

### Phase 6: Database Helpers (Day 4)
1. Create `QueryHelpers`
2. Refactor `lib/db/queries.ts`

---

## Expected Outcomes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Backend API Lines | ~1,900 | ~1,000 | 47% reduction |
| Frontend Component Lines | ~2,100 | ~1,500 | 29% reduction |
| Duplicated Patterns | 15+ | 0 | Eliminated |
| New Reusable Abstractions | 0 | 12 | Highly maintainable |

### Benefits
1. **Consistency**: All job-starting flows use identical logic
2. **Testability**: Services can be unit tested in isolation
3. **Maintainability**: Bug fixes apply everywhere automatically
4. **Extensibility**: Adding new job types requires minimal code
5. **Type Safety**: Centralized types prevent mismatches
