import { Skeleton } from "@/components/ui/skeleton";

export default function LeadDetailLoading() {
  return (
    <>
      {/* Header bar skeleton - matches h-10 header */}
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-2">
        {/* Back arrow */}
        <Skeleton className="w-4 h-4 rounded" />
        {/* Breadcrumb: "Leads" / company name */}
        <div className="flex items-center gap-1.5 text-sm">
          <Skeleton className="h-4 w-10 rounded" />
          <Skeleton className="h-4 w-2 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-6 h-6 rounded" />
        </div>
        <div className="flex-1" />
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-6 h-6 rounded" />
        </div>
      </header>

      {/* Content with right sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-8 py-6">
            {/* Title - text-2xl = ~1.5rem height */}
            <Skeleton className="h-7 w-48 rounded mb-1" />
            {/* Subtitle */}
            <Skeleton className="h-4 w-64 rounded mb-6" />

            {/* Research content skeleton */}
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

            {/* Activity section skeleton */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <Skeleton className="h-4 w-16 rounded mb-4" />
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar skeleton - w-64 */}
        <aside className="w-64 border-l border-white/5 overflow-auto shrink-0">
          <div className="p-4">
            {/* Section header */}
            <Skeleton className="h-3 w-16 rounded mb-4" />

            <div className="space-y-4">
              {/* Status */}
              <div>
                <Skeleton className="h-3 w-10 rounded mb-1" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              </div>

              {/* Industry */}
              <div>
                <Skeleton className="h-3 w-14 rounded mb-1" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>

              {/* Location */}
              <div>
                <Skeleton className="h-3 w-16 rounded mb-1" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              </div>

              {/* Size */}
              <div>
                <Skeleton className="h-3 w-8 rounded mb-1" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>

              {/* Links section */}
              <div className="border-t border-white/5 pt-4 mt-4">
                <Skeleton className="h-3 w-10 rounded mb-3" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
