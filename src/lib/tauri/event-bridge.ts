import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { queryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/keys";
import { getJobLogs, getJobsActive } from "./commands";
import { parseJobLogs } from "@/lib/stream/job-log-parser";

// Event payload types from backend
interface LeadCreatedPayload {
  id: number;
}

interface LeadUpdatedPayload {
  id: number;
}

interface PersonUpdatedPayload {
  id: number;
  lead_id: number;
}

interface LeadScoredPayload {
  lead_id: number;
}

interface PeopleBulkCreatedPayload {
  lead_id: number;
}

interface LeadDeletedPayload {
  ids: number[];
}

interface PersonDeletedPayload {
  ids: number[];
}

// Job event payloads
interface JobStatusChangedPayload {
  jobId: string;
  status: string;
  exitCode: number | null;
}

interface JobCreatedPayload {
  jobId: string;
  jobType: string;
  entityId: number;
  entityLabel: string;
}

let unlisteners: UnlistenFn[] = [];
let isInitialized = false;

/**
 * Initialize the Tauri event bridge.
 * Sets up listeners for backend events and routes them to Zustand stores.
 * Should be called once at app startup.
 */
export async function initializeEventBridge(): Promise<void> {
  // Prevent double initialization
  if (isInitialized) {
    return;
  }

  // Clean up any existing listeners
  await cleanupEventBridge();

  // Lead created → invalidate leads list + onboarding status
  const leadCreatedUnlisten = await listen<LeadCreatedPayload>("lead-created", () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores() });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus() });
  });
  unlisteners.push(leadCreatedUnlisten);

  // Lead updated → invalidate specific lead + list + onboarding
  const leadUpdatedUnlisten = await listen<LeadUpdatedPayload>("lead-updated", (event) => {
    const id = event.payload.id;
    queryClient.invalidateQueries({ queryKey: queryKeys.lead(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores() });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus() });
  });
  unlisteners.push(leadUpdatedUnlisten);

  // Person updated → invalidate person + lead's people + list + onboarding
  const personUpdatedUnlisten = await listen<PersonUpdatedPayload>("person-updated", (event) => {
    const { id, lead_id } = event.payload;
    queryClient.invalidateQueries({ queryKey: queryKeys.person(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.leadPeople(lead_id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.peopleList() });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus() });
  });
  unlisteners.push(personUpdatedUnlisten);

  // Lead scored → invalidate lead score + list + onboarding
  const leadScoredUnlisten = await listen<LeadScoredPayload>("lead-scored", (event) => {
    const leadId = event.payload.lead_id;
    queryClient.invalidateQueries({ queryKey: queryKeys.leadScore(leadId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores() });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus() });
  });
  unlisteners.push(leadScoredUnlisten);

  // People bulk created → invalidate lead's people + people list
  const peopleBulkCreatedUnlisten = await listen<PeopleBulkCreatedPayload>("people-bulk-created", (event) => {
    const leadId = event.payload.lead_id;
    queryClient.invalidateQueries({ queryKey: queryKeys.leadPeople(leadId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.peopleList() });
  });
  unlisteners.push(peopleBulkCreatedUnlisten);

  // Leads deleted → remove from cache + invalidate lists + onboarding
  const leadDeletedUnlisten = await listen<LeadDeletedPayload>("lead-deleted", (event) => {
    for (const id of event.payload.ids) {
      queryClient.removeQueries({ queryKey: queryKeys.lead(id) });
      queryClient.removeQueries({ queryKey: queryKeys.leadScore(id) });
      queryClient.removeQueries({ queryKey: queryKeys.leadPeople(id) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores() });
    // Also refresh people list as related people may be deleted
    queryClient.invalidateQueries({ queryKey: queryKeys.peopleList() });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus() });
  });
  unlisteners.push(leadDeletedUnlisten);

  // People deleted → remove from cache + invalidate list + onboarding
  const personDeletedUnlisten = await listen<PersonDeletedPayload>("person-deleted", (event) => {
    for (const id of event.payload.ids) {
      queryClient.removeQueries({ queryKey: queryKeys.person(id) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.peopleList() });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus() });
  });
  unlisteners.push(personDeletedUnlisten);

  // Job created → set active tab, open panel, invalidate jobs query
  const jobCreatedUnlisten = await listen<JobCreatedPayload>("job-created", (event) => {
    const { jobId } = event.payload;

    const store = useStreamPanelStore.getState();

    // Set this job as active and open the panel
    store.setActiveTab(jobId);
    store.setOpen(true);

    // Invalidate jobs query so the new job appears in the tab list
    queryClient.invalidateQueries({ queryKey: queryKeys.jobsRecent(50) });
  });
  unlisteners.push(jobCreatedUnlisten);

  // Job status changed → invalidate jobs queries
  const jobStatusChangedUnlisten = await listen<JobStatusChangedPayload>("job-status-changed", (event) => {
    const { jobId } = event.payload;

    // Invalidate jobs queries for status updates
    queryClient.invalidateQueries({ queryKey: queryKeys.jobsRecent(50) });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobsActive() });

    // Also invalidate the specific job query so useJob() updates
    queryClient.invalidateQueries({ queryKey: [...queryKeys.jobs, jobId] });
  });
  unlisteners.push(jobStatusChangedUnlisten);

  isInitialized = true;

  // After initialization, immediately fetch logs for any running jobs.
  // This handles the case where the app was reloaded while jobs were running -
  // the old Channel callbacks are invalid, so we need to hydrate from DB.
  hydrateRunningJobLogs();
}

/**
 * Fetch logs for all currently running jobs and update the store.
 * Called after event bridge initialization to catch any events missed during reload.
 */
async function hydrateRunningJobLogs(): Promise<void> {
  try {
    const activeJobs = await getJobsActive();
    const runningJobs = activeJobs.filter(
      (job) => job.status === "running" || job.status === "queued"
    );

    if (runningJobs.length === 0) return;

    // Fetch logs for all running jobs in parallel
    await Promise.all(
      runningJobs.map(async (job) => {
        try {
          const logs = await getJobLogs(job.id);
          const parsed = parseJobLogs(logs);
          if (parsed.length > 0) {
            useStreamPanelStore.getState().setLogs(job.id, parsed);
          }
        } catch (e) {
          console.error("[event-bridge] Failed to hydrate logs for job:", job.id, e);
        }
      })
    );
  } catch (e) {
    console.error("[event-bridge] Failed to get active jobs for hydration:", e);
  }
}

/**
 * Clean up the event bridge.
 * Removes all event listeners. Should be called on app unmount.
 */
export async function cleanupEventBridge(): Promise<void> {
  for (const unlisten of unlisteners) {
    unlisten();
  }
  unlisteners = [];
  isInitialized = false;
}
