# Code Cleanup Backlog

**Created**: 2025-01-29
**Purpose**: Document identified code bloat, dead code, and inefficiencies for future cleanup

---

## Summary

After thorough investigation, most "unused" code serves legitimate purposes. The cleanup should focus on **actual duplicate code** rather than removing potentially useful abstractions.

---

## Items to Keep (Serve a Purpose)

| Item | Location | Purpose | Why Keep |
|------|----------|---------|----------|
| `NewNote` struct | `src-tauri/src/db/schema.rs:349-353` | Planned for consistent API pattern | Part of `NewX` pattern (like `NewLead`, `NewPerson`); could be adopted later |
| `NewCompanyProfile` struct | `src-tauri/src/db/schema.rs:381-385` | Planned for consistent API pattern | Same as above |
| `JOB_TIMEOUT_SECS` | `src-tauri/src/jobs/queue.rs:38` | Documents default timeout (600s) | Job-specific timeouts reference this value; serves as documentation |
| `update_lead_research` | `src-tauri/src/db/queries.rs:128-140` | API function for frontend | Marked `#[allow(dead_code)]` intentionally for future use |

### Recommendation: **DO NOT REMOVE** these items

---

## Actual Issues to Fix

### 1. Duplicate Slug Generation Code (HIGH PRIORITY)

**Pattern** - Appears 4 times in `src-tauri/src/commands/research.rs`:

```rust
// Occurrence 1: Lines 153-157 (company research)
let company_slug = lead.company_name
    .to_lowercase()
    .chars()
    .map(|c| if c.is_alphanumeric() { c } else { '_' })
    .collect::<String>();

// Occurrence 2: Lines 297-301 (person research)
let person_slug = format!("{}_{}", person.first_name, person.last_name)
    .to_lowercase()
    .chars()
    .map(|c| if c.is_alphanumeric() { c } else { '_' })
    .collect::<String>();

// Occurrence 3: Lines 719-723 (scoring)
let company_slug = lead.company_name
    .to_lowercase()
    .chars()
    .map(|c| if c.is_alphanumeric() { c } else { '_' })
    .collect::<String>();

// Occurrence 4: Lines 832-836 (conversation)
let person_slug = format!("{}_{}", person.first_name, person.last_name)
    .to_lowercase()
    .chars()
    .map(|c| if c.is_alphanumeric() { c } else { '_' })
    .collect::<String>();
```

**Fix**: Extract to helper function
```rust
fn slugify(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect()
}
```

**Impact**: ~24 lines → 4 function calls

---

### 2. Duplicate Retry Logic in StreamProcessor (HIGH PRIORITY)

**Location**: `src-tauri/src/jobs/stream_processor.rs`

Both `StreamProcessor::flush_buffer` (lines 163-227) and `StreamProcessorHandle::flush_buffer` (lines 441-505) contain **identical 65-line retry loops**:

```rust
let mut retry_count = 0;
let mut total_delay = 0;
const BASE_DELAY_MS: u64 = 50;
let mut insert_success = false;

loop {
    let (should_retry, delay_ms) = match self.db_conn.lock() {
        Ok(conn) => {
            match crate::db::insert_job_logs_batch_full(&conn, &batch_entries) {
                Ok(_) => {
                    if retry_count > 0 {
                        eprintln!("[stream_processor] job_id={} Insert succeeded after {} retries", ...);
                    }
                    insert_success = true;
                    (false, 0)
                }
                Err(e) => {
                    let error_str = format!("{:?}", e);
                    let is_fk_error = error_str.contains("foreign key mismatch")
                        || error_str.contains("FOREIGN KEY constraint");

                    if is_fk_error && total_delay < MAX_TOTAL_DELAY_MS {
                        let delay_ms = BASE_DELAY_MS * 2_u64.pow(retry_count);
                        let remaining_budget = MAX_TOTAL_DELAY_MS.saturating_sub(total_delay);
                        let final_delay = delay_ms.min(remaining_budget);

                        let jitter_base = (final_delay / 4).max(1) as i64;
                        let jitter_range = jitter_base * 2;
                        let jitter = (rand::random::<i64>().abs() % jitter_range) - jitter_base;
                        let jittered_delay = (final_delay as i64 + jitter).max(1) as u64;

                        retry_count += 1;
                        total_delay = total_delay.saturating_add(jittered_delay);
                        (true, jittered_delay)
                    } else {
                        eprintln!("[stream_processor] job_id={} Failed to insert logs batch...", ...);
                        (false, 0)
                    }
                }
            }
            Err(_) => {
                eprintln!("[stream_processor] job_id={} Failed to acquire DB lock", ...);
                (false, 0)
            }
        };

        if !should_retry { break; }
        if delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
        }
}

if insert_success {
    *self.last_flush.lock().await = Instant::now();
}
```

**Fix**: Extract to private method shared by both structs

**Impact**: ~130 lines → 1 shared method (~80 lines net savings)

---

## Items Requiring Decision

### Option A: Adopt `NewX` Pattern Consistently

**Current state**: Some functions use `NewX` structs, others don't

| Function | Uses Struct? |
|----------|-------------|
| `insert_lead` | Uses `NewLead` ✓ |
| `insert_person` | Uses `NewPerson` ✓ |
| `insert_note` | Uses individual parameters ✗ |
| `insert_company_profile` | (likely uses individual params) ✗ |

**Change**: Refactor `insert_note` and company profile functions to use `NewNote`/`NewCompanyProfile`

### Option B: Remove Unused Structs

**Change**: Remove `NewNote` and `NewCompanyProfile` from schema.rs

**Trade-off**: Simpler schema but less consistent API pattern

**Decision needed**: Which approach do you prefer?

---

## Compiler Warnings (Low Priority)

These are harmless but can be cleaned up if desired:

```
warning: struct `NewNote` is never constructed
   --> src/db/schema.rs:349:12

warning: struct `NewCompanyProfile` is never constructed
   --> src/db/schema.rs:381:12

warning: constant `JOB_TIMEOUT_SECS` is never used
   --> src/jobs/queue.rs:38:7
```

---

## Verification Checklist

Before any cleanup:

- [ ] Confirm `update_lead_research` is not needed by frontend
- [ ] Decide on `NewX` pattern adoption vs removal
- [ ] Run tests to verify no regressions
- [ ] Check if slug generation affects existing directory names (compatibility)

---

## Files Potentially Modified

| File | Changes |
|------|---------|
| `src-tauri/src/commands/research.rs` | Add `slugify()` helper, replace 4 duplicate occurrences |
| `src-tauri/src/jobs/stream_processor.rs` | Extract shared retry logic method |
| `src-tauri/src/db/schema.rs` | Optional: remove or adopt `NewNote`/`NewCompanyProfile` |
| `src-tauri/src/jobs/queue.rs` | Optional: remove `JOB_TIMEOUT_SECS` |
