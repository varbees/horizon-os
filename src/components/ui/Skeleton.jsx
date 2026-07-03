// Shimmer skeletons — the loaders. Use these instead of "Loading..." text so
// every screen keeps its layout while data resolves.

export function Skeleton({ className = "", style }) {
  return <div className={`hz-skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: `${92 - i * (60 / lines)}%` }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="glass rounded-[var(--hz-radius-md)] p-5" role="status" aria-label="Loading">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-[var(--hz-radius-sm)]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4">
        <SkeletonText lines={lines} />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, cols = "md:grid-cols-3" }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
