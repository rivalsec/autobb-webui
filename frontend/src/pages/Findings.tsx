import { ChevronDown, ChevronLeft, ChevronRight, Copy, Terminal } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { SearchInput, FilterInput } from "../components/SearchInput";
import { SeverityBadge } from "../components/SeverityBadge";
import { HostLink } from "../components/bits";
import { SEVERITY_ORDER, relativeTime, toArray } from "../lib/format";
import { useDebounced } from "../lib/hooks";
import { usePagedList } from "../lib/useList";
import type { Finding } from "../lib/types";
import { useApp } from "../state/AppContext";

const PASSIVE_OPTIONS = [
  { value: "", label: "Active + Passive" },
  { value: "false", label: "Active only" },
  { value: "true", label: "Passive only" },
];

const SORT_OPTIONS = [
  { value: "newest", sort: "add_date", order: "desc", label: "Newest" },
  { value: "oldest", sort: "add_date", order: "asc", label: "Oldest" },
  { value: "active", sort: "last_alive", order: "desc", label: "Recently alive" },
  { value: "severity", sort: "severity", order: "desc", label: "Severity" },
];

export function Findings() {
  const { scope, aliveDays, scopeWindowParams } = useApp();
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [template, setTemplate] = useState("");
  const [passive, setPassive] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const q = useDebounced(search);
  const templateD = useDebounced(template);

  const filters = useMemo(() => {
    const opt = SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0];
    return {
      ...scopeWindowParams(),
      severity: severity || undefined,
      template_id: templateD || undefined,
      passive: passive || undefined,
      q: q || undefined,
      sort: opt.sort,
      order: opt.order,
    };
  }, [scopeWindowParams, severity, templateD, passive, q, sortBy]);

  const list = usePagedList<Finding>("/findings", filters);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const pageCount = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Findings</h1>
        <p className="text-sm text-zinc-500">
          nuclei findings (active + passive). {scope ? `Scope: ${scope}` : "All scopes"} ·{" "}
          {aliveDays ? `alive in last ${aliveDays}d` : "all history"}.
        </p>
      </div>

      <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/40">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="template / matched-at / host…" />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm capitalize text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            <option value="">All severities</option>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <FilterInput value={template} onChange={setTemplate} placeholder="template-id" width="w-40" />
          <select
            value={passive}
            onChange={(e) => setPassive(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            {PASSIVE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500">
            sort
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {list.isError ? (
          <EmptyState title="Failed to load findings" hint={(list.error as Error)?.message} />
        ) : list.isLoading && list.items.length === 0 ? (
          <LoadingSkeleton rows={8} />
        ) : list.items.length === 0 ? (
          <EmptyState title="No findings" hint="Nothing matches these filters." />
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {list.items.map((f, i) => {
              const id = f.id ?? String(i);
              const open = expanded.has(id);
              return <FindingRow key={id} f={f} open={open} onToggle={() => toggle(id)} />;
            })}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
          <span className="tabular-nums">{list.total.toLocaleString()} findings</span>
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

function FindingRow({ f, open, onToggle }: { f: Finding; open: boolean; onToggle: () => void }) {
  const extracted = toArray(f["extracted-results"]);
  const curl = f["curl-command"];
  return (
    <li>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-800/30">
        <span className="text-zinc-500">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
        <SeverityBadge severity={f.severity ?? f.info?.severity} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-zinc-200">
            {f.info?.name || f["template-id"]}
            {f.passive && <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">passive</span>}
          </div>
          <div className="truncate font-mono text-xs text-zinc-500">{f["matched-at"] || f["template-id"]}</div>
        </div>
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <HostLink host={f.host} className="text-xs" />
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-zinc-800/60 bg-zinc-950/40 px-9 py-3 text-sm">
          <Field label="Template" value={f["template-id"]} mono />
          {f["matcher-name"] && <Field label="Matcher" value={f["matcher-name"]} mono />}
          <Field label="Matched at" value={f["matched-at"]} mono />
          {f.type && <Field label="Type" value={f.type} />}
          {f.timestamp && <Field label="Time" value={`${relativeTime(f.timestamp)}`} />}
          {toArray(f.info?.tags).length > 0 && <Field label="Tags" value={toArray(f.info?.tags).join(", ")} />}
          {extracted.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium uppercase text-zinc-500">Extracted</div>
              <pre className="overflow-x-auto rounded bg-zinc-900 p-2 font-mono text-xs text-emerald-300">{extracted.join("\n")}</pre>
            </div>
          )}
          {curl && (
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-zinc-500">
                <Terminal className="h-3.5 w-3.5" /> curl
                <button onClick={() => navigator.clipboard?.writeText(String(curl))} className="inline-flex items-center gap-1 rounded px-1 text-zinc-400 hover:text-zinc-200">
                  <Copy className="h-3 w-3" /> copy
                </button>
              </div>
              <pre className="overflow-x-auto rounded bg-zinc-900 p-2 font-mono text-xs text-zinc-300">{String(curl)}</pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Field({ label, value, mono }: { label: string; value?: unknown; mono?: boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-xs font-medium uppercase text-zinc-500">{label}</span>
      <span className={mono ? "break-all font-mono text-xs text-zinc-300" : "text-zinc-300"}>{String(value)}</span>
    </div>
  );
}
