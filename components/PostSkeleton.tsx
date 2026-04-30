import { Skeleton } from "@/components/ui/skeleton";

export function PostSkeleton() {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-32 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
      </div>
      {/* Body */}
      <div className="space-y-2 pl-1">
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-4/5 rounded-full" />
        <Skeleton className="h-3 w-2/3 rounded-full" />
      </div>
      {/* Action row */}
      <div className="flex gap-3 pt-1">
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-8 rounded-full ml-auto" />
      </div>
    </div>
  );
}
