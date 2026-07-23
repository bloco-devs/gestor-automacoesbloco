import { useHostDiagnostics } from "@/platform-sdk/runtime/hooks";
import { useEventHistory } from "@/platform-sdk";

/**
 * Developer Console — Timeline dos eventos, lifecycle e registros.
 */
export function DeveloperConsole() {
  const diag = useHostDiagnostics();
  const history = useEventHistory();
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-1 text-xs font-medium text-muted-foreground">
          Lifecycle Events ({diag.lifecycleEvents.length})
        </h3>
        <ul className="max-h-48 space-y-1 overflow-auto font-mono text-[11px]">
          {diag.lifecycleEvents.map((e, i) => (
            <li key={i} className="flex justify-between border-b border-border/40 py-1">
              <span>
                {e.pluginId} · {e.phase} · {e.durationMs.toFixed(2)}ms
              </span>
              <span className={e.error ? "text-destructive" : "text-muted-foreground"}>
                {e.error ?? "ok"}
              </span>
            </li>
          ))}
          {diag.lifecycleEvents.length === 0 && (
            <li className="text-muted-foreground">Nenhum evento.</li>
          )}
        </ul>
      </section>
      <section>
        <h3 className="mb-1 text-xs font-medium text-muted-foreground">
          Platform Events ({history.length})
        </h3>
        <ul className="max-h-40 space-y-1 overflow-auto font-mono text-[11px]">
          {history.slice(-40).map((h, i) => (
            <li key={i} className="border-b border-border/40 py-1">
              {new Date(h.at).toLocaleTimeString()} · {h.name}
            </li>
          ))}
          {history.length === 0 && <li className="text-muted-foreground">Sem tráfego.</li>}
        </ul>
      </section>
    </div>
  );
}
