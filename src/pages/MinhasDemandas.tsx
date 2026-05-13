import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Inbox } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { listMinhasSolicitacoes, listSolucoesBySolicitacao, createSolucaoTask } from "@/lib/supabaseData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardCompacto } from "@/components/minhas-demandas/CardCompacto";
import { CardDestaqueLateral } from "@/components/minhas-demandas/CardDestaqueLateral";
import { CardPainelModerno } from "@/components/minhas-demandas/CardPainelModerno";
import type { Solucao } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

type Layout = "compacto" | "lateral" | "painel";
const LAYOUT_KEY = "minhas-demandas:layout";

export default function MinhasDemandas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const solicitacoes = useSupabaseData(() => (user ? listMinhasSolicitacoes(user.id) : Promise.resolve([])), [], [user?.id]);

  const [chamadoOpen, setChamadoOpen] = useState(false);
  const [chamadoTitulo, setChamadoTitulo] = useState("");
  const [chamadoSolucoes, setChamadoSolucoes] = useState<Solucao[]>([]);
  const [chamadoSolucaoId, setChamadoSolucaoId] = useState<string>("");
  const [chamadoLoading, setChamadoLoading] = useState(false);
  const [chamadoSubmitting, setChamadoSubmitting] = useState(false);

  const [layout, setLayoutState] = useState<Layout>(() => {
    if (typeof window === "undefined") return "lateral";
    return ((localStorage.getItem(LAYOUT_KEY) as Layout) || "lateral");
  });
  const setLayout = (v: Layout) => {
    setLayoutState(v);
    try { localStorage.setItem(LAYOUT_KEY, v); } catch { /* noop */ }
  };
  useEffect(() => { /* keep in sync if needed */ }, [layout]);

  async function handleAbrirChamado(solicitacaoId: string) {
    setChamadoTitulo("");
    setChamadoSolucaoId("");
    setChamadoSolucoes([]);
    setChamadoOpen(true);
    setChamadoLoading(true);
    try {
      const solucoes = await listSolucoesBySolicitacao(solicitacaoId);
      setChamadoSolucoes(solucoes);
      if (solucoes.length === 1) setChamadoSolucaoId(solucoes[0].id);
    } catch {
      toast({ title: "Erro ao carregar soluções", variant: "destructive" });
    } finally {
      setChamadoLoading(false);
    }
  }

  async function submitChamado() {
    if (!chamadoSolucaoId) {
      toast({ title: "Selecione uma solução", variant: "destructive" });
      return;
    }
    if (!chamadoTitulo.trim()) {
      toast({ title: "Descreva o chamado", variant: "destructive" });
      return;
    }
    setChamadoSubmitting(true);
    try {
      await createSolucaoTask({ solucaoId: chamadoSolucaoId, titulo: chamadoTitulo.trim(), createdBy: user?.id });
      toast({ title: "Chamado aberto com sucesso" });
      setChamadoOpen(false);
    } catch {
      toast({ title: "Erro ao abrir chamado", variant: "destructive" });
    } finally {
      setChamadoSubmitting(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 overflow-hidden">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Minhas demandas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe o status das suas solicitações em tempo real.</p>
        </div>
        <Button asChild>
          <Link to="/nova-demanda">
            <Plus className="size-4" /> Nova demanda
          </Link>
        </Button>
      </div>

      {solicitacoes.length === 0 ? (
        <Card className="surface-1">
          <CardContent className="py-16 text-center space-y-3">
            <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center">
              <Inbox className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Nenhuma demanda ainda</p>
              <p className="text-sm text-muted-foreground">Crie sua primeira solicitação para o time de automação.</p>
            </div>
            <Button asChild>
              <Link to="/nova-demanda">
                <Plus className="size-4" /> Criar demanda
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs value={layout} onValueChange={(v) => setLayout(v as Layout)}>
            <TabsList>
              <TabsTrigger value="compacto">Compacto</TabsTrigger>
              <TabsTrigger value="lateral">Destaque lateral</TabsTrigger>
              <TabsTrigger value="painel">Painel moderno</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid min-w-0 gap-4">
            {solicitacoes.map((s) => {
              const props = {
                solicitacao: s,
                onOpen: () => navigate(`/demanda/${s.id}`),
                onAbrirChamado: () => handleAbrirChamado(s.id),
                editHref: `/demanda/${s.id}?editar=1`,
              };
              if (layout === "compacto") return <CardCompacto key={s.id} {...props} />;
              if (layout === "lateral") return <CardDestaqueLateral key={s.id} {...props} />;
              return <CardPainelModerno key={s.id} {...props} />;
            })}
          </div>
        </>
      )}

      <Dialog open={chamadoOpen} onOpenChange={setChamadoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir chamado</DialogTitle>
            <DialogDescription>Cadastre uma task na solução vinculada a esta demanda.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {chamadoLoading ? (
              <p className="text-sm text-muted-foreground">Carregando soluções...</p>
            ) : chamadoSolucoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma solução vinculada a esta demanda ainda. Aguarde a equipe cadastrar uma solução.
              </p>
            ) : (
              <>
                {chamadoSolucoes.length > 1 && (
                  <div className="space-y-2">
                    <Label>Solução</Label>
                    <Select value={chamadoSolucaoId} onValueChange={setChamadoSolucaoId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a solução" /></SelectTrigger>
                      <SelectContent>
                        {chamadoSolucoes.map((sol) => (
                          <SelectItem key={sol.id} value={sol.id}>{sol.titulo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="chamado-titulo">Descrição do chamado</Label>
                  <Textarea
                    id="chamado-titulo"
                    value={chamadoTitulo}
                    onChange={(e) => setChamadoTitulo(e.target.value)}
                    placeholder="Descreva resumidamente o chamado..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChamadoOpen(false)}>Cancelar</Button>
            <Button
              onClick={submitChamado}
              disabled={chamadoSubmitting || chamadoLoading || chamadoSolucoes.length === 0}
            >
              {chamadoSubmitting ? "Abrindo..." : "Abrir chamado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
