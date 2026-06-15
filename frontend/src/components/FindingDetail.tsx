import { formatDate, relativeTime, toArray } from "../lib/format";
import type { Finding } from "../lib/types";
import { HostLink } from "./bits";
import { SeverityBadge } from "./SeverityBadge";
import { CodeField, Field, SlideOver } from "./SlideOver";

export function FindingDetail({ finding: f, onClose }: { finding: Finding; onClose: () => void }) {
  const extracted = toArray(f["extracted-results"]);
  const tags = toArray(f.info?.tags);
  const author = toArray(f.info?.author);
  const curl = f["curl-command"];
  return (
    <SlideOver
      onClose={onClose}
      title={
        <>
          <SeverityBadge severity={f.severity ?? f.info?.severity} />
          <span className="truncate text-sm font-medium text-zinc-200">{f.info?.name || f["template-id"]}</span>
          {f.passive && <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">passive</span>}
        </>
      }
    >
      {f.info?.description && <p className="text-zinc-300">{f.info.description}</p>}

      <Field label="Template" value={f["template-id"]} mono copy />
      <Field label="Matcher" value={f["matcher-name"]} mono />
      <Field label="Matched at" value={f["matched-at"]} mono copy />
      <Field label="Host" value={f.host ? <HostLink host={f.host} /> : undefined} />
      <Field label="Type" value={f.type} />
      <Field label="Port" value={f.port} mono />
      <Field label="Path" value={f.path} mono />
      <Field label="Tags" value={tags.length ? tags.join(", ") : undefined} />
      <Field label="Author" value={author.length ? author.join(", ") : undefined} />
      <Field label="Time" value={f.timestamp ? `${formatDate(f.timestamp)} (${relativeTime(f.timestamp)})` : undefined} />
      <Field label="Scope" value={f.scope} mono />
      <Field label="Added" value={f.add_date ? formatDate(f.add_date) : undefined} />
      <Field label="Last alive" value={f.last_alive ? `${formatDate(f.last_alive)} (${relativeTime(f.last_alive)})` : undefined} />

      {extracted.length > 0 && <CodeField label="Extracted" value={extracted.join("\n")} tone="text-emerald-300" copy />}
      {curl && <CodeField label="curl" value={String(curl)} copy />}
    </SlideOver>
  );
}
