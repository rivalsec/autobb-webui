import { Copy, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function SlideOver({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/95 px-5 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">{title}</div>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4 text-sm">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, value, mono, copy }: { label: string; value?: ReactNode; mono?: boolean; copy?: boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 pt-0.5 text-xs font-medium uppercase text-zinc-500">{label}</span>
      <div className={mono ? "min-w-0 flex-1 break-all font-mono text-xs text-zinc-300" : "min-w-0 flex-1 text-zinc-300"}>
        {value}
        {copy && typeof value === "string" && <CopyButton value={value} />}
      </div>
    </div>
  );
}

export function CodeField({ label, value, tone, copy }: { label: string; value: string; tone?: string; copy?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-zinc-500">
        {label}
        {copy && <CopyButton value={value} />}
      </div>
      <pre className={`overflow-x-auto rounded bg-zinc-950 p-2.5 font-mono text-xs ${tone || "text-zinc-300"}`}>{value}</pre>
    </div>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="ml-2 inline-flex items-center gap-1 rounded px-1 text-zinc-500 hover:text-zinc-200"
    >
      <Copy className="h-3 w-3" /> {done ? "copied" : "copy"}
    </button>
  );
}
