import { formatBytes, formatDate, relativeTime } from "../lib/format";
import type { PathDoc } from "../lib/types";
import { ExtLink, HostLink, StatusCode } from "./bits";
import { Field, SlideOver } from "./SlideOver";

export function PathDetail({ path: p, onClose }: { path: PathDoc; onClose: () => void }) {
  return (
    <SlideOver
      onClose={onClose}
      title={
        <>
          <StatusCode code={p.status_code} />
          <span className="truncate font-mono text-sm text-zinc-200">{p.path || p.url}</span>
        </>
      }
    >
      <Field label="URL" value={p.url ? <ExtLink url={p.url} /> : undefined} />
      <Field label="Host" value={p.host ? <HostLink host={p.host} /> : undefined} />
      <Field label="Path" value={p.path} mono copy />
      <Field label="Status" value={p.status_code !== undefined ? <StatusCode code={p.status_code} /> : undefined} />
      <Field label="Redirect" value={p.redirect} mono />
      <Field label="Size" value={p.content_length !== undefined ? formatBytes(p.content_length) : undefined} />
      <Field label="Words" value={p.words} mono />
      <Field label="Lines" value={p.lines} mono />
      <Field label="Scope" value={p.scope} mono />
      <Field label="Added" value={p.add_date ? formatDate(p.add_date) : undefined} />
      <Field label="Last alive" value={p.last_alive ? `${formatDate(p.last_alive)} (${relativeTime(p.last_alive)})` : undefined} />
    </SlideOver>
  );
}
