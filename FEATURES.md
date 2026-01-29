# Liidi Application - Complete Feature Inventory

This document provides a comprehensive list of ALL features in the Liidi B2B lead research and qualification application.

---

## 1. Authentication & Onboarding

| Feature | Description |
|---------|-------------|
| **Login Page** (`/auth/login`) | Sign in with Clerk authentication, social login options |
| **Sign Up Page** (`/auth/signup`) | Create new account with social signup, Terms of Service |
| **Organization Registration** | Link installation to organization, select from available organizations |
| **Company Overview Dialog** | Initial onboarding - describe company details before using app |
| **Onboarding Checklist** | Track setup progress (company overview, configuration completion) |
| **Organization Switcher** | Switch between organizations with data isolation |
| **Subscription Management** | Tier-based access control (Free/Pro/Enterprise), lockout handling, grace periods |
| **Machine Binding** | Device fingerprinting for single-device subscription enforcement |

---

## 2. People/Contact Management

| Feature | Description |
|---------|-------------|
| **People List Page** (`/people`) | View all people with status grouping, search, filter |
| **Add Person Modal** | Create person with name, email, job title, LinkedIn URL, company association |
| **Import People** | Bulk import people from CSV with drag & drop, Google Sheets integration, validation, preview |
| **CSV Template Download** | Download CSV templates for people import |
| **Person Detail Page** | View person profile with tabs for research, conversation topics, notes |
| **Person Status Management** | Update person status with dropdown selector |
| **People Multi-Select** | Select multiple people with Cmd/Ctrl+A, Escape to clear |
| **Bulk People Actions** | Research selected, generate conversation topics, delete selected |
| **Adjacent Person Navigation** | Previous/Next navigation between people |
| **Person CRUD Operations** | Full Create, Read, Update, Delete for people entities |

---

## 3. Company/Lead Management

| Feature | Description |
|---------|-------------|
| **Leads List Page** (`/lead`) | View all companies with tier indicators, status grouping, search, filter |
| **Add Lead Modal** | Create company with name, website, location fields |
| **Import Leads** | Bulk import companies from CSV with drag & drop, Google Sheets integration, validation, preview |
| **CSV Template Download** | Download CSV templates for lead import |
| **Lead Detail Page** | View company info, associated people, score breakdown, activity history |
| **Lead Status Management** | Update status (New, Qualified, Contacted, Meeting, Proposal, Negotiating, Won, Lost, On Hold) |
| **Leads Multi-Select** | Select multiple leads with keyboard shortcuts |
| **Bulk Lead Actions** | Run research, score, delete selected leads |
| **Adjacent Lead Navigation** | Previous/Next navigation between leads |
| **Lead CRUD Operations** | Full Create, Read, Update, Delete for lead entities |

---

## 4. Research & AI Features

| Feature | Description |
|---------|-------------|
| **Company Research** | AI-powered company research using Claude CLI, generates profile, people list, enrichment data |
| **Person Research** | AI research on individuals, generates profile and enrichment data |
| **Conversation Generation** | Generate talking points and engagement strategies for contacts |
| **Real-time Job Streaming** | Live research logs, scoring progress, conversation generation in stream panel |
| **Research Status Tracking** | Visual badges (Pending, In Progress, Completed, Failed) |
| **Re-run Research** | Regenerate research data for entities |
| **Job Lifecycle Management** | Start, kill, monitor AI jobs (5 concurrent max, 10min timeout) |
| **Job History & Logs** | Access job execution logs, job cleanup, retention management |
| **Job Recovery System** | Detect and recover from stuck jobs or entities with "in_progress" status |
| **AI Model Selection** | Choose between Claude models (Opus/Sonnet) |

---

## 5. Lead Scoring System

| Feature | Description |
|---------|-------------|
| **Automated Lead Scoring** | AI-powered scoring based on configured criteria |
| **Scoring Configuration** | Configure required characteristics, demand signifiers with weights |
| **Tier Classification** | Auto-classify leads as Hot, Warm, Nurture, DQ based on score thresholds |
| **Score Badges** | Visual indicators for lead scores on list items |
| **Score Bars** | Progress visualization of scores |
| **Score Breakdown** | Detailed analysis showing how score was calculated |
| **Required Characteristic Gates** | Gate leads that don't meet required criteria |
| **Weighted Scoring** | Configure weights for different demand signifiers |
| **Lead Score CRUD** | Retrieve, save, delete lead scores |
| **Unscored Leads View** | Filter/view leads that haven't been scored yet |

---

## 6. Import & Export Features

| Feature | Description |
|---------|-------------|
| **CSV Import Modal** | Comprehensive import modal with drag & drop support |
| **Google Sheets Integration** | Import data directly from Google Sheets |
| **CSV Validation** | Validate CSV data before import |
| **CSV Preview** | Preview imported data before committing |
| **CSV Template Download** | Download templates for proper CSV formatting |
| **Column Mapping** | Map CSV columns to entity fields |
| **Tauri Native File Drag & Drop** | Integration with Tauri's native file system APIs |

