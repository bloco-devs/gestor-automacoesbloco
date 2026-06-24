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
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeMouseHandler,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import newBlackBoldUrl from "@/assets/fonts/NewBlackTypeface-Bold.ttf?url";
import newBlackRegularUrl from "@/assets/fonts/NewBlackTypeface-Regular.ttf?url";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
import { useTheme } from "@/hooks/useTheme";
import { listSolucoes, listSolicitacoes } from "@/lib/supabaseData";
import {
  createConexao,
  createColuna,
  createNota,
  deleteColuna,
  deleteConexao,
  deleteNota,
  listColunas,
  listConexoes,
  listNotas,
  listPosicoes,
  TIPOS_DADO,
  updateColuna,
  updateConexaoCurvatura,
  updateConexaoLabel,
  updateNota,
  upsertPosicao,
  type DiagramaConexaoColuna,
} from "@/lib/diagrama";

import type { Solucao, Solicitacao } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Skeleton as SkeletonDg } from "@/components/ui/skeleton";
import { EmptyState as EmptyStateDg } from "@/components/EmptyState";
import { Trash2, Plus, Workflow, Workflow as WorkflowIcon, StickyNote, FileDown } from "lucide-react";
import { FlowEdge } from "@/components/diagrama/FlowEdge";
import { StickyNoteNode, type StickyNoteData } from "@/components/diagrama/StickyNoteNode";
import { toast } from "@/hooks/use-toast";


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

