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
      className="min-w-[180px] max-w-[240px] px-3 py-2 border-2 border-border bg-card hover:border-primary/60 transition-colors cursor-pointer shadow-sm"
      onDoubleClick={d.onOpen}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Workflow className="size-4 text-primary shrink-0" />
        <div className="text-sm font-medium truncate flex-1" title={d.titulo}>
          {d.titulo}
        </div>
      </div>
      {d.solicitacaoTitulo && (
        <div
          className="text-[11px] text-muted-foreground truncate mt-1"
          title={d.solicitacaoTitulo}
        >
          {d.solicitacaoTitulo}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
    </Card>
  );
}

/** Variante "Compacta": pílula minimalista com apenas título. */
function SolucaoNodeCompact({ data }: NodeProps) {
  const d = data as unknown as SolucaoNodeData;
  return (
    <div
      className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm hover:border-primary hover:shadow-md transition-all max-w-[200px] cursor-pointer"
      onDoubleClick={d.onOpen}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />
      <span className="size-2 rounded-full bg-primary shrink-0" />
      <span className="text-xs font-medium truncate" title={d.titulo}>
        {d.titulo}
      </span>
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
    </div>
  );
}

/** Variante "Detalhada": card com faixa lateral, ícone destacado e CTA. */
function SolucaoNodeDetailed({ data }: NodeProps) {
  const d = data as unknown as SolucaoNodeData;
  return (
    <Card
      className="min-w-[220px] max-w-[280px] overflow-hidden border-2 border-border bg-card hover:border-primary transition-colors cursor-pointer shadow-md"
      onDoubleClick={d.onOpen}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2.5 !h-2.5" />
      <div className="flex">
        <div className="w-1.5 bg-primary shrink-0" />
        <div className="flex-1 p-3">
          <div className="flex items-start gap-2">
            <div className="rounded-md bg-primary/10 p-1.5 shrink-0">
              <Workflow className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight line-clamp-2" title={d.titulo}>
                {d.titulo}
              </div>
              {d.solicitacaoTitulo && (
                <div
                  className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1 truncate"
                  title={d.solicitacaoTitulo}
                >
                  {d.solicitacaoTitulo}
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Solução</span>
            <span className="text-primary font-medium">Abrir →</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-primary !w-2.5 !h-2.5" />
    </Card>
  );
}

const nodeTypes = {
  solucao: SolucaoNode,
  solucaoCompact: SolucaoNodeCompact,
  solucaoDetailed: SolucaoNodeDetailed,
};

type NodeVariant = "solucao" | "solucaoCompact" | "solucaoDetailed";
const VARIANT_LABEL: Record<NodeVariant, string> = {
  solucao: "Padrão",
  solucaoCompact: "Compacta",
  solucaoDetailed: "Detalhada",
};

function DiagramaInner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [variant, setVariant] = useState<NodeVariant>("solucao");
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
      <div className="px-4 md:px-8 py-3 border-b border-border bg-background">
        <h1 className="text-xl md:text-2xl font-brand font-bold">Diagrama de Soluções</h1>
        <p className="text-xs text-muted-foreground">
          Arraste para reposicionar. Conecte os pontos das laterais para criar relações. Selecione uma aresta e
          pressione Delete para removê-la. Duplo clique em um nó abre a Solução.
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
