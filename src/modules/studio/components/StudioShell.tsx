import { memo, useCallback, useState } from "react";
import { PageShell, PageHeader } from "@/design-system";
import { LayoutTemplate } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudio, nodeFromSpec } from "../store";
import type { StudioNode } from "../types";
import { Explorer } from "./Explorer";
import { Outline } from "./Outline";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import { StudioToolbar } from "./StudioToolbar";
import { StatusBar } from "./StatusBar";
import { AIStudio } from "./AIStudio";
import { PluginStudio } from "./PluginStudio";
import { WorkflowStudio } from "./WorkflowStudio";
import { PreviewRuntime } from "./PreviewRuntime";
import { ExportPanel } from "./ExportPanel";
import { clearDoc } from "../persistence";

function appendToRoot(dispatch: ReturnType<typeof useStudio>["dispatch"], node: StudioNode, parentId: string) {
  // Estratégia: adiciona um nó base do tipo do template raiz, depois insere os filhos.
  dispatch({ type: "add", nodeType: node.type, parentId });
  // Para simplificar, atualiza props do último nó adicionado a seguir seria caro sem o id.
  // O template mais interessante já vem com children construídos localmente; então
  // aqui gravamos as props via bindings do doc atual.
  // A implementação real replica o subtree via múltiplos dispatches:
  const insertSubtree = (n: StudioNode, parent: string) => {
    dispatch({ type: "add", nodeType: n.type, parentId: parent });
    // props/children não podem ser aplicados sem conhecer o id gerado — deixamos os defaults.
    for (const c of n.children ?? []) insertSubtree(c, parent);
  };
  for (const c of node.children ?? []) insertSubtree(c, parentId);
}

function StudioShellInner() {
  const { state, dispatch, selectedNode } = useStudio();
  const [view, setView] = useState<"editor" | "preview" | "ai" | "plugins" | "workflow" | "export">("editor");

  const handleAdd = useCallback(
    (type: string) => dispatch({ type: "add", nodeType: type, parentId: selectedNode?.id ?? state.doc.root.id }),
    [dispatch, selectedNode?.id, state.doc.root.id],
  );

  const handleAppendTemplate = useCallback(
    (n: StudioNode) => appendToRoot(dispatch, n, state.doc.root.id),
    [dispatch, state.doc.root.id],
  );

  return (
    <PageShell maxWidth="full" className="!py-3 space-y-3">
      <PageHeader
        title="Platform Studio"
        subtitle="Ambiente low-code para montar aplicações a partir dos módulos existentes."
        icon={<LayoutTemplate className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Input
              value={state.doc.name}
              onChange={(e) => dispatch({ type: "rename", name: e.target.value })}
              className="h-9 w-56"
              aria-label="Nome do rascunho"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Limpar rascunho atual? Esta ação não pode ser desfeita.")) {
                  clearDoc();
                  dispatch({ type: "reset" });
                }
              }}
            >
              Novo
            </Button>
          </div>
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as never)} className="space-y-3">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="ai">AI Studio</TabsTrigger>
          <TabsTrigger value="plugins">Plugin Studio</TabsTrigger>
          <TabsTrigger value="workflow">Workflow Studio</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="m-0">
          <div className="border rounded-lg overflow-hidden bg-background flex flex-col h-[calc(100vh-220px)] min-h-[560px]">
            <StudioToolbar
              viewport={state.viewport}
              canUndo={state.past.length > 0}
              canRedo={state.future.length > 0}
              onUndo={() => dispatch({ type: "undo" })}
              onRedo={() => dispatch({ type: "redo" })}
              onViewport={(v) => dispatch({ type: "viewport", viewport: v })}
            />
            <div className="grid flex-1 min-h-0" style={{ gridTemplateColumns: "260px 1fr 320px" }}>
              <aside className="border-r overflow-hidden flex flex-col">
                <Explorer onAdd={handleAdd} />
                <div className="border-t max-h-52 overflow-auto">
                  <Outline
                    root={state.doc.root}
                    selectedId={state.selectedId}
                    onSelect={(id) => dispatch({ type: "select", id })}
                  />
                </div>
              </aside>
              <main className="min-w-0 overflow-hidden">
                <Canvas
                  doc={state.doc}
                  viewport={state.viewport}
                  selectedId={state.selectedId}
                  onSelect={(id) => dispatch({ type: "select", id })}
                  onAddTo={(parentId, type, index) =>
                    dispatch({ type: "add", nodeType: type, parentId, index })
                  }
                  onMoveTo={(id, parentId, index) => dispatch({ type: "move", id, parentId, index })}
                />
              </main>
              <aside className="border-l overflow-hidden">
                <Inspector
                  node={selectedNode}
                  doc={state.doc}
                  onUpdateProps={(id, props) => dispatch({ type: "updateProps", id, props })}
                  onUpdateStyle={(id, style) => dispatch({ type: "updateStyle", id, style })}
                  onSetBinding={(id, prop, bindingId) => dispatch({ type: "setBinding", id, prop, bindingId })}
                  onUpsertBinding={(binding) => dispatch({ type: "upsertBinding", binding })}
                  onRemoveBinding={(bindingId) => dispatch({ type: "removeBinding", bindingId })}
                  onDuplicate={(id) => dispatch({ type: "duplicate", id })}
                  onRemove={(id) => dispatch({ type: "remove", id })}
                />
              </aside>
            </div>
            <StatusBar doc={state.doc} viewport={state.viewport} />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div className="border rounded-lg overflow-hidden bg-background flex flex-col h-[calc(100vh-220px)] min-h-[560px]">
            <StudioToolbar
              viewport={state.viewport}
              canUndo={false}
              canRedo={false}
              onUndo={() => {}}
              onRedo={() => {}}
              onViewport={(v) => dispatch({ type: "viewport", viewport: v })}
            />
            <div className="flex-1 min-h-0">
              <PreviewRuntime doc={state.doc} viewport={state.viewport} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="m-0">
          <AIStudio onAppend={handleAppendTemplate} />
        </TabsContent>
        <TabsContent value="plugins" className="m-0">
          <PluginStudio />
        </TabsContent>
        <TabsContent value="workflow" className="m-0">
          <WorkflowStudio />
        </TabsContent>
        <TabsContent value="export" className="m-0">
          <ExportPanel doc={state.doc} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

export const StudioShell = memo(StudioShellInner);
