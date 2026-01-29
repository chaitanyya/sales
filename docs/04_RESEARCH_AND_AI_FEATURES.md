# Research & AI Features - Comprehensive Technical Documentation

**Liidi Application - Section 4**

This document provides an extremely detailed technical analysis of the Research & AI features in the Liidi B2B lead research and qualification application.

---

## Table of Contents

1. [Research Job Types](#1-research-job-types)
2. [Research Architecture](#2-research-architecture)
3. [Research Prompts](#3-research-prompts)
4. [Research Data Flow](#4-research-data-flow)
5. [Research UI Components](#5-research-ui-components)
6. [Event Handling](#6-event-handling)
7. [Configuration](#7-configuration)
8. [Job Completion & Result Processing](#8-job-completion--result-processing)

---

## 1. Research Job Types

The application implements **4 distinct job types** for AI-powered research and analysis.

### 1.1 Company Research (`JobType::CompanyResearch`)

**Purpose**: Comprehensive company research and profiling

**Trigger**: `start_research()` command (`src-tauri/src/commands/research.rs:140-266`)

**Entity**: Lead (company)

**Output Files**:
| File | Description |
|------|-------------|
| `company_profile.md` | Detailed company research profile in Markdown |
| `people.json` | Extracted key personnel data |
| `enrichment.json` | Structured company metadata |

**Status Tracking**: `research_status` field in leads table (pending → in_progress → completed/failed)

**Use Case**: When a user wants to research a target company to understand their business, market position, technology stack, and key decision makers.

### 1.2 Person Research (`JobType::PersonResearch`)

**Purpose**: Individual professional background research

**Trigger**: `start_person_research()` command (`src-tauri/src/commands/research.rs:268-364`)

**Entity**: Person

**Output Files**:
| File | Description |
|------|-------------|
| `person_profile.md` | Detailed person research profile in Markdown |
| `enrichment.json` | Structured person metadata |

**Status Tracking**: `research_status` field in people table

**Use Case**: When a user wants to research a specific contact to understand their professional background, expertise, and decision-making role.

### 1.3 Scoring (`JobType::Scoring`)

**Purpose**: Lead scoring based on configurable criteria

**Trigger**: `start_scoring()` command (`src-tauri/src/commands/research.rs:466-561`)

**Entity**: Lead

**Output Files**:
| File | Description |
|------|-------------|
| `score.json` | Scoring results with breakdown |

**No Status Field**: Scoring doesn't affect entity research status

**Use Case**: When a user wants to evaluate a lead against defined criteria to determine priority tier (Hot/Warm/Nurture/DQ).

### 1.4 Conversation Generation (`JobType::Conversation`)

**Purpose**: Generate personalized conversation topics and talking points

**Trigger**: `start_conversation_generation()` command (`src-tauri/src/commands/research.rs:366-464`)

**Entity**: Person

**Output Files**:
| File | Description |
|------|-------------|
| `conversation.md` | Conversation strategies and topics |

**No Status Field**: Conversation generation doesn't affect research status

**Use Case**: When preparing for sales outreach and needing personalized talking points.

---

## 2. Research Architecture

### 2.1 Job Queue System

**File**: `src-tauri/src/jobs/queue.rs`

#### Core Components

| Component | Description |
|-----------|-------------|
| **Semaphore** | Controls maximum concurrent jobs (5) |
| **Active Jobs Map** | Tracks running jobs with cancellation channels |
| **Job Guard** | RAII pattern for automatic cleanup |
| **Timeout Protection** | 10-minute timeout per job |

#### Job Queue Structure

```rust
pub struct JobQueue {
    semaphore: Arc<Semaphore>,        // Max 5 permits
    active_jobs: Arc<Mutex<HashMap<String, ActiveJob>>>,
}

struct ActiveJob {
    cancel_tx: mpsc::Sender<()>,      // Cancellation channel
    status: String,                   // "queued", "running", etc.
}

struct JobGuard {
    // RAII guard - removes job on drop
}
```

#### Job Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                        JOB LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. CREATION                                                        │
│     ├─ Generate UUID                                               │
│     ├─ Persist to database (status: "queued")                      │
│     └─ Create ActiveJob entry                                      │
│                                                                     │
│  2. SEMAPHORE ACQUISITION                                          │
│     ├─ Wait for permit (30s timeout)                               │
│     └─ Update status to "running"                                  │
│                                                                     │
│  3. PROCESS SPAWNING                                                │
│     ├─ Invoke Claude CLI                                           │
│     ├─ Set up output streams                                       │
│     └─ Start StreamProcessor                                       │
│                                                                     │
│  4. EXECUTION                                                       │
│     ├─ StreamProcessor reads stdout/stderr                         │
│     ├─ Parse and batch insert logs (3 per batch)                   │
│     ├─ Emit real-time events to frontend                           │
│     └─ Monitor for timeout (10 min)                                │
│                                                                     │
│  5. COMPLETION                                                      │
│     ├─ Wait for process exit                                       │
│     ├─ Verify output files exist                                   │
│     ├─ Parse and validate outputs                                  │
│     ├─ Update database atomically                                  │
│     └─ Clean up temporary files                                    │
│                                                                     │
│  6. CLEANUP                                                         │
│     ├─ Remove from active_jobs map                                 │
│     ├─ Update final status ("completed" or "error")                │
│     └─ Emit completion events                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Concurrency Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `MAX_CONCURRENT_JOBS` | 5 | Maximum jobs running simultaneously |
| `SEMAPHORE_TIMEOUT` | 30 seconds | Time to wait for semaphore permit |
| `JOB_TIMEOUT` | 600 seconds (10 min) | Maximum job execution time |
| `LOG_BUFFER_FLUSH_SIZE` | 3 | Logs per batch insert |
| `MAX_ACCUMULATED_OUTPUT_SIZE` | 10MB | Output truncation threshold |

### 2.2 Claude CLI Integration

**File**: `src-tauri/src/jobs/queue.rs`

#### Command Construction

```rust
let mut command = Command::new(&claude_path);
command
    .args(&[
        "-p",                          // Positional prompt
        "--output-format", "stream-json",
        "--verbose",
        "--dangerously-skip-permissions",
    ])
    .current_dir(&working_dir)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .kill_on_drop(true);
```

#### Model Selection

| Model | Description | Use Case |
|-------|-------------|----------|
| `claude-3-opus` | Highest quality, slower | Complex research, detailed scoring |
| `claude-3-sonnet` | Balanced speed/quality | Standard research, conversations |

#### Optional Features

| Feature | Flag | Description |
|---------|------|-------------|
| Chrome Mode | `--chrome` | Enable web search capability |
| GLM Gateway | (endpoint override) | Alternative endpoint for Z.ai integration |

### 2.3 Streaming Mechanisms

**File**: `src-tauri/src/jobs/stream_processor.rs`

#### StreamProcessor Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     STREAM PROCESSOR                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STDOUT/STDERR                                                   │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────┐                   │
│  │   Read Line (Buffered)                   │                   │
│  └────────────────────┬─────────────────────┘                   │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────┐                   │
│  │   Parse JSON Event (or fallback to raw)  │                   │
│  └────────────────────┬─────────────────────┘                   │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────┐                   │
│  │   Create ClientLogEntry                  │                   │
│  │   - id, type, content, timestamp         │                   │
│  └────────────────────┬─────────────────────┘                   │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────┐                   │
│  │   Accumulate in Buffer                    │                   │
│  │   (Flush when size ≥ 3)                   │                   │
│  └────────────────────┬─────────────────────┘                   │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────┐                   │
│  │   Batch Insert to Database               │                   │
│  │   Emit Tauri Events to Frontend          │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Log Entry Types

| Type | Icon | Description |
|------|------|-------------|
| `system` | ⚙️ | System messages, job lifecycle |
| `assistant` | 💬 | Claude assistant responses |
| `tool_use` | → | Tool being invoked |
| `tool_result` | ✓ | Tool execution result |
| `error` | ❌ | Error messages |
| `browser` | 🌐 | Browser automation output |
| `progress` | ⏱️ | Progress indicators |
| `redirect` | 🔗 | URL redirects |

---

## 3. Research Prompts

### 3.1 Default Prompts

**Location**: `src-tauri/src/prompts/defaults/`

#### Company Research Prompt (`company.md`)

```markdown
Research the following company and provide a comprehensive profile.

## Company Information
- Company Name: {{company_name}}
- Website: {{website}}
- Location: {{city}}, {{state}}, {{country}}

## Research Instructions

Gather and analyze information about this company including:

1. **Business Overview**: What does the company do? What products or services do they offer?
2. **Market Position**: Who are their main competitors? What is their market share or position?
3. **Recent News**: Any recent announcements, funding rounds, partnerships, or significant events?
4. **Technology Stack**: What technologies do they use? Any public information about their tech infrastructure?
5. **Company Culture**: What is their company culture like? Any notable values or initiatives?
6. **Growth Indicators**: Signs of growth or expansion (hiring, new offices, product launches)?
7. **Potential Pain Points**: Based on their industry and size, what challenges might they face?
```

#### Person Research Prompt (`person.md`)

```markdown
Research the following person and provide a detailed professional profile.

## Person Information
- Name: {{first_name}} {{last_name}}
- Title: {{title}}
- Company: {{company_name}}
- LinkedIn: {{linkedin_url}}

## Research Instructions

Gather and analyze information about this person including:

1. **Professional Background**: Career history, previous roles, and companies
2. **Current Role**: Responsibilities and duration in position
3. **Expertise & Skills**: Areas of specialization
4. **Education**: Educational background and certifications
5. **Public Presence**: Articles, podcasts, conference talks
6. **Professional Interests**: Topics they engage with publicly
7. **Decision-Making Role**: What purchasing decisions they might influence
8. **Communication Style**: Insights into their communication preferences
```

#### Conversation Topics Prompt (`conversation_topics.md`)

```markdown
Generate personalized conversation topics and talking points for outreach.

## Context
- Person: {{first_name}} {{last_name}}
- Title: {{title}}
- Company: {{company_name}}

## Person Profile
{{person_profile}}

## Company Profile
{{company_profile}}

## Instructions

Based on the profiles above, generate:

1. **Ice Breakers**: 3-5 personalized conversation starters
2. **Value Propositions**: How our offering addresses their challenges
3. **Discovery Questions**: Thoughtful questions for understanding needs
4. **Common Ground**: Shared connections or experiences
5. **Timing Triggers**: Recent events making this a good time to reach out
6. **Objection Handling**: Potential concerns and how to address them
7. **Next Steps**: Suggested actions after the conversation
```

### 3.2 Prompt Building Functions

**File**: `src-tauri/src/commands/research.rs`

#### Company Research Prompt Builder (`build_research_prompt`)

**Lines**: 359-410

```rust
fn build_research_prompt(
    prompt: &str,
    lead: &db::Lead,
    profile_path: &std::path::Path,
    people_path: &std::path::Path,
    enrichment_path: &std::path::Path,
    company_overview: Option<&str>,
) -> String
```

**Builds the following sections**:
1. Company overview (if available)
2. User prompt or default
3. Lead data (company name, website, industry, location)
4. Output file instructions with JSON schemas
5. Enrichment data requirements

#### Person Research Prompt Builder (`build_person_research_prompt`)

**Lines**: 412-459

```rust
fn build_person_research_prompt(
    prompt: &str,
    person: &db::Person,
    lead: Option<&db::Lead>,
    profile_path: &std::path::Path,
    enrichment_path: &std::path::Path,
    company_overview: Option<&str>,
) -> String
```

**Builds the following sections**:
1. Company overview (if available)
2. User prompt or default
3. Person data (name, title, email, LinkedIn)
4. Company data (if associated)
5. Output file instructions

#### Scoring Prompt Builder (`build_scoring_prompt`)

**Lines**: 687-877

```rust
fn build_scoring_prompt(
    lead: &db::Lead,
    people: &[db::Person],
    config: &db::ParsedScoringConfig,
    output_path: &std::path::Path,
) -> String
```

**Builds the following sections**:
1. Lead context with all people
2. Required characteristics (pass/fail gates)
3. Demand signifiers (weighted scoring factors)
4. Tier thresholds configuration
5. JSON output schema

### 3.3 Prompt Management

| Prompt Type | Has Default | Storage | Usage |
|-------------|-------------|---------|-------|
| `company` | ✅ | Database | Company research |
| `person` | ✅ | Database | Person research |
| `conversation_topics` | ✅ | Database | Conversation generation |
| `company_overview` | ❌ | Database | Injected into all research |

---

## 4. Research Data Flow

### 4.1 Input Data Structures

#### Lead (Company Research Input)

```rust
pub struct Lead {
    pub id: i64,
    pub company_name: String,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
    pub employee_range: Option<String>,
    pub revenue_range: Option<String>,
    // ... other fields
}
```

#### Person (Person Research Input)

```rust
pub struct Person {
    pub id: i64,
    pub lead_id: Option<i64>,
    pub first_name: String,
    pub last_name: String,
    pub title: Option<String>,
    pub email: Option<String>,
    pub linkedin_url: Option<String>,
    pub management_level: Option<String>,
    pub year_joined: Option<i64>,
}
```

### 4.2 Output Data Structures

#### Company Research Output

```rust
pub struct VerifiedOutputs {
    pub primary_content: String,           // company_profile.md
    pub secondary_content: Option<String>,  // people.json
    pub enrichment_content: Option<String>, // enrichment.json
}

pub enum ParsedOutput {
    CompanyResearch {
        profile: String,
        people: Option<Vec<PersonData>>,
        enrichment: Option<LeadEnrichment>,
    },
    // ...
}
```

#### Person Research Output

```rust
pub enum ParsedOutput {
    PersonResearch {
        profile: String,
        enrichment: Option<PersonEnrichment>,
    },
    // ...
}
```

### 4.3 Enrichment Data

**File**: `src-tauri/src/jobs/enrichment.rs`

#### LeadEnrichment Structure

```rust
#[derive(Debug, Deserialize, Default, Clone)]
pub struct LeadEnrichment {
    pub website: Option<String>,
    pub industry: Option<String>,
    pub sub_industry: Option<String>,
    pub employees: Option<i64>,
    pub employee_range: Option<String>,
    pub revenue: Option<f64>,
    pub revenue_range: Option<String>,
    pub company_linkedin_url: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
}
```

#### PersonEnrichment Structure

```rust
#[derive(Debug, Deserialize, Default, Clone)]
pub struct PersonEnrichment {
    pub email: Option<String>,
    pub title: Option<String>,
    pub management_level: Option<String>,
    pub linkedin_url: Option<String>,
    pub year_joined: Option<i64>,
}
```

### 4.4 Database Storage Flow

**File**: `src-tauri/src/jobs/completion_handler.rs`

```
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE STORAGE FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COMPANY RESEARCH                                               │
│  ├─ Update leads table                                         │
│  │   └─ SET research_status = 'completed'                      │
│  │   └─ SET company_profile = (markdown)                       │
│  ├─ Delete existing people for lead                            │
│  ├─ Insert new people from people.json                         │
│  └─ Apply enrichment (only NULL fields)                        │
│                                                                 │
│  PERSON RESEARCH                                                │
│  ├─ Update people table                                        │
│  │   └─ SET research_status = 'completed'                      │
│  │   └─ SET person_profile = (markdown)                       │
│  └─ Apply enrichment (only NULL fields)                        │
│                                                                 │
│  SCORING                                                        │
│  ├─ Delete existing score for lead                             │
│  └─ INSERT INTO lead_scores                                    │
│      └─ (lead_id, config_id, passes_requirements,              │
│          requirement_results, total_score, score_breakdown,     │
│          tier, scoring_notes, scored_at, created_at)           │
│                                                                 │
│  CONVERSATION                                                   │
│  └─ Update people table                                        │
│      └─ SET conversation_topics = (markdown)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Research UI Components

### 5.1 Research Triggering

#### Lead Research Button

**File**: `src/components/leads/research-button.tsx`

```typescript
interface ResearchButtonProps {
  lead: Lead;
}

// Disabled when research_status === "in_progress" or job active
// Navigates to /lead/{lead.id} on click
```

#### Person Research Button

**File**: `src/components/people/research-button.tsx`

```typescript
interface ResearchButtonProps {
  person: Person;
}

// Disabled when job active
// Includes event propagation stop for list item clicks
```

### 5.2 Research Results Display

#### Lead Research Panel

**File**: `src/components/lead/lead-research-panel.tsx`

**Three-tab interface**:
| Tab | Icon | Content |
|-----|------|---------|
| Company | 🏢 | `company_profile.md` rendered as markdown |
| People | 👥 | List of extracted people with status badges |
| Score | 🎯 | Score breakdown if available |

#### Person Research Panel

**File**: `src/components/people/person-research-panel.tsx`

- Displays `person_profile.md` as markdown
- Empty state with "Start Research" button when no data

#### Conversation Panel

**File**: `src/components/people/person-conversation-panel.tsx`

- Displays `conversation.md` as markdown
- Empty state with "Generate Topics" button

#### Markdown Renderer

**File**: `src/components/ui/markdown-renderer.tsx`

```typescript
// Uses react-markdown with remarkGfm
// Terminal-styled prose classes
// Compact mode available
```

### 5.3 Stream Panel System

**Directory**: `src/components/stream-panel/`

#### Component Structure

| Component | File | Description |
|-----------|------|-------------|
| StreamPanel | `stream-panel.tsx` | Main container with conditional rendering |
| StreamPanelHeader | `stream-panel-header.tsx` | Tabs, controls, active job info |
| StreamPanelTabs | `stream-panel-tabs.tsx` | Horizontal scrollable tab bar |
| StreamPanelContent | `stream-panel-content.tsx` | Log entries with color coding |
| StreamPanelWrapper | `stream-panel-wrapper.tsx` | Resizable panel group |

#### Tab Display

```
┌─────────────────────────────────────────────────────────────┐
│ [🏢 Company Name] [👤 Person Name] [💬 Conversation] ...   │
│      ✓              ⏱️                                       │
└─────────────────────────────────────────────────────────────┘
```

| Status Icon | Description |
|-------------|-------------|
| 🟢 + spinner | Running job |
| ✓ | Completed successfully |
| ❌ | Error |
| 🕐 | Timeout |
| ✕ | Cancelled |

#### Log Entry Styling

| Entry Type | Color | Icon |
|------------|-------|------|
| system | yellow | ⚙️ |
| assistant | default | 💬 |
| tool_use | blue | → |
| tool_result | green | ✓ |
| error | red | ❌ |
| browser | cyan | 🌐 |
| progress | muted | ⏱️ |

---

## 6. Event Handling

### 6.1 Backend Events

**File**: `src-tauri/src/events.rs`

| Event Name | Payload | Trigger |
|------------|---------|---------|
| `lead-created` | Lead | New lead created |
| `lead-updated` | Lead | Lead data modified |
| `person-updated` | Person | Person data modified |
| `people_bulk_created` | Person[] | Multiple people created |
| `job-created` | Job | New job started |
| `job-status-changed` | Job, String | Job status update |
| `job-logs-appended` | jobId, logs | New logs available |
| `lead-scored` | LeadScore | Lead scoring completed |

### 6.2 Frontend Event Bridge

**File**: `src/lib/tauri/event-bridge.ts`

#### Event Listeners

```typescript
// Job created → open panel, set active tab
listen("job-created", (event) => {
  const store = useStreamPanelStore.getState();
  store.setActiveTab(jobId);
  store.setOpen(true);
});

// Job logs appended → fetch and append new logs
listen("job-logs-appended", (event) => {
  getJobLogs(jobId, currentSequence + 1)
    .then((logs) => {
      const parsed = parseJobLogs(logs);
      store.appendLogs(jobId, parsed);
    });
});

// Job status changed → invalidate queries
listen("job-status-changed", (event) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.jobsRecent(50) });
  queryClient.invalidateQueries({ queryKey: queryKeys.jobsActive() });
});
```

### 6.3 Query Cache Invalidation

| Event | Queries Invalidated |
|-------|---------------------|
| `lead-updated` | Lead detail, lead list, scores, onboarding |
| `person-updated` | Person detail, people list, lead's people |
| `job-status-changed` | Job queries, active jobs |

---

## 7. Configuration

### 7.1 Settings Structure

**File**: `src/lib/store/settings-store.ts`

```typescript
interface Settings {
  model: string;           // "claude-3-opus" | "claude-3-sonnet"
  useChrome: boolean;      // Enable web search
  useGlmGateway: boolean;  // Use Z.ai endpoint
  theme: string;           // "light" | "dark" | "system"
}
```

### 7.2 Timeout Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Job Timeout | 600s (10 min) | Maximum job execution time |
| Queue Timeout | 30s | Semaphore acquisition timeout |
| Graceful Shutdown | 2s | SIGTERM before SIGKILL |
| Stream Drain | 5s | Output stream completion wait |

### 7.3 File Locations

| Directory | Purpose |
|-----------|---------|
| `~/.local/share/liidi/research/` | Company/Person research output |
| `~/.local/share/liidi/scoring/` | Scoring output |
| `~/.local/share/liidi/conversations/` | Conversation output |

---

## 8. Job Completion & Result Processing

### 8.1 Completion Handler

**File**: `src-tauri/src/jobs/completion_handler.rs`

#### CompletionPhase Enum

```rust
pub enum CompletionPhase {
    Started,          // Phase 1: Initiated
    FilesVerified,    // Phase 2: Output files validated
    ContentParsed,    // Phase 3: Content parsed and validated
    DatabaseUpdated,  // Phase 4: Database transaction committed
    FilesCleanedUp,   // Phase 5: Output files deleted
    Completed,        // Final: All phases complete
    Failed,           // Failed completion
}
```

#### Phase Process

```
┌─────────────────────────────────────────────────────────────┐
│              COMPLETION HANDLER PHASES                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PHASE 1: STARTED                                          │
│  └─ Initialize completion tracking                          │
│                                                             │
│  PHASE 2: FILES VERIFIED                                    │
│  ├─ Validate primary output file exists                    │
│  ├─ Check for empty content                                │
│  ├─ Read secondary content (people.json)                   │
│  └─ Optionally read enrichment content                     │
│                                                             │
│  PHASE 3: CONTENT PARSED                                    │
│  ├─ Parse profile markdown                                 │
│  ├─ Parse people JSON with error handling                  │
│  ├─ Parse enrichment with fallback to None                 │
│  └─ Validate score JSON for required fields                │
│                                                             │
│  PHASE 4: DATABASE UPDATED                                  │
│  ├─ Begin transaction                                       │
│  ├─ Execute updates                                         │
│  ├─ Commit on success / Rollback on error                  │
│  └─ Only defuse guard after successful commit              │
│                                                             │
│  PHASE 5: FILES CLEANED UP                                  │
│  ├─ Delete entire output directory (research)              │
│  ├─ Delete single file (scoring/conversation)              │
│  └─ Log warning but don't fail if cleanup fails            │
│                                                             │
│  EMIT EVENTS                                                │
│  ├─ lead-updated + people_bulk_created (company research)  │
│  ├─ person-updated (person research)                       │
│  └─ lead-scored (scoring)                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Result Parsing

**File**: `src-tauri/src/jobs/result_parser.rs`

#### Parse Output Content

```rust
fn parse_output_content(
    job_type: &JobType,
    primary_content: String,
    secondary_content: Option<String>,
    enrichment_content: Option<String>,
) -> Result<ParsedOutput, CompletionError>
```

#### Validation Rules

| Job Type | Required Field | Validation |
|----------|----------------|------------|
| Scoring | `passesRequirements` | Must exist or error |
| All | Primary content | Must be non-empty |
| Company Research | people.json | Warning if parse fails |
| All | enrichment.json | Warning if parse fails |

### 8.3 Atomic Transaction Guarantees

```rust
let tx = conn.transaction()?;
let result = self.update_database_in_tx(&tx, parsed, metadata);
match result {
    Ok(()) => {
        tx.commit()?;
        // Only defuse guard after successful commit
        guard.defuse();
    }
    Err(e) => {
        // Transaction rolled back automatically on drop
    }
}
```

---

## Key File Paths

### Backend Files

| File | Lines | Purpose |
|------|-------|---------|
| `src-tauri/src/commands/research.rs` | 140-561 | Research command implementations |
| `src-tauri/src/commands/prompts.rs` | All | Prompt management commands |
| `src-tauri/src/prompts/defaults/` | All | Default prompt templates |
| `src-tauri/src/jobs/queue.rs` | All | Job queue and spawning logic |
| `src-tauri/src/jobs/completion_handler.rs` | All | Result processing and storage |
| `src-tauri/src/jobs/stream_processor.rs` | All | Output streaming |
| `src-tauri/src/jobs/enrichment.rs` | All | Data enrichment structures |
| `src-tauri/src/jobs/result_parser.rs` | All | Output parsing |
| `src-tauri/src/events.rs` | All | Event definitions |

### Frontend Files

| File | Purpose |
|------|---------|
| `src/lib/tauri/commands.ts` | Frontend command interfaces |
| `src/lib/store/stream-panel-store.ts` | Stream panel state |
| `src/lib/stream/handle-stream-event.ts` | Stream event processing |
| `src/lib/tauri/event-bridge.ts` | Backend event handling |
| `src/components/lead/lead-research-panel.tsx` | Lead research UI |
| `src/components/people/person-research-panel.tsx` | Person research UI |
| `src/components/people/person-conversation-panel.tsx` | Conversation UI |
| `src/components/stream-panel/` | All stream panel components |
| `src/components/ui/markdown-renderer.tsx` | Markdown rendering |

---

*Document Version: 1.0*
*Last Updated: 2025*
