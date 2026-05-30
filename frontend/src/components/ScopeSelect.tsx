import { ChevronDown } from "lucide-react";
import { useScopes } from "../lib/queries";
import { useApp } from "../state/AppContext";

export function ScopeSelect() {
  const { scope, setScope } = useApp();
  const { data, isLoading } = useScopes();
  const scopes = data?.items ?? [];

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Scope</span>
      <select
        value={scope ?? ""}
        onChange={(e) => setScope(e.target.value || null)}
        disabled={isLoading}
        className="appearance-none rounded-md border border-zinc-700 bg-zinc-900 py-1.5 pl-3 pr-8 text-sm text-zinc-100 hover:border-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
      >
        <option value="">All scopes</option>
        {scopes.map((s) => (
          <option key={s.name} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-zinc-500" />
    </label>
  );
}
