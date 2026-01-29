# Prompt Management System - Comprehensive Technical Documentation

**Liidi Application - Section 8**

This document provides an extremely detailed technical analysis of the Prompt Management System in the Liidi B2B lead research and qualification application.

---

## Table of Contents

1. [Prompt Storage](#1-prompt-storage)
2. [Prompt Commands](#2-prompt-commands)
3. [Prompt UI](#3-prompt-ui)
4. [Prompt Usage](#4-prompt-usage)
5. [All Prompt Types](#5-all-prompt-types)
6. [Frontend Prompt Management](#6-frontend-prompt-management)
7. [Prompt Customization](#7-prompt-customization)

---

## 1. Prompt Storage

### 1.1 Database Schema

**File**: `src-tauri/src/db/schema.rs:104-113`

#### Prompts Table

```sql
CREATE TABLE prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'company',
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

#### Index

```sql
CREATE UNIQUE INDEX idx_prompts_type_unique ON prompts(type);
```

#### Rust Structure

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Prompt {
    pub id: i64,
    #[serde(rename = "type")]
    pub prompt_type: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
}
```

### 1.2 Supported Prompt Types

**TypeScript Definition** (`src/lib/tauri/types.ts:84`)

```typescript
export type PromptType =
  | "company"           // Company research prompt
  | "person"            // Person research prompt
  | "company_overview"  // User's company context (injected into all research)
  | "conversation_topics"; // Conversation generation prompt
```

### 1.3 Storage Behavior

| Operation | Behavior |
|-----------|----------|
| Create | INSERT with new timestamp |
| Read | SELECT by type, most recent first |
| Update | UPDATE content and updated_at |
| Delete | Not exposed in UI |
| Upsert | Automatic in save operation |

---

## 2. Prompt Commands

### 2.1 Backend Commands

**File**: `src-tauri/src/commands/prompts.rs`

#### `get_prompt_by_type`

**Lines**: 6-24

```rust
#[tauri::command]
pub fn get_prompt_by_type(
    state: State<'_, DbState>,
    prompt_type: String
) -> Result<Option<Prompt>, String>
```

**Behavior**:
1. Queries database for prompt of given type
2. If found, returns the stored prompt
3. If not found, returns a synthetic default prompt with `id: 0`
4. Returns `None` if no default exists for that type

**Return Value**:
```rust
Ok(Some(Prompt {
    id: 0,  // Indicates default/fallback
    prompt_type: prompt_type.clone(),
    content: default_content.to_string(),
    created_at: 0,
    updated_at: 0,
}))
```

#### `save_prompt_by_type`

**Lines**: 27-30

```rust
#[tauri::command]
pub fn save_prompt_by_type(
    state: State<'_, DbState>,
    prompt_type: String,
    content: String
) -> Result<i64, String>
```

**Behavior**:
1. Checks if prompt of type already exists
2. If exists: UPDATE content and updated_at
3. If not exists: INSERT new row
4. Returns the prompt ID

### 2.2 Database Query Functions

**File**: `src-tauri/src/db/queries.rs`

#### `get_prompt_by_type`

**Lines**: 447-465

```rust
pub fn get_prompt_by_type(conn: &Connection, prompt_type: &str)
    -> SqliteResult<Option<Prompt>>
{
    let sql = r#"
        SELECT id, type, content, created_at, updated_at
        FROM prompts
        WHERE type = ?1
        ORDER BY id DESC
        LIMIT 1
    "#;

    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![prompt_type])?;

    if let Some(row) = rows.next()? {
        Ok(Some(Prompt {
            id: row.get(0)?,
            prompt_type: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        }))
    } else {
        Ok(None)
    }
}
```

#### `save_prompt_by_type`

**Lines**: 467-489

```rust
pub fn save_prompt_by_type(
    conn: &Connection,
    prompt_type: &str,
    content: &str
) -> SqliteResult<i64>
{
    let now = chrono::Utc::now().timestamp_millis();

    // Check for existing prompt
    let existing: Option<i64> = conn.query_row(
        "SELECT id FROM prompts WHERE type = ?1 ORDER BY id DESC LIMIT 1",
        params![prompt_type],
        |row| row.get(0),
    ).ok();

    if let Some(id) = existing {
        // Update existing
        conn.execute(
            "UPDATE prompts SET content = ?1, updated_at = ?2 WHERE id = ?3",
            params![content, now, id],
        )?;
        Ok(id)
    } else {
        // Insert new
        conn.execute(
            "INSERT INTO prompts (type, content, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![prompt_type, content, now, now],
        )?;
        Ok(conn.last_insert_rowid())
    }
}
```

### 2.3 Default Prompt Fallbacks

**File**: `src-tauri/src/prompts/mod.rs`

#### Default Prompt Retrieval

```rust
pub fn get_default_prompt(prompt_type: &str) -> Option<&'static str> {
    match prompt_type {
        "company" => Some(defaults::COMPANY),
        "person" => Some(defaults::PERSON),
        "conversation_topics" => Some(defaults::CONVERSATION_TOPICS),
        // company_overview has no default - user must provide it
        _ => None,
    }
}
```

#### Fallback Behavior

| Prompt Type | Has Default | Fallback Behavior |
|-------------|-------------|-------------------|
| `company` | ✅ Yes | Returns default if no DB prompt |
| `person` | ✅ Yes | Returns default if no DB prompt |
| `conversation_topics` | ✅ Yes | Returns default if no DB prompt |
| `company_overview` | ❌ No | Returns `None` if no DB prompt |

---

## 3. Prompt UI

### 3.1 Prompt Configuration Page

**File**: `src/pages/prompt.tsx`

#### Page Structure

```typescript
export default function PromptPage() {
  // State for all four prompt types
  const [companyPrompt, setCompanyPrompt] = useState("");
  const [personPrompt, setPersonPrompt] = useState("");
  const [companyOverview, setCompanyOverview] = useState("");
  const [conversationTopics, setConversationTopics] = useState("");
  const [loading, setLoading] = useState(true);
}
```

#### Data Fetching

```typescript
const fetchPrompts = useCallback(async () => {
  try {
    setLoading(true);
    const types: PromptType[] = [
      "company",
      "person",
      "company_overview",
      "conversation_topics"
    ];

    const results = await Promise.all(
      types.map((type) => getPromptByType(type))
    );

    setCompanyPrompt(results[0]?.content || "");
    setPersonPrompt(results[1]?.content || "");
    setCompanyOverview(results[2]?.content || "");
    setConversationTopics(results[3]?.content || "");
  } catch (error) {
    console.error("Failed to fetch prompts:", error);
  } finally {
    setLoading(false);
  }
}, []);
```

### 3.2 Prompt Editor Component

**File**: `src/components/prompt/prompt-editor.tsx`

#### Tab Structure

```typescript
const tabs = [
  {
    id: "company_overview" as const,
    label: "Company Overview",
    icon: IconInfoCircle
  },
  {
    id: "company" as const,
    label: "Company",
    icon: IconBuilding
  },
  {
    id: "person" as const,
    label: "Person",
    icon: IconUser
  },
  {
    id: "conversation_topics" as const,
    label: "Conversation",
    icon: IconMessageCircle
  },
];
```

#### Tab Content Mapping

```typescript
const getCurrentContent = () => {
  switch (activeTab) {
    case "company":
      return companyContent;
    case "person":
      return personContent;
    case "company_overview":
      return overviewContent;
    case "conversation_topics":
      return conversationContent;
  }
};

const setCurrentContent = (value: string) => {
  switch (activeTab) {
    case "company":
      setCompanyContent(value);
      break;
    case "person":
      setPersonContent(value);
      break;
    case "company_overview":
      setOverviewContent(value);
      break;
    case "conversation_topics":
      setConversationContent(value);
      break;
  }
};
```

#### Save Functionality

```typescript
const handleSave = () => {
  setIsSaving(true);
  startTransition(async () => {
    try {
      await savePromptByType(activeTab, currentContent);
      toast.success("Prompt saved");
    } catch (error) {
      toast.error("Failed to save prompt", {
        description: error instanceof Error
          ? error.message
          : "An unexpected error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  });
};
```

### 3.3 Auto-injected Variable Display

#### Company Overview Tab

```typescript
<Section>
  <SectionTitle>Company Overview</SectionTitle>
  <SectionDescription>
    Information about your company that will be included in all research.
    This context helps the AI provide more relevant analysis.
  </SectionDescription>
  <InfoBox>
    <InfoBoxTitle>Tip</InfoBoxTitle>
    Include what you do, who you sell to, the problems you solve,
    and what makes you different.
  </InfoBox>
</Section>
```

#### Company Prompt Tab

```typescript
<SectionDescription>
  Template for company research. The following information will be
  automatically included:
</SectionDescription>

<VariableList>
  <Variable>Company name</Variable>
  <Variable>Website</Variable>
  <Variable>Industry</Variable>
  <Variable>Size</Variable>
  <Variable>LinkedIn URL</Variable>
  <Variable>Location</Variable>
</VariableList>
```

#### Person Prompt Tab

```typescript
<SectionDescription>
  Template for person research. The following information will be
  automatically included:
</SectionDescription>

<VariableList>
  <Variable>Name</Variable>
  <Variable>Title</Variable>
  <Variable>Email</Variable>
  <Variable>LinkedIn</Variable>
  <Variable>Company details (if associated)</Variable>
</VariableList>
```

#### Conversation Topics Tab

```typescript
<SectionDescription>
  Template for conversation preparation. The following information will
  be automatically included:
</SectionDescription>

<VariableList>
  <Variable>Person details</Variable>
  <Variable>Company details</Variable>
  <Variable>Research profiles (if available)</Variable>
</VariableList>
```

### 3.4 Form Styling

```typescript
<textarea
  value={currentContent}
  onChange={(e) => setCurrentContent(e.target.value)}
  className={cn(
    "w-full h-96 font-mono text-sm",
    "bg-neutral-900 border border-neutral-700",
    "rounded-md p-4",
    "focus:outline-none focus:ring-2 focus:ring-blue-500",
    "resize-none"
  )}
  placeholder={getPlaceholder(activeTab)}
/>
```

---

## 4. Prompt Usage

### 4.1 Loading Prompts in Research Jobs

**File**: `src-tauri/src/commands/research.rs`

#### Company Research Prompt Loading

```rust
// In start_research function
let (company_prompt_content, company_overview) = {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    // Get company prompt (with fallback to default)
    let cp = db::get_prompt_by_type(&conn, "company")
        .map_err(|e| e.to_string())?;

    let content = cp
        .map(|p| p.content)
        .or_else(|| get_default_prompt("company").map(String::from));

    // Get company overview (no default)
    let co = db::get_prompt_by_type(&conn, "company_overview")
        .map_err(|e| e.to_string())?
        .and_then(|p| Some(p.content));

    (content, co)
};
```

#### Person Research Prompt Loading

```rust
// In start_person_research function
let (person_prompt_content, company_overview) = {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let pp = db::get_prompt_by_type(&conn, "person")
        .map_err(|e| e.to_string())?;

    let content = pp
        .map(|p| p.content)
        .or_else(|| get_default_prompt("person").map(String::from));

    let co = db::get_prompt_by_type(&conn, "company_overview")
        .map_err(|e| e.to_string())?
        .and_then(|p| Some(p.content));

    (content, co)
};
```

#### Conversation Topics Prompt Loading

```rust
// In start_conversation_generation function
let conversation_prompt = {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let cp = db::get_prompt_by_type(&conn, "conversation_topics")
        .map_err(|e| e.to_string())?;

    cp.map(|p| p.content)
        .or_else(|| get_default_prompt("conversation_topics").map(String::from))
        .ok_or_else(|| "No conversation topics prompt available".to_string())?
};
```

### 4.2 Variable Substitution Mechanism

**IMPORTANT**: The system does NOT use traditional templating with `{{variable}}` substitution.

Instead, prompts are built by **appending structured data**:

#### Company Research Prompt Building

**File**: `src-tauri/src/commands/research.rs:359-410`

```rust
fn build_research_prompt(
    prompt: &str,
    lead: &db::Lead,
    profile_path: &std::path::Path,
    people_path: &std::path::Path,
    enrichment_path: &std::path::Path,
    company_overview: Option<&str>,
) -> String
{
    let mut full_prompt = String::new();

    // 1. Add company overview context if available
    if let Some(overview) = company_overview {
        full_prompt.push_str(&format!(
            "# Company Overview\n\n{}\n\n---\n\n",
            overview
        ));
    }

    // 2. Add user prompt (or default)
    full_prompt.push_str(prompt);

    // 3. Add company information
    full_prompt.push_str(&format!(
        "\n\n# Company Information\n\nCompany Name: {}\n",
        lead.company_name
    ));

    if let Some(website) = &lead.website {
        full_prompt.push_str(&format!("Website: {}\n", website));
    }

    if let Some(industry) = &lead.industry {
        full_prompt.push_str(&format!("Industry: {}\n", industry));
    }

    // ... more fields

    // 4. Add output instructions
    full_prompt.push_str(&get_output_instructions(profile_path, people_path, enrichment_path));

    full_prompt
}
```

#### Person Research Prompt Building

```rust
fn build_person_research_prompt(
    prompt: &str,
    person: &db::Person,
    lead: Option<&db::Lead>,
    profile_path: &std::path::Path,
    enrichment_path: &std::path::Path,
    company_overview: Option<&str>,
) -> String
{
    let mut full_prompt = String::new();

    // 1. Add company overview if available
    if let Some(overview) = company_overview {
        full_prompt.push_str(&format!(
            "# Company Overview\n\n{}\n\n---\n\n",
            overview
        ));
    }

    // 2. Add user prompt
    full_prompt.push_str(prompt);

    // 3. Add person information
    full_prompt.push_str(&format!(
        "\n\n# Person Information\n\nName: {} {}\n",
        person.first_name, person.last_name
    ));

    if let Some(title) = &person.title {
        full_prompt.push_str(&format!("Title: {}\n", title));
    }

    // 4. Add company information if available
    if let Some(lead) = lead {
        full_prompt.push_str(&format!(
            "\n# Company Information\n\nCompany Name: {}\n",
            lead.company_name
        ));
        // ... more company fields
    }

    // 5. Add output instructions
    full_prompt.push_str(&get_output_instructions(profile_path, enrichment_path));

    full_prompt
}
```

### 4.3 Output File Instructions

#### Company Research Output Instructions

```rust
const PEOPLE_JSON_SCHEMA: &str = r#"
The people JSON should be an array of objects with these fields:
- firstName (string)
- lastName (string)
- email (string, optional)
- title (string)
- linkedinUrl (string, optional)
- managementLevel (string, optional) - one of: C-Level, VP, Director, Manager, IC
- yearJoined (number, optional) - the year they joined the company
"#;

const ENRICHMENT_SCHEMA: &str = r#"
The enrichment JSON should include only fields with verified data:
- website (string URL)
- industry (string)
- subIndustry (string)
- employees (number)
- employeeRange (string like "10-50")
- revenue (number)
- revenueRange (string like "$1M-$5M")
- companyLinkedinUrl (string URL)
- city (string)
- state (string)
- country (string)
"#;
```

---

## 5. All Prompt Types

### 5.1 Company Overview Prompt

**Purpose**: Context about your company that gets injected into ALL research prompts

**Has Default**: ❌ NO - User must provide this

**Usage**: Injected at the beginning of company/person research prompts

**Auto-injected Variables**: None - this IS the context

**Template Structure** (user-provided):

```markdown
# About [Your Company Name]

## What We Do
[Brief description of your products/services]

## Who We Sell To
- Target industries
- Company sizes
- Buyer personas

## Problems We Solve
- Pain point 1
- Pain point 2
- Pain point 3

## Key Differentiators
- What makes you unique
- Competitive advantages
- Value proposition
```

**Storage**: Stored as `company_overview` type in prompts table

### 5.2 Company Research Prompt

**File**: `src-tauri/src/prompts/defaults/company.md`

**Purpose**: Instructions for researching companies

**Has Default**: ✅ Yes

**Auto-injected Variables**:
| Variable | Source | Format |
|----------|--------|--------|
| Company Name | `lead.company_name` | String |
| Website | `lead.website` | URL |
| Industry | `lead.industry` | Industry name |
| Sub-Industry | `lead.sub_industry` | Optional |
| Employees | `lead.employees` | Count/range |
| Revenue | `lead.annual_revenue` | Dollar amount |
| Employee Range | `lead.employee_range` | Range string |
| Revenue Range | `lead.revenue_range` | Range string |
| LinkedIn URL | `lead.company_linkedin_url` | URL |
| City | `lead.city` | City name |
| State | `lead.state` | State/province |
| Country | `lead.country` | Country name |
| Company Profile | `lead.company_profile` | Markdown (if exists) |

**Default Template**:

```markdown
Research the following company and provide a comprehensive profile.

## Research Instructions

Gather and analyze information about this company including:

1. **Business Overview**: What does the company do? What products or services do they offer?

2. **Market Position**: Who are their main competitors? What is their market share or position?

3. **Recent News**: Any recent announcements, funding rounds, partnerships, or significant events?

4. **Technology Stack**: What technologies do they use? Any public information about their tech infrastructure?

5. **Company Culture**: What is their company culture like? Any notable values or initiatives?

6. **Growth Indicators**: Signs of growth or expansion (hiring, new offices, product launches)?

7. **Potential Pain Points**: Based on their industry and size, what challenges might they face?

8. **Key Contacts**: Identify important decision makers and their roles.

Provide a structured summary that would help a sales professional understand this company and identify potential opportunities.
```

**Expected Output**:
- `company_profile.md` - Markdown research profile
- `people.json` - Array of extracted people
- `enrichment.json` - Structured company data

### 5.3 Person Research Prompt

**File**: `src-tauri/src/prompts/defaults/person.md`

**Purpose**: Instructions for researching individuals

**Has Default**: ✅ Yes

**Auto-injected Variables**:
| Variable | Source | Format |
|----------|--------|--------|
| First Name | `person.first_name` | String |
| Last Name | `person.last_name` | String |
| Title | `person.title` | Job title |
| Email | `person.email` | Email address |
| LinkedIn URL | `person.linkedin_url` | URL |
| Company Name | `lead.company_name` | If associated |
| Company Details | All lead fields | If associated |

**Default Template**:

```markdown
Research the following person and provide a detailed professional profile.

## Research Instructions

Gather and analyze information about this person including:

1. **Professional Background**: Career history, previous roles, and companies they've worked at.

2. **Current Role**: What are their responsibilities? How long have they been in this position?

3. **Expertise & Skills**: What are they known for? Any areas of specialization or technical expertise?

4. **Education**: Educational background, certifications, or notable achievements.

5. **Public Presence**: Any articles, podcasts, conference talks, or publications?

6. **Professional Interests**: Topics they engage with on LinkedIn or other platforms. What content do they share or comment on?

7. **Decision-Making Role**: Based on their title and company, what purchasing decisions might they influence?

8. **Communication Style**: Any insights into how they prefer to communicate based on their public presence?

Provide a structured profile that would help a sales professional understand this person and tailor their outreach effectively.
```

**Expected Output**:
- `person_profile.md` - Markdown research profile
- `enrichment.json` - Structured person data

### 5.4 Conversation Topics Prompt

**File**: `src-tauri/src/prompts/defaults/conversation_topics.md`

**Purpose**: Generate conversation preparation for sales outreach

**Has Default**: ✅ Yes

**Auto-injected Variables**:
| Variable | Source | Format |
|----------|--------|--------|
| Person Details | `person` object | All person fields |
| Company Details | `lead` object | If associated |
| Person Profile | `person.person_profile` | Previous research |
| Company Profile | `lead.company_profile` | Previous research |

**Default Template**:

```markdown
Generate personalized conversation topics and talking points for outreach.

## Instructions

Based on the person and company profiles above, generate:

1. **Ice Breakers**: 3-5 personalized conversation starters based on their background, interests, or recent activities.

2. **Value Propositions**: How our offering might address their specific challenges or goals. Tailor this to their role and company context.

3. **Discovery Questions**: Thoughtful questions to understand their current situation and needs. Focus on uncovering pain points and priorities.

4. **Common Ground**: Any shared connections, interests, experiences, or alma maters that could build rapport.

5. **Timing Triggers**: Recent events or changes (company growth, funding, role change) that make this a good time to reach out.

6. **Objection Handling**: Potential concerns they might have and how to address them proactively.

7. **Next Steps**: Suggested actions to propose after the initial conversation (demo, case study, trial, etc.).

Format the output as actionable talking points that can be used directly in outreach messages and calls.
```

**Expected Output**:
- `conversation.md` - Markdown conversation topics

---

## 6. Frontend Prompt Management

### 6.1 Tauri Commands Interface

**File**: `src/lib/tauri/commands.ts:99-105`

```typescript
export async function getPromptByType(
  promptType: PromptType
): Promise<Prompt | null> {
  return invoke("get_prompt_by_type", { promptType });
}

export async function savePromptByType(
  promptType: PromptType,
  content: string
): Promise<number> {
  return invoke("save_prompt_by_type", { promptType, content });
}
```

### 6.2 Specialized Helper Functions

```typescript
// Company overview specific helpers
export async function getCompanyOverview(): Promise<string | null> {
  const prompt = await getPromptByType("company_overview");
  return prompt?.content ?? null;
}

export async function saveCompanyOverview(content: string): Promise<number> {
  return savePromptByType("company_overview", content);
}
```

### 6.3 React Hook Integration

```typescript
// In prompt page component
useEffect(() => {
  fetchPrompts();
}, []);

// Fetch on mount, refresh when needed
const fetchPrompts = async () => {
  const [company, person, overview, conversation] = await Promise.all([
    getPromptByType("company"),
    getPromptByType("person"),
    getPromptByType("company_overview"),
    getPromptByType("conversation_topics"),
  ]);

  // Update state
};
```

### 6.4 Cache Invalidation

The system uses React's built-in state management:
- Prompts are fetched on component mount
- No explicit cache invalidation beyond re-fetching
- Tauri's state management ensures backend consistency
- Prompt changes trigger database updates immediately

---

## 7. Prompt Customization

### 7.1 Auto-injected Variables Summary

| Prompt Type | Auto-injected Variables |
|-------------|------------------------|
| **Company Overview** | None (this IS the context) |
| **Company Research** | Company name, website, industry, size, location, LinkedIn, existing profile |
| **Person Research** | Name, title, email, LinkedIn, company details (if associated) |
| **Conversation Topics** | Person details, company details, research profiles (if available) |

### 7.2 User Customization Options

Users CAN customize:
- ✅ All prompt content (full Markdown)
- ✅ Research instructions
- ✅ Output format requirements
- ✅ Tone and style
- ✅ Specific questions to ask

Users CANNOT customize:
- ❌ Auto-injected variables (fixed by system)
- ❌ Output file names (fixed by job type)
- ❌ JSON schemas (enforced by parser)

### 7.3 Validation Rules

| Rule | Enforcement |
|------|-------------|
| Required content | Company Overview must be provided before research |
| Format | Markdown - no syntax validation |
| Length | No explicit limits |
| Encoding | UTF-8 |
| Storage | SQLite TEXT field |

### 7.4 Prompt Seeding

**File**: `src-tauri/src/db/seed.rs:14-40`

```rust
fn seed_prompts(conn: &Connection) -> SqliteResult<()> {
    let now = chrono::Utc::now().timestamp_millis();

    let prompt_types = [
        ("company", prompts::defaults::COMPANY),
        ("person", prompts::defaults::PERSON),
        ("conversation_topics", prompts::defaults::CONVERSATION_TOPICS),
    ];

    for (prompt_type, content) in prompt_types {
        // Check if prompt already exists
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM prompts WHERE type = ?1)",
            params![prompt_type],
            |row| row.get(0),
        )?;

        if !exists {
            conn.execute(
                "INSERT INTO prompts (type, content, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params![prompt_type, content, now, now],
            )?;
        }
    }

    Ok(())
}
```

**Seeding Behavior**:
- Runs on database creation
- Idempotent (safe to run multiple times)
- Only inserts if no prompt exists for that type
- Does NOT seed company_overview (user must provide)

---

## Prompt Type Quick Reference

| Type | Default | Required For | Used In Job | Output Files |
|------|---------|--------------|-------------|--------------|
| `company_overview` | No | Research quality | All research | N/A (injected) |
| `company` | Yes | Company research | `CompanyResearch` | .md, .json |
| `person` | Yes | Person research | `PersonResearch` | .md, .json |
| `conversation_topics` | Yes | Call prep | `Conversation` | .md |

---

## Key File Paths

### Backend Files

| File | Purpose |
|------|---------|
| `src-tauri/src/db/schema.rs:104-113` | Prompts table schema |
| `src-tauri/src/db/queries.rs:447-489` | Prompt queries |
| `src-tauri/src/commands/prompts.rs:6-30` | Prompt Tauri commands |
| `src-tauri/src/prompts/mod.rs` | Default prompt module |
| `src-tauri/src/prompts/defaults/company.md` | Company research default |
| `src-tauri/src/prompts/defaults/person.md` | Person research default |
| `src-tauri/src/prompts/defaults/conversation_topics.md` | Conversation default |
| `src-tauri/src/db/seed.rs:14-40` | Prompt seeding |
| `src-tauri/src/commands/research.rs:359-410` | Company prompt builder |
| `src-tauri/src/commands/research.rs:412-459` | Person prompt builder |

### Frontend Files

| File | Purpose |
|------|---------|
| `src/lib/tauri/commands.ts:99-105` | Frontend command interfaces |
| `src/lib/tauri/types.ts:84` | PromptType definition |
| `src/pages/prompt.tsx` | Prompt configuration page |
| `src/components/prompt/prompt-editor.tsx` | Prompt editor component |

---

*Document Version: 1.0*
*Last Updated: 2025*
