import {
  IconCircle,
  IconLoader2,
  IconCircleCheck,
  IconCircleX,
  IconSparkles,
  IconPhone,
  IconCalendarEvent,
  IconFileText,
  IconMessages,
  IconTrophy,
  IconThumbDown,
  IconPlayerPause,
  IconMail,
  IconMessageReply,
  IconCalendarCheck,
  IconMessage,
  IconStar,
  IconX,
} from "@tabler/icons-react";

// ============================================
// Research Status (Claude CLI agent state)
// ============================================

export type ResearchStatusType = "pending" | "in_progress" | "completed" | "failed";

interface StatusConfigItem {
  label: string;
  icon: typeof IconCircle;
  color: string;
  bgColor: string;
}

export const RESEARCH_STATUS_CONFIG: Record<ResearchStatusType, StatusConfigItem> = {
  pending: {
    label: "Pending",
    icon: IconCircle,
    color: "text-muted-foreground",
    bgColor: "bg-muted-foreground/20",
  },
  in_progress: {
    label: "In Progress",
    icon: IconLoader2,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/20",
  },
  completed: {
    label: "Completed",
    icon: IconCircleCheck,
    color: "text-green-500",
    bgColor: "bg-green-500/20",
  },
  failed: {
    label: "Failed",
    icon: IconCircleX,
    color: "text-red-500",
    bgColor: "bg-red-500/20",
  },
};

export const RESEARCH_STATUS_ORDER: ResearchStatusType[] = [
  "completed",
  "in_progress",
  "pending",
  "failed",
];

export function isValidResearchStatus(status: string | null): status is ResearchStatusType {
  return status !== null && RESEARCH_STATUS_ORDER.includes(status as ResearchStatusType);
}

export function validateResearchStatus(status: string | null): ResearchStatusType {
  if (isValidResearchStatus(status)) {
    return status;
  }
  return "pending";
}

export function getResearchStatusConfig(status: string | null): StatusConfigItem {
  return RESEARCH_STATUS_CONFIG[validateResearchStatus(status)];
}

// ============================================
// Lead User Status (sales pipeline stage)
// ============================================

export type LeadUserStatusType =
  | "new"
  | "qualified"
  | "contacted"
  | "meeting"
  | "proposal"
  | "negotiating"
  | "won"
  | "lost"
  | "on_hold";

export const LEAD_USER_STATUS_CONFIG: Record<LeadUserStatusType, StatusConfigItem> = {
  new: {
    label: "New",
    icon: IconSparkles,
    color: "text-blue-400",
    bgColor: "bg-blue-400/20",
  },
  qualified: {
    label: "Qualified",
    icon: IconCircleCheck,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/20",
  },
  contacted: {
    label: "Contacted",
    icon: IconPhone,
    color: "text-purple-400",
    bgColor: "bg-purple-400/20",
  },
  meeting: {
    label: "Meeting",
    icon: IconCalendarEvent,
    color: "text-orange-400",
    bgColor: "bg-orange-400/20",
  },
  proposal: {
    label: "Proposal",
    icon: IconFileText,
    color: "text-amber-400",
    bgColor: "bg-amber-400/20",
  },
  negotiating: {
    label: "Negotiating",
    icon: IconMessages,
    color: "text-pink-400",
    bgColor: "bg-pink-400/20",
  },
  won: {
    label: "Won",
    icon: IconTrophy,
    color: "text-green-400",
    bgColor: "bg-green-400/20",
  },
  lost: {
    label: "Lost",
    icon: IconThumbDown,
    color: "text-red-400",
    bgColor: "bg-red-400/20",
  },
  on_hold: {
    label: "On Hold",
    icon: IconPlayerPause,
    color: "text-gray-400",
    bgColor: "bg-gray-400/20",
  },
};

export const LEAD_USER_STATUS_ORDER: LeadUserStatusType[] = [
  "new",
  "qualified",
  "contacted",
  "meeting",
  "proposal",
  "negotiating",
  "won",
  "lost",
  "on_hold",
];

export function isValidLeadUserStatus(status: string | null): status is LeadUserStatusType {
  return status !== null && LEAD_USER_STATUS_ORDER.includes(status as LeadUserStatusType);
}

export function validateLeadUserStatus(status: string | null): LeadUserStatusType {
  if (isValidLeadUserStatus(status)) {
    return status;
  }
  return "new";
}

export function getLeadUserStatusConfig(status: string | null): StatusConfigItem {
  return LEAD_USER_STATUS_CONFIG[validateLeadUserStatus(status)];
}

// ============================================
// Person User Status (sales pipeline stage)
// ============================================

export type PersonUserStatusType =
  | "new"
  | "reached_out"
  | "responded"
  | "meeting_scheduled"
  | "in_conversation"
  | "champion"
  | "not_interested";

export const PERSON_USER_STATUS_CONFIG: Record<PersonUserStatusType, StatusConfigItem> = {
  new: {
    label: "New",
    icon: IconSparkles,
    color: "text-blue-400",
    bgColor: "bg-blue-400/20",
  },
  reached_out: {
    label: "Reached Out",
    icon: IconMail,
    color: "text-purple-400",
    bgColor: "bg-purple-400/20",
  },
  responded: {
    label: "Responded",
    icon: IconMessageReply,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/20",
  },
  meeting_scheduled: {
    label: "Meeting Scheduled",
    icon: IconCalendarCheck,
    color: "text-orange-400",
    bgColor: "bg-orange-400/20",
  },
  in_conversation: {
    label: "In Conversation",
    icon: IconMessage,
    color: "text-pink-400",
    bgColor: "bg-pink-400/20",
  },
  champion: {
    label: "Champion",
    icon: IconStar,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/20",
  },
  not_interested: {
    label: "Not Interested",
    icon: IconX,
    color: "text-red-400",
    bgColor: "bg-red-400/20",
  },
};

export const PERSON_USER_STATUS_ORDER: PersonUserStatusType[] = [
  "new",
  "reached_out",
  "responded",
  "meeting_scheduled",
  "in_conversation",
  "champion",
  "not_interested",
];

export function isValidPersonUserStatus(status: string | null): status is PersonUserStatusType {
  return status !== null && PERSON_USER_STATUS_ORDER.includes(status as PersonUserStatusType);
}

export function validatePersonUserStatus(status: string | null): PersonUserStatusType {
  if (isValidPersonUserStatus(status)) {
    return status;
  }
  return "new";
}

export function getPersonUserStatusConfig(status: string | null): StatusConfigItem {
  return PERSON_USER_STATUS_CONFIG[validatePersonUserStatus(status)];
}

// ============================================
// Legacy exports for backwards compatibility
// ============================================

// Keep StatusType as an alias for ResearchStatusType for backwards compat
export type StatusType = ResearchStatusType;
export const STATUS_CONFIG = RESEARCH_STATUS_CONFIG;
export const STATUS_ORDER = RESEARCH_STATUS_ORDER;
export const getStatusConfig = getResearchStatusConfig;
