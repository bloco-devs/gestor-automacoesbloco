import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useAuth } from "@/hooks/useAuth";
import { listSolucoes, listSolicitacoes } from "@/lib/supabaseData";
import {
  createConexao,
  deleteConexao,
  listConexoes,
  listPosicoes,
  upsertPosicao,
} from "@/lib/diagrama";
import type { Solucao, Solicitacao } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Workflow } from "lucide-react";

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


function DiagramaInner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [variant, setVariant] = useState<NodeVariant>("solucao");
  const variantRef = useRef<NodeVariant>("solucao");
  const positionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const buildNodes = useCallback(
    (
      solucoes: Solucao[],
      solicitacoes: Solicitacao[],
      posMap: Map<string, { x: number; y: number }>,
      v: NodeVariant,
    ) => {
      const solById = new Map(solicitacoes.map((s) => [s.id, s.titulo]));
      const cols = 4;
      return solucoes.map<Node>((s, i) => {
        const pos = posMap.get(s.id);
        return {
          id: s.id,
          type: v,
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

  // Quando o usuário troca a variante, atualiza o tipo de cada nó preservando posição.
  useEffect(() => {
    variantRef.current = variant;
    setNodes((nds) => nds.map((n) => ({ ...n, type: variant })));
  }, [variant]);


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
        setNodes(buildNodes(solucoes, solicitacoes, posMap, variantRef.current));
        const validIds = new Set(solucoes.map((s) => s.id));
        setEdges(
          conexoes
            .filter((c) => validIds.has(c.sourceId) && validIds.has(c.targetId))
            .map<Edge>((c) => ({
              id: c.id,
              source: c.sourceId,
              target: c.targetId,
              label: c.label ?? undefined,
              animated: false,
            })),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildNodes]);

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
      // optimistic
      const tempId = `tmp-${params.source}-${params.target}-${Date.now()}`;
      setEdges((eds) =>
        addEdge({ ...params, id: tempId, source: params.source!, target: params.target! }, eds),
      );
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
    [user?.id],
  );

  return (
    <div className="-m-4 md:-m-8 h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)]">
      <div className="px-4 md:px-8 py-3 border-b border-border bg-background flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-brand font-bold">Diagrama de Soluções</h1>
          <p className="text-xs text-muted-foreground">
            Arraste para reposicionar. Conecte os pontos das laterais para criar relações. Selecione uma aresta e
            pressione Delete para removê-la. Duplo clique em um nó abre a Solução.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs shrink-0">
          {(Object.keys(VARIANT_LABEL) as NodeVariant[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              className={
                "px-2.5 py-1 rounded transition-colors " +
                (variant === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {VARIANT_LABEL[v]}
            </button>
          ))}
        </div>
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
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
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
