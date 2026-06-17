import { Moon, Sun } from "lucide-react";
import { useApp } from "../state/AppContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="rounded-md border border-zinc-700 p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