---

## 7. Notes System

| Feature | Description |
|---------|-------------|
| **Entity Notes** | Add notes to any lead or person entity |
| **Note CRUD Operations** | Create, read, update, delete notes |
| **Markdown Support** | Rich text formatting (**bold**, *italic*, - lists, `code`) |
| **Activity Tracking** | Notes appear in activity timeline |
| **Rich Text Toolbar** | Formatting toolbar for note editing |

---

## 8. Prompt Management

| Feature | Description |
|---------|-------------|
| **Prompt Configuration Page** (`/prompt`) | Edit custom prompts for different AI operations |
| **Company Overview Prompt** | Customize company overview generation |
| **Company Research Prompt** | Customize company research generation |
| **Person Research Prompt** | Customize person research generation |
| **Conversation Topics Prompt** | Customize conversation topic generation |
| **Auto-injected Variables** | Display variables that are auto-injected into prompts |
| **Fallback Prompts** | Default prompts used when no custom prompt is configured |
| **Prompt Storage** | Persistent storage of custom prompts in database |

---

## 9. Stream Panel & Job UI

| Feature | Description |
|---------|-------------|
| **Resizable Stream Panel** | Panel for real-time job output |
| **Tab-based Interface** | Multiple jobs shown as tabs |
| **Persistent UI State** | Panel open/closed state persists across navigation |
| **Live Log Streaming** | Real-time log updates without full refresh |
| **Job Hydration on Reload** | Restore job logs when app reloads |
| **Active Job Indicators** | Visual indicators for running jobs |
| **Job Status Updates** | Real-time status updates via event bridge |

---

## 10. Settings & Configuration

| Feature | Description |
|---------|-------------|
| **Settings Page** | Centralized settings management |
| **Theme Toggle** | Light/Dark/System theme selection with dynamic CSS updates |
| **Model Selector** | Choose AI model (Claude Opus/Sonnet) |
| **Chrome Integration Toggle** | Enable/disable Chrome app mode |
| **GLM Model Toggle** | Enable/disable GLM gateway |
| **Persistent Settings** | Settings saved to database and restored on app load |
| **System Theme Listener** | Auto-update theme when system theme changes |

---

## 11. Organization & Security

| Feature | Description |
|---------|-------------|
| **Organization Binding** | Single-tenant organization setup with data isolation |
| **Machine Binding** | Device identification and binding for licensing |
| **Org Switching with Data Wipe** | Switch organizations with automatic data cleanup |
| **Automatic Backup** | Backup created before org data wipe |
| **Subscription Validation** | Token-based subscription status checking |
| **Grace Periods** | Access during subscription grace period |
| **Lockout Detection** | Check and display lockout status |
| **Subscription Token Encryption** | Secure storage of subscription tokens |
| **Secure Key-Value Storage** | Tauri secure storage for sensitive data |

---

## 12. User Interface Features

| Feature | Description |
|---------|-------------|
| **Sidebar Navigation** | People, Companies, Settings sections with collapsible settings panel |
| **Breadcrumb Navigation** | Navigation breadcrumbs on detail pages |
| **Floating Action Bar** | Dynamic action bar that appears when items are selected with animations |
| **Command Menu** (Cmd/Ctrl+K) | Quick action menu for bulk operations |
| **Keyboard Shortcuts** | Cmd+A (select all), Escape (clear selection), Cmd+K (command menu), navigation arrows |
| **Multi-Select System** | Set-based selection with checkboxes, anchor for range operations, visual selection indicators |
| **Multi-Select Checkboxes** | Individual row checkboxes for selection |
| **Selectable Entity List** | Comprehensive list component supporting multi-select patterns |
| **Empty States** | Helpful messages and CTAs when no data |
| **Skeleton Loading States** | Loading placeholder components for better perceived performance |
| **Loading States** | Spinners, progress indicators, disabled states during operations |
| **Toast Notifications** | Success/error feedback messages |
| **Error Handling** | Error messages with retry options |
| **Responsive Design** | Tauri desktop app optimization, drag regions for window controls |
| **Status Indicators** | Visual badges for entity and job status with configurable colors and icons |
| **Collapsible Status Groups** | Collapsible components for grouping status badges with count badges |
| **Resizable Panels** | Panel layout system with drag handles for flexible UI organization |
| **Enhanced Combobox** | Multi-select combobox with chips, custom rendering, advanced interactions |
| **Markdown Renderer** | Dedicated component for rendering markdown with GFM support |
| **Tabbed Modal Interface** | Modal components with tab-based navigation for complex forms |
| **Animated UI Components** | Smooth animations using Framer Motion (AnimatePresence, motion) |
| **Dynamic Status Badge System** | Comprehensive status badge system with icons and styling |

