import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title = "Nothing here", hint, icon }: { title?: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="text-zinc-600">{icon || <Inbox className="h-8 w-8" />}</div>
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {hint && <p className="max-w-sm text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
