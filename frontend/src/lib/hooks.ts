import { useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import type { Params } from "./api";

export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Map a TanStack SortingState into the API's `sort` / `order` params. */
export function sortingToParams(sorting: SortingState): Params {
  if (!sorting.length) return {};
  const s = sorting[0];
  return { sort: s.id, order: s.desc ? "desc" : "asc" };
}
