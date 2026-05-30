import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { FilterInput } from "../components/SearchInput";
import { formatDate, relativeTime } from "../lib/format";
import { useDebounced } from "../lib/hooks";
import { usePagedList } from "../lib/useList";
import type { AlertDoc } from "../lib/types";

const DAY_OPTIONS = [
  { value: "", label: "All time" },
  { value: "7", label: "Last 7d" },
  { value: "30", label: "Last 30d" },
  { value: "90", label: "Last 90d" },
];

export function Alerts() {
  const [source, setSource] = useState("");
  const [days, setDays] = useState("");
  const sourceD = useDebounced(source);

  const filters = useMemo(
    () => ({ source: sourceD || undefined, days: days || undefined }),
    [sourceD, days],
  );

  const list = usePagedList<AlertDoc>("/alerts", filters, [{ id: "created_at", desc: true }]);
  const pageCount = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Alerts</h1>
        <p className="text-sm text-zinc-500">Notification history (telegram / smtp / vkteams).</p>
      </div>

      <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/40">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 p-3">
          <FilterInput value={source} onChange={setSource} placeholder="source (e.g. domain)" width="w-44" />
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            {DAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {list.isError ? (
          <EmptyState title="Failed to load alerts" hint={(list.error as Error)?.message} />
        ) : list.isLoading && list.items.length === 0 ? (
          <LoadingSkeleton rows={6} />
        ) : list.items.length === 0 ? (
          <EmptyState title="No alerts" hint="No notifications match these filters." />
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {list.items.map((a, i) => (
              <li key={a.id ?? i} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-300">{a.source || "—"}</span>
                    {a.dispatch &&
                      Object.entries(a.dispatch).map(([k, v]) => (
                        <span
                          key={k}
                          className={`rounded px-1.5 py-0.5 text-[10px] ${v === "ok" ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300"}`}
                          title={`${k}: ${v}`}
                        >
                          {k}
                        </span>
                      ))}
                  </div>
                  <span className="shrink-0 text-xs text-zinc-500" title={formatDate(a.created_at)}>
                    {relativeTime(a.created_at)}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-zinc-300">{a.msg}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
          <span className="tabular-nums">{list.total.toLocaleString()} alerts</span>
          <div className="flex items-center gap-1">
            <button className="rounded p-1 hover:bg-zinc-800 disabled:opacity-40" onClick={() => list.setPage(list.page - 1)} disabled={list.page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">Page {list.page} / {pageCount}</span>
            <button className="rounded p-1 hover:bg-zinc-800 disabled:opacity-40" onClick={() => list.setPage(list.page + 1)} disabled={list.page >= pageCount}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
