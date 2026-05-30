import clsx from "clsx";
import { useSearchParams } from "react-router-dom";
import { SubdomainsTable } from "./assets/SubdomainsTable";
import { ProbesTable } from "./assets/ProbesTable";
import { PortsTable } from "./assets/PortsTable";
import { PathsTable } from "./assets/PathsTable";

const TABS = [
  { key: "subdomains", label: "Subdomains", el: <SubdomainsTable /> },
  { key: "probes", label: "HTTP Probes", el: <ProbesTable /> },
  { key: "ports", label: "Ports", el: <PortsTable /> },
  { key: "paths", label: "Paths", el: <PathsTable /> },
];

export function Assets() {
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") || "probes";
  const current = TABS.find((t) => t.key === active) ?? TABS[1];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Assets</h1>
        <p className="text-sm text-zinc-500">Inventory across subdomains, HTTP services, ports and fuzzed paths.</p>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
            className={clsx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              t.key === current.key
                ? "border-emerald-400 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {current.el}
    </div>
  );
}
