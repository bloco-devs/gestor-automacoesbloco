import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Sparkles, UserCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { getSolucao, listAssignableUsers, listSolicitacoes, updateSolucao } from "@/lib/supabaseData";
import { SolucaoTasksChecklist } from "@/components/SolucaoTasksChecklist";
import { useToast } from "@/hooks/use-toast";
import type { Solucao } from "@/lib/types";

const UNASSIGNED = "__none__";

const ROLE_LABEL: Record<string, string> = {
  developer: "Desenvolvedor",
  administrador: "Administrador",
  builder: "Builder",
};

export default function SolucaoDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [solucao, setSolucao] = useState<Solucao | null>(null);
  const [loading, setLoading] = useState(true);
  const solicitacoes = useSupabaseData(() => listSolicitacoes(), []);
  const assignables = useSupabaseData(() => listAssignableUsers(), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSolucao(id)
      .then((s) => {
        if (active) setSolucao(s);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function handleResponsavelChange(value: string) {
    if (!solucao) return;
    const responsavelId = value === UNASSIGNED ? null : value;
    const previous = solucao.responsavelId ?? null;
    setSolucao({ ...solucao, responsavelId });
    try {
      await updateSolucao(solucao.id, { responsavelId });
    } catch (err) {
      setSolucao({ ...solucao, responsavelId: previous });
      toast({ title: "Erro ao definir responsável", description: (err as Error).message, variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!solucao) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/solucoes")}>
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <p className="text-sm text-muted-foreground">Solução não encontrada.</p>
      </div>
    );
  }

  const solicitação = solicitacoes.find((s) => s.id === solucao.solicitacaoId);
  const responsavel = assignables.find((u) => u.id === solucao.responsavelId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/solucoes")}>
          <ArrowLeft className="size-4" /> Voltar
        </Button>
      </div>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-accent" /> {solucao.titulo}
          </CardTitle>
          {solicitação && (
            <CardDescription>
              <Link to={`/solicitacao/${solicitação.id}`} className="text-accent font-medium hover:underline underline-offset-4">
                {solicitação.titulo}
              </Link>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {solucao.descricao ? (
            <p className="text-sm whitespace-pre-wrap">{solucao.descricao}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Sem descrição.</p>
          )}
          {solucao.link && (
            <a
              href={solucao.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              <ExternalLink className="size-4" /> Abrir link
            </a>
          )}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserCircle2 className="size-4 text-muted-foreground" />
              Responsável principal:
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={solucao.responsavelId ?? UNASSIGNED}
                onValueChange={handleResponsavelChange}
              >
                <SelectTrigger className="h-8 w-[240px] text-sm">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Sem responsável</SelectItem>
                  {assignables.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome} · {ROLE_LABEL[u.role] ?? u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {responsavel && (
                <Badge variant="secondary" className="text-xs">
                  {ROLE_LABEL[responsavel.role] ?? responsavel.role}
                </Badge>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Criada em {new Date(solucao.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </CardContent>
      </Card>

      <SolucaoTasksChecklist solucaoId={solucao.id} />
    </div>
  );
}
