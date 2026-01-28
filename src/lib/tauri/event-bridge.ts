import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { queryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/keys";
import { getJobLogs, getJobsActive } from "./commands";
import { parseJobLogs } from "@/lib/stream/job-log-parser";

// Event payload types from backend
interface LeadCreatedPayload {
  id: number;
  clerkOrgId: string | null;
}

interface LeadUpdatedPayload {
  id: number;
  clerkOrgId: string | null;
}

interface PersonUpdatedPayload {
  id: number;
  leadId: number | null;
  clerkOrgId: string | null;
}

interface LeadScoredPayload {
  leadId: number;
  clerkOrgId: string | null;
}

interface PeopleBulkCreatedPayload {
  leadId: number;
  clerkOrgId: string | null;
}

interface LeadDeletedPayload {
  ids: number[];
  clerkOrgId: string | null;
}

interface PersonDeletedPayload {
  ids: number[];
  clerkOrgId: string | null;
}

// Job event payloads
interface JobStatusChangedPayload {
  jobId: string;
  status: string;
  exitCode: number | null;
  clerkOrgId: string | null;
}

interface JobLogsAppendedPayload {
  jobId: string;
  count: number;
  lastSequence: number;
  clerkOrgId: string | null;
}

interface JobCreatedPayload {
  jobId: string;
  jobType: string;
  entityId: number;
  entityLabel: string;
  clerkOrgId: string | null;
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

  // Helper to get current clerkOrgId
  const getOrgId = () => useAuthStore.getState().getCurrentOrgId();

  // Helper to check if event should be processed for current org
  const shouldProcessEvent = (eventOrgId: string | null) => {
    const currentOrgId = getOrgId();
    // Process event if:
    // 1. Both are null (no org context - unlikely but handle it)
    // 2. Both match (event is for current org)
    // 3. Event has null clerkOrgId (global/system event like recovery)
    return eventOrgId === currentOrgId || eventOrgId === null || currentOrgId === null;
  };

  // Lead created → invalidate leads list + onboarding status
  const leadCreatedUnlisten = await listen<LeadCreatedPayload>("lead-created", (event) => {
    const { clerkOrgId } = event.payload;
    if (!shouldProcessEvent(clerkOrgId)) return;

    queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores(clerkOrgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus(clerkOrgId) });
  });
  unlisteners.push(leadCreatedUnlisten);

  // Lead updated → invalidate specific lead + list + onboarding
  const leadUpdatedUnlisten = await listen<LeadUpdatedPayload>("lead-updated", (event) => {
    const { id, clerkOrgId } = event.payload;
    if (!shouldProcessEvent(clerkOrgId)) return;

    queryClient.invalidateQueries({ queryKey: queryKeys.lead(id, clerkOrgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores(clerkOrgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus(clerkOrgId) });
  });
  unlisteners.push(leadUpdatedUnlisten);

  // Person updated → invalidate person + lead's people + list + onboarding
  const personUpdatedUnlisten = await listen<PersonUpdatedPayload>("person-updated", (event) => {
    const { id, leadId, clerkOrgId } = event.payload;
    if (!shouldProcessEvent(clerkOrgId)) return;

    queryClient.invalidateQueries({ queryKey: queryKeys.person(id, clerkOrgId) });
    if (leadId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadPeople(leadId, clerkOrgId) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.peopleList(clerkOrgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus(clerkOrgId) });
  });
  unlisteners.push(personUpdatedUnlisten);

  // Lead scored → invalidate lead score + list + onboarding
  const leadScoredUnlisten = await listen<LeadScoredPayload>("lead-scored", (event) => {
    const { leadId, clerkOrgId } = event.payload;
    if (!shouldProcessEvent(clerkOrgId)) return;

    queryClient.invalidateQueries({ queryKey: queryKeys.leadScore(leadId, clerkOrgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores(clerkOrgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus(clerkOrgId) });
  });
  unlisteners.push(leadScoredUnlisten);

  // People bulk created → invalidate lead's people + people list
  const peopleBulkCreatedUnlisten = await listen<PeopleBulkCreatedPayload>("people-bulk-created", (event) => {
    const { leadId, clerkOrgId } = event.payload;
    if (!shouldProcessEvent(clerkOrgId)) return;

    queryClient.invalidateQueries({ queryKey: queryKeys.leadPeople(leadId, clerkOrgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.peopleList(clerkOrgId) });
  });
  unlisteners.push(peopleBulkCreatedUnlisten);

  // Leads deleted → remove from cache + invalidate lists + onboarding
  const leadDeletedUnlisten = await listen<LeadDeletedPayload>("lead-deleted", (event) => {
    const { ids, clerkOrgId } = event.payload;
    if (!shouldProcessEvent(clerkOrgId)) return;

    for (const id of ids) {
      queryClient.removeQueries({ queryKey: queryKeys.lead(id, clerkOrgId) });
      queryClient.removeQueries({ queryKey: queryKeys.leadScore(id, clerkOrgId) });
      queryClient.removeQueries({ queryKey: queryKeys.leadPeople(id, clerkOrgId) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores(clerkOrgId) });
    // Also refresh people list as related people may be deleted
    queryClient.invalidateQueries({ queryKey: queryKeys.peopleList(clerkOrgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus(clerkOrgId) });
  });
  unlisteners.push(leadDeletedUnlisten);

  // People deleted → remove from cache + invalidate list + onboarding
  const personDeletedUnlisten = await listen<PersonDeletedPayload>("person-deleted", (event) => {
    const { ids, clerkOrgId } = event.payload;
    if (!shouldProcessEvent(clerkOrgId)) return;

    for (const id of ids) {
      queryClient.removeQueries({ queryKey: queryKeys.person(id, clerkOrgId) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.peopleList(clerkOrgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus(clerkOrgId) });
  });
  unlisteners.push(personDeletedUnlisten);

  // Job created → set active tab, open panel, invalidate jobs query
  const jobCreatedUnlisten = await listen<JobCreatedPayload>("job-created", (event) => {
    const { jobId, clerkOrgId } = event.payload;

    // Only process job events for current org
    if (!shouldProcessEvent(clerkOrgId)) return;

    const store = useStreamPanelStore.getState();

    // Set this job as active and open the panel
    store.setActiveTab(jobId);
    store.setOpen(true);

    // Invalidate jobs query so the new job appears in the tab list
    queryClient.invalidateQueries({ queryKey: queryKeys.jobsRecent(clerkOrgId, 50) });
  });
  unlisteners.push(jobCreatedUnlisten);

  // Job status changed → invalidate jobs queries
  const jobStatusChangedUnlisten = await listen<JobStatusChangedPayload>("job-status-changed", (event) => {
    const { jobId, clerkOrgId } = event.payload;

    // Only process job events for current org
    if (!shouldProcessEvent(clerkOrgId)) return;

    // Invalidate jobs queries for status updates
    queryClient.invalidateQueries({ queryKey: queryKeys.jobsRecent(clerkOrgId, 50) });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobsActive(clerkOrgId) });

    // Also invalidate the specific job query so useJob() updates
    queryClient.invalidateQueries({ queryKey: queryKeys.job(jobId, clerkOrgId) });
  });
  unlisteners.push(jobStatusChangedUnlisten);

  // Job logs appended → fetch and append new logs
  const jobLogsAppendedUnlisten = await listen<JobLogsAppendedPayload>("job-logs-appended", (event) => {
    const { jobId, clerkOrgId } = event.payload;

    // Only process job events for current org
    if (!shouldProcessEvent(clerkOrgId)) return;

    const store = useStreamPanelStore.getState();
    const currentSequence = store.getLogsSequence(jobId);

    // Fetch new logs since our last sequence
    getJobLogs(jobId, currentSequence + 1)
      .then((logs) => {
        if (logs.length > 0) {
          const parsed = parseJobLogs(logs);
          store.appendLogs(jobId, parsed);
        }
      })
      .catch((e) => {
        console.error("[event-bridge] Failed to fetch job logs:", e);
      });
  });
  unlisteners.push(jobLogsAppendedUnlisten);

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
  const currentOrgId = useAuthStore.getState().getCurrentOrgId();
  try {
    const activeJobs = await getJobsActive(currentOrgId);
    const runningJobs = activeJobs.filter(
      (job) => job.status === "running" || job.status === "queued"
    );

    if (runningJobs.length === 0) return;

    // Fetch logs for all running jobs in parallel
    await Promise.all(
      runningJobs.map(async (job) => {
        try {
          const logs = await getJobLogs(job.id, undefined, undefined, currentOrgId);
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
