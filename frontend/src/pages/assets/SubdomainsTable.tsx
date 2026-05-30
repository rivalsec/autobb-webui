import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chips, HostLink } from "../../components/bits";
import { DataTable } from "../../components/DataTable";
import { SearchInput } from "../../components/SearchInput";
import { relativeTime } from "../../lib/format";
import { useDebounced } from "../../lib/hooks";
import { usePagedList } from "../../lib/useList";
import type { DomainDoc } from "../../lib/types";
import { useApp } from "../../state/AppContext";

const col = createColumnHelper<DomainDoc>();

export function SubdomainsTable() {
  const { scopeWindowParams } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);

  const filters = useMemo(() => ({ ...scopeWindowParams(), q: q || undefined }), [scopeWindowParams, q]);

  const list = usePagedList<DomainDoc>("/domains", filters, [{ id: "last_alive", desc: true }]);

  const columns = useMemo(
    () => [
      col.accessor("host", { header: "Host", cell: (c) => <HostLink host={c.getValue()} /> }),
      col.accessor("a", { header: "IPs", enableSorting: false, cell: (c) => <Chips values={c.getValue()} /> }),
      col.accessor("cname", { header: "CNAME", enableSorting: false, cell: (c) => <Chips values={c.getValue()} tone="bg-indigo-900/40 text-indigo-300" /> }),
      col.accessor("scope", { header: "Scope", cell: (c) => <span className="text-xs text-zinc-400">{c.getValue()}</span> }),
      col.accessor("add_date", { header: "Added", cell: (c) => <span className="whitespace-nowrap text-xs text-zinc-400">{relativeTime(c.getValue())}</span> }),
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
      emptyTitle="No subdomains"
      emptyHint="Try widening the alive window or clearing filters."
      toolbar={<SearchInput value={search} onChange={setSearch} placeholder="Search host…" />}
    />
  );
}
