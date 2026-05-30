// Tiny typed fetch client. All requests go to the same-origin `/api` (Vite
// proxies it in dev; FastAPI serves it in prod). The shared auth token, when
// present, is attached as X-Auth-Token.

const TOKEN_KEY = "autobb.token";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token: string): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Params = Record<string, string | number | boolean | null | undefined>;

function buildQuery(params?: Params): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function apiGet<T>(path: string, params?: Params): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}${buildQuery(params)}`, {
    headers: token ? { "X-Auth-Token": token } : {},
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body?.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return (await res.json()) as T;
}

// --- Auth discovery / validation ---
export async function fetchAuthConfig(): Promise<{ auth_required: boolean }> {
  return apiGet("/auth/config");
}

export async function checkToken(): Promise<boolean> {
  try {
    await apiGet("/auth/check");
    return true;
  } catch {
    return false;
  }
}
