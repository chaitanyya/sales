# Lead Scoring System - Comprehensive Technical Documentation

**Liidi Application - Section 5**

This document provides an extremely detailed technical analysis of the Lead Scoring System in the Liidi B2B lead research and qualification application.

---

## Table of Contents

1. [Scoring Architecture](#1-scoring-architecture)
2. [Scoring Configuration](#2-scoring-configuration)
   - 2.5 [Business Guide: Configuring Scoring for Your Business](#25-business-guide-configuring-scoring-for-your-business)
3. [Scoring Prompts](#3-scoring-prompts)
4. [Score Storage & Retrieval](#4-score-storage--retrieval)
5. [Scoring UI Components](#5-scoring-ui-components)
6. [Scoring Data Flow](#6-scoring-data-flow)
7. [Frontend Integration](#7-frontend-integration)

---

## 1. Scoring Architecture

### 1.1 How Scoring Jobs Are Initiated

**File**: `src-tauri/src/commands/research.rs:466-561`

#### Tauri Command: `start_scoring`

```rust
#[tauri::command]
pub async fn start_scoring(
    app: AppHandle,
    state: State<'_, DbState>,
    queue: State<'_, JobQueue>,
    lead_id: i64,
    on_event: Channel<StreamEvent>,
) -> Result<ResearchResult, String>
```

#### Initiation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCORING JOB INITIATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. VALIDATION                                                  │
│     ├─ Check for existing active scoring job for this lead     │
│     ├─ If exists, cancel it first                              │
│     └─ Verify lead exists in database                          │
│                                                                 │
│  2. DATA FETCHING                                               │
│     ├─ Fetch lead by ID                                        │
│     ├─ Fetch all people associated with lead                   │
│     └─ Fetch active scoring configuration                      │
│                                                                 │
│  3. OUTPUT SETUP                                                │
│     ├─ Create scoring output directory                         │
│     └─ Generate output file path (score.json)                  │
│                                                                 │
│  4. PROMPT BUILDING                                             │
│     └─ Build scoring prompt with:                              │
│         ├─ Lead context (company, industry, size, etc.)        │
│         ├─ People data (names, titles)                         │
│         ├─ Required characteristics                            │
│         ├─ Demand signifiers with weights                      │
│         └─ Tier thresholds                                     │
│                                                                 │
│  5. JOB QUEUING                                                 │
│     ├─ Create job metadata                                     │
│     ├─ Add to job queue                                        │
│     └─ Return immediately with job ID                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Cancellation Logic

```rust
// Cancel any existing scoring job for this lead
if let Some(existing_job) = get_active_job_for_lead(&queue, lead_id, JobType::Scoring) {
    kill_job(state.clone(), queue.clone(), existing_job.id).await?;
}
```

### 1.2 Scoring Prompt Structure

**File**: `src-tauri/src/commands/research.rs:687-877`

#### `build_scoring_prompt` Function

```rust
fn build_scoring_prompt(
    lead: &db::Lead,
    people: &[db::Person],
    config: &db::ParsedScoringConfig,
    output_path: &std::path::Path,
) -> String
```

#### Prompt Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCORING PROMPT STRUCTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HEADER                                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ You are a lead scoring analyst. Your task is to evaluate │  │
│  │ the following company as a sales lead...                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  COMPANY INFORMATION                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ - Company Name, Website, Industry                         │  │
│  │ - Employees, Revenue, Location                           │  │
│  │ - Company Profile (if available)                          │  │
│  │ - Key People Information                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  REQUIRED CHARACTERISTICS (Pass/Fail)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ These are gates that must be passed. If ANY requirement │  │
│  │ fails, the lead will be classified as "disqualified".   │  │
│  │                                                           │  │
│  │ • Requirement 1: Name - Description                      │  │
│  │ • Requirement 2: Name - Description                      │  │
│  │   ...                                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  Demand Signifiers (Weighted Scoring)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Evaluate each factor 0-100. Final score is weighted avg.│  │
│  │                                                           │  │
│  │ • Signifier 1 (×8 weight): Name - Description            │  │
│  │ • Signifier 2 (×5 weight): Name - Description            │  │
│  │   ...                                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  TIER THRESHOLDS                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ - Hot: 80+ (highest priority)                            │  │
│  │ - Warm: 50-79 (good potential)                           │  │
│  │ - Nurture: 30-49 (needs development)                     │  │
│  │ - Disqualified: Below 30 OR fails requirement            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  OUTPUT FORMAT                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Respond ONLY with valid JSON matching this schema...     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Score Calculation Logic

#### Formula

```
Total Score = Sum of (signifier_score × weight) / total_weight
```

#### Detailed Calculation Example

Let's walk through a complete example with 5 signifiers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIGNIFIER SCORING EXAMPLE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Signifier 1: "Budget Availability"                              │
│   AI Score: 85 (out of 100)                                    │
│   Weight: 10 (highest importance)                               │
│   Weighted Value: 85 × 10 = 850                                │
│                                                                 │
│ Signifier 2: "Timeline Urgency"                                 │
│   AI Score: 70 (out of 100)                                    │
│   Weight: 8 (high importance)                                  │
│   Weighted Value: 70 × 8 = 560                                 │
│                                                                 │
│ Signifier 3: "Clear Pain Points"                                │
│   AI Score: 90 (out of 100)                                    │
│   Weight: 7 (high importance)                                  │
│   Weighted Value: 90 × 7 = 630                                 │
│                                                                 │
│ Signifier 4: "Decision Maker Access"                           │
│   AI Score: 50 (out of 100)                                    │
│   Weight: 5 (medium importance)                                │
│   Weighted Value: 50 × 5 = 250                                 │
│                                                                 │
│ Signifier 5: "Technical Fit"                                   │
│   AI Score: 80 (out of 100)                                    │
│   Weight: 3 (low importance)                                   │
│   Weighted Value: 80 × 3 = 240                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ CALCULATION:                                                     │
│                                                                 │
│ Total Weight = 10 + 8 + 7 + 5 + 3 = 33                        │
│ Weighted Sum = 850 + 560 + 630 + 250 + 240 = 2,530            │
│                                                                 │
│ Final Score = 2,530 / 33 = 76.67 → 76 (rounded down)          │
│                                                                 │
│ TIER: Warm (50-79 range)                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Weight Impact Analysis

The weight of each signifier determines how much it impacts the final score:

```
┌─────────────────────────────────────────────────────────────────┐
│              WEIGHT IMPACT ON FINAL SCORE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ With Total Weight = 33:                                         │
│                                                                 │
│ Budget (weight 10) = 10/33 = 30.3% of score                    │
│   → If Budget drops from 100 to 0, score drops ~30 points     │
│                                                                 │
│ Timeline (weight 8) = 8/33 = 24.2% of score                     │
│   → If Timeline drops from 100 to 0, score drops ~24 points    │
│                                                                 │
│ Pain Points (weight 7) = 7/33 = 21.2% of score                  │
│   → If Pain Points drops from 100 to 0, score drops ~21 points  │
│                                                                 │
│ Decision Maker (weight 5) = 5/33 = 15.2% of score              │
│   → If Decision Maker drops from 100 to 0, score drops ~15 pts │
│                                                                 │
│ Technical Fit (weight 3) = 3/33 = 9.1% of score                 │
│   → If Tech Fit drops from 100 to 0, score drops ~9 points     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

This means a lead could score:
- 0 on Budget (worst case)
- 100 on all other factors
- Final score ≈ 70 (still Warm tier)

But if they score:
- 100 on Budget (best case)
- 0 on all other factors
- Final score ≈ 30 (borderline Nurture/Disqualified)

**Key Insight**: High-weight signifiers act as "soft gates" - they don't disqualify like requirements, but they make it very hard to achieve a good score without them.

#### Code Implementation

```rust
// Calculate total weight from enabled signifiers
let total_weight: f64 = enabled_signifiers.iter()
    .filter_map(|s| s.get("weight").and_then(|w| w.as_f64()))
    .sum();

// Calculate weighted score for each signifier
let percentage = if total_weight > 0.0 {
    ((weight / total_weight) * 100.0).round() as i32
} else {
    0
};
```

#### Edge Cases

| Scenario | Behavior |
|----------|----------|
| **No enabled signifiers** | Score defaults to 0 (Disqualified) |
| **Total weight = 0** | Prevented by UI validation |
| **AI returns non-integer scores** | Scores are rounded for display, used as-is for calculation |
| **Signifier score = 0** | Contributes nothing, but doesn't fail like a requirement |

#### Interaction with Requirements

```
┌─────────────────────────────────────────────────────────────────┐
│            REQUIREMENTS vs SIGNIFIERS INTERACTION                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Step 1: Check Required Characteristics                          │
│   ├─ ALL pass → Proceed to signifier scoring                   │
│   └─ ANY fail → Disqualified (score irrelevant)                │
│                                                                 │
│ Step 2: Calculate Signifier Score (if requirements passed)    │
│   └─ Apply weighted average formula                             │
│                                                                 │
│ Step 3: Determine Tier                                          │
│   ├─ If requirements failed → Disqualified                     │
│   ├─ If score ≥ hot_min → Hot                                  │
│   ├─ If score ≥ warm_min → Warm                                │
│   ├─ If score ≥ nurture_min → Nurture                          │
│   └─ Otherwise → Disqualified                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Important**: A lead that passes all requirements but scores 25 will be "Disqualified" (low score tier). A lead that fails any requirement will also be "Disqualified" (failed requirements tier). The result looks the same, but the reasoning differs.

---

## 2. Scoring Configuration

### 2.1 Database Schema

**File**: `src-tauri/src/db/schema.rs:119-147`

#### ScoringConfig Table

```sql
CREATE TABLE scoring_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 0,
    required_characteristics TEXT NOT NULL,  -- JSON
    demand_signifiers TEXT NOT NULL,         -- JSON
    tier_hot_min INTEGER NOT NULL DEFAULT 80,
    tier_warm_min INTEGER NOT NULL DEFAULT 50,
    tier_nurture_min INTEGER NOT NULL DEFAULT 30,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

#### Rust Structure

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringConfig {
    pub id: i64,
    pub name: String,
    pub is_active: bool,
    pub required_characteristics: String,  // JSON string
    pub demand_signifiers: String,         // JSON string
    pub tier_hot_min: i64,
    pub tier_warm_min: i64,
    pub tier_nurture_min: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedScoringConfig {
    pub id: i64,
    pub name: String,
    pub is_active: bool,
    pub required_characteristics: serde_json::Value,
    pub demand_signifiers: serde_json::Value,
    pub tier_hot_min: i64,
    pub tier_warm_min: i64,
    pub tier_nurture_min: i64,
    pub created_at: i64,
    pub updated_at: i64,
}
```

### 2.2 Required Characteristics vs Demand Signifiers

#### Required Characteristics (Pass/Fail Gates)

**TypeScript Interface** (`src/lib/types/scoring.ts:92-97`)

```typescript
export interface RequiredCharacteristic {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}
```

**Purpose**: Gates that must ALL be passed for a lead to qualify

**Behavior**:
- If ANY requirement fails → Lead is "disqualified"
- Regardless of demand signifier scores
- Binary evaluation (pass/fail)

**Examples**:
- "B2B Company" - Must sell to businesses
- "Company Size" - Must have 10+ employees
- "English Speaking" - Must operate in English-speaking market

#### Demand Signifiers (Weighted Scoring)

**TypeScript Interface** (`src/lib/types/scoring.ts:99-105`)

```typescript
export interface DemandSignifier {
  id: string;
  name: string;
  description: string;
  weight: number;      // 1-10
  enabled: boolean;
}
```

**Purpose**: Factors that contribute to the total score

**Behavior**:
- Each scored 0-100
- Multiplied by weight (1-10)
- Combined into weighted average

**Examples**:
- "Budget Availability" (weight: 10) - High importance
- "Timeline Urgency" (weight: 8) - Important
- "Decision Maker Access" (weight: 5) - Moderate

### 2.3 Weight System

| Weight Range | Importance | Use Case |
|--------------|------------|----------|
| 1-3 | Low priority | Nice-to-have indicators |
| 4-6 | Medium priority | Standard factors |
| 7-8 | High priority | Key differentiators |
| 9-10 | Critical | Make-or-break factors |

**Weight Percentage Calculation**:

```rust
let percentage = if total_weight > 0.0 {
    ((weight / total_weight) * 100.0).round() as i32
} else {
    0
};
```

**Example**:
- Signifier A: weight 8, total 20 → 40% of score
- Signifier B: weight 5, total 20 → 25% of score
- Signifier C: weight 3, total 20 → 15% of score

### 2.4 Tier Thresholds

**Default Configuration** (`src/lib/types/scoring.ts:115-117`)

```typescript
tierHotMin: 80,     // 80-100 = Hot
tierWarmMin: 50,    // 50-79 = Warm
tierNurtureMin: 30,  // 30-49 = Nurture
// 0-29 = Disqualified
```

#### Tier Classification Logic

```rust
pub fn classify_tier(score: i64, passes_requirements: bool, config: &ScoringConfig) -> String {
    if !passes_requirements {
        return "disqualified".to_string();
    }

    if score >= config.tier_hot_min {
        "hot".to_string()
    } else if score >= config.tier_warm_min {
        "warm".to_string()
    } else if score >= config.tier_nurture_min {
        "nurture".to_string()
    } else {
        "disqualified".to_string()
    }
}
```

#### Tier Descriptions

| Tier | Score Range | Description | Priority |
|------|-------------|-------------|----------|
| **Hot** | 80-100 | Highest priority, ready to engage | Immediate outreach |
| **Warm** | 50-79 | Good potential, worth pursuing | Active follow-up |
| **Nurture** | 30-49 | Needs development | Keep in touch, monitor |
| **Disqualified** | 0-29 OR fails reqs | Not a fit | Archive/disqualify |

---

## 2.5 Business Guide: Configuring Scoring for Your Business

This section provides practical guidance on how to configure the lead scoring system to match your specific business model, target market, and sales process.

### Understanding the Two-Tiered Scoring System

The Liidi scoring system uses a **two-tiered evaluation approach**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TWO-TIERED SCORING MODEL                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TIER 1: REQUIRED CHARACTERISTICS (Gates)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Must ALL pass → Proceed to scoring                      │  │
│  │   ANY fails → Automatically Disqualified                 │  │
│  │                                                           │  │
│  │   These are your NON-NEGOTIABLE criteria.               │  │
│  │   Use these to quickly filter out companies that          │  │
│  │   absolutely cannot be your customers.                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼ (if all gates passed)         │
│  TIER 2: DEMAND SIGNIFIERS (Weighted Scoring)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Each scored 0-100, multiplied by weight                │  │
│  │   Combined into weighted average → Total Score            │  │
│  │                                                           │  │
│  │   These indicate HOW GOOD of a fit the company is.       │  │
│  │   Higher weights = More important to your business.      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  TIER CLASSIFICATION                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Hot (80-100), Warm (50-79), Nurture (30-49)            │  │
│  │   Disqualified (0-29 OR failed any requirement)          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Designing Required Characteristics (Gates)

Required characteristics are your **first line of defense** for filtering leads. They should represent the absolute minimum criteria a company must meet to be worth considering.

#### When to Use Required Characteristics

Use required characteristics when:
- The criteria is binary (either they have it or they don't)
- Missing this criteria would make closing a deal nearly impossible
- You want to automatically exclude certain segments
- The criteria is easy for AI to verify from available data

#### Common Required Characteristic Examples

| Business Type | Required Characteristic | Why |
|---------------|------------------------|-----|
| **Enterprise Software** | B2B Company | Only sells to businesses, not consumers |
| **Enterprise Software** | Minimum 50 employees | Too small to afford enterprise pricing |
| **Industry-Specific** | Healthcare Industry | Solution only works for healthcare |
| **Industry-Specific** | E-commerce Presence | Tool requires existing online store |
| **Geographic** | North America Based | Only serve NA markets currently |
| **Geographic** | English-Speaking Market | Support only available in English |
| **Technical** | Has Development Team | Product requires dev resources to implement |
| **Financial** | $1M+ Annual Revenue | Below this, cannot afford solution |
| **Financial** | Has Raised Funding | Startups must have external funding |
| **Regulatory** | Compliance Certification | Required for your industry (HIPAA, SOC2, etc.) |

#### Writing Effective Requirement Descriptions

```json
{
  "id": "req-b2b-company",
  "name": "B2B Company",
  "description": "The company must sell products or services to other businesses (B2B), not directly to consumers (B2C). Look for: business-focused language on website, enterprise pricing, B2B testimonials, or clear business solutions.",
  "enabled": true
}
```

**Tips for descriptions**:
- Be specific about what to look for
- Mention clear indicators the AI can find
- Explain WHY this matters (helps AI understand context)
- Include examples of what counts and what doesn't

#### How Many Required Characteristics Should You Have?

| Count | Recommendation | Rationale |
|-------|---------------|-----------|
| 0-1 | Too few | Won't effectively filter bad leads |
| 2-4 | **Recommended** | Balanced filtering without over-constraining |
| 5-7 | Many | May miss some good leads, use only if truly necessary |
| 8+ | Too many | Risk of filtering out viable opportunities |

**Best Practice**: Start with 2-3 truly non-negotiable criteria, then adjust based on results.

### Designing Demand Signifiers

Demand signifiers measure **how well a lead matches your ideal customer profile**. Unlike requirements, these are scored on a continuum and weighted by importance.

#### Weight Selection Guide

Weights range from 1-10. Here's how to choose:

```
Weight 1-3: Low Priority (Nice-to-Have)
├── Differentiators that are helpful but not essential
├── "Good to have" characteristics
└── Examples: Company culture fit, brand alignment, tech stack preferences

Weight 4-6: Medium Priority (Standard Factors)
├── Important considerations that affect deal success
├── Common evaluation criteria
└── Examples: Budget range, timeline urgency, decision maker access

Weight 7-8: High Priority (Key Differentiators)
├── Critical factors that strongly predict success
├── Primary indicators of fit
└── Examples: Clear pain points, budget availability, active search

Weight 9-10: Critical (Make-or-Break)
├── Essential factors that can kill a deal if missing
├── Primary value proposition drivers
└── Examples: Problem urgency, budget confirmed, champion identified
```

#### Sample Weight Configurations by Business Model

**High-Volume SaaS (Self-Service)**
| Signifier | Weight | Rationale |
|-----------|--------|-----------|
| Active Problem Search | 10 | Self-motivated leads convert best |
| Website Traffic Volume | 7 | Indicates growth stage |
| Technical Fit | 6 | Must be able to self-serve |
| Budget Indicators | 5 | Low price point, less critical |
| Company Size | 3 | Wide target market |

**Enterprise Software (High-Touch)**
| Signifier | Weight | Rationale |
|-----------|--------|-----------|
| Budget Availability | 10 | Long sales cycles require committed budget |
| Decision Maker Identified | 9 | Critical for deal progression |
| Clear Pain Points | 8 | Drives purchase urgency |
| Timeline Urgency | 7 | Long cycles need clear timeline |
| Company Size (Revenue) | 5 | Must afford solution |
| Technical Fit | 4 | Can adapt if needed |
| Industry Experience | 3 | Nice-to-have |

**Agency/Service Business**
| Signifier | Weight | Rationale |
|-----------|--------|-----------|
| Marketing Budget | 10 | Direct correlation with ability to pay |
| Growth Indicators | 9 | Growing companies need more services |
| Decision Maker Access | 8 | Critical for closing |
| Previous Agency Spend | 7 | Shows they value outsourcing |
| Company Stage | 5 | Startups vs enterprise approach |
| Industry Vertical | 4 | Specialization helps but not required |

#### Writing Effective Signifier Descriptions

```json
{
  "id": "sig-budget-availability",
  "name": "Budget Availability",
  "weight": 10,
  "description": "Assess the company's ability and willingness to invest in a solution like ours. Look for: recent funding rounds, positive financial performance, existing tech spend, hiring growth, or statements indicating budget allocation for similar solutions. Score 100+ if strong budget evidence, 50-70 if moderate indicators, 0-20 if unclear or negative indicators.",
  "enabled": true
}
```

**Key elements of a good description**:
1. **Clear criterion**: What you're evaluating
2. **Evidence to look for**: Specific signals for the AI to find
3. **Scoring guidance**: What constitutes high/medium/low scores
4. **Context**: Why this matters for your solution

### Configuring Tier Thresholds

Tier thresholds determine which leads get prioritized. They should reflect your **sales capacity and strategy**.

#### Default Thresholds

| Tier | Score Range | Typical Action |
|------|-------------|----------------|
| **Hot** | 80-100 | Immediate personal outreach |
| **Warm** | 50-79 | Add to sequences, monitor engagement |
| **Nurture** | 30-49 | Content marketing, occasional touchpoints |
| **Disqualified** | 0-29 | Archive or exclude from outreach |

#### Adjusting Thresholds for Your Situation

**Scenario 1: Limited Sales Capacity (Small Team)**
```
Hot: 85+      // Only pursue exceptional leads
Warm: 60-84   // Moderate leads get automated nurturing
Nurture: 40-59 // Long-term nurture
DQ: Below 40
```

**Scenario 2: Aggressive Growth (Expanding Team)**
```
Hot: 70+      // Lower bar to cast wider net
Warm: 45-69   // More leads in follow-up
Nurture: 25-44 // Keep more in nurture
DQ: Below 25
```

**Scenario 3: Enterprise Focus (High-Value Deals)**
```
Hot: 90+      // Only pursue near-perfect fits
Warm: 70-89   // Strong potential only
Nurture: 50-69 // Develop for future
DQ: Below 50   // Higher bar overall
```

**Scenario 4: High-Volume SMB (Self-Service)**
```
Hot: 60+      // More leads qualify as hot
Warm: 40-59   // Broader warm tier
Nurture: 20-39 // Even marginal leads nurtured
DQ: Below 20   // Only clearly unqualified filtered
```

#### Tier Threshold Best Practices

1. **Align with sales capacity**: Don't set thresholds that generate more Hot leads than your team can handle
2. **Review regularly**: Analyze conversion rates by tier and adjust
3. **Consider seasonality**: May need temporary adjustments during peak periods
4. **Track feedback loops**: Monitor how scored leads actually perform

### Complete Example Configurations

#### Example 1: B2B SaaS Company (Series Stage, $50k ACV Target)

**Business Context**:
- Sells project management software to mid-market companies
- Price: $10k-50k annually
- Sales cycle: 2-4 months
- Target: 50-500 employees, actively using project tools

**Configuration**:

```json
{
  "requiredCharacteristics": [
    {
      "id": "req-b2b",
      "name": "B2B Company",
      "description": "Must sell products/services to businesses, not consumers",
      "enabled": true
    },
    {
      "id": "req-employees",
      "name": "25+ Employees",
      "description": "Company must have at least 25 employees to afford our solution",
      "enabled": true
    },
    {
      "id": "req-english",
      "name": "English Speaking",
      "description": "Primary operations in English-speaking country (US, UK, Canada, Australia, etc.)",
      "enabled": true
    }
  ],
  "demandSignifiers": [
    {
      "id": "sig-active-search",
      "name": "Active Tool Search",
      "weight": 10,
      "description": "Company actively evaluating or has recently evaluated project management solutions. Look for: recent tool reviews, RFPs, hiring for PM roles, blog content about project management challenges.",
      "enabled": true
    },
    {
      "id": "sig-budget",
      "name": "Budget Indicators",
      "weight": 9,
      "description": "Signs of financial health and ability to invest. Look for: recent funding, revenue growth, hiring expansion, positive news about growth, existing tool spend.",
      "enabled": true
    },
    {
      "id": "sig-pain-points",
      "name": "Clear Pain Points",
      "weight": 8,
      "description": "Evidence of challenges our solution addresses. Look for: mentions of project visibility issues, remote work coordination problems, scaling challenges, team collaboration struggles.",
      "enabled": true
    },
    {
      "id": "sig-timeline",
      "name": "Timeline Urgency",
      "weight": 7,
      "description": "Indicators of immediate need or upcoming trigger. Look for: recent growth, new funding, organizational changes, new initiatives, hiring surges, expansion plans.",
      "enabled": true
    },
    {
      "id": "sig-decision-maker",
      "name": "Decision Maker Access",
      "weight": 6,
      "description": "Ability to reach decision makers. Look for: identified VP/Director level executives, clear org structure, accessible leadership, known contacts.",
      "enabled": true
    },
    {
      "id": "sig-tech-fit",
      "name": "Technical Fit",
      "weight": 4,
      "description": "Compatibility with our solution requirements. Look for: existing tech stack compatibility, cloud-native infrastructure, API usage, modern development practices.",
      "enabled": true
    },
    {
      "id": "sig-culture",
      "name": "Culture Alignment",
      "weight": 2,
      "description": "Cultural fit with our ideal customer. Look for: innovation mindset, growth orientation, collaborative culture, transparency values.",
      "enabled": true
    }
  ],
  "tierHotMin": 80,
  "tierWarmMin": 55,
  "tierNurtureMin": 30
}
```

**Total Weight Calculation**:
```
Total Weight = 10 + 9 + 8 + 7 + 6 + 4 + 2 = 46

Percentage impact on total score:
- Active Tool Search: 10/46 = 21.7%
- Budget Indicators: 9/46 = 19.6%
- Clear Pain Points: 8/46 = 17.4%
- Timeline Urgency: 7/46 = 15.2%
- Decision Maker Access: 6/46 = 13.0%
- Technical Fit: 4/46 = 8.7%
- Culture Alignment: 2/46 = 4.3%
```

#### Example 2: Marketing Agency (Lead Generation Services)

**Business Context**:
- Sells lead generation services to SMBs
- Price: $5k-20k/month retainers
- Sales cycle: 2-6 weeks
- Target: Growing businesses needing more leads

**Configuration**:

```json
{
  "requiredCharacteristics": [
    {
      "id": "req-b2b",
      "name": "B2B Company",
      "description": "Must serve business customers",
      "enabled": true
    },
    {
      "id": "req-marketing-budget",
      "name": "Existing Marketing Spend",
      "description": "Already spending on marketing or advertising (AdWords, Facebook, etc.)",
      "enabled": true
    },
    {
      "id": "req-growth-stage",
      "name": "Growth Stage Company",
      "description": "Company in growth phase (not pre-revenue, not stagnant)",
      "enabled": true
    }
  ],
  "demandSignifiers": [
    {
      "id": "sig-marketing-spend",
      "name": "Marketing Budget Size",
      "weight": 10,
      "description": "Current marketing budget indicates ability to afford services. Look for: estimated ad spend, marketing team size, agency partnerships, marketing technology stack.",
      "enabled": true
    },
    {
      "id": "sig-growth-rate",
      "name": "Growth Indicators",
      "weight": 9,
      "description": "Company is growing and scaling. Look for: recent hiring, funding, expansion, new product launches, revenue growth, new locations.",
      "enabled": true
    },
    {
      "id": "sig-pain-urgency",
      "name": "Lead Pain Urgency",
      "weight": 8,
      "description": "Urgent need for more leads. Look for: statements about lead quality, hiring sales team, missed quotas, new product launches, competitive pressure.",
      "enabled": true
    },
    {
      "id": "sig-accessibility",
      "name": "Decision Maker Access",
      "weight": 7,
      "description": "Can reach the decision maker. Look for: founder/owner contact info, small org structure, direct contact available, responsive leadership.",
      "enabled": true
    },
    {
      "id": "sig-niche-fit",
      "name": "Industry Niche Fit",
      "weight": 5,
      "description": "Industry aligns with our expertise. Score highest for industries we've succeeded in before, moderate for adjacent industries.",
      "enabled": true
    },
    {
      "id": "sig-tech-savvy",
      "name": "Digital Maturity",
      "weight": 3,
      "description": "Comfortable with digital marketing. Look for: active social media, modern website, email marketing, digital presence.",
      "enabled": true
    }
  ],
  "tierHotMin": 75,
  "tierWarmMin": 50,
  "tierNurtureMin": 25
}
```

### Testing and Iterating Your Configuration

#### 1. Start with a Baseline Configuration

Begin with 2-3 requirements and 5-7 signifiers using the examples above as templates.

#### 2. Score a Batch of Leads

Run scoring on 20-50 existing leads to establish a baseline distribution.

#### 3. Review and Adjust

| Issue | Symptom | Solution |
|-------|----------|----------|
| Too many Hot leads | Sales team overwhelmed | Raise tier thresholds or add requirements |
| Too few Hot leads | Nothing to prioritize | Lower tier thresholds or reduce requirements |
| Poor quality Hot leads | Leads not converting | Adjust signifier weights or descriptions |
| Good leads disqualified | Requirements too strict | Remove or relax certain requirements |
| Scores all similar | Lack of differentiation | Increase weight spread (add more 1-2 and 9-10 weights) |

#### 4. Monitor Conversion Metrics

Track these metrics by tier:
- **Conversion Rate**: Leads → Opportunities → Closed Deals
- **Time to Close**: Average days to close by tier
- **Deal Size**: Average contract value by tier
- **Activity Required**: Touches needed to engage by tier

Use this data to iteratively refine your configuration.

### Common Mistakes to Avoid

| Mistake | Why It's Problematic | Fix |
|---------|---------------------|-----|
| **Too many requirements** | Filters out good leads | Keep to 2-4 maximum |
| **Vague descriptions** | AI can't evaluate accurately | Be specific about what to look for |
| **All high weights** | No differentiation in scoring | Use 1-10 range intentionally |
| **Weights don't match sales process** | High scores don't convert | Align with what actually matters |
| **Never updating configuration** | Business evolves, scoring should too | Review quarterly |
| **Thresholds too high/low** | Misaligned with capacity | Adjust based on sales bandwidth |
| **Ignoring disqualified results** | Missing patterns in rejected leads | Review why leads fail requirements |

---

## 3. Scoring Prompts

### 3.1 Exact Scoring Prompt Template

**File**: `src-tauri/src/commands/research.rs:687-877`

#### Prompt Sections

**1. Header Section**
```markdown
You are a lead scoring analyst. Your task is to evaluate the following company as a sales lead and provide a detailed scoring assessment.

COMPANY INFORMATION:
{lead_context}

SCORING CRITERIA:

## Required Characteristics (Pass/Fail)
These are gates that must be passed for a lead to be considered qualified. If ANY required characteristic fails, the lead will be classified as "disqualified" regardless of the demand signifier scores.

{req_formatted}

## Demand Signifiers (Weighted Scoring)
Evaluate each of the following factors on a scale of 0-100. The final score is calculated as a weighted average.

{sig_formatted}

## Tier Thresholds
- Hot: {config.tier_hot_min}+ (highest priority leads)
- Warm: {config.tier_warm_min}-{config.tier_hot_min - 1} (good potential)
- Nurture: {config.tier_nurture_min}-{config.tier_warm_min - 1} (needs development)
- Disqualified: Below {config.tier_nurture_min} OR fails any required characteristic
```

**2. Lead Context Formatting**

```rust
fn format_lead_context(lead: &db::Lead, people: &[db::Person]) -> String {
    let mut context = format!("Company Name: {}\n", lead.company_name);

    if let Some(website) = &lead.website {
        context.push_str(&format!("Website: {}\n", website));
    }
    if let Some(industry) = &lead.industry {
        context.push_str(&format!("Industry: {}\n", industry));
    }
    if let Some(employees) = &lead.employees {
        context.push_str(&format!("Employees: {}\n", employees));
    }
    if let Some(revenue) = &lead.annual_revenue {
        context.push_str(&format!("Revenue: {}\n", revenue));
    }
    // ... more fields

    // Add people information
    for person in people {
        context.push_str(&format!(
            "- {}, {} ({})\n",
            person.first_name,
            person.last_name,
            person.title.as_deref().unwrap_or("Unknown")
        ));
    }

    context
}
```

**3. Output Format Instructions**

```markdown
OUTPUT FORMAT:

Respond ONLY with a valid JSON object matching this exact structure:

{
  "passesRequirements": true/false,
  "requirementResults": [
    {
      "id": "requirement-id",
      "name": "Requirement Name",
      "passed": true/false,
      "reason": "Brief explanation for this evaluation"
    }
  ],
  "totalScore": 75,
  "scoreBreakdown": [
    {
      "id": "signifier-id",
      "name": "Signifier Name",
      "weight": 8,
      "score": 80,
      "weightedScore": 24,
      "reason": "Explanation for this score"
    }
  ],
  "tier": "hot"|"warm"|"nurture"|"disqualified",
  "scoringNotes": "Overall assessment and recommendations"
}

IMPORTANT:
- scores must be integers 0-100
- weightedScore should be (score × weight / total_weights × 100)
- tier must match the thresholds provided
- Provide concise but informative reasoning
```

### 3.2 Variables Injected into Prompt

| Variable | Source | Format |
|----------|--------|--------|
| Company Name | `lead.company_name` | String |
| Website | `lead.website` | URL or "Not provided" |
| Industry | `lead.industry` | Industry name |
| Sub-Industry | `lead.sub_industry` | Optional detail |
| Employees | `lead.employees` | Count or range |
| Revenue | `lead.annual_revenue` | Dollar amount |
| Location | `lead.city`, `state`, `country` | City, State, Country |
| Company Profile | `lead.company_profile` | Markdown (if available) |
| People Data | `people` array | Name, title, email |
| Requirements | `config.required_characteristics` | Filtered to enabled only |
| Signifiers | `config.demand_signifiers` | Filtered to enabled only |
| Tier Thresholds | `config.tier_*_min` | Hot, Warm, Nurture values |

### 3.3 AI Response Parsing

**File**: `src-tauri/src/jobs/completion_handler.rs:251-262`

#### Validation

```rust
// Parse JSON from file
let score_data: serde_json::Value = serde_json::from_str(&outputs.primary_content)
    .map_err(|e| CompletionError::ParseError(format!("Invalid score JSON: {}", e)))?;

// Validate required fields
if score_data.get("passesRequirements").is_none() {
    return Err(CompletionError::ValidationError(
        "Score JSON missing 'passesRequirements' field".to_string()
    ));
}
```

#### Expected JSON Structure

```json
{
  "passesRequirements": true,
  "requirementResults": [
    {
      "id": "req-b2b-company",
      "name": "B2B Company",
      "passed": true,
      "reason": "Company sells enterprise software to businesses"
    },
    {
      "id": "req-company-size",
      "name": "Company Size 10+",
      "passed": true,
      "reason": "Company has 150 employees"
    }
  ],
  "totalScore": 75,
  "scoreBreakdown": [
    {
      "id": "sig-budget",
      "name": "Budget Availability",
      "weight": 10,
      "score": 80,
      "weightedScore": 32,
      "reason": "Recent funding round of $5M indicates available budget"
    },
    {
      "id": "sig-timeline",
      "name": "Timeline Urgency",
      "weight": 8,
      "score": 70,
      "weightedScore": 22.4,
      "reason": "Actively evaluating solutions"
    }
  ],
  "tier": "warm",
  "scoringNotes": "This lead shows strong potential with recent funding and active solution evaluation. Focus on ROI and implementation speed."
}
```

---

## 4. Score Storage & Retrieval

### 4.1 Database Schema

**File**: `src-tauri/src/db/schema.rs:157-175`

#### LeadScores Table

```sql
CREATE TABLE lead_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    config_id INTEGER NOT NULL REFERENCES scoring_configs(id),
    passes_requirements BOOLEAN NOT NULL DEFAULT 0,
    requirement_results TEXT NOT NULL,    -- JSON
    total_score INTEGER NOT NULL,
    score_breakdown TEXT NOT NULL,        -- JSON
    tier TEXT NOT NULL DEFAULT 'disqualified',
    scoring_notes TEXT,
    scored_at INTEGER,
    created_at INTEGER NOT NULL
);

CREATE INDEX idx_lead_scores_lead_id ON lead_scores(lead_id);
CREATE INDEX idx_lead_scores_config_id ON lead_scores(config_id);
CREATE INDEX idx_lead_scores_created_at ON lead_scores(created_at);
```

#### Rust Structure

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeadScore {
    pub id: i64,
    pub lead_id: i64,
    pub config_id: i64,
    pub passes_requirements: bool,
    pub requirement_results: String,  // JSON
    pub total_score: i64,
    pub score_breakdown: String,      // JSON
    pub tier: String,
    pub scoring_notes: Option<String>,
    pub scored_at: Option<i64>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedLeadScore {
    pub id: i64,
    pub lead_id: i64,
    pub config_id: i64,
    pub passes_requirements: bool,
    pub requirement_results: Vec<RequirementResult>,
    pub total_score: i64,
    pub score_breakdown: Vec<ScoreBreakdownItem>,
    pub tier: ScoringTier,
    pub scoring_notes: Option<String>,
    pub scored_at: Option<i64>,
    pub created_at: i64,
}
```

### 4.2 Score CRUD Operations

**File**: `src-tauri/src/commands/database.rs`

#### Get Active Config

```rust
#[tauri::command]
pub fn get_active_scoring_config(state: State<'_, DbState>)
    -> Result<Option<ParsedScoringConfig>, String>
```

#### Get Lead Score

```rust
#[tauri::command]
pub fn get_lead_score(state: State<'_, DbState>, lead_id: i64)
    -> Result<Option<ParsedLeadScore>, String>
```

**Query**:
```sql
SELECT * FROM lead_scores
WHERE lead_id = ?1
ORDER BY created_at DESC
LIMIT 1
```

#### Get Leads with Scores

```rust
#[tauri::command]
pub fn get_leads_with_scores(state: State<'_, DbState>)
    -> Result<Vec<LeadWithScore>, String>
```

**Query**:
```sql
SELECT
    l.*,
    ls.id AS score_id,
    ls.passes_requirements,
    ls.total_score,
    ls.tier,
    ls.scored_at
FROM leads l
LEFT JOIN lead_scores ls ON l.id = ls.lead_id
LEFT JOIN (
    SELECT lead_id, MAX(created_at) AS max_created
    FROM lead_scores
    GROUP BY lead_id
) latest ON ls.lead_id = latest.lead_id
    AND ls.created_at = latest.max_created
ORDER BY l.created_at DESC
```

#### Get Unscored Leads

```rust
#[tauri::command]
pub fn get_unscored_leads(state: State<'_, DbState>)
    -> Result<Vec<Lead>, String>
```

**Query**:
```sql
SELECT * FROM leads
WHERE id NOT IN (SELECT DISTINCT lead_id FROM lead_scores)
ORDER BY created_at DESC
```

### 4.3 Score Insertion

**File**: `src-tauri/src/jobs/completion_handler.rs:423-433`

```rust
// First, delete existing score for this lead
tx.execute(
    "DELETE FROM lead_scores WHERE lead_id = ?1",
    &[lead_id],
)?;

// Insert new score
tx.execute(
    "INSERT INTO lead_scores (
        lead_id, config_id, passes_requirements, requirement_results,
        total_score, score_breakdown, tier, scoring_notes, scored_at, created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
    params![
        lead_id, config.id, passes_requirements, requirement_results,
        total_score, score_breakdown, tier, scoring_notes, now, now
    ],
)?;
```

---

## 5. Scoring UI Components

### 5.1 Score Badge Components

**File**: `src/components/leads/score-badge.tsx`

#### ScoreBadge (Small)

```typescript
interface ScoreBadgeProps {
  score: ParsedLeadScore | null;
  size?: "sm" | "default";
}

// Circular badge showing total score
// Size: sm = w-5 h-5, default = w-6 h-6
// Colors based on tier:
// - hot: bg-green-500
// - warm: bg-orange-500
// - nurture: bg-orange-400
// - disqualified: bg-red-500
// - null: bg-neutral-600
```

#### ScoreBadgeLarge

```typescript
interface ScoreBadgeLargeProps {
  score: ParsedLeadScore;
}

// Large display with:
// - Score number (2xl font-bold)
// - Tier label with styled border
// - "Qualified" / "Disqualified" text
```

### 5.2 Score Bar Visualization

**File**: `src/components/leads/score-bars.tsx`

#### Bars Component

```typescript
interface BarsProps {
  value: number;        // 0-100
  tier: ScoringTier | null;
  size?: "sm" | "default" | "lg";
}

// 10 horizontal bars
// Filled bars = Math.floor(value / 10)
// Partial fill for remainder
// Color based on tier
```

#### Size Specifications

| Size | Bar Width | Bar Height | Gap |
|------|-----------|------------|-----|
| sm | w-1 (4px) | h-3 (12px) | gap-px (1px) |
| default | w-1.5 (6px) | h-4 (16px) | gap-px (1px) |
| lg | w-2 (8px) | h-5 (20px) | gap-px (1px) |

#### ScoreCard Component

```typescript
interface ScoreCardProps {
  score: ParsedLeadScore;
  className?: string;
}

// Used in lead detail sidebar
// Shows:
// - Large score number
// - Tier label
// - Score bars
// - Requirements passed count
```

### 5.3 Score Breakdown Display

**File**: `src/components/leads/score-breakdown.tsx`

#### Full Breakdown

```typescript
interface ScoreBreakdownProps {
  score: ParsedLeadScore;
}

// Displays:
// 1. Header section
//    - Large score number (2xl)
//    - Tier label with color
//    - Large score bars (lg)
//
// 2. Required Characteristics
//    - Each requirement with:
//      - Check/X icon
//      - Name
//      - Reason (in muted text)
//
// 3. Demand Signifiers
//    - Each signifier with:
//      - Name
//      - Weight indicator (×N)
//      - Mini score bars (sm)
//      - Score value
//      - Reason
//
// 4. AI Assessment
//    - scoringNotes text
//    - Timestamp
```

#### Compact Breakdown

```typescript
// Space-efficient alternative
// Shows:
// - Top 3 demand signifiers only
// - Summary requirement count
// - Smaller bars (default)
```

### 5.4 Tier Filter Tabs

**File**: `src/components/leads/score-badge.tsx:75-114`

```typescript
interface TierFilterTabsProps {
  activeTier: ScoringTier | "all" | "unscored";
  onTierChange: (tier: ScoringTier | "all" | "unscored") => void;
  counts: Record<string, number>;
}

// Tabs: All, Hot, Warm, Nurture, Disqualified, Unscored
// Each tab shows:
// - Colored dot for tier
// - Tier label
// - Count badge
// Active tab has background highlight
```

---

## 6. Scoring Data Flow

### 6.1 End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     SCORING DATA FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Lead Data + Scoring Config                              │   │
│  │  - Company info, industry, size                         │   │
│  │  - Associated people                                    │   │
│  │  - Required characteristics                             │   │
│  │  - Demand signifiers with weights                       │   │
│  │  - Tier thresholds                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  PROCESSING                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Build prompt with all context                        │   │
│  │ 2. Invoke Claude CLI                                    │   │
│  │ 3. Stream output to frontend                           │   │
│  │ 4. Parse JSON response                                  │   │
│  │ 5. Validate required fields                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  OUTPUT                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ score.json                                               │   │
│  │ {                                                        │   │
│  │   passesRequirements: true,                             │   │
│  │   requirementResults: [...],                            │   │
│  │   totalScore: 75,                                       │   │
│  │   scoreBreakdown: [...],                                │   │
│  │   tier: "warm",                                         │   │
│  │   scoringNotes: "..."                                   │   │
│  │ }                                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  STORAGE                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Begin transaction                                    │   │
│  │ 2. Delete existing score for lead                       │   │
│  │ 3. INSERT new score record                              │   │
│  │ 4. Commit transaction                                   │   │
│  │ 5. Emit lead-scored event                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  DISPLAY                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ - Score badge in lists                                  │   │
│  │ - Score bars in detail views                            │   │
│  │ - Full breakdown on score tab                           │   │
│  │ - Tier filter in list header                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Input: Lead Data + Scoring Config

#### Lead Context Formatting

```rust
fn format_lead_context(lead: &db::Lead, people: &[db::Person]) -> String {
    format!(r#"
Company Name: {}
Website: {}
Industry: {}
Sub-Industry: {}
Employees: {}
Revenue: {}
Location: {}, {}, {}

Company Profile:
{}

Key People:
{}
"#,
        lead.company_name,
        lead.website.as_deref().unwrap_or("Not provided"),
        lead.industry.as_deref().unwrap_or("Unknown"),
        lead.sub_industry.as_deref().unwrap_or(""),
        lead.employees.as_deref().unwrap_or(&"Unknown".to_string()),
        lead.annual_revenue.as_deref().unwrap_or(&"Unknown".to_string()),
        lead.city.as_deref().unwrap_or(""),
        lead.state.as_deref().unwrap_or(""),
        lead.country.as_deref().unwrap_or(""),
        lead.company_profile.as_deref().unwrap_or("No profile available"),
        people.iter().map(|p| format!(
            "- {}, {} ({})",
            p.first_name, p.last_name,
            p.title.as_deref().unwrap_or("Unknown")
        )).collect::<Vec<_>>().join("\n")
    ).trim().to_string()
}
```

### 6.3 Processing: AI Scoring Job

#### Job Processing Steps

```
1. JOB QUEUE ENTRY
   └─ status: "queued", type: "scoring"

2. SEMAPHORE ACQUISITION
   └─ Wait for available slot (max 5 concurrent)

3. CLAUDE CLI INVOCATION
   ├─ Write prompt to temp file
   ├─ Execute: claude -p prompt.txt --output-format stream-json
   └─ Output redirected to score.json

4. STREAM PROCESSING
   ├─ Read stdout/stderr line by line
   ├─ Parse stream-json events
   ├─ Batch insert to job_logs (3 per batch)
   └─ Emit events to frontend

5. COMPLETION HANDLING
   ├─ Wait for process exit (10min timeout)
   ├─ Verify score.json exists
   ├─ Parse and validate JSON
   ├─ Update database in transaction
   └─ Clean up temp files
```

### 6.4 Output: Score with Breakdown and Tier

#### Stored Data Structure

```json
{
  "id": 123,
  "lead_id": 456,
  "config_id": 1,
  "passes_requirements": true,
  "requirement_results": [
    {
      "id": "req-1",
      "name": "B2B Company",
      "passed": true,
      "reason": "Sells to businesses"
    }
  ],
  "total_score": 75,
  "score_breakdown": [
    {
      "id": "sig-1",
      "name": "Budget",
      "weight": 10,
      "score": 80,
      "weightedScore": 32,
      "reason": "Recent funding"
    }
  ],
  "tier": "warm",
  "scoring_notes": "Strong potential",
  "scored_at": 1735843200000,
  "created_at": 1735843200000
}
```

---

## 7. Frontend Integration

### 7.1 Score Display in Lists

**File**: `src/components/leads/lead-list-with-selection.tsx`

#### List Row Display

```typescript
// In each lead row:
<div className="flex items-center gap-2">
  {score && (
    <>
      <ScoreBadge score={score} size="sm" />
      <ScoreBars value={score.totalScore} tier={score.tier} size="sm" />
    </>
  )}
</div>
```

#### Tier Filtering

```typescript
// Tier filter tabs in header
<TierFilterTabs
  activeTier={activeTier}
  onTierChange={setActiveTier}
  counts={tierCounts}
/>
```

### 7.2 Score Display in Detail Views

**File**: `src/pages/lead/detail.tsx` and `src/components/lead/lead-research-panel.tsx`

#### Sidebar Score Card

```typescript
<ScoreCard score={score} className="mb-4" />
```

#### Score Tab Content

```typescript
<TabsContent value="score" className="space-y-4">
  {score ? (
    <ScoreBreakdown score={score} />
  ) : (
    <EmptyState
      title="No score available"
      description="This lead hasn't been scored yet."
      action={{
        label: "Score Lead",
        onClick: handleScore,
        isLoading: isScoringJobActive
      }}
    />
  )}
</TabsContent>
```

### 7.3 Bulk Scoring

#### Bulk Action Handler

```typescript
const handleScore = async () => {
  const selectedIds = Array.from(selectedLeads);

  let started = 0;
  let failed = 0;

  for (const leadId of selectedIds) {
    try {
      await startScoring(leadId, handleStreamEvent);
      started++;
    } catch (error) {
      console.error(`Failed to score lead ${leadId}:`, error);
      failed++;
    }
  }

  if (started > 0) {
    toast.success(`Started scoring ${started} lead${started !== 1 ? 's' : ''}`);
  }
  if (failed > 0) {
    toast.error(`Failed to score ${failed} lead${failed !== 1 ? 's' : ''}`);
  }

  clearSelection();
};
```

---

## Key File Paths

### Backend Files

| File | Purpose |
|------|---------|
| `src-tauri/src/commands/research.rs:466-561` | `start_scoring` command |
| `src-tauri/src/commands/research.rs:687-877` | `build_scoring_prompt` function |
| `src-tauri/src/db/schema.rs:119-147` | `ScoringConfig` table |
| `src-tauri/src/db/schema.rs:157-175` | `LeadScore` table |
| `src-tauri/src/commands/database.rs` | Score CRUD operations |
| `src-tauri/src/jobs/completion_handler.rs:364-434` | Score result processing |

### Frontend Files

| File | Purpose |
|------|---------|
| `src/components/leads/score-badge.tsx` | Score badge components |
| `src/components/leads/score-bars.tsx` | Score bar visualization |
| `src/components/leads/score-breakdown.tsx` | Full breakdown display |
| `src/components/scoring/config-editor.tsx` | Scoring configuration UI |
| `src/lib/types/scoring.ts` | TypeScript type definitions |

---

## Tier Color Reference

| Tier | Background | Border | Text | Usage |
|------|-----------|--------|------|-------|
| hot | green-500/10 | green-500/30 | green-500 | High priority |
| warm | orange-500/10 | orange-500/30 | orange-500 | Good potential |
| nurture | orange-400/10 | orange-400/30 | orange-400 | Needs development |
| disqualified | red-500/10 | red-500/30 | red-500 | Not a fit |
| unscored | neutral-600 | neutral-600/30 | neutral-400 | No score |

---

*Document Version: 1.0*
*Last Updated: 2025*
