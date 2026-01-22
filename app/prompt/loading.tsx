import { Skeleton } from "@/components/ui/skeleton";

export default function PromptLoading() {
  return (
    <>
      <header className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-36 rounded" />
      </header>

      <div className="border-b border-white/5 px-4">
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-1 py-2 border-b-2 border-transparent -mb-px">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <div className="flex items-center gap-2 px-1 py-2 border-b-2 border-transparent -mb-px">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl">
          <Skeleton className="h-4 w-80 rounded mb-2" />

          <div className="space-y-4">
            <Skeleton className="w-full h-96 rounded bg-white/5" />

            <Skeleton className="h-9 w-44 rounded" />
          </div>
        </div>
      </div>
    </>
  );
}
