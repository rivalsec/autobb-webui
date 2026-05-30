import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";

export interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  isLoading?: boolean;
  isError?: boolean;
  error?: string;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
  getRowId?: (row: T, index: number) => string;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  sorting,
  onSortingChange,
  isLoading,
  isError,
  error,
  onRowClick,
  toolbar,
  emptyTitle,
  emptyHint,
  getRowId,
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    getRowId,
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/40">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 p-3">{toolbar}</div>
      )}

      <div className="relative overflow-x-auto">
        {isError ? (
          <EmptyState title="Failed to load" hint={error || "Request error"} />
        ) : isLoading && data.length === 0 ? (
          <LoadingSkeleton rows={8} />
        ) : data.length === 0 ? (
          <EmptyState title={emptyTitle || "No results"} hint={emptyHint} />
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-900/95 text-left text-xs uppercase tracking-wide text-zinc-500 backdrop-blur">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-zinc-800">
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const dir = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className={clsx("whitespace-nowrap px-3 py-2 font-medium", canSort && "cursor-pointer select-none hover:text-zinc-300")}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === "asc" && <ArrowUp className="h-3 w-3" />}
                          {dir === "desc" && <ArrowDown className="h-3 w-3" />}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={clsx(
                    "border-b border-zinc-800/60 last:border-0",
                    onRowClick && "cursor-pointer hover:bg-zinc-800/40",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-top text-zinc-200">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isLoading && data.length > 0 && (
          <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-sky-500/60" />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
        <span className="tabular-nums">
          {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
        </span>
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1 hover:bg-zinc-800 disabled:opacity-40"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tabular-nums">
            Page {page} / {pageCount}
          </span>
          <button
            className="rounded p-1 hover:bg-zinc-800 disabled:opacity-40"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount || isLoading}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
