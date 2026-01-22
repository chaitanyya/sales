import { Skeleton } from "@/components/ui/skeleton";

export default function PeopleLoading() {
  return (
    <>
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/10">
          <Skeleton className="w-3.5 h-3.5 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      </header>

      <div className="h-9 border-b border-white/5 flex items-center px-3 gap-2">
        <div className="h-6 flex items-center gap-1 px-2">
          <Skeleton className="w-3.5 h-3.5 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div>
          <div className="sticky top-0 bg-black/95 flex items-center gap-2 px-3 py-2 text-sm border-b border-white/5">
            <div className="p-0.5">
              <Skeleton className="w-3 h-3 rounded" />
            </div>
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-3 w-4 rounded" />
            <div className="flex-1" />
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 border-b border-white/5 text-sm"
            >
              <div className="w-4 shrink-0">
                <Skeleton className="w-4 h-4 rounded" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
              <div className="w-40 shrink-0 flex items-center gap-1.5">
                <Skeleton className="w-3.5 h-3.5 rounded shrink-0" />
                <Skeleton className="h-3 flex-1 rounded" />
              </div>
              <div className="shrink-0">
                <Skeleton className="w-6 h-6 rounded" />
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="sticky top-0 bg-black/95 flex items-center gap-2 px-3 py-2 text-sm border-b border-white/5">
            <div className="p-0.5">
              <Skeleton className="w-3 h-3 rounded" />
            </div>
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-3 w-3 rounded" />
            <div className="flex-1" />
          </div>

          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 border-b border-white/5 text-sm"
            >
              <div className="w-4 shrink-0">
                <Skeleton className="w-4 h-4 rounded" />
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <div className="w-40 shrink-0 flex items-center gap-1.5">
                <Skeleton className="w-3.5 h-3.5 rounded shrink-0" />
                <Skeleton className="h-3 flex-1 rounded" />
              </div>
              <div className="shrink-0">
                <Skeleton className="w-6 h-6 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
