import { formatDate, relativeTime } from "../lib/format";
import type { SecretDoc } from "../lib/types";
import { ExtLink, HostLink } from "./bits";
import { SeverityBadge } from "./SeverityBadge";
import { CodeField, Field, SlideOver } from "./SlideOver";

export function SecretDetail({ secret, onClose }: { secret: SecretDoc; onClose: () => void }) {
  return (
    <SlideOver
      onClose={onClose}
      title={
        <>
          <SeverityBadge severity={secret.severity} />
          <span className="truncate font-mono text-sm text-zinc-200">{secret.rule_id || "secret"}</span>
        </>
      }
    >
      {secret.description && <p className="text-zinc-300">{secret.description}</p>}

      {secret.secret && <CodeField label="Secret" value={secret.secret} tone="text-amber-300" copy />}
      {secret.match && <CodeField label="Match" value={secret.match} tone="text-amber-300/80" copy />}

      <Field label="Host" value={secret.host ? <HostLink host={secret.host} /> : undefined} />
      <Field label="URL" value={secret.url ? <ExtLink url={secret.url} /> : undefined} />
      <Field label="File" value={secret.file} mono />
      <Field label="Line" value={secret.line} mono />
      <Field label="SHA-256" value={secret.secret_sha256} mono copy />
      <Field label="Scope" value={secret.scope} mono />
      <Field label="Added" value={secret.add_date ? formatDate(secret.add_date) : undefined} />
      <Field label="Last alive" value={secret.last_alive ? `${formatDate(secret.last_alive)} (${relativeTime(secret.last_alive)})` : undefined} />
    </SlideOver>
  );
}
