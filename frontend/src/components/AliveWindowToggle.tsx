import clsx from "clsx";
import { useApp, type WindowKey } from "../state/AppContext";

const OPTIONS: { key: WindowKey; label: string; title: string }[] = [
  { key: "7d", label: "7d", title: "Alive in the last 7 days" },
  { key: "30d", label: "30d", title: "Alive in the last 30 days" },
  { key: "all", label: "All", title: "All history (disable alive window)" },
];

export function AliveWindowToggle() {
  const { windowKey, setWindowKey } = useApp();
  return (
    <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 p-0.5" role="group" aria-label="Alive window">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          title={o.title}
          onClick={() => setWindowKey(o.key)}
          className={clsx(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            windowKey === o.key ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
