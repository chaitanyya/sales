import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      {/* Header skeleton - matches h-10 header with pill button */}
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/10">
          <Skeleton className="w-3.5 h-3.5 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
      </header>

      {/* Filter bar skeleton - matches h-9 with button */}
      <div className="h-9 border-b border-white/5 flex items-center px-3 gap-2">
        <div className="h-6 flex items-center gap-1 px-2">
          <Skeleton className="w-3.5 h-3.5 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
        </div>
      </div>

      {/* List content skeleton - no padding on container */}
      <div className="flex-1 overflow-auto">
        {/* Status group 1 */}
        <div>
          {/* Status group header */}
          <div className="sticky top-0 bg-black/95 flex items-center gap-2 px-3 py-1.5 text-sm border-b border-white/5">
            <div className="p-0.5">
              <Skeleton className="w-3 h-3 rounded" />
            </div>
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-3 w-4 rounded" />
            <div className="flex-1" />
          </div>

          {/* Lead rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 text-sm"
            >
              {/* Status icon */}
              <Skeleton className="w-4 h-4 rounded shrink-0" />
              {/* Company name + location */}
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="w-3 h-3 rounded shrink-0" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
              {/* Industry badge */}
              <Skeleton className="h-5 w-16 rounded shrink-0" />
              {/* Research button */}
              <Skeleton className="w-6 h-6 rounded shrink-0" />
            </div>
          ))}
        </div>

        {/* Status group 2 */}
        <div>
          {/* Status group header */}
          <div className="sticky top-0 bg-black/95 flex items-center gap-2 px-3 py-1.5 text-sm border-b border-white/5">
            <div className="p-0.5">
              <Skeleton className="w-3 h-3 rounded" />
            </div>
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-3 w-3 rounded" />
            <div className="flex-1" />
          </div>

          {/* Lead rows */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 text-sm"
            >
              <Skeleton className="w-4 h-4 rounded shrink-0" />
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="w-3 h-3 rounded shrink-0" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
              <Skeleton className="h-5 w-14 rounded shrink-0" />
              <Skeleton className="w-6 h-6 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
