import { Link } from "react-router-dom";
import { Pencil, Plus, Inbox } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { listMinhasSolicitacoes } from "@/lib/supabaseData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { FREQUENCIA_LABEL } from "@/lib/types";

export default function MinhasDemandas() {
  const { user } = useAuth();
  const solicitacoes = useSupabaseData(() => (user ? listMinhasSolicitacoes(user.id) : Promise.resolve([])), [], [user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
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
        <div className="grid gap-4">
          {solicitacoes.map((s) => (
            <Card key={s.id} className="surface-1">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base truncate">{s.titulo}</CardTitle>
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
              <CardContent className="space-y-4">
                <StatusTimeline current={s.status} compact />
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/demanda/${s.id}`}>Ver detalhes</Link>
                  </Button>
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
