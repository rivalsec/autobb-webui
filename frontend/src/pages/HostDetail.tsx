import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Fingerprint, Globe, KeyRound, Network, ServerCog, ShieldAlert, FileSearch } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import { formatBytes, formatDate, relativeTime, toArray } from "../lib/format";
import type { Finding, HostDetail as HostDetailData, PathDoc, SecretDoc } from "../lib/types";
import { Chips, Mono, StatusCode } from "../components/bits";
import { EmptyState } from "../components/EmptyState";
import { FindingDetail } from "../components/FindingDetail";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { PathDetail } from "../components/PathDetail";
import { SecretDetail } from "../components/SecretDetail";
import { SeverityBadge } from "../components/SeverityBadge";

export function HostDetail() {
  const { host = "" } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["host", host],
    queryFn: () => apiGet<HostDetailData>(`/host/${encodeURIComponent(host)}`),
    enabled: !!host,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/assets" className="rounded-md border border-zinc-700 p-1.5 text-zinc-400 hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-mono text-xl font-semibold text-zinc-100">{host}</h1>
          {data?.domain?.scope && <p className="text-sm text-zinc-500">scope: {data.domain.scope}</p>}
        </div>
      </div>

      {isError ? (
        <EmptyState title="Failed to load host" hint={(error as Error)?.message} />
      ) : isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : !data ? (
        <EmptyState title="Not found" />
      ) : (
        <>
          <DomainCard data={data} />
          <FindingsSection data={data} />
          <SecretsSection data={data} />
          <ProbesSection data={data} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PortsSection data={data} />
            <PathsSection data={data} />
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: ReactNode; count?: number; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300">
        {icon}
        {title}
        {count !== undefined && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">{count}</span>}
      </div>
      {children}
    </section>
  );
}

function DomainCard({ data }: { data: HostDetailData }) {
  const d = data.domain;
  return (
    <Section title="Subdomain" icon={<Globe className="h-4 w-4 text-emerald-400" />}>
      {!d ? (
        <div className="px-4 py-3 text-sm text-zinc-500">No domains record (host known from another collection).</div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-4">
          <Meta label="IPs"><Chips values={d.a} /></Meta>
          <Meta label="CNAME"><Chips values={d.cname} tone="bg-indigo-900/40 text-indigo-300" /></Meta>
          <Meta label="First seen">{formatDate(d.add_date)}</Meta>
          <Meta label="Last alive">{relativeTime(d.last_alive)}</Meta>
          {d.juicy_weight !== undefined && <Meta label="Juicy weight"><span className="text-amber-300">{String(d.juicy_weight)}</span></Meta>}
        </dl>
      )}
    </Section>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-xs font-medium uppercase text-zinc-500">{label}</dt>
      <dd className="text-zinc-200">{children}</dd>
    </div>
  );
}

function FindingsSection({ data }: { data: HostDetailData }) {
  const [selected, setSelected] = useState<Finding | null>(null);
  if (data.findings.length === 0) return null;
  return (
    <Section title="Findings" icon={<ShieldAlert className="h-4 w-4 text-amber-400" />} count={data.findings.length}>
      <ul className="divide-y divide-zinc-800/60">
        {data.findings.map((f, i) => (
          <li key={f.id ?? i}>
            <button
              onClick={() => setSelected(f)}
              className="flex w-full items-start gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-800/30"
            >
              <SeverityBadge severity={f.severity ?? f.info?.severity} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-200">
                  {f.info?.name || f["template-id"]}
                  {f.passive && <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">passive</span>}
                </div>
                <div className="truncate font-mono text-xs text-zinc-500">{f["matched-at"]}</div>
              </div>
              <span className="shrink-0 text-xs text-zinc-500">{relativeTime(f.last_alive)}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected && <FindingDetail finding={selected} onClose={() => setSelected(null)} />}
    </Section>
  );
}

function SecretsSection({ data }: { data: HostDetailData }) {
  const [selected, setSelected] = useState<SecretDoc | null>(null);
  if (data.secrets.length === 0) return null;
  return (
    <Section title="Secrets" icon={<KeyRound className="h-4 w-4 text-rose-400" />} count={data.secrets.length}>
      <ul className="divide-y divide-zinc-800/60">
        {data.secrets.map((s, i) => (
          <li key={s.id ?? i}>
            <button
              onClick={() => setSelected(s)}
              className="flex w-full items-start gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-800/30"
            >
              <SeverityBadge severity={s.severity} />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-zinc-200">{s.rule_id || "secret"}</div>
                {s.description && <div className="truncate text-xs text-zinc-500">{s.description}</div>}
                {s.match && <div className="truncate font-mono text-xs text-amber-300/90">{s.match}</div>}
              </div>
              <span className="shrink-0 text-xs text-zinc-500">{relativeTime(s.last_alive)}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected && <SecretDetail secret={selected} onClose={() => setSelected(null)} />}
    </Section>
  );
}

function ProbesSection({ data }: { data: HostDetailData }) {
  return (
    <Section title="HTTP services" icon={<ServerCog className="h-4 w-4 text-sky-400" />} count={data.probes.length}>
      {data.probes.length === 0 ? (
        <div className="px-4 py-3 text-sm text-zinc-500">No HTTP probes.</div>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {data.probes.map((p, i) => (
            <div key={p.id ?? i} className="space-y-2 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusCode code={p.status_code} />
                <a href={p.url} target="_blank" rel="noreferrer" className="font-mono text-zinc-200 hover:text-sky-300">{p.url}</a>
                {p.tls?.probe_status ? <span className="rounded bg-emerald-900/40 px-1.5 py-0.5 text-[10px] uppercase text-emerald-300">tls</span> : null}
              </div>
              {p.title && <div className="text-xs text-zinc-400">{p.title}</div>}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-zinc-500">
                {p.webserver && <span>server: <span className="text-zinc-300">{p.webserver}</span></span>}
                <span>size: <span className="text-zinc-300">{formatBytes(p.content_length)}</span></span>
                <span>last alive: <span className="text-zinc-300">{relativeTime(p.last_alive)}</span></span>
                {p.hash && (
                  <span className="inline-flex items-center gap-1" title={`content hash ${p.hash}`}>
                    <Fingerprint className="h-3 w-3" /> <Mono>{String(p.hash).slice(0, 12)}</Mono>
                  </span>
                )}
              </div>
              {toArray(p.tech).length > 0 && <Chips values={p.tech} tone="bg-emerald-900/40 text-emerald-300" max={8} />}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function PortsSection({ data }: { data: HostDetailData }) {
  return (
    <Section title="Open ports" icon={<Network className="h-4 w-4 text-amber-400" />} count={data.ports.length}>
      {data.ports.length === 0 ? (
        <div className="px-4 py-3 text-sm text-zinc-500">No open ports.</div>
      ) : (
        <div className="flex flex-wrap gap-2 p-4">
          {data.ports.map((pt, i) => (
            <span key={pt.id ?? i} className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs" title={`${pt.ip ?? ""} · last alive ${relativeTime(pt.last_alive)}`}>
              <span className="text-amber-300">{String(pt.port)}</span>
              {pt.ip && <span className="ml-1.5 text-zinc-500">{pt.ip}</span>}
            </span>
          ))}
        </div>
      )}
    </Section>
  );
}

function PathsSection({ data }: { data: HostDetailData }) {
  const [selected, setSelected] = useState<PathDoc | null>(null);
  return (
    <Section title="Fuzzed paths" icon={<FileSearch className="h-4 w-4 text-zinc-400" />} count={data.paths.length}>
      {data.paths.length === 0 ? (
        <div className="px-4 py-3 text-sm text-zinc-500">No fuzzed paths.</div>
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {data.paths.map((p, i) => (
            <li key={p.id ?? i}>
              <button
                onClick={() => setSelected(p)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-800/30"
              >
                <StatusCode code={p.status_code} />
                <Mono>{p.path}</Mono>
                {p.redirect && <span className="truncate text-xs text-zinc-500">→ {p.redirect}</span>}
                <span className="ml-auto shrink-0 text-xs tabular-nums text-zinc-500">{formatBytes(p.content_length)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && <PathDetail path={selected} onClose={() => setSelected(null)} />}
    </Section>
  );
}
