import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./api";
import type { Operator } from "./filterTree";

export type FieldType = "string" | "number" | "date" | "bool" | "string[]";

export interface SchemaField {
  name: string;
  label: string;
  type: FieldType;
  operators: Operator[];
}

export interface CollectionSchema {
  collection: string;
  fields: SchemaField[];
}

// Filterable-field schema for a collection — drives the FilterBuilder and stays
// in lockstep with the backend validator. Rarely changes, so cache hard.
export function useSchema(collection: string) {
  return useQuery({
    queryKey: ["schema", collection],
    queryFn: () => apiGet<CollectionSchema>(`/schema/${collection}`),
    staleTime: 30 * 60 * 1000,
  });
}
