import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, GitMerge, Layers, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  consolidarDemanda,
  limparDesfecho,
  listSolicitacoes,
  salvarMatchEcossistema,
} from "@/lib/supabaseData";
import { TIPO_DEMANDA_LABEL } from "@/lib/types";
import type { MatchCandidato, Solicitacao } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScorePill } from "@/components/ScorePill";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";

type Similar = { id: string; titulo: string; similaridade: number; motivo: string };

const STATUS_ABERTOS = new Set(["novo", "em_analise", "aprovado"]);

export default function Consolidacao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isDev = user?.role === "developer" || !!user?.isAdministrador;
  const [reloadKey, setReloadKey] = useState(0);
  const all = useSupabaseData(listSolicitacoes, [], [reloadKey]);

  const pendentes = useMemo(
    () => all.filter((s) => STATUS_ABERTOS.has(s.status) && !s.desfecho),
    [all],
  );
  const tituloPorId = useMemo(() => new Map(all.map((s) => [s.id, s.titulo])), [all]);

  if (!isDev) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Consolidação</h1>
        <p className="text-sm text-muted-foreground">Acesso restrito ao gestor de tecnologia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Layers className="size-6" />
          Consolidação
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Para cada demanda aberta, verifique se a funcionalidade já existe em um sistema do
          ecossistema ou se a demanda é complementar de outra. A resposta ao solicitante é tratada
          em outra etapa — aqui apenas a decisão fica registrada.
        </p>
      </header>

      {pendentes.length === 0 ? (
        <EmptyState
          title="Nenhuma demanda pendente"
          description="Todas as demandas abertas já têm desfecho registrado."
        />
      ) : (
        <div className="space-y-4">
          {pendentes.map((s) => (
            <DemandaCard
              key={s.id}
              demanda={s}
              tituloPorId={tituloPorId}
              outrosAbertos={all.filter((o) => o.id !== s.id)}
              onChanged={() => setReloadKey((k) => k + 1)}
              onError={(msg) => toast({ title: "Falha", description: msg, variant: "destructive" })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DemandaCard({
  demanda,
  tituloPorId,
  outrosAbertos,
  onChanged,
  onError,
}: {
  demanda: Solicitacao;
  tituloPorId: Map<string, string>;
  outrosAbertos: Solicitacao[];
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const { user } = useAuth();
  const [analisando, setAnalisando] = useState(false);
  const [erroMatch, setErroMatch] = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<MatchCandidato[] | null>(
    demanda.matchSugestoes ?? null,
  );
  const [fonteMatch, setFonteMatch] = useState<"hub" | "indisponivel" | null>(
    demanda.matchSugestoes ? "hub" : null,
  );

  const [similares, setSimilares] = useState<Similar[] | null>(null);
  const [carregandoSimilares, setCarregandoSimilares] = useState(false);
  const [erroSimilares, setErroSimilares] = useState<string | null>(null);
  const [canonicaId, setCanonicaId] = useState<string>("");

  const [salvando, setSalvando] = useState(false);

  const analisar = useCallback(async () => {
    setAnalisando(true);
    setErroMatch(null);
    try {
      const { data, error } = await supabase.functions.invoke("match-ecossistema", {
        body: {
          titulo: demanda.titulo,
          descricao: demanda.descricao,
          tipo_demanda: demanda.tipoDemanda ?? null,
          sistema_alvo_slug: demanda.sistemaAlvoSlug ?? null,
        },
      });
      if (error) throw error;
      const cs: MatchCandidato[] = Array.isArray(data?.candidatos) ? data.candidatos : [];
      const fonte = data?.fonte === "indisponivel" ? "indisponivel" : "hub";
      setCandidatos(cs);
      setFonteMatch(fonte);
      try {
        await salvarMatchEcossistema(demanda.id, cs);
      } catch (e) {
        console.warn("salvarMatchEcossistema falhou:", e);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao analisar com a IA.";
      setErroMatch(msg);
    } finally {
      setAnalisando(false);
    }
  }, [demanda]);

  const buscarSimilares = useCallback(async () => {
    setCarregandoSimilares(true);
    setErroSimilares(null);
    try {
      const { data, error } = await supabase.functions.invoke("demandas-similares", {
        body: {
          titulo: demanda.titulo,
          descricao: demanda.descricao,
          excluirId: demanda.id,
        },
      });
      if (error) throw error;
      const list: Similar[] = Array.isArray(data?.similares) ? data.similares : [];
      setSimilares(list);
    } catch (e) {
      setErroSimilares(e instanceof Error ? e.message : "Falha ao buscar similares.");
    } finally {
      setCarregandoSimilares(false);
    }
  }, [demanda]);

  const handleAtender = useCallback(
    async (c: MatchCandidato) => {
      setSalvando(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "confirmar-atendimento-existente",
          {
            body: {
              solicitacao_id: demanda.id,
              sistema_slug: c.sistema_slug,
              nome_sistema: c.nome,
              url_app: c.url_app,
              modulo: c.modulo,
              justificativa: c.justificativa,
            },
          },
        );
        if (error) throw error;
        const emailEnviado = Boolean((data as { email_enviado?: boolean } | null)?.email_enviado);
        toast({
          title: "Solicitante notificado",
          description: emailEnviado
            ? "Notificação na tela e e-mail enviados."
            : "Notificação na tela criada. E-mail não foi enviado.",
        });
        onChanged();
      } catch (e) {
        onError(e instanceof Error ? e.message : "Falha ao marcar como atendida.");
      } finally {
        setSalvando(false);
      }
    },
    [demanda.id, onChanged, onError, toast],
  );

  const handleConsolidar = useCallback(async () => {
    if (!canonicaId) return;
    setSalvando(true);
    try {
      await consolidarDemanda(demanda.id, canonicaId);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha ao consolidar.");
    } finally {
      setSalvando(false);
    }
  }, [canonicaId, demanda.id, onChanged, onError]);

  const handleDescartar = useCallback(async () => {
    setSalvando(true);
    try {
      await limparDesfecho(demanda.id, { limparCache: true });
      setCandidatos(null);
      setFonteMatch(null);
      setSimilares(null);
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha ao descartar.");
    } finally {
      setSalvando(false);
    }
  }, [demanda.id, onChanged, onError]);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base">
              <Link to={`/solicitacao/${demanda.id}`} className="hover:underline">
                {demanda.titulo}
              </Link>
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>{demanda.solicitanteNome}</span>
              {demanda.setor ? <span>· {demanda.setor}</span> : null}
              {demanda.tipoDemanda ? (
                <span>· {TIPO_DEMANDA_LABEL[demanda.tipoDemanda]}</span>
              ) : null}
              {demanda.sistemaAlvoSlug ? <span>· alvo: {demanda.sistemaAlvoSlug}</span> : null}
            </div>
          </div>
          <ScorePill score={Math.round(demanda.scoreSolicitante)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm whitespace-pre-line line-clamp-3">{demanda.descricao}</p>

        {/* Bloco 1: Já existe no ecossistema? */}
        <section className="rounded-md border border-border p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="size-4" /> Já existe no ecossistema?
            </h3>
            <Button
              size="sm"
              variant={candidatos ? "outline" : "default"}
              onClick={analisar}
              disabled={analisando}
            >
              {analisando ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : candidatos ? (
                <RefreshCw className="size-3.5" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {candidatos ? "Reanalisar" : "Analisar com IA"}
            </Button>
          </div>
          {erroMatch && <p className="text-xs text-destructive">{erroMatch}</p>}
          {candidatos !== null && !analisando && (
            <>
              {fonteMatch === "indisponivel" ? (
                <p className="text-xs text-muted-foreground">Catálogo do ecossistema indisponível.</p>
              ) : candidatos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nada equivalente encontrado.</p>
              ) : (
                <ul className="space-y-2">
                  {candidatos.map((c) => (
                    <li
                      key={c.sistema_slug + (c.modulo ?? "")}
                      className="rounded border border-border/70 p-2 flex items-start justify-between gap-3 flex-wrap"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                          {c.nome}
                          {c.modulo && (
                            <span className="text-xs text-muted-foreground">· {c.modulo}</span>
                          )}
                          <Badge variant="secondary" className="text-[10px]">
                            {c.confianca}% confiança
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.justificativa}</p>
                        {c.url_app && (
                          <a
                            href={c.url_app}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="size-3" />
                            Abrir sistema
                          </a>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAtender(c)}
                        disabled={salvando}
                      >
                        Marcar como já atendida
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {/* Bloco 2: Demandas internas parecidas */}
        <section className="rounded-md border border-border p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <GitMerge className="size-4" /> Demandas internas parecidas
            </h3>
            <Button
              size="sm"
              variant={similares ? "outline" : "default"}
              onClick={buscarSimilares}
              disabled={carregandoSimilares}
            >
              {carregandoSimilares ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {similares ? "Rebuscar" : "Buscar similares"}
            </Button>
          </div>
          {erroSimilares && <p className="text-xs text-destructive">{erroSimilares}</p>}
          {similares !== null && !carregandoSimilares && (
            <>
              {similares.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma demanda parecida encontrada.</p>
              ) : (
                <ul className="space-y-1.5">
                  {similares.map((sim) => (
                    <li key={sim.id} className="text-xs flex items-start gap-2">
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {sim.similaridade}%
                      </Badge>
                      <div className="min-w-0">
                        <Link to={`/solicitacao/${sim.id}`} className="font-medium hover:underline">
                          {tituloPorId.get(sim.id) ?? sim.titulo}
                        </Link>
                        <p className="text-muted-foreground">{sim.motivo}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Select value={canonicaId} onValueChange={setCanonicaId}>
                  <SelectTrigger className="h-8 w-[280px] text-xs">
                    <SelectValue placeholder="Escolher demanda canônica…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(similares.length > 0 ? similares.map((s) => s.id) : outrosAbertos.slice(0, 30).map((s) => s.id)).map((cid) => (
                      <SelectItem key={cid} value={cid}>
                        {tituloPorId.get(cid) ?? cid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleConsolidar} disabled={!canonicaId || salvando}>
                  Agrupar como complementar de…
                </Button>
              </div>
            </>
          )}
        </section>

        {(candidatos !== null || similares !== null) && (
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" onClick={handleDescartar} disabled={salvando}>
              <X className="size-3.5" /> Descartar sugestões
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
