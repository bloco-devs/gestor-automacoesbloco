import { useSyncExternalStore } from "react";
import { listMessages, subscribeMemory } from "../memory";
import { stableSnapshot } from "@/lib/stable-snapshot";
import CopilotContextPanel from "./CopilotContextPanel";

const getMessages = stableSnapshot(listMessages);

/**
 * Drawer lateral leve. Nunca substitui telas.
 * Renderizado por hosts que consumam slot "copilot" via SDK.
 */
export default function CopilotDock() {
  const messages = useSyncExternalStore(subscribeMemory, getMessages, getMessages);

  return (
    <aside className="w-80 shrink-0 space-y-3 border-l border-border p-3">
      <header className="text-sm font-semibold">AI Copilot</header>
      <CopilotContextPanel />
      <section className="space-y-1 text-xs">
        <div className="text-muted-foreground">Conversa (sessão)</div>
        {messages.length === 0 ? (
          <p className="text-muted-foreground">Sem mensagens.</p>
        ) : (
          messages.slice(-6).map((m) => (
            <div key={m.id} className="rounded border border-border p-2">
              <div className="text-[10px] uppercase text-muted-foreground">{m.role}</div>
              <div className="line-clamp-3">{m.content}</div>
            </div>
          ))
        )}
      </section>
    </aside>
  );
}
