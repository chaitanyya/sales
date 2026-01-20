import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for sidebar navigation
 */
export function SidebarSkeleton() {
  return (
    <aside className="w-52 bg-sidebar flex flex-col text-[13px] shrink-0 border-r border-[#1a1a1d]">
      <div className="p-2">
        <Skeleton className="h-7 w-full rounded" />
      </div>
      <div className="px-2 pb-1">
        <Skeleton className="h-7 w-full rounded" />
      </div>
      <div className="px-4 py-2 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full rounded" />
        ))}
      </div>
    </aside>
  );
}

/**
 * Skeleton for a single lead row in the list
 */
export function LeadRowSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5">
      <Skeleton className="h-4 w-4 rounded shrink-0" />
      <Skeleton className="h-4 flex-1 rounded" />
      <Skeleton className="h-4 w-16 rounded" />
    </div>
  );
}

/**
 * Skeleton for a group of lead rows
 */
export function LeadListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-0">
      {/* Status group header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-6 rounded" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <LeadRowSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for research content in the lead detail page
 */
export function ResearchContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32 rounded" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
      <div className="space-y-2 mt-6">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton for the lead detail header
 */
export function LeadDetailHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-48 rounded mb-2" />
      <Skeleton className="h-4 w-64 rounded mb-6" />
    </div>
  );
}

/**
 * Skeleton for the properties sidebar
 */
export function PropertiesSidebarSkeleton() {
  return (
    <aside className="w-64 border-l border-white/5 overflow-auto shrink-0">
      <div className="p-4">
        <Skeleton className="h-3 w-20 rounded mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-12 rounded mb-1" />
              <Skeleton className="h-4 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/**
 * Skeleton for activity feed
 */
export function ActivityFeedSkeleton() {
  return (
    <div className="mt-8 pt-6 border-t border-white/5">
      <Skeleton className="h-4 w-16 rounded mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
