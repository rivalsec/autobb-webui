import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { checkToken, fetchAuthConfig, setToken } from "../lib/api";
import type { Params } from "../lib/api";

// The two persistent global controls (spec §5.2): scope + alive-window.
export type WindowKey = "7d" | "30d" | "all";

const SCOPE_KEY = "autobb.scope";
const WINDOW_KEY = "autobb.window";

const WINDOW_DAYS: Record<WindowKey, number> = { "7d": 7, "30d": 30, all: 0 };

interface AppContextValue {
  // scope + window
  scope: string | null;
  setScope: (s: string | null) => void;
  windowKey: WindowKey;
  setWindowKey: (w: WindowKey) => void;
  aliveDays: number;
  /** scope + alive-window as query params for asset/stat endpoints. */
  scopeWindowParams: () => Params;
  // auth
  authReady: boolean;
  authRequired: boolean;
  authed: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<string | null>(
    () => localStorage.getItem(SCOPE_KEY) || null,
  );
  const [windowKey, setWindowKeyState] = useState<WindowKey>(
    () => (localStorage.getItem(WINDOW_KEY) as WindowKey) || "30d",
  );

  const [authReady, setAuthReady] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authed, setAuthed] = useState(false);

  // Bootstrap auth: discover whether a token is needed, then validate any
  // token we already hold.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchAuthConfig();
        if (cancelled) return;
        setAuthRequired(cfg.auth_required);
        if (!cfg.auth_required) {
          setAuthed(true);
        } else {
          setAuthed(await checkToken());
        }
      } catch {
        // API unreachable — let the gate surface the error on first load.
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setScope = (s: string | null) => {
    setScopeState(s);
    if (s) localStorage.setItem(SCOPE_KEY, s);
    else localStorage.removeItem(SCOPE_KEY);
  };

  const setWindowKey = (w: WindowKey) => {
    setWindowKeyState(w);
    localStorage.setItem(WINDOW_KEY, w);
  };

  const login = async (token: string): Promise<boolean> => {
    setToken(token);
    const ok = await checkToken();
    setAuthed(ok);
    if (!ok) setToken("");
    return ok;
  };

  const logout = () => {
    setToken("");
    if (authRequired) setAuthed(false);
  };

  const value = useMemo<AppContextValue>(() => {
    const aliveDays = WINDOW_DAYS[windowKey];
    return {
      scope,
      setScope,
      windowKey,
      setWindowKey,
      aliveDays,
      scopeWindowParams: () => {
        const p: Params = {};
        if (scope) p.scope = scope;
        if (windowKey === "all") p.all = true;
        else p.alive_days = aliveDays;
        return p;
      },
      authReady,
      authRequired,
      authed,
      login,
      logout,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, windowKey, authReady, authRequired, authed]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
