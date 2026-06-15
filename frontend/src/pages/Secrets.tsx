import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "../components/DataTable";
import { FilterBuilder } from "../components/FilterBuilder";
import { SearchInput } from "../components/SearchInput";
import { SecretDetail } from "../components/SecretDetail";
import { SeverityBadge } from "../components/SeverityBadge";
import { HostLink, Mono } from "../components/bits";
import { SEVERITY_ORDER, relativeTime } from "../lib/format";
import { useDebounced } from "../lib/hooks";
import { usePagedList } from "../lib/useList";
import type { SecretDoc } from "../lib/types";
import { useApp } from "../state/AppContext";

const col = createColumnHelper<SecretDoc>();

export function Secrets() {
  const { scope, aliveDays, scopeWindowParams } = useApp();
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [adv, setAdv] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<SecretDoc | null>(null);
  const q = useDebounced(search);
  const advD = useDebounced(adv, 400);

  const filters = useMemo(
    () => ({ ...scopeWindowParams(), q: q || undefined, severity: severity || undefined, filter: advD }),
    [scopeWindowParams, q, severity, advD],
  );

  const list = usePagedList<SecretDoc>("/secrets", filters, [{ id: "last_alive", desc: true }]);

  const columns = useMemo(
    () => [
      col.accessor("severity", {
        header: "Severity",
        enableSorting: false,
        cell: (c) => <SeverityBadge severity={c.getValue()} />,
      }),
      col.accessor("rule_id", {
        header: "Rule",
        cell: (c) => (
          <div className="min-w-0">
            <Mono>{c.getValue() || "—"}</Mono>
            {c.row.original.description && (
              <div className="truncate text-xs text-zinc-500">{c.row.original.description}</div>
            )}
          </div>
        ),
      }),
      col.accessor("match", {
        header: "Match",
        enableSorting: false,
        cell: (c) => {
          const v = c.getValue();
          return v ? (
            <span title={v} className="block max-w-[26rem] truncate font-mono text-xs text-amber-300/90">
              {v}
            </span>
          ) : (
            <span className="text-zinc-600">—</span>
          );
        },
      }),
      col.accessor("host", { header: "Host", cell: (c) => <HostLink host={c.getValue()} /> }),
      col.accessor("url", {
        header: "URL",
        enableSorting: false,
        cell: (c) => {
          const url = c.getValue();
          return url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block max-w-[22rem] truncate font-mono text-xs text-sky-400 hover:underline"
            >
              {url}
            </a>
          ) : (
            <span className="text-zinc-600">—</span>
          );
        },
      }),
      col.accessor("last_alive", {
        header: "Last alive",
        cell: (c) => <span className="whitespace-nowrap text-xs text-zinc-400">{relativeTime(c.getValue())}</span>,
      }),
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Secrets</h1>
        <p className="text-sm text-zinc-500">
          Leaked credentials found by the passive secret scan (gitleaks) over saved HTTP responses.{" "}
          {scope ? `Scope: ${scope}` : "All scopes"} · {aliveDays ? `alive in last ${aliveDays}d` : "all history"}.
        </p>
      </div>

      <FilterBuilder collection="secret_hits" onChange={setAdv} />

      <DataTable
        columns={columns}
        data={list.items}
        total={list.total}
        page={list.page}
        onPageChange={list.setPage}
        pageSize={list.pageSize}
        sorting={list.sorting}
        onSortingChange={list.setSorting}
        isLoading={list.isLoading}
        isError={list.isError}
        error={(list.error as Error)?.message}
        onRowClick={(row) => setSelected(row)}
        getRowId={(r, i) => r.id ?? String(i)}
        emptyTitle="No secrets"
        emptyHint="gitleaks has not flagged any leaked secrets in this scope/window."
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="rule / match / host / url…" />
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
          </>
        }
      />

      {selected && <SecretDetail secret={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
