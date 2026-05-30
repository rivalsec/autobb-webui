// Shared API types. Mongo documents are heterogeneous, so asset/finding shapes
// keep an index signature and surface only the fields the UI relies on.

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type Severity = "critical" | "high" | "medium" | "low" | "info" | "unknown";

export interface ScopeCounts {
  domains: number;
  http_probes: number;
  ports: number;
  http_paths: number;
  findings: number;
}

export interface ScopeInfo {
  name: string;
  counts: ScopeCounts;
}

export interface Overview {
  scope: string | null;
  days: number;
  totals: Record<string, number>;
  new_last_7d: Record<string, number>;
  findings_by_severity: Partial<Record<Severity, number>>;
  recent_findings: Finding[];
  recent_alerts: AlertDoc[];
}

export interface BaseDoc {
  id?: string;
  scope?: string;
  add_date?: string;
  last_alive?: string;
  [k: string]: unknown;
}

export interface DomainDoc extends BaseDoc {
  host?: string;
  a?: string[];
  cname?: string[];
  juicy_weight?: number;
  juicy_info?: unknown;
}

export interface ProbeDoc extends BaseDoc {
  url?: string;
  host?: string;
  port?: string | number;
  scheme?: string;
  status_code?: number;
  title?: string;
  webserver?: string;
  tech?: string[];
  content_length?: number;
  words?: number;
  lines?: number;
  tls?: Record<string, unknown>;
  a?: string[];
  cnames?: string[];
  final_url?: string;
  hash?: string;
}

export interface PortDoc extends BaseDoc {
  host?: string;
  ip?: string;
  port?: string | number;
}

export interface PathDoc extends BaseDoc {
  url?: string;
  host?: string;
  path?: string;
  status_code?: number;
  content_length?: number;
  words?: number;
  lines?: number;
  redirect?: string;
}

export interface FindingInfo {
  name?: string;
  severity?: Severity;
  tags?: string[] | string;
  description?: string;
  author?: string[] | string;
}

export interface Finding extends BaseDoc {
  "template-id"?: string;
  info?: FindingInfo;
  type?: string;
  "matcher-name"?: string;
  host?: string;
  "matched-at"?: string;
  "extracted-results"?: string[];
  "curl-command"?: string;
  meta?: Record<string, unknown>;
  timestamp?: string;
  passive?: boolean;
  severity?: Severity;
  port?: string | number;
  path?: string;
}

export interface AlertDoc extends BaseDoc {
  source?: string;
  created_at?: string;
  msg?: string;
  items?: unknown[];
  dispatch?: Record<string, string>;
}

export interface HostDetail {
  host: string;
  domain: DomainDoc | null;
  probes: ProbeDoc[];
  ports: PortDoc[];
  findings: Finding[];
  paths: PathDoc[];
}
