import clsx from "clsx";
import { Activity, Bell, LayoutGrid, LogOut, Radar, ShieldCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { AliveWindowToggle } from "./AliveWindowToggle";
import { ScopeSelect } from "./ScopeSelect";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/assets", label: "Assets", icon: LayoutGrid, end: false },
  { to: "/findings", label: "Findings", icon: ShieldCheck, end: false },
  { to: "/alerts", label: "Alerts", icon: Bell, end: false },
];

export function Layout() {
  const { authRequired, logout } = useApp();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-2.5">
          <div className="flex items-center gap-2 pr-2 text-zinc-100">
            <Radar className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-semibold tracking-tight">AutoBB</span>
          </div>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-200",
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ScopeSelect />
            <AliveWindowToggle />
            {authRequired && (
              <button
                onClick={logout}
                title="Lock dashboard"
                className="rounded-md border border-zinc-700 p-1.5 text-zinc-400 hover:text-zinc-100"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-[1500px] px-4 pb-6 pt-2 text-center text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1">
          <Activity className="h-3 w-3" /> read-only dashboard over autobb · MongoDB
        </span>
      </footer>
    </div>
  );
}
