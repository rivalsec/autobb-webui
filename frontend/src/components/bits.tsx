import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { statusTone } from "../lib/format";

export function HostLink({ host, className }: { host?: string | null; className?: string }) {
  if (!host) return <span className="text-zinc-500">—</span>;
  return (
    <Link
      to={`/host/${encodeURIComponent(host)}`}
      onClick={(e) => e.stopPropagation()}
      className={clsx("font-mono text-sky-400 hover:underline", className)}
    >
      {host}
    </Link>
  );
}

export function ExtLink({ url, className }: { url?: string | null; className?: string }) {
  if (!url) return <span className="text-zinc-500">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={clsx("inline-flex items-center gap-1 break-all font-mono text-xs text-sky-400 hover:underline", className)}
    >
      {url}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

export function StatusCode({ code }: { code?: number | null }) {
  if (code === null || code === undefined) return <span className="text-zinc-500">—</span>;
  return <span className={clsx("font-mono tabular-nums", statusTone(code))}>{code}</span>;
}

export function Chips({ values, max = 4, tone = "bg-zinc-800 text-zinc-300" }: { values?: unknown; max?: number; tone?: string }) {
  const arr = Array.isArray(values) ? values.map(String) : values ? [String(values)] : [];
  if (arr.length === 0) return <span className="text-zinc-600">—</span>;
  const shown = arr.slice(0, max);
  const rest = arr.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((v, i) => (
        <span key={i} className={clsx("rounded px-1.5 py-0.5 text-xs", tone)}>
          {v}
        </span>
      ))}
      {rest > 0 && <span className="rounded px-1 py-0.5 text-xs text-zinc-500">+{rest}</span>}
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-xs text-zinc-300">{children}</span>;
}
