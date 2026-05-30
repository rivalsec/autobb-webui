import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chips, HostLink, StatusCode } from "../../components/bits";
import { DataTable } from "../../components/DataTable";
import { FilterInput, SearchInput } from "../../components/SearchInput";
import { formatBytes, relativeTime } from "../../lib/format";
import { useDebounced } from "../../lib/hooks";
import { usePagedList } from "../../lib/useList";
import type { ProbeDoc } from "../../lib/types";
import { useApp } from "../../state/AppContext";

const col = createColumnHelper<ProbeDoc>();

const TLS_OPTIONS = [
  { value: "", label: "TLS: any" },
  { value: "true", label: "TLS only" },
  { value: "false", label: "No TLS" },
];

export function ProbesTable() {
  const { scopeWindowParams } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tech, setTech] = useState("");
  const [tls, setTls] = useState("");
  const q = useDebounced(search);
  const techD = useDebounced(tech);

  const filters = useMemo(
    () => ({
      ...scopeWindowParams(),
      q: q || undefined,
      status_code: status || undefined,
      tech: techD || undefined,
      tls: tls || undefined,
    }),
    [scopeWindowParams, q, status, techD, tls],
  );

  const list = usePagedList<ProbeDoc>("/http_probes", filters, [{ id: "last_alive", desc: true }]);

  const columns = useMemo(
    () => [
      col.accessor("status_code", { header: "Code", cell: (c) => <StatusCode code={c.getValue()} /> }),
      col.accessor("url", {
        header: "URL",
        cell: (c) => (
          <div className="min-w-0">
            <a href={c.getValue()} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="font-mono text-zinc-200 hover:text-sky-300">
              {c.getValue()}
            </a>
            {c.row.original.title && <div className="truncate text-xs text-zinc-500">{c.row.original.title}</div>}
          </div>
        ),
      }),
      col.accessor("host", { header: "Host", cell: (c) => <HostLink host={c.getValue()} /> }),
      col.accessor("webserver", { header: "Server", cell: (c) => <span className="text-xs text-zinc-400">{c.getValue() || "—"}</span> }),
      col.accessor("tech", { header: "Tech", enableSorting: false, cell: (c) => <Chips values={c.getValue()} tone="bg-emerald-900/40 text-emerald-300" /> }),
      col.accessor("content_length", { header: "Size", cell: (c) => <span className="whitespace-nowrap text-xs tabular-nums text-zinc-400">{formatBytes(c.getValue())}</span> }),
      col.accessor("a", { header: "IPs", enableSorting: false, cell: (c) => <Chips values={c.getValue()} /> }),
      col.accessor("last_alive", { header: "Last alive", cell: (c) => <span className="whitespace-nowrap text-xs text-zinc-400">{relativeTime(c.getValue())}</span> }),
    ],
    [],
  );

  return (
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
      onRowClick={(row) => row.host && navigate(`/host/${encodeURIComponent(row.host)}`)}
      getRowId={(r, i) => r.id ?? String(i)}
      emptyTitle="No HTTP services"
      emptyHint="Try widening the alive window or clearing filters."
      toolbar={
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="host / title / url…" />
          <FilterInput value={status} onChange={setStatus} placeholder="status" type="number" width="w-24" />
          <FilterInput value={tech} onChange={setTech} placeholder="tech" width="w-28" />
          <select
            value={tls}
            onChange={(e) => setTls(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            {TLS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </>
      }
    />
  );
}
