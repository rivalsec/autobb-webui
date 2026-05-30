import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./api";
import type { ScopeInfo } from "./types";

// Scope list is reused by the selector and the scopes view; cache generously.
export function useScopes() {
  return useQuery({
    queryKey: ["scopes"],
    queryFn: () => apiGet<{ items: ScopeInfo[]; total: number }>("/scopes"),
    staleTime: 5 * 60 * 1000,
  });
}
