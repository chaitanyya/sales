# New User Experience Plan

## Current State

### Database Schema
- **`prompts` table**: Stores prompts with `type` field (company, person, company_overview, conversation_topics)
- **`settings` table**: Already seeds default settings (`model='sonnet'`, `use_chrome=0`)
- **Initialization**: `init_schema()` in `src-tauri/src/db/mod.rs` creates tables and runs migrations

### Existing Components
- **`CompanyOverviewDialog`** (`src/components/onboarding/company-overview-dialog.tsx`): Fully implemented modal that blocks user interaction until company overview is set
- **`OnboardingStatus`**: Has `hasCompanyOverview` field that checks if a `company_overview` prompt exists
- **`useOnboardingStatus`**: React Query hook to fetch onboarding status

### Problem
1. `CompanyOverviewDialog` exists but is NOT rendered anywhere in the app
2. Prompts are not seeded - user starts with empty prompts

---

## Implementation Plan

### 1. Render CompanyOverviewDialog in App.tsx

**File**: `src/App.tsx`

Changes:
- Import `CompanyOverviewDialog` and `useOnboardingStatus`
- Wrap app content in a check for onboarding status
- Render dialog when `!hasCompanyOverview`

```tsx
import { CompanyOverviewDialog } from "@/components/onboarding/company-overview-dialog";
import { useOnboardingStatus } from "@/lib/query";

export default function App() {
  useEventBridge();
  const { data: onboardingStatus, isLoading } = useOnboardingStatus();

  // Show loading while checking onboarding status
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Blocking dialog for company overview */}
      <CompanyOverviewDialog hasCompanyOverview={onboardingStatus?.hasCompanyOverview ?? false} />

      <div className="flex h-screen...">
        {/* rest of app */}
      </div>
    </QueryClientProvider>
  );
}
```

### 2. Seed Default Prompts in Database

**File**: `src-tauri/src/db/mod.rs`

Add after settings seed in `init_schema()`:

```rust
-- Seed default prompts if they don't exist
INSERT OR IGNORE INTO prompts (type, content, created_at, updated_at)
SELECT 'company', '<default company research prompt>', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
WHERE NOT EXISTS (SELECT 1 FROM prompts WHERE type = 'company');

INSERT OR IGNORE INTO prompts (type, content, created_at, updated_at)
SELECT 'person', '<default person research prompt>', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
WHERE NOT EXISTS (SELECT 1 FROM prompts WHERE type = 'person');

INSERT OR IGNORE INTO prompts (type, content, created_at, updated_at)
SELECT 'conversation_topics', '<default conversation prompt>', strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
WHERE NOT EXISTS (SELECT 1 FROM prompts WHERE type = 'conversation_topics');
```

**Note**: `company_overview` is intentionally NOT seeded - user must provide this.

### 3. Define Default Prompt Content

Need to determine what the default prompts should contain. Options:

**Option A**: Hardcode in Rust `init_schema()`
- Pros: Single source of truth, always available
- Cons: Harder to update, prompts in Rust code

**Option B**: Create a `prompts.rs` module with constants
- Pros: Organized, reusable
- Cons: Still compiled into binary

**Recommendation**: Option B - create constants in a dedicated module

**New file**: `src-tauri/src/prompts/defaults.rs`

```rust
pub const DEFAULT_COMPANY_PROMPT: &str = r#"
Research the following company and provide a comprehensive profile...
"#;

pub const DEFAULT_PERSON_PROMPT: &str = r#"
Research the following person and provide a detailed profile...
"#;

pub const DEFAULT_CONVERSATION_PROMPT: &str = r#"
Generate personalized conversation topics and talking points...
"#;
```

### 4. Invalidate Query After Dialog Submit

**File**: `src/components/onboarding/company-overview-dialog.tsx`

After saving company overview, invalidate the onboarding status query:

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";

// In component:
const queryClient = useQueryClient();

const handleSubmit = () => {
  startTransition(async () => {
    await saveCompanyOverview(content);
    await queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus() });
    setOpen(false);
  });
};
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/App.tsx` | Add CompanyOverviewDialog rendering with onboarding status check |
| `src-tauri/src/db/mod.rs` | Add prompt seeding in init_schema() |
| `src-tauri/src/prompts/defaults.rs` | New file with default prompt constants |
| `src-tauri/src/prompts/mod.rs` | New module declaration |
| `src-tauri/src/lib.rs` | Add prompts module |
| `src/components/onboarding/company-overview-dialog.tsx` | Invalidate query after submit |

---

## Testing Checklist

- [ ] Delete `~/.local/share/qual/data.db` to test fresh install
- [ ] App shows company overview dialog on first launch
- [ ] Cannot dismiss dialog without entering content
- [ ] After submitting, dialog closes and app is usable
- [ ] Prompts page shows seeded default prompts for company/person/conversation
- [ ] Company overview field is empty until user fills it
- [ ] Subsequent launches don't show the dialog (if overview exists)
