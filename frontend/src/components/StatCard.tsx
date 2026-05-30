import clsx from "clsx";
import type { ReactNode } from "react";
import { compactNumber } from "../lib/format";

interface StatCardProps {
  label: string;
  value?: number | null;
  delta?: number | null; // e.g. new-this-week
  deltaLabel?: string;
  icon?: ReactNode;
  loading?: boolean;
  accent?: string;
}

export function StatCard({ label, value, delta, deltaLabel = "new 7d", icon, loading, accent }: StatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400">{label}</span>
        {icon && <span className={clsx("text-zinc-500", accent)}>{icon}</span>}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded bg-zinc-800" />
      ) : (
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums text-zinc-50">
            {compactNumber(value)}
          </span>
          {delta !== undefined && delta !== null && delta > 0 && (
            <span className="text-xs font-medium text-emerald-400">
              +{compactNumber(delta)} {deltaLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
