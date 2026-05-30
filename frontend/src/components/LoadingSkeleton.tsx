import clsx from "clsx";

export function LoadingSkeleton({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={clsx("space-y-2 p-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 w-full animate-pulse rounded bg-zinc-800/70" style={{ opacity: 1 - i * 0.06 }} />
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200",
        className,
      )}
    />
  );
}
