import { Skeleton } from "@/components/ui/skeleton";

export default function LeadDetailLoading() {
  return (
    <>
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <div className="flex items-center gap-1.5 text-sm">
          <Skeleton className="h-4 w-10 rounded" />
          <Skeleton className="h-4 w-2 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-6 h-6 rounded" />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-6 h-6 rounded" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-8 py-6">
            <Skeleton className="h-7 w-48 rounded mb-1" />
            <Skeleton className="h-4 w-64 rounded mb-6" />

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

        <aside className="w-64 border-l border-white/5 overflow-auto shrink-0">
          <div className="p-4">
            <Skeleton className="h-3 w-16 rounded mb-4" />

            <div className="space-y-4">
              <div>
                <Skeleton className="h-3 w-10 rounded mb-1" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              </div>

              <div>
                <Skeleton className="h-3 w-14 rounded mb-1" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>

              <div>
                <Skeleton className="h-3 w-16 rounded mb-1" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              </div>

              <div>
                <Skeleton className="h-3 w-8 rounded mb-1" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>

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
