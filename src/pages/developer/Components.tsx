import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { Card } from "@/components/ui/card";
import { EmptyPanel } from "@/design-system/patterns/EmptyPanel";
import { Layers } from "lucide-react";

/**
 * Onda 3 — Component Inspector.
 * Sem instrumentação invasiva: apresenta apenas metadados públicos coletáveis
 * a partir do DOM montado (nenhum probe no reconciler).
 */
export default function ComponentInspector() {
  const mounted = typeof document !== "undefined" ? document.querySelectorAll("[data-slot], [data-radix-portal]").length : 0;

  return (
    <DeveloperShell title="Component Inspector" description="Snapshot de superfície DOM montada. Métricas de render vivem em Performance Lab.">
      <Card className="p-4">
        <div className="text-sm">
          <p className="text-muted-foreground">
            Componentes com <code>data-slot</code> montados no documento:
          </p>
          <p className="ds-h2 mt-2">{mounted}</p>
        </div>
      </Card>
      <EmptyPanel
        icon={Layers}
        title="Instrumentação profunda desativada"
        description="Esta feature é intencionalmente read-only. Para render counts e profiling detalhado use o Performance Lab e o React DevTools."
      />
    </DeveloperShell>
  );
}
