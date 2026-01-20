// Re-export everything from effect-runtime for backwards compatibility
// This file can be removed once all imports are updated to use effect-runtime directly

export {
  ResearchService,
  ResearchServiceLive,
  runWithResearchService,
  shutdownResearchRuntime,
  type ResearchJobOptions,
  type JobInfo,
} from "./effect-runtime";
