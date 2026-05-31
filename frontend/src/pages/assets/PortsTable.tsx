import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HostLink, Mono } from "../../components/bits";
import { DataTable } from "../../components/DataTable";
import { FilterBuilder } from "../../components/FilterBuilder";
import { FilterInput, SearchInput } from "../../components/SearchInput";
import { relativeTime } from "../../lib/format";
import { useDebounced } from "../../lib/hooks";
import { usePagedList } from "../../lib/useList";
import type { PortDoc } from "../../lib/types";
import { useApp } from "../../state/AppContext";

const col = createColumnHelper<PortDoc>();

export function PortsTable() {
  const { scopeWindowParams } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [port, setPort] = useState("");
  const [adv, setAdv] = useState<string | undefined>(undefined);
  const q = useDebounced(search);
  const portD = useDebounced(port);
  const advD = useDebounced(adv, 400);

  const filters = useMemo(
    () => ({ ...scopeWindowParams(), q: q || undefined, port: portD || undefined, filter: advD }),
    [scopeWindowParams, q, portD, advD],
  );

  const list = usePagedList<PortDoc>("/ports", filters, [{ id: "last_alive", desc: true }]);

  const columns = useMemo(
    () => [
      col.accessor("host", { header: "Host", cell: (c) => <HostLink host={c.getValue()} /> }),
      col.accessor("port", { header: "Port", cell: (c) => <span className="font-mono font-medium tabular-nums text-amber-300">{String(c.getValue())}</span> }),
      col.accessor("ip", { header: "IP", cell: (c) => <Mono>{c.getValue() || "—"}</Mono> }),
      col.accessor("scope", { header: "Scope", cell: (c) => <span className="text-xs text-zinc-400">{c.getValue()}</span> }),
      col.accessor("add_date", { header: "Added", cell: (c) => <span className="whitespace-nowrap text-xs text-zinc-400">{relativeTime(c.getValue())}</span> }),
      col.accessor("last_alive", { header: "Last alive", cell: (c) => <span className="whitespace-nowrap text-xs text-zinc-400">{relativeTime(c.getValue())}</span> }),
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <FilterBuilder collection="ports" onChange={setAdv} />
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
        emptyTitle="No open ports"
        emptyHint="naabu has not reported ports in this scope/window."
        toolbar={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="host / ip…" />
            <FilterInput value={port} onChange={setPort} placeholder="port" type="number" width="w-24" />
          </>
        }
      />
    </div>
  );
}
