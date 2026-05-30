import clsx from "clsx";
import { normalizeSeverity } from "../lib/format";
import type { Severity } from "../lib/types";

const STYLES: Record<Severity, string> = {
  critical: "bg-red-600/20 text-red-300 ring-red-600/40",
  high: "bg-orange-600/20 text-orange-300 ring-orange-600/40",
  medium: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
  low: "bg-blue-600/20 text-blue-300 ring-blue-600/40",
  info: "bg-zinc-500/20 text-zinc-300 ring-zinc-500/40",
  unknown: "bg-zinc-700/30 text-zinc-400 ring-zinc-600/40",
};

export function SeverityBadge({ severity, className }: { severity?: string | null; className?: string }) {
  const sev = normalizeSeverity(severity);
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide ring-1 ring-inset",
        STYLES[sev],
        className,
      )}
    >
      {sev}
    </span>
  );
}
