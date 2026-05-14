import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ExternalLink, Lightbulb, Pencil, Save, Sparkles, Trash2, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  deleteSolicitacao,
  getSolicitacao,
  listSolucoesBySolicitacao,
  updateOwnSolicitacao,
  updateSolicitacao,
} from "@/lib/supabaseData";
import { FREQUENCIA_LABEL, PIPELINE_ORDER, SETORES, STATUS_LABEL, statusToCategory, type Frequencia, type PipelineStatus, type Setor } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { TasksChecklist } from "@/components/TasksChecklist";
import { ScorePill } from "@/components/ScorePill";
import { AssistenteDescricao } from "@/components/AssistenteDescricao";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { calcScore } from "@/lib/score";
import { computeScoreFinal, computeScoreSolicitante } from "@/lib/scoreV2";
import { useToast } from "@/hooks/use-toast";

export default function DemandaDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const isDev = user?.role === "developer";

  const solicitacao = useSupabaseData(() => getSolicitacao(id), null, [id]);
  const solucoes = useSupabaseData(() => listSolucoesBySolicitacao(id), [], [id]);
  const isOwner = user?.id === solicitacao?.solicitanteId;

  const [complex, setComplex] = useState(solicitacao?.complexidade ?? 3);
  const [retorno, setRetorno] = useState(solicitacao?.retorno ?? 3);
  const [status, setStatus] = useState<PipelineStatus>(solicitacao?.status ?? "novo");
  const [notas, setNotas] = useState(solicitacao?.notasTecnicas ?? "");
  const [descricaoDev, setDescricaoDev] = useState(solicitacao?.descricao ?? "");
  const [temIntegracao, setTemIntegracao] = useState<boolean>(solicitacao?.temIntegracao ?? false);
  const [integracoesText, setIntegracoesText] = useState((solicitacao?.integracoes ?? []).join(", "));
  const [complexidadeDev, setComplexidadeDev] = useState<number>(solicitacao?.complexidadeDev ?? 5);
  const [notasComplexDev, setNotasComplexDev] = useState<string>(solicitacao?.notasTecnicas ?? "");
  const [savingComplexDev, setSavingComplexDev] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitulo, setEditTitulo] = useState(solicitacao?.titulo ?? "");
  const [editDescricao, setEditDescricao] = useState(solicitacao?.descricao ?? "");
  const [editSoftwares, setEditSoftwares] = useState((solicitacao?.integracoes ?? []).join(", "));
  const [editFrequencia, setEditFrequencia] = useState<Frequencia>(solicitacao?.frequencia ?? 3);
  const [editComplexidade, setEditComplexidade] = useState(solicitacao?.complexidade ?? 3);
  const [editRetorno, setEditRetorno] = useState(solicitacao?.retorno ?? 3);
  const [editSetor, setEditSetor] = useState<Setor | "">((solicitacao?.setor as Setor) ?? "");


  useEffect(() => {
    if (!solicitacao) return;
    setComplex(solicitacao.complexidade);
    setRetorno(solicitacao.retorno);
    setStatus(solicitacao.status);
    setNotas(solicitacao.notasTecnicas ?? "");
    setDescricaoDev(solicitacao.descricao);
    setTemIntegracao(solicitacao.temIntegracao ?? false);
    setIntegracoesText((solicitacao.integracoes ?? []).join(", "));
    setComplexidadeDev(solicitacao.complexidadeDev ?? 5);
    setNotasComplexDev(solicitacao.notasTecnicas ?? "");
    setEditTitulo(solicitacao.titulo);
    setEditDescricao(solicitacao.descricao);
    setEditSoftwares((solicitacao.integracoes ?? []).join(", "));
    setEditFrequencia(solicitacao.frequencia);
    setEditComplexidade(solicitacao.complexidade);
    setEditRetorno(solicitacao.retorno);
    setEditSetor(((solicitacao.setor as Setor) ?? "") as Setor | "");
  }, [solicitacao]);

  useEffect(() => {
    if (searchParams.get("editar") === "1" && isOwner) {
      setIsEditing(true);
    }
  }, [searchParams, isOwner]);

  const previewScore = useMemo(
    () => (solicitacao ? calcScore({ frequencia: solicitacao.frequencia, complexidade: complex, retorno }) : 0),
    [solicitacao, complex, retorno],
  );

  if (!solicitacao) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Demanda não encontrada.</p>
        <Button asChild variant="outline"><Link to="/">Voltar</Link></Button>
      </div>
    );
  }

  async function handleSave() {
    const integracoes = temIntegracao
      ? integracoesText.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    await updateSolicitacao(id, {
      complexidade: complex,
      retorno,
      status,
      notasTecnicas: notas,
      temIntegracao,
      integracoes,
    });
    toast({ title: "Demanda atualizada" });
  }

  async function handleSaveOwn() {
    if (!editTitulo.trim() || editTitulo.trim().length < 3) {
      toast({ title: "Verifique os campos", description: "Informe um título válido.", variant: "destructive" });
      return;
    }
    if (!editDescricao.trim() || editDescricao.trim().length < 10) {
      toast({ title: "Verifique os campos", description: "Descreva a demanda com mais detalhes.", variant: "destructive" });
      return;
    }
    if (!editSetor || !(SETORES as readonly string[]).includes(editSetor)) {
      toast({ title: "Verifique os campos", description: "Selecione o setor da empresa.", variant: "destructive" });
      return;
    }

    const softwares = editSoftwares.split(",").map((s) => s.trim()).filter(Boolean);
    await updateOwnSolicitacao(id, {
      titulo: editTitulo.trim(),
      descricao: editDescricao.trim(),
      softwares,
      frequencia: editFrequencia,
      complexidade: editComplexidade,
      retorno: editRetorno,
      setor: editSetor,
    });
    setIsEditing(false);
    setSearchParams({});
    toast({ title: "Demanda atualizada" });
  }

  async function handleDelete() {
    await deleteSolicitacao(id);
    toast({ title: "Solicitação excluída" });
    navigate("/solicitacoes", { replace: true });
  }

  async function handleSaveComplexidadeDev() {
    if (
      typeof complexidadeDev !== "number" ||
      Number.isNaN(complexidadeDev) ||
      complexidadeDev < 0 ||
      complexidadeDev > 10
    ) {
      toast({
        title: "Valor inválido",
        description: "A complexidade técnica deve estar entre 0 e 10.",
        variant: "destructive",
      });
      return;
    }
    setSavingComplexDev(true);
    try {
      await updateSolicitacao(id, {
        complexidadeDev,
        notasTecnicas: notasComplexDev,
      });
      toast({
        title: "Avaliação técnica salva",
        description: "Score final recalculado.",
      });
      // useSupabaseData já refaz a query via realtime postgres_changes em `solicitacoes`.
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingComplexDev(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3">
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">{solicitacao.titulo}</h1>
            <StatusBadge status={solicitacao.status} />
            {isDev && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">Solicitante:</span>
                <ScorePill score={Math.round(solicitacao.scoreSolicitante)} />
                <span className="text-xs text-muted-foreground ml-1">Final:</span>
                {solicitacao.scoreFinal !== null ? (
                  <ScorePill score={Math.round(solicitacao.scoreFinal)} />
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border border-dashed border-border bg-muted/40 text-muted-foreground"
                    title="O dev ainda não avaliou a complexidade técnica"
                  >
                    ⚙ Aguardando avaliação técnica
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => {
                setIsEditing(true);
                setSearchParams({ editar: "1" });
              }}>
                <Pencil className="size-4" /> Editar demanda
              </Button>
            )}
            {isDev && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="size-4" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir solicitação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A solicitação e as soluções registradas nela serão removidas permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir solicitação</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Solicitado por <span className="text-foreground">{solicitacao.solicitanteNome}</span> ·{" "}
          {new Date(solicitacao.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <Card className="surface-1">
        <CardContent className="p-4 overflow-x-auto">
          <StatusTimeline current={solicitacao.status} />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 items-stretch">
        <Card className="surface-1 h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">{isEditing ? "Editar demanda" : "Descrição"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {isEditing ? (
              <>
                <div>
                  <Label htmlFor="edit-titulo">Título</Label>
                  <Input id="edit-titulo" value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label htmlFor="edit-descricao">Descrição da atividade atual</Label>
                    {!isDev && <AssistenteDescricao onAccept={setEditDescricao} />}
                  </div>
                  <Textarea id="edit-descricao" rows={6} value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} />
                </div>
                <div>
                  <Label>Setor da empresa</Label>
                  <Select value={editSetor} onValueChange={(v) => setEditSetor(v as Setor)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                    <SelectContent>
                      {SETORES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-softwares">Softwares envolvidos</Label>
                  <Input id="edit-softwares" value={editSoftwares} onChange={(e) => setEditSoftwares(e.target.value)} />
                </div>
                <div>
                  <Label>Frequência</Label>
                  <Select value={String(editFrequencia)} onValueChange={(v) => setEditFrequencia(Number(v) as Frequencia)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {([4, 3, 2, 1] as Frequencia[]).map((f) => (
                        <SelectItem key={f} value={String(f)}>{FREQUENCIA_LABEL[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <SliderField label="Complexidade" value={editComplexidade} onChange={setEditComplexidade} />
                <SliderField label="Retorno financeiro" value={editRetorno} onChange={setEditRetorno} />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleSaveOwn}><Save className="size-4" /> Salvar alterações</Button>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setSearchParams({});
                  }}><X className="size-4" /> Cancelar</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">{solicitacao.descricao}</p>
                <dl className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-border">
                  <div><dt className="text-xs text-muted-foreground">Status</dt><dd>{STATUS_LABEL[statusToCategory(solicitacao.status)]}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Frequência</dt><dd>{FREQUENCIA_LABEL[solicitacao.frequencia]}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Complexidade</dt><dd>{solicitacao.complexidade}/5</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Retorno financeiro</dt><dd>{solicitacao.retorno}/5</dd></div>
                  {solicitacao.setor && <div><dt className="text-xs text-muted-foreground">Setor</dt><dd>{solicitacao.setor}</dd></div>}
                </dl>
              </>
            )}
            {!isEditing && solicitacao.temIntegracao && (
              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1">Softwares Utilizados</div>
                {solicitacao.integracoes && solicitacao.integracoes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {solicitacao.integracoes.map((nome) => (
                      <span key={nome} className="text-xs px-2 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/30">
                        {nome}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sim, mas sistemas não especificados.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {(isDev || isOwner) && (
          <Card className="surface-1 h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="size-4 text-accent" /> Soluções</CardTitle>
              <CardDescription>{isDev ? "Soluções vinculadas a esta demanda. Cadastre novas pela aba Soluções." : "Soluções vinculadas a esta demanda."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 overflow-auto">
              {solucoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma solução registrada ainda.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {solucoes.map((s) => (
                    <li key={s.id} className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          {isDev ? (
                            <Link
                              to={`/solucoes/${s.id}`}
                              className="font-medium text-sm hover:text-accent hover:underline underline-offset-4"
                            >
                              {s.titulo}
                            </Link>
                          ) : (
                            <div className="font-medium text-sm">{s.titulo}</div>
                          )}
                          {s.descricao && <p className="text-xs text-muted-foreground mt-0.5">{s.descricao}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {s.link && (
                            <Button asChild variant="outline" size="icon" className="h-8 w-8" title="Abrir link">
                              <a href={/^https?:\/\//i.test(s.link) ? s.link : `https://${s.link}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir link da solução">
                                <ExternalLink className="size-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {isDev && (
        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="text-base">Ajustes do desenvolvedor</CardTitle>
            <CardDescription>Score recalculado: <ScorePill score={previewScore} /></CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Label>Status do pipeline</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PipelineStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SliderField label="Complexidade" value={complex} onChange={setComplex} />
            <SliderField label="Retorno financeiro" value={retorno} onChange={setRetorno} />
            <div className="md:col-span-2">
              <Button onClick={handleSave} className="w-full">
                <Save className="size-4" /> Salvar alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isDev && (
        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="text-base">Avaliação Técnica do Dev</CardTitle>
            <CardDescription>
              Define o fator de penalização aplicado ao score do solicitante para gerar o score final.
              {solicitacao.complexidadeDev === null && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border border-dashed border-border bg-muted/40 text-muted-foreground">
                  ⚙ Aguardando avaliação técnica
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Complexidade Técnica (0-10)</Label>
                <span className="text-sm tabular-nums text-accent font-medium">{complexidadeDev}/10</span>
              </div>
              <Slider
                min={0}
                max={10}
                step={1}
                value={[complexidadeDev]}
                onValueChange={(v) => setComplexidadeDev(v[0])}
              />
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { v: 0, label: "Trivial", desc: "Integração plug-and-play existente, <2h" },
                  { v: 2, label: "Simples", desc: "1-2 APIs, fluxo linear, <1 dia" },
                  { v: 4, label: "Moderada", desc: "Múltiplas APIs, lógica condicional, 2-5 dias" },
                  { v: 6, label: "Complexa", desc: "Integrações custom, regras de negócio, 1-2 semanas" },
                  { v: 8, label: "Muito Complexa", desc: "Arquitetura custom, múltiplos serviços, 2-4 semanas" },
                  { v: 10, label: "Extremamente Complexa", desc: "Novo sistema, IA/ML, >1 mês" },
                ].map((a) => {
                  const active = complexidadeDev === a.v;
                  return (
                    <button
                      key={a.v}
                      type="button"
                      onClick={() => setComplexidadeDev(a.v)}
                      className={`text-left rounded-md border p-2 transition-colors ${
                        active
                          ? "border-accent bg-accent/10"
                          : "border-border bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold tabular-nums text-accent">{a.v}</span>
                        <span className="text-xs font-medium">{a.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.desc}</p>
                    </button>
                  );
                })}
              </div>
              <FormulaImpactCard complexidade={complexidadeDev} />
            </div>
            <div>
              <Label htmlFor="notas-complex-dev">Notas técnicas (opcional)</Label>
              <Textarea
                id="notas-complex-dev"
                rows={3}
                placeholder="Justifique a avaliação, dependências, riscos…"
                value={notasComplexDev}
                onChange={(e) => setNotasComplexDev(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Preview do score final:{" "}
                <span className="text-foreground font-medium tabular-nums">
                  {Math.round(
                    computeScoreFinal(solicitacao.scoreSolicitante, complexidadeDev) ?? 0,
                  )}
                </span>
              </div>
              <Button onClick={handleSaveComplexidadeDev} disabled={savingComplexDev}>
                <Save className="size-4" /> Salvar Avaliação Técnica
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{label}</Label>
        <span className="text-sm tabular-nums text-accent font-medium">{value}/5</span>
      </div>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

function FormulaImpactCard({ complexidade }: { complexidade: number }) {
  const [open, setOpen] = useState(false);
  const mult = Math.max(0, (10 - complexidade) / 10);
  const pct = Math.round(mult * 100);
  const rows = [
    { c: 0, m: "1,0", p: "100%" },
    { c: 2, m: "0,8", p: "80%" },
    { c: 5, m: "0,5", p: "50%" },
    { c: 8, m: "0,2", p: "20%" },
    { c: 10, m: "0,0", p: "0%" },
  ];
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3 rounded-md border border-border bg-muted/30">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <Lightbulb className="size-4 text-accent shrink-0" />
          <span className="text-sm font-medium truncate">Como sua avaliação afeta o score final</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs tabular-nums text-muted-foreground">
            atual: ×{mult.toFixed(1).replace(".", ",")} ({pct}%)
          </span>
          <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-3">
        <div className="rounded-md bg-background border border-border p-2 text-xs font-mono text-foreground">
          Score Final = Score Solicitante × (10 − Complexidade) ÷ 10
        </div>
        <ul className="space-y-1">
          {rows.map((r) => {
            const active = complexidade === r.c;
            return (
              <li
                key={r.c}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-xs tabular-nums ${
                  active ? "bg-accent/10 text-foreground" : "text-muted-foreground"
                }`}
              >
                <span>Complexidade {r.c}</span>
                <span>Multiplicador {r.m}</span>
                <span>Score Solicitante × {r.p}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground leading-snug">
          Quanto mais complexa a solução técnica, menor a prioridade final, priorizando assim
          soluções que combinam alto impacto + baixa complexidade.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
