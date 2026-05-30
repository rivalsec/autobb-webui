import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { apiGet, type Params } from "./api";
import { sortingToParams } from "./hooks";
import type { Paginated } from "./types";

const PAGE_SIZE = 50;

/**
 * Server-side paginated/sortable list backed by TanStack Query.
 * Resets to page 1 whenever the filters or sort change so results stay coherent.
 */
export function usePagedList<T>(
  path: string,
  filters: Params,
  defaultSort: SortingState = [],
  pageSize = PAGE_SIZE,
) {
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>(defaultSort);

  const filterKey = JSON.stringify(filters);
  const sortKey = JSON.stringify(sorting);

  // Any filter/sort change → back to the first page.
  useEffect(() => {
    setPage(1);
  }, [filterKey, sortKey]);

  const params: Params = {
    ...filters,
    ...sortingToParams(sorting),
    page,
    page_size: pageSize,
  };

  const query = useQuery({
    queryKey: ["list", path, filterKey, sortKey, page, pageSize],
    queryFn: () => apiGet<Paginated<T>>(path, params),
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page,
    setPage,
    pageSize,
    sorting,
    setSorting,
  };
}
