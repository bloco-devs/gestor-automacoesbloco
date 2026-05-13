import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { getSolucao, listSolicitacoes } from "@/lib/supabaseData";
import { SolucaoTasksChecklist } from "@/components/SolucaoTasksChecklist";
import type { Solucao } from "@/lib/types";

export default function SolucaoDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [solucao, setSolucao] = useState<Solucao | null>(null);
  const [loading, setLoading] = useState(true);
  const solicitacoes = useSupabaseData(() => listSolicitacoes(), []);

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

  const demanda = solicitacoes.find((s) => s.id === solucao.solicitacaoId);

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
          {demanda && (
            <CardDescription>
              Demanda vinculada:{" "}
              <Link to={`/demanda/${demanda.id}`} className="underline hover:text-accent">
                {demanda.titulo}
              </Link>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
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
          <p className="text-xs text-muted-foreground">
            Criada em {new Date(solucao.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </CardContent>
      </Card>

      <SolucaoTasksChecklist solucaoId={solucao.id} />
    </div>
  );
}
