import { useQuery } from "@tanstack/react-query";
import { Bell, Globe, Network, ServerCog, ShieldAlert, FileSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { SEVERITY_ORDER } from "../lib/format";
import { relativeTime } from "../lib/format";
import type { Overview as OverviewData, Severity } from "../lib/types";
import { EmptyState } from "../components/EmptyState";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatCard } from "../components/StatCard";
import { useApp } from "../state/AppContext";

const SEV_BAR: Record<Severity, string> = {
  critical: "bg-red-600",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
  info: "bg-zinc-500",
  unknown: "bg-zinc-700",
};

export function Overview() {
  const { scope, aliveDays } = useApp();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["overview", scope, aliveDays],
    queryFn: () => apiGet<OverviewData>("/stats/overview", { scope, days: aliveDays }),
  });

  const totals = data?.totals ?? {};
  const newers = data?.new_last_7d ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Overview</h1>
        <p className="text-sm text-zinc-500">
          {scope ? `Scope: ${scope}` : "All scopes"} ·{" "}
          {aliveDays ? `alive in last ${aliveDays}d` : "all history"}
        </p>
      </div>

      {isError ? (
        <EmptyState title="Failed to load stats" hint={(error as Error)?.message} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Subdomains" value={totals.domains} delta={newers.domains} icon={<Globe className="h-4 w-4" />} loading={isLoading} />
            <StatCard label="HTTP services" value={totals.http_probes} delta={newers.http_probes} icon={<ServerCog className="h-4 w-4" />} loading={isLoading} />
            <StatCard label="Open ports" value={totals.ports} delta={newers.ports} icon={<Network className="h-4 w-4" />} loading={isLoading} />
            <StatCard label="Fuzzed paths" value={totals.http_paths} delta={newers.http_paths} icon={<FileSearch className="h-4 w-4" />} loading={isLoading} />
            <StatCard label="Findings" value={totals.findings} icon={<ShieldAlert className="h-4 w-4" />} accent="text-amber-400" loading={isLoading} />
          </div>

          <SeverityBreakdown data={data?.findings_by_severity} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentFindings data={data} loading={isLoading} />
            <RecentAlerts data={data} loading={isLoading} />
          </div>
        </>
      )}
    </div>
  );
}

function SeverityBreakdown({ data }: { data?: Partial<Record<Severity, number>> }) {
  const counts = data ?? {};
  const total = SEVERITY_ORDER.reduce((acc, s) => acc + (counts[s] ?? 0), 0);
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="mb-3 text-sm font-medium text-zinc-300">Findings by severity</h2>
      {total === 0 ? (
        <p className="text-sm text-zinc-500">No findings in this scope/window.</p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            {SEVERITY_ORDER.map((s) => {
              const n = counts[s] ?? 0;
              if (!n) return null;
              return <div key={s} className={SEV_BAR[s]} style={{ width: `${(n / total) * 100}%` }} title={`${s}: ${n}`} />;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {SEVERITY_ORDER.filter((s) => counts[s]).map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className={`h-2.5 w-2.5 rounded-sm ${SEV_BAR[s]}`} />
                <span className="capitalize">{s}</span>
                <span className="font-medium text-zinc-200">{counts[s]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RecentFindings({ data, loading }: { data?: OverviewData; loading?: boolean }) {
  const items = data?.recent_findings ?? [];
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300">
        <ShieldAlert className="h-4 w-4 text-amber-400" /> Recent findings
      </div>
      {loading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-6 animate-pulse rounded bg-zinc-800/70" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No findings" hint="nuclei has not reported anything yet" />
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {items.map((f, i) => (
            <li key={f.id ?? i} className="flex items-center gap-3 px-4 py-2 text-sm">
              <SeverityBadge severity={f.severity ?? f.info?.severity} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-zinc-200">{f.info?.name || f["template-id"]}</div>
                <div className="truncate text-xs text-zinc-500">{f["matched-at"]}</div>
              </div>
              {f.host && (
                <Link to={`/host/${encodeURIComponent(f.host)}`} className="shrink-0 text-xs text-sky-400 hover:underline">
                  {f.host}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentAlerts({ data, loading }: { data?: OverviewData; loading?: boolean }) {
  const items = data?.recent_alerts ?? [];
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300">
        <Bell className="h-4 w-4 text-sky-400" /> Recent alerts
      </div>
      {loading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-6 animate-pulse rounded bg-zinc-800/70" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No alerts" hint="no notifications recorded" />
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {items.map((a, i) => (
            <li key={a.id ?? i} className="px-4 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-300">{a.source}</span>
                <span className="text-xs text-zinc-500">{relativeTime(a.created_at)}</span>
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-zinc-400">{a.msg}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