const nodeTypes = { solucao: SolucaoNode, nota: StickyNoteNode };
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
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const reactFlow = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [labelDialog, setLabelDialog] = useState<{ edgeId: string; value: string } | null>(null);
  const [detailsDialog, setDetailsDialog] = useState<{ edgeId: string; label: string } | null>(null);
  const [deleteEdgeDialog, setDeleteEdgeDialog] = useState<{ edgeId: string; label: string } | null>(null);
  const [colunas, setColunas] = useState<DiagramaConexaoColuna[]>([]);
  const [colunasLoading, setColunasLoading] = useState(false);
  const [novaColuna, setNovaColuna] = useState<{ nome: string; tipo: string }>({ nome: "", tipo: "VARCHAR" });
  const positionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const curvatureTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const notaTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const flowWrapperRef = useRef<HTMLDivElement>(null);

  const scheduleNotaUpdate = useCallback(
    (id: string, patch: Parameters<typeof updateNota>[1]) => {
      const timers = notaTimers.current;
      const existing = timers.get(id);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(() => {
        updateNota(id, patch).catch((err) => console.error("updateNota", err));
        timers.delete(id);
      }, 400);
      timers.set(id, handle);
    },
    [],
  );

  const handleNotaTextChange = useCallback(
    (id: string, texto: string) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, texto } } : n)));
      scheduleNotaUpdate(id, { texto });
    },
    [scheduleNotaUpdate],
  );

  const handleNotaHeaderChange = useCallback(
    (id: string, cabecalho: string) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, cabecalho } } : n)));
      scheduleNotaUpdate(id, { cabecalho });
    },
    [scheduleNotaUpdate],
  );

  const handleNotaColorChange = useCallback(
    (id: string, cor: string) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, cor } } : n)));
      updateNota(id, { cor }).catch((err) => console.error("updateNota", err));
    },
    [],
  );
  const handleNotaDelete = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    deleteNota(id).catch((err) => console.error("deleteNota", err));
  }, []);

  const buildNotaNode = useCallback(
    (n: { id: string; x: number; y: number; largura: number; altura: number; texto: string; cabecalho?: string; cor: string }): Node => ({
      id: n.id,
      type: "nota",
      position: { x: n.x, y: n.y },
      width: n.largura,
      height: n.altura,
      style: { width: n.largura, height: n.altura },
      data: {
        texto: n.texto,
        cabecalho: n.cabecalho ?? "",
        cor: n.cor,
        onTextChange: handleNotaTextChange,
        onHeaderChange: handleNotaHeaderChange,
        onColorChange: handleNotaColorChange,
        onDelete: handleNotaDelete,
      } satisfies StickyNoteData,
    }),
    [handleNotaTextChange, handleNotaHeaderChange, handleNotaColorChange, handleNotaDelete],
  );


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
          deletable: false,
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
        const [solucoes, solicitacoes, posicoes, conexoes, notas] = await Promise.all([
          listSolucoes(),
          listSolicitacoes(),
          listPosicoes(),
          listConexoes(),
          listNotas(),
        ]);
        if (cancelled) return;
        const posMap = new Map(posicoes.map((p) => [p.solucaoId, { x: p.x, y: p.y }]));
        const solucaoNodes = buildNodes(solucoes, solicitacoes, posMap);
        const notaNodes = notas.map(buildNotaNode);
        setNodes([...solucaoNodes, ...notaNodes]);
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
  }, [buildNodes, openDetails, handleCurvatureDrag, buildNotaNode]);

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
      setNodes((current) => {
        const next = applyNodeChanges(changes, current);
        for (const ch of changes) {
          if (ch.type === "position" && ch.dragging === false && ch.position) {
            const node = current.find((n) => n.id === ch.id);
            if (node?.type === "nota") {
              scheduleNotaUpdate(node.id, { x: ch.position.x, y: ch.position.y });
            } else {
              schedulePersistPosition(ch.id, ch.position.x, ch.position.y);
            }
          } else if (
            ch.type === "dimensions" &&
            ch.dimensions &&
            ch.resizing === false
          ) {
            const node = current.find((n) => n.id === ch.id);
            if (node?.type === "nota") {
              scheduleNotaUpdate(node.id, {
                largura: ch.dimensions.width,
                altura: ch.dimensions.height,
              });
            }
          } else if (ch.type === "remove") {
            const node = current.find((n) => n.id === ch.id);
            if (node?.type === "nota") {
              deleteNota(node.id).catch((err) => console.error("deleteNota", err));
            }
          }
        }
        return next;
      });
    },
    [schedulePersistPosition, scheduleNotaUpdate],
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => {
      const filtered: EdgeChange[] = [];
      for (const ch of changes) {
        if (ch.type === "remove") {
          const edge = eds.find((e) => e.id === ch.id);
          const lbl = typeof edge?.label === "string" ? edge.label.trim() : "";
          if (lbl) {
            // Defer: abre confirmação no app; não aplica remoção agora
            setDeleteEdgeDialog({ edgeId: ch.id, label: lbl });
            continue;
          }
          filtered.push(ch);
          deleteConexao(ch.id).catch((err) => console.error("deleteConexao", err));
        } else {
          filtered.push(ch);
        }
      }
      return applyEdgeChanges(filtered, eds);
    });
  }, []);

  const handleConfirmDeleteEdge = useCallback(() => {
    if (!deleteEdgeDialog) return;
    const { edgeId } = deleteEdgeDialog;
    setEdges((eds) => applyEdgeChanges([{ type: "remove", id: edgeId }], eds));
    deleteConexao(edgeId).catch((err) => console.error("deleteConexao", err));
    setDeleteEdgeDialog(null);
  }, [deleteEdgeDialog]);

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target || params.source === params.target) return;
      const tempId = `tmp-${params.source}-${params.target}-${Date.now()}`;
      const newEdge = buildEdge(tempId, params.source!, params.target!, undefined, openDetails, null, null, handleCurvatureDrag);
      setEdges((eds) => [...eds, newEdge]);
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
    [user?.id, openDetails, handleCurvatureDrag],

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

  const handleAddNota = useCallback(async () => {
    try {
      // Coloca no centro do viewport visível
      const wrap = flowWrapperRef.current;
      const rect = wrap?.getBoundingClientRect();
      const center = rect
        ? reactFlow.screenToFlowPosition({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          })
        : { x: 0, y: 0 };
      const created = await createNota(center.x - 110, center.y - 80, user?.id);
      setNodes((nds) => [...nds, buildNotaNode(created)]);
    } catch (err) {
      console.error("createNota", err);
      toast({
        title: "Não foi possível criar a nota",
        description: "Verifique se você possui permissão de administrador.",
        variant: "destructive",
      });
    }
  }, [reactFlow, user?.id, buildNotaNode]);

  const handleExportPdf = useCallback(async () => {
    const wrap = flowWrapperRef.current;
    if (!wrap || nodes.length === 0) return;
    setExporting(true);
    try {
      const viewportEl = wrap.querySelector(".react-flow__viewport") as HTMLElement | null;
      const containerEl = (wrap.querySelector(".react-flow") as HTMLElement | null) ?? wrap;
      if (!viewportEl) throw new Error("viewport not found");

      // Salva estilos atuais e enquadra exatamente o bounding box de todos os nós
      const prevTransform = viewportEl.style.transform;
      const prevWrapWidth = wrap.style.width;
      const prevWrapHeight = wrap.style.height;
      const prevContainerWidth = containerEl.style.width;
      const prevContainerHeight = containerEl.style.height;

      const bounds = getNodesBounds(nodes);
      const padding = 40;
      const captureW = Math.ceil(bounds.width + padding * 2);
      const captureH = Math.ceil(bounds.height + padding * 2);

      // Redimensiona o container para o tamanho exato do conteúdo
      wrap.style.width = `${captureW}px`;
      wrap.style.height = `${captureH}px`;
      containerEl.style.width = `${captureW}px`;
      containerEl.style.height = `${captureH}px`;

      // Posiciona viewport em escala 1:1 para capturar todos os nós sem corte
      viewportEl.style.transform = `translate(${-bounds.x + padding}px, ${-bounds.y + padding}px) scale(1)`;

      // Aguarda o reflow
      await new Promise((r) => setTimeout(r, 150));

      const dataUrl = await toPng(containerEl, {
        pixelRatio: 2,
        width: captureW,
        height: captureH,
        backgroundColor: resolvedTheme === "dark" ? "#0C0C0C" : "#E5E3DF",
        filter: (node) => {
          if (!(node instanceof Element)) return true;
          return !node.classList?.contains("react-flow__minimap") &&
                 !node.classList?.contains("react-flow__controls") &&
                 !node.classList?.contains("react-flow__panel");
        },
      });

      // Restaura
      viewportEl.style.transform = prevTransform;
      wrap.style.width = prevWrapWidth;
      wrap.style.height = prevWrapHeight;
      containerEl.style.width = prevContainerWidth;
      containerEl.style.height = prevContainerHeight;

      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = () => res(null); });

      // Paleta da marca Bloco Construções — adapta a light/dark mode
      const isDark = resolvedTheme === "dark";
      const BRAND_YELLOW = "#FFDA5B";
      const BRAND_BLACK = "#0C0C0C";
      const BRAND_SAND = "#E5E3DF";
      const BRAND_BROWN = "#8B796D";
      // Tokens semânticos do PDF
      const PAGE_BG = isDark ? "#0C0C0C" : BRAND_SAND;       // fundo da página
      const BAR_BG = isDark ? BRAND_SAND : BRAND_BLACK;       // header/footer
      const BAR_TEXT = isDark ? BRAND_BLACK : BRAND_SAND;     // texto secundário em barra
      const BAR_TITLE = isDark ? BRAND_BLACK : BRAND_SAND;    // "CONSTRUÇÕES"
      const BAR_ACCENT = BRAND_YELLOW;                        // "BLOCO" + acentos (sempre amarelo da marca)
      const STRIPE = BRAND_YELLOW;                            // faixa amarela mantida
      const FRAME = isDark ? "#3A3A3A" : BRAND_BROWN;         // moldura do diagrama

      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      // Embute a fonte da marca (NewBlackTypeface). Falha silenciosamente -> helvetica.
      let brandFont = "helvetica";
      try {
        const toBase64 = async (url: string) => {
          const buf = await (await fetch(url)).arrayBuffer();
          let binary = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          return btoa(binary);
        };
        const [boldB64, regB64] = await Promise.all([
          toBase64(newBlackBoldUrl),
          toBase64(newBlackRegularUrl),
        ]);
        pdf.addFileToVFS("NewBlackTypeface-Bold.ttf", boldB64);
        pdf.addFont("NewBlackTypeface-Bold.ttf", "NewBlack", "bold");
        pdf.addFileToVFS("NewBlackTypeface-Regular.ttf", regB64);
        pdf.addFont("NewBlackTypeface-Regular.ttf", "NewBlack", "normal");
        brandFont = "NewBlack";
      } catch (e) {
        console.warn("Falha ao carregar fonte da marca, usando fallback.", e);
      }

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Fundo geral
      pdf.setFillColor(PAGE_BG);
      pdf.rect(0, 0, pageW, pageH, "F");

      // ===== HEADER =====
      const headerH = 70;
      pdf.setFillColor(BAR_BG);
      pdf.rect(0, 0, pageW, headerH, "F");
      // faixa amarela
      pdf.setFillColor(STRIPE);
      pdf.rect(0, headerH, pageW, 4, "F");

      // Logo-block tipográfico
      pdf.setFont(brandFont, "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(BAR_ACCENT);
      pdf.text("BLOCO", 32, 38);
      pdf.setTextColor(BAR_TITLE);
      pdf.text("CONSTRUÇÕES", 32 + pdf.getTextWidth("BLOCO") + 8, 38);

      pdf.setFont(brandFont, "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(BAR_TEXT);
      pdf.text("Diagrama de Soluções", 32, 56);

      // Data alinhada à direita
      const dataStr = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric",
      });
      pdf.setFont(brandFont, "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(BAR_TEXT);
      const dataW = pdf.getTextWidth(dataStr);
      pdf.text(dataStr, pageW - 32 - dataW, 38);
      pdf.setFont(brandFont, "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(BAR_ACCENT);
      const lbl = "EXPORTADO EM";
      const lblW = pdf.getTextWidth(lbl);
      pdf.text(lbl, pageW - 32 - lblW, 24);

      // ===== FOOTER =====
      const footerH = 28;
      pdf.setFillColor(BAR_BG);
      pdf.rect(0, pageH - footerH, pageW, footerH, "F");
      pdf.setFillColor(STRIPE);
      pdf.rect(0, pageH - footerH - 2, pageW, 2, "F");
      pdf.setFont(brandFont, "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(BAR_TEXT);
      pdf.text("Bloco Construções · Gestor de Automações", 32, pageH - 10);
      const pg = "Página 1 de 1";
      const pgW = pdf.getTextWidth(pg);
      pdf.text(pg, pageW - 32 - pgW, pageH - 10);

      // ===== ÁREA DO DIAGRAMA =====
      const margin = 24;
      const top = headerH + 4 + margin;
      const bottom = pageH - footerH - 2 - margin;
      const left = margin;
      const right = pageW - margin;
      const areaW = right - left;
      const areaH = bottom - top;

      // Moldura sutil
      pdf.setDrawColor(FRAME);
      pdf.setLineWidth(0.6);
      pdf.roundedRect(left - 6, top - 6, areaW + 12, areaH + 12, 6, 6, "S");

      const ratio = Math.min(areaW / img.width, areaH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = left + (areaW - w) / 2;
      const y = top + (areaH - h) / 2;
      pdf.addImage(dataUrl, "PNG", x, y, w, h);

      pdf.save(`bloco-diagrama-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("exportPdf", err);
      toast({
        title: "Falha ao exportar PDF",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [nodes, resolvedTheme]);


  return (
    <div className="-m-4 md:-m-8 h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)]">
      <div className="px-4 md:px-8 py-3 border-b border-border bg-background flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <h1 className="text-xl md:text-2xl font-brand font-bold">Diagrama de Soluções</h1>
          <p className="text-xs text-muted-foreground">
            Conecte as laterais das Soluções para indicar fluxo de dados (origem → destino). Duplo clique em uma seta
            para nomear o dado trafegado. Clique no chip para detalhar as colunas. Arraste a linha para ajustar a curva
            (duplo clique reseta). Use as notas adesivas para anotações livres.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-2">
          <Button variant="outline" size="sm" onClick={handleAddNota}>
            <StickyNote className="size-4 mr-1" /> Nota
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting || nodes.length === 0}>
            <FileDown className="size-4 mr-1" /> {exporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>
      </div>

      <div ref={flowWrapperRef} className="w-full h-[calc(100%-4rem)]">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonDg key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <EmptyStateDg
              icon={WorkflowIcon}
              title="Nenhuma solução cadastrada ainda"
              description="Cadastre uma solução para que ela apareça no diagrama de integrações."
            />
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
            minZoom={0.1}
            maxZoom={4}
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
              <div className="space-y-2 py-2">
                <SkeletonDg className="h-8 w-full" />
                <SkeletonDg className="h-8 w-full" />
              </div>
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

      <AlertDialog
        open={deleteEdgeDialog !== null}
        onOpenChange={(open) => !open && setDeleteEdgeDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir integração?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta integração possui o chip{" "}
              <span className="font-semibold text-foreground">
                "{deleteEdgeDialog?.label}"
              </span>
              . Excluí-la também removerá as colunas associadas. Deseja realmente prosseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteEdge}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
