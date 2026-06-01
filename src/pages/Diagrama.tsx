import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Handle,
  Position,
  MarkerType,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeMouseHandler,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { listSolucoes, listSolicitacoes } from "@/lib/supabaseData";
import {
  createConexao,
  createColuna,
  deleteColuna,
  deleteConexao,
  listColunas,
  listConexoes,
  listPosicoes,
  TIPOS_DADO,
  updateColuna,
  updateConexaoCurvatura,
  updateConexaoLabel,
  upsertPosicao,
  type DiagramaConexaoColuna,
} from "@/lib/diagrama";

import type { Solucao, Solicitacao } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, Workflow } from "lucide-react";
import { FlowEdge } from "@/components/diagrama/FlowEdge";


type SolucaoNodeData = {
  titulo: string;
  solicitacaoTitulo?: string | null;
  onOpen: () => void;
};

function SolucaoNode({ data }: NodeProps) {
  const d = data as unknown as SolucaoNodeData;
  return (
    <Card
      className="w-[240px] overflow-hidden border-2 border-border bg-card hover:border-primary transition-colors cursor-pointer shadow-md"
      onDoubleClick={d.onOpen}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2.5 !h-2.5" />
      <div className="flex">
        <div className="w-1.5 bg-primary shrink-0" />
        <div className="flex-1 flex flex-col">
          {/* Cabeçalho com ícone destacado */}
          <div className="flex flex-col items-center text-center px-4 pt-4 pb-3 border-b border-border bg-muted/30">
            <div className="rounded-lg bg-primary/10 p-2.5 mb-2">
              <Workflow className="size-6 text-primary" />
            </div>
            <div
              className="text-sm font-semibold leading-tight line-clamp-2 w-full"
              title={d.titulo}
            >
              {d.titulo}
            </div>
          </div>

          {/* Corpo */}
          <div className="px-4 py-3 flex-1 flex flex-col gap-2 min-h-[80px]">
            {d.solicitacaoTitulo ? (
              <div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                  Solicitação
                </div>
                <div
                  className="text-xs text-foreground line-clamp-3"
                  title={d.solicitacaoTitulo}
                >
                  {d.solicitacaoTitulo}
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">Sem solicitação vinculada</div>
            )}
          </div>

          {/* Rodapé */}
          <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground uppercase tracking-wide">Solução</span>
            <span className="text-primary font-medium">Abrir →</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2.5 !h-2.5" />
    </Card>
  );
}

const nodeTypes = { solucao: SolucaoNode };
const edgeTypes = { flow: FlowEdge };

function buildEdge(
  id: string,
  source: string,
  target: string,
  label: string | undefined,
  onLabelClick: ((edgeId: string) => void) | undefined,
  curvDX: number | null | undefined,
  curvDY: number | null | undefined,
  onCurvatureDrag: ((edgeId: string, dx: number | null, dy: number | null, isFinal: boolean) => void) | undefined,
): Edge {
  return {
    id,
    source,
    target,
    label,
    type: "flow",
    animated: true,
    data: { onLabelClick, curvDX, curvDY, onCurvatureDrag },
    markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))", width: 18, height: 18 },
    style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
  };
}