---

## 13. Data & State Management

| Feature | Description |
|---------|-------------|
| **Zustand Stores** | Client state management (auth, selection, settings, stream panel, subscription) |
| **TanStack Query Integration** | Server state caching and invalidation |
| **Event-Driven Updates** | Backend events trigger frontend cache invalidation |
| **SQLite Database** | Local data storage with WAL mode |
| **Bulk Operations** | Bulk insert/delete for leads and people |
| **Adjacent Entity Navigation** | Get previous/next entities for navigation |
| **Normalized State** | Map-based entity storage for O(1) lookups |
| **Query Key Management** | Centralized query keys for cache invalidation |

---

## 14. Backend/Infrastructure Features

| Feature | Description |
|---------|-------------|
| **Tauri 2 Integration** | Desktop app framework with Rust backend |
| **Job Queue System** | Semaphore-based concurrent job limiting (5 max) |
| **Job Timeout Protection** | 10-minute timeout per job |
| **Channel Streaming** | Real-time output streaming via Tauri channels |
| **Event Emission** | Backend emits events for frontend updates |
| **Database Schema** | Tables: leads, people, notes, prompts, scoring_config, lead_scores, jobs, job_logs, settings, org_binding, subscription_state, machine_binding |
| **Recovery Commands** | Get/reset stuck entities, recover all stuck jobs |
| **Job Cleanup** | Automatic cleanup of old completed jobs (default 7 days) to prevent database bloat |
| **Atomic Job Completion** | Ensures job completion happens atomically with proper error handling and file cleanup |
| **Research Data Enrichment** | Extracts and stores additional metadata (industry, employee count, revenue, email, title, LinkedIn, management level) |
| **Smart Person Name Parsing** | Intelligent extraction of first/last names from JSON data with fallbacks |
| **Device-Bound Token Encryption** | AES-256-GCM encryption with device-specific keys to prevent token theft |
| **Subscription Grace Period** | 7-day grace period for past_due/canceled/expired subscriptions |
| **Automatic Database Backup** | Creates timestamped backups when changing organization bindings |

---

## Summary by Category

| Category | Feature Count |
|----------|---------------|
| Authentication & Onboarding | 8 |
| People Management | 10 |
| Company/Lead Management | 10 |
| Research & AI | 10 |
| Lead Scoring | 10 |
| Notes | 5 |
| Prompt Management | 8 |
| Stream Panel | 7 |
| Settings | 6 |
| Organization & Security | 9 |
| **Import & Export** | 7 |
| UI Features | 22 |
| Data & State Management | 8 |
| Backend/Infrastructure | 15 |
| **TOTAL** | **135 features** |

---

## Key Files Reference

| Purpose | Path |
|---------|------|
| App routing | `src/App.tsx` |
| All Zustand stores | `src/lib/store/` (auth-store.ts, selection-store.ts, settings-store.ts, stream-panel-store.ts, subscription-store.ts) |
| All hooks | `src/lib/hooks/` (use-leads.ts, use-people.ts, use-notes.ts, use-stream-tabs.ts, use-job-submission.ts, use-org-binding.ts) |
| Tauri commands | `src/lib/tauri/commands.ts` |
| Event bridge | `src/lib/tauri/event-bridge.ts` |
| CSV templates | `src/lib/csv-templates.ts` |
| Status configs | `src/lib/constants/status-config.ts` |
| Stream utilities | `src/lib/stream/` (handle-stream-event.ts, job-log-parser.ts, stream-parser.ts) |
| Type definitions | `src/lib/types/` (claude.ts, scoring.ts), `src/lib/tauri/types.ts` |
| Selection components | `src/components/selection/` (floating-action-bar.tsx, action-command-menu.tsx, selection-provider.tsx, selectable-entity-list.tsx, selectable-row.tsx) |
| Import modals | `src/components/leads/import-leads-modal.tsx`, `src/components/people/import-people-modal.tsx` |
| UI components | `src/components/ui/` (collapsible-status-group.tsx, resizable.tsx, combobox.tsx, markdown-renderer.tsx, skeleton.tsx, skeletons.tsx) |
| Scoring config | `src/components/scoring/config-editor.tsx` |
| Database schema | `src-tauri/src/db/schema.rs` |
| Backend commands | `src-tauri/src/commands/` (database.rs, research.rs, prompts.rs, subscription.rs, org.rs, settings.rs, storage.rs, jobs.rs, recovery.rs) |
| Job queue | `src-tauri/src/jobs/queue.rs` |
| Job completion | `src-tauri/src/jobs/completion_handler.rs` |
| Data enrichment | `src-tauri/src/jobs/enrichment.rs` |
| Token encryption | `src-tauri/src/crypto/encryption.rs` |
| Subscription validator | `src-tauri/src/subscription/validator.rs` |
