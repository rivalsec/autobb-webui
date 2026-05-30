import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HostLink, Mono, StatusCode } from "../../components/bits";
import { DataTable } from "../../components/DataTable";
import { FilterInput, SearchInput } from "../../components/SearchInput";
import { formatBytes, relativeTime } from "../../lib/format";
import { useDebounced } from "../../lib/hooks";
import { usePagedList } from "../../lib/useList";
import type { PathDoc } from "../../lib/types";
import { useApp } from "../../state/AppContext";

const col = createColumnHelper<PathDoc>();

export function PathsTable() {
  const { scopeWindowParams } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const q = useDebounced(search);

  const filters = useMemo(
    () => ({ ...scopeWindowParams(), q: q || undefined, status_code: status || undefined }),
    [scopeWindowParams, q, status],
  );

  const list = usePagedList<PathDoc>("/http_paths", filters, [{ id: "last_alive", desc: true }]);

  const columns = useMemo(
    () => [
      col.accessor("status_code", { header: "Code", cell: (c) => <StatusCode code={c.getValue()} /> }),
      col.accessor("path", {
        header: "Path",
        cell: (c) => {
          const r = c.row.original;
          const href = r.url ? r.url.replace(/\/$/, "") + (c.getValue() || "") : undefined;
          return href ? (
            <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="font-mono text-zinc-200 hover:text-sky-300">
              {c.getValue()}
            </a>
          ) : (
            <Mono>{c.getValue()}</Mono>
          );
        },
      }),
      col.accessor("host", { header: "Host", cell: (c) => <HostLink host={c.getValue()} /> }),
      col.accessor("redirect", { header: "Redirect", enableSorting: false, cell: (c) => <Mono>{c.getValue() || "—"}</Mono> }),
      col.accessor("content_length", { header: "Size", cell: (c) => <span className="whitespace-nowrap text-xs tabular-nums text-zinc-400">{formatBytes(c.getValue())}</span> }),
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
      emptyTitle="No fuzzed paths"
      emptyHint="ffuf/httpfuzz has not reported paths in this scope/window."
      toolbar={
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="url / host / path…" />
          <FilterInput value={status} onChange={setStatus} placeholder="status" type="number" width="w-24" />
        </>
      }
    />
  );
}