function DiagramaInner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelDialog, setLabelDialog] = useState<{ edgeId: string; value: string } | null>(null);
  const [detailsDialog, setDetailsDialog] = useState<{ edgeId: string; label: string } | null>(null);
  const [colunas, setColunas] = useState<DiagramaConexaoColuna[]>([]);
  const [colunasLoading, setColunasLoading] = useState(false);
  const [novaColuna, setNovaColuna] = useState<{ nome: string; tipo: string }>({ nome: "", tipo: "VARCHAR" });
  const positionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const curvatureTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleCurvatureDrag = useCallback(
    (edgeId: string, dx: number | null, dy: number | null, isFinal: boolean) => {
      if (edgeId.startsWith("tmp-")) return;
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId
            ? { ...e, data: { ...(e.data ?? {}), curvDX: dx, curvDY: dy } }
            : e,
        ),
      );
      if (isFinal) {
        const timers = curvatureTimers.current;
        const existing = timers.get(edgeId);
        if (existing) clearTimeout(existing);
        const handle = setTimeout(() => {
          updateConexaoCurvatura(edgeId, dx, dy).catch((err) =>
            console.error("updateConexaoCurvatura", err),
          );
          timers.delete(edgeId);
        }, 200);
        timers.set(edgeId, handle);
      }
    },
    [],
  );


  const openDetails = useCallback((edgeId: string) => {
    if (edgeId.startsWith("tmp-")) return;
    setEdges((eds) => {
      const e = eds.find((x) => x.id === edgeId);
      const lbl = typeof e?.label === "string" ? e.label : "";
      setDetailsDialog({ edgeId, label: lbl });
      setColunasLoading(true);
      setColunas([]);
      setNovaColuna({ nome: "", tipo: "VARCHAR" });
      listColunas(edgeId)
        .then((cols) => setColunas(cols))
        .catch((err) => console.error("listColunas", err))
        .finally(() => setColunasLoading(false));
      return eds;
    });
  }, []);



  const buildNodes = useCallback(
    (
      solucoes: Solucao[],
      solicitacoes: Solicitacao[],
      posMap: Map<string, { x: number; y: number }>,
    ) => {
      const solById = new Map(solicitacoes.map((s) => [s.id, s.titulo]));
      const cols = 4;
      return solucoes.map<Node>((s, i) => {
        const pos = posMap.get(s.id);
        return {
          id: s.id,
          type: "solucao",
          position: pos ?? { x: (i % cols) * 280, y: Math.floor(i / cols) * 140 },
          data: {
            titulo: s.titulo,
            solicitacaoTitulo: s.solicitacaoId ? solById.get(s.solicitacaoId) ?? null : null,
            onOpen: () => navigate(`/solucoes/${s.id}`),
          } satisfies SolucaoNodeData,
        };
      });
    },
    [navigate],
  );



  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [solucoes, solicitacoes, posicoes, conexoes] = await Promise.all([
          listSolucoes(),
          listSolicitacoes(),
          listPosicoes(),
          listConexoes(),
        ]);
        if (cancelled) return;
        const posMap = new Map(posicoes.map((p) => [p.solucaoId, { x: p.x, y: p.y }]));
        setNodes(buildNodes(solucoes, solicitacoes, posMap));
        const validIds = new Set(solucoes.map((s) => s.id));
        setEdges(
          conexoes
            .filter((c) => validIds.has(c.sourceId) && validIds.has(c.targetId))
            .map<Edge>((c) => buildEdge(c.id, c.sourceId, c.targetId, c.label ?? undefined, openDetails, c.curvX, c.curvY, handleCurvatureDrag)),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildNodes, openDetails, handleCurvatureDrag]);

  const schedulePersistPosition = useCallback(
    (id: string, x: number, y: number) => {
      const timers = positionTimers.current;
      const existing = timers.get(id);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(() => {
        upsertPosicao(id, x, y, user?.id).catch((err) => console.error("upsertPosicao", err));
        timers.delete(id);
      }, 500);
      timers.set(id, handle);
    },
    [user?.id],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      for (const ch of changes) {
        if (ch.type === "position" && ch.dragging === false && ch.position) {
          schedulePersistPosition(ch.id, ch.position.x, ch.position.y);
        }
      }
    },
    [schedulePersistPosition],
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    for (const ch of changes) {
      if (ch.type === "remove") {
        deleteConexao(ch.id).catch((err) => console.error("deleteConexao", err));
      }
    }
  }, []);

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target || params.source === params.target) return;
      const tempId = `tmp-${params.source}-${params.target}-${Date.now()}`;
      setEdges((eds) => addEdge(buildEdge(tempId, params.source!, params.target!, undefined, openDetails, null, null, handleCurvatureDrag), eds));
      try {
        const created = await createConexao(params.source, params.target, user?.id);
        if (!created) {
          setEdges((eds) => eds.filter((e) => e.id !== tempId));
          return;
        }
        setEdges((eds) => eds.map((e) => (e.id === tempId ? { ...e, id: created.id } : e)));
      } catch (err) {
        console.error("createConexao", err);
        setEdges((eds) => eds.filter((e) => e.id !== tempId));
      }
    },
    [user?.id, openDetails],

  );

  const onEdgeDoubleClick = useCallback<EdgeMouseHandler>((_evt, edge) => {
    if (edge.id.startsWith("tmp-")) return;
    const current = typeof edge.label === "string" ? edge.label : "";
    setLabelDialog({ edgeId: edge.id, value: current });
  }, []);

  const handleSaveLabel = useCallback(() => {
    if (!labelDialog) return;
    const { edgeId, value } = labelDialog;
    const trimmed = value.trim();
    setEdges((eds) =>
      eds.map((e) => (e.id === edgeId ? { ...e, label: trimmed || undefined } : e)),
    );
    updateConexaoLabel(edgeId, trimmed || null).catch((err) => console.error("updateConexaoLabel", err));
    setLabelDialog(null);
  }, [labelDialog]);

  const handleAddColuna = useCallback(async () => {
    if (!detailsDialog) return;
    const nome = novaColuna.nome.trim();
    if (!nome) return;
    try {
      const created = await createColuna(
        detailsDialog.edgeId,
        nome,
        novaColuna.tipo,
        colunas.length,
        user?.id,
      );
      setColunas((cs) => [...cs, created]);
      setNovaColuna({ nome: "", tipo: novaColuna.tipo });
    } catch (err) {
      console.error("createColuna", err);
    }
  }, [detailsDialog, novaColuna, colunas.length, user?.id]);

  const handleUpdateColuna = useCallback(
    (id: string, patch: { nome?: string; tipo?: string }) => {
      setColunas((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      updateColuna(id, patch).catch((err) => console.error("updateColuna", err));
    },
    [],
  );

  const handleDeleteColuna = useCallback((id: string) => {
    setColunas((cs) => cs.filter((c) => c.id !== id));
    deleteColuna(id).catch((err) => console.error("deleteColuna", err));
  }, []);


  return (
    <div className="-m-4 md:-m-8 h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)]">
      <div className="px-4 md:px-8 py-3 border-b border-border bg-background">
        <h1 className="text-xl md:text-2xl font-brand font-bold">Diagrama de Soluções</h1>
        <p className="text-xs text-muted-foreground">
          Conecte as laterais das Soluções para indicar fluxo de dados (origem → destino). Duplo clique em uma seta
          para nomear o dado trafegado (ex.: Pedidos, NF-e). Clique no chip para detalhar as colunas trafegadas.
          Selecione uma seta e pressione Delete para removê-la. Duplo clique em um nó abre a Solução.
        </p>

      </div>

      <div className="w-full h-[calc(100%-4rem)]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Carregando diagrama...
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Nenhuma Solução cadastrada ainda.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeDoubleClick={onEdgeDoubleClick}
            fitView
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={["Delete", "Backspace"]}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap pannable zoomable className="!bg-muted" style={{ width: 120, height: 80 }} />
          </ReactFlow>
        )}
      </div>

      <Dialog open={labelDialog !== null} onOpenChange={(open) => !open && setLabelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nomear integração</DialogTitle>
            <DialogDescription>
              Informe os dados trafegados nessa conexão (ex.: Pedidos, NF-e, Clientes). Deixe em branco para remover o rótulo.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={labelDialog?.value ?? ""}
            onChange={(e) => setLabelDialog((d) => (d ? { ...d, value: e.target.value } : d))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveLabel();
              }
            }}
            placeholder="Ex.: Pedidos, NF-e"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabelDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLabel}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialog !== null} onOpenChange={(open) => !open && setDetailsDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Detalhes da integração{detailsDialog?.label ? `: ${detailsDialog.label}` : ""}
            </DialogTitle>
            <DialogDescription>
              Cadastre as colunas (campos) trafegadas entre as Soluções e o respectivo tipo de dado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {colunasLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Carregando colunas...</div>
            ) : colunas.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2 text-center italic">
                Nenhuma coluna cadastrada ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-[1fr_180px_40px] gap-2 text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-1">
                  <span>Nome da coluna</span>
                  <span>Tipo</span>
                  <span></span>
                </div>
                {colunas.map((c) => (
                  <div key={c.id} className="grid grid-cols-[1fr_180px_40px] gap-2 items-center">
                    <Input
                      value={c.nome}
                      onChange={(e) => handleUpdateColuna(c.id, { nome: e.target.value })}
                      placeholder="ex.: cliente_id"
                    />
                    <Select
                      value={c.tipo}
                      onValueChange={(v) => handleUpdateColuna(c.id, { tipo: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_DADO.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteColuna(c.id)}
                      title="Remover coluna"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <Label className="text-xs">Adicionar nova coluna</Label>
              <div className="grid grid-cols-[1fr_180px_auto] gap-2">
                <Input
                  value={novaColuna.nome}
                  onChange={(e) => setNovaColuna((n) => ({ ...n, nome: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddColuna();
                    }
                  }}
                  placeholder="Nome (ex.: pedido_id)"
                />
                <Select
                  value={novaColuna.tipo}
                  onValueChange={(v) => setNovaColuna((n) => ({ ...n, tipo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DADO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddColuna} disabled={!novaColuna.nome.trim()}>
                  <Plus className="size-4 mr-1" /> Adicionar
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setDetailsDialog(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}

export default function Diagrama() {
  return (
    <ReactFlowProvider>
      <DiagramaInner />
    </ReactFlowProvider>
  );
}
