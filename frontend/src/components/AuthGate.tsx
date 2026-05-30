import { KeyRound, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApp } from "../state/AppContext";
import { Spinner } from "./LoadingSkeleton";

export function AuthGate({ children }: { children: ReactNode }) {
  const { authReady, authRequired, authed, login } = useApp();
  const [token, setTokenInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!authRequired || authed) {
    return <>{children}</>;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await login(token.trim());
    setBusy(false);
    if (!ok) setError("Invalid token. Check the API's AUTH_TOKEN.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center gap-2 text-zinc-100">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          <h1 className="text-lg font-semibold">AutoBB Dashboard</h1>
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          This dashboard exposes recon data and is protected. Enter the API access token to continue.
        </p>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Access token</label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="password"
            autoFocus
            value={token}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="token"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 pl-8 pr-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !token.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-zinc-100 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-50"
        >
          {busy && <Spinner className="h-4 w-4 border-zinc-500 border-t-zinc-900" />}
          Unlock
        </button>
      </form>
    </div>
  );
}
