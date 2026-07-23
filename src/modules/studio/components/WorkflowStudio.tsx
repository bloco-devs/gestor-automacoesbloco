import { memo } from "react";
import { Section } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { EmptyPanel } from "@/design-system";

interface Registry {
  triggers: string[];
  conditions: string[];
  actions: string[];
  validators: string[];
  hooks: string[];
}

/**
 * WorkflowStudio — leitura passiva do Workflow SDK.
 * A resolução real depende do módulo estar publicado no Service Mesh.
 * Fallback amigável quando não estiver disponível.
 */
function safeReadRegistry(): Registry {
  try {
    // Import dinâmico opcional para não acoplar o Studio ao SDK em tempo de compilação.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = require("@/platform-sdk/workflow-sdk") as {
      workflowSdk?: {
        listTriggers?: () => Array<{ id: string }>;
        listConditions?: () => Array<{ id: string }>;
        listActions?: () => Array<{ id: string }>;
        listValidators?: () => Array<{ id: string }>;
        listHooks?: () => Array<{ id: string }>;
      };
    };
    const s = sdk?.workflowSdk;
    return {
      triggers: (s?.listTriggers?.() ?? []).map((x) => x.id),
      conditions: (s?.listConditions?.() ?? []).map((x) => x.id),
      actions: (s?.listActions?.() ?? []).map((x) => x.id),
      validators: (s?.listValidators?.() ?? []).map((x) => x.id),
      hooks: (s?.listHooks?.() ?? []).map((x) => x.id),
    };
  } catch {
    return { triggers: [], conditions: [], actions: [], validators: [], hooks: [] };
  }
}

function Group({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="border rounded-md p-3 bg-card">
      <p className="font-medium mb-2">{label}</p>
      {items.length === 0 ? (
        <p className="ds-caption text-muted-foreground">Nada registrado.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((id) => (
            <Badge key={id} variant="secondary" className="text-[10px]">
              {id}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowStudioInner() {
  const reg = safeReadRegistry();
  const total = reg.triggers.length + reg.conditions.length + reg.actions.length + reg.validators.length + reg.hooks.length;
  return (
    <Section
      title="Workflow Studio"
      description="Extensões registradas via Workflow SDK. Somente leitura — o Engine não é alterado."
    >
      {total === 0 ? (
        <EmptyPanel
          title="Nenhuma extensão registrada"
          description="Ative plugins que registrem triggers, actions ou validators para vê-los aqui."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Group label="Triggers" items={reg.triggers} />
          <Group label="Conditions" items={reg.conditions} />
          <Group label="Actions" items={reg.actions} />
          <Group label="Validators" items={reg.validators} />
          <Group label="Hooks" items={reg.hooks} />
        </div>
      )}
    </Section>
  );
}

export const WorkflowStudio = memo(WorkflowStudioInner);
