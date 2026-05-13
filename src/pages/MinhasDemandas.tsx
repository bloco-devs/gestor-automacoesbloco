import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Plus, Inbox, LifeBuoy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { listMinhasSolicitacoes, listSolucoesBySolicitacao, createSolucaoTask } from "@/lib/supabaseData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { FREQUENCIA_LABEL } from "@/lib/types";
import type { Solucao } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

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
        <div className="grid min-w-0 gap-4">
          {solicitacoes.map((s) => (
            <Card
              key={s.id}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/demanda/${s.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/demanda/${s.id}`);
                }
              }}
              className="surface-1 min-w-0 overflow-hidden cursor-pointer transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-4 sm:p-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="min-w-0 max-w-full truncate text-base">{s.titulo}</CardTitle>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.descricao}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                    <span>Frequência: <span className="text-foreground">{FREQUENCIA_LABEL[s.frequencia]}</span></span>
                    <span>Complexidade: <span className="text-foreground">{s.complexidade}/5</span></span>
                    <span>Retorno: <span className="text-foreground">{s.retorno}/5</span></span>
                    <span>Dificuldade: <span className="text-foreground">{s.dificuldade}/5</span></span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                <StatusTimeline current={s.status} compact />
                <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button asChild size="sm">
                    <Link to={`/demanda/${s.id}?editar=1`}>
                      <Pencil className="size-4" /> Editar demanda
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
