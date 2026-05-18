import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ClipboardList, ExternalLink, Lightbulb, Pencil, Save, Sparkles, Trash2, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  createSolucao,
  deleteSolicitacao,
  deleteSolucao,
  getSolicitacao,
  listScoreHistory,
  listSolucoesBySolicitacao,
  updateOwnSolicitacao,
  updateSolicitacao,
  updateSolucao,
} from "@/lib/supabaseData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Solucao } from "@/lib/types";
import { FREQUENCIA_LABEL, PIPELINE_ORDER, STATUS_LABEL, statusToCategory, type Frequencia, type PipelineStatus } from "@/lib/types";
import { useSetoresNomes } from "@/hooks/useSetores";
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

import { computeScoreFinal, computeScoreSolicitante } from "@/lib/scoreV2";
import { useToast } from "@/hooks/use-toast";

export default function SolicitacaoDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const isDev = user?.role === "developer";
  const isBuilder = user?.role === "builder";

  const [solucoesReloadKey, setSolucoesReloadKey] = useState(0);
  const solicitacao = useSupabaseData(() => getSolicitacao(id), null, [id]);
  const solucoes = useSupabaseData(() => listSolucoesBySolicitacao(id), [], [id, solucoesReloadKey]);
  const scoreHistory = useSupabaseData(() => listScoreHistory(id), [], [id, solicitacao?.complexidadeDev, solicitacao?.notasTecnicasComplexidade]);
  const isOwner = user?.id === solicitacao?.solicitanteId;
  const canManageSolucoes = isDev || (isBuilder && isOwner);

  const [solucaoDialogOpen, setSolucaoDialogOpen] = useState(false);
  const [editingSolucao, setEditingSolucao] = useState<Solucao | null>(null);
  const [solForm, setSolForm] = useState({ titulo: "", descricao: "", link: "", dataInicio: "", dataFim: "" });
  const [savingSolucao, setSavingSolucao] = useState(false);

  function openNovaSolucao() {
    setEditingSolucao(null);
    setSolForm({ titulo: "", descricao: "", link: "", dataInicio: "", dataFim: "" });
    setSolucaoDialogOpen(true);
  }
  function openEditarSolucao(s: Solucao) {
    setEditingSolucao(s);
    setSolForm({
      titulo: s.titulo,
      descricao: s.descricao ?? "",
      link: s.link ?? "",
      dataInicio: s.dataInicioPrevista ?? "",
      dataFim: s.dataFimPrevista ?? "",
    });
    setSolucaoDialogOpen(true);
  }
  async function handleSaveSolucao() {
    if (!solForm.titulo.trim()) {
      toast({ title: "Informe um título", variant: "destructive" });
      return;
    }
    setSavingSolucao(true);
    try {
      if (editingSolucao) {
        await updateSolucao(editingSolucao.id, {
          titulo: solForm.titulo.trim(),
          descricao: solForm.descricao.trim(),
          link: solForm.link.trim() || null,
          dataInicioPrevista: solForm.dataInicio || null,
          dataFimPrevista: solForm.dataFim || null,
        });
        toast({ title: "Solução atualizada" });
      } else {
        await createSolucao({
          solicitacaoId: id,
          titulo: solForm.titulo.trim(),
          descricao: solForm.descricao.trim(),
          link: solForm.link.trim() || null,
          createdBy: user?.id,
          dataInicioPrevista: solForm.dataInicio || null,
          dataFimPrevista: solForm.dataFim || null,
        });
        toast({ title: "Solução cadastrada" });
      }
      setSolucaoDialogOpen(false);
      setSolucoesReloadKey((k) => k + 1);
    } catch (err) {
      toast({
        title: "Erro ao salvar solução",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingSolucao(false);
    }
  }
  async function handleDeleteSolucao(solId: string) {
    try {
      await deleteSolucao(solId);
      toast({ title: "Solução excluída" });
      setSolucoesReloadKey((k) => k + 1);
    } catch (err) {
      toast({
        title: "Erro ao excluir solução",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  const [status, setStatus] = useState<PipelineStatus>(solicitacao?.status ?? "novo");
  const [savingStatus, setSavingStatus] = useState(false);
  const [notasTecnicasComplexidade, setNotasTecnicasComplexidade] = useState<string>(
    solicitacao?.notasTecnicasComplexidade ?? "",
  );
  const [savingComplexDev, setSavingComplexDev] = useState(false);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [hasOverride, setHasOverride] = useState<boolean>(false);
  const [overrideComplexidade, setOverrideComplexidade] = useState<number>(0);
  const [overrideMotivo, setOverrideMotivo] = useState<string>("");

  const calculatedComplexidade = useMemo(
    () => computeComplexidadeFromChecklist(marcados),
    [marcados],
  );
  const effectiveComplexidade: number = hasOverride ? overrideComplexidade : calculatedComplexidade;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitulo, setEditTitulo] = useState(solicitacao?.titulo ?? "");
  const [editDescricao, setEditDescricao] = useState(solicitacao?.descricao ?? "");
  const [editSoftwares, setEditSoftwares] = useState((solicitacao?.integracoes ?? []).join(", "));
  const [editFrequencia, setEditFrequencia] = useState<Frequencia>(solicitacao?.frequencia ?? 3);
  const [editComplexidade, setEditComplexidade] = useState(solicitacao?.complexidade ?? 3);
  const [editRetorno, setEditRetorno] = useState(solicitacao?.retorno ?? 3);
  const [editSetor, setEditSetor] = useState<string>(solicitacao?.setor ?? "");
  const setoresDisponiveis = useSetoresNomes();


  useEffect(() => {
    if (!solicitacao) return;
    setStatus(solicitacao.status);
    setNotasTecnicasComplexidade(solicitacao.notasTecnicasComplexidade ?? "");
    // Quando há valor salvo, ativamos o modo override (porque não temos o checklist original).
    if (solicitacao.complexidadeDev !== null && solicitacao.complexidadeDev !== undefined) {
      setHasOverride(true);
      setOverrideComplexidade(solicitacao.complexidadeDev);
    } else {
      setHasOverride(false);
      setOverrideComplexidade(0);
    }
    setEditTitulo(solicitacao.titulo);
    setEditDescricao(solicitacao.descricao);
    setEditSoftwares((solicitacao.integracoes ?? []).join(", "));
    setEditFrequencia(solicitacao.frequencia);
    setEditComplexidade(solicitacao.complexidade);
    setEditRetorno(solicitacao.retorno);
    setEditSetor(solicitacao.setor ?? "");
  }, [solicitacao]);

  useEffect(() => {
    if (searchParams.get("editar") === "1" && isOwner) {
      setIsEditing(true);
    }
  }, [searchParams, isOwner]);

  if (!solicitacao) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Solicitação não encontrada.</p>
        <Button asChild variant="outline"><Link to="/">Voltar</Link></Button>
      </div>
    );
  }

  async function handleSaveStatus() {
    setSavingStatus(true);
    try {
      await updateSolicitacao(id, { status });
      toast({ title: "Status atualizado" });
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingStatus(false);
    }
  }
  async function handleSaveOwn() {
    if (!editTitulo.trim() || editTitulo.trim().length < 3) {
      toast({ title: "Verifique os campos", description: "Informe um título válido.", variant: "destructive" });
      return;
    }
    if (!editDescricao.trim() || editDescricao.trim().length < 10) {
      toast({ title: "Verifique os campos", description: "Descreva a solicitação com mais detalhes.", variant: "destructive" });
      return;
    }
    if (!editSetor.trim()) {
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
    toast({ title: "Solicitação atualizada" });
  }

  async function handleDelete() {
    await deleteSolicitacao(id);
    toast({ title: "Solicitação excluída" });
    navigate("/solicitacoes", { replace: true });
  }

  async function handleSaveComplexidadeDev() {
    const final = effectiveComplexidade;
    if (
      typeof final !== "number" ||
      Number.isNaN(final) ||
      final < 0 ||
      final > 10
    ) {
      toast({
        title: "Avaliação incompleta",
        description: "Marque ao menos um item do checklist ou ative o override antes de salvar.",
        variant: "destructive",
      });
      return;
    }
    const notasFinal = hasOverride && overrideMotivo
      ? `${notasTecnicasComplexidade}${notasTecnicasComplexidade ? "\n\n" : ""}[Override] ${overrideMotivo}`
      : notasTecnicasComplexidade;
    setSavingComplexDev(true);
    try {
      await updateSolicitacao(id, {
        complexidadeDev: final,
        notasTecnicasComplexidade: notasFinal || null,
      });
      toast({
        title: "Avaliação técnica salva",
        description: "Score final recalculado.",
      });
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
                <Pencil className="size-4" /> Editar solicitação
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
            <CardTitle className="text-base">{isEditing ? "Editar solicitação" : "Descrição"}</CardTitle>
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
                  <Select value={editSetor} onValueChange={setEditSetor}>
                    <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                    <SelectContent>
                      {setoresDisponiveis.map((s) => (
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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Sparkles className="size-4 text-accent" /> Soluções</CardTitle>
                  <CardDescription>
                    {isDev
                      ? "Soluções vinculadas a esta solicitação. Cadastre novas pela aba Soluções."
                      : canManageSolucoes
                        ? "Cadastre e gerencie as soluções desta solicitação."
                        : "Soluções vinculadas a esta solicitação."}
                  </CardDescription>
                </div>
                {canManageSolucoes && !isDev && (
                  <Button size="sm" variant="outline" onClick={openNovaSolucao}>
                    <Sparkles className="size-4" /> Adicionar solução
                  </Button>
                )}
              </div>
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
                          {canManageSolucoes && !isDev && s.createdBy === user?.id && (
                            <>
                              <Button variant="outline" size="icon" className="h-8 w-8" title="Editar" onClick={() => openEditarSolucao(s)}>
                                <Pencil className="size-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-8 w-8" title="Excluir">
                                    <Trash2 className="size-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir solução?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteSolucao(s.id)}>Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
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

        <Dialog open={solucaoDialogOpen} onOpenChange={setSolucaoDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSolucao ? "Editar solução" : "Nova solução"}</DialogTitle>
              <DialogDescription>Preencha os dados da solução vinculada a esta solicitação.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="sol-titulo">Título</Label>
                <Input id="sol-titulo" value={solForm.titulo} onChange={(e) => setSolForm((f) => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="sol-desc">Descrição</Label>
                <Textarea id="sol-desc" rows={3} value={solForm.descricao} onChange={(e) => setSolForm((f) => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="sol-link">Link</Label>
                <Input id="sol-link" placeholder="https://..." value={solForm.link} onChange={(e) => setSolForm((f) => ({ ...f, link: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sol-ini">Início previsto</Label>
                  <Input id="sol-ini" type="date" value={solForm.dataInicio} onChange={(e) => setSolForm((f) => ({ ...f, dataInicio: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="sol-fim">Fim previsto</Label>
                  <Input id="sol-fim" type="date" value={solForm.dataFim} onChange={(e) => setSolForm((f) => ({ ...f, dataFim: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSolucaoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveSolucao} disabled={savingSolucao}>
                {savingSolucao ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>

      {isDev && (
        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="text-base">Status do Pipeline</CardTitle>
            <CardDescription>Atualize apenas o estágio do pipeline. Demais campos do solicitante não são editáveis pelo dev.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PipelineStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveStatus} disabled={savingStatus || status === solicitacao.status}>
              <Save className="size-4" /> Salvar status
            </Button>
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
            <ChecklistAvaliacao
              marcados={marcados}
              onToggle={(id, val) => setMarcados((m) => ({ ...m, [id]: val }))}
            />

            {/* Display read-only da complexidade calculada */}
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Complexidade Técnica
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {effectiveComplexidade}/10
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {hasOverride
                      ? "Definida manualmente pelo dev (override)"
                      : "Calculada automaticamente pelo checklist"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  Soma do checklist:{" "}
                  <span className="font-semibold tabular-nums">
                    {checklistSum(marcados)}
                  </span>
                  <br />
                  Equivalente a{" "}
                  <span className="font-semibold tabular-nums">
                    {calculatedComplexidade}/10
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMPLEXIDADE_ANCORAS.map((a) => {
                  const active = effectiveComplexidade === a.v;
                  return (
                    <div
                      key={a.v}
                      className={`text-left rounded-md border p-2 ${
                        active
                          ? "border-accent bg-accent/10"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold tabular-nums text-accent">{a.v}</span>
                        <span className="text-xs font-medium">{a.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{a.desc}</p>
                    </div>
                  );
                })}
              </div>
              <FormulaImpactCard complexidade={effectiveComplexidade} />
            </div>

            {/* Override opcional */}
            <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={hasOverride}
                  onCheckedChange={(v) => setHasOverride(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  Minha avaliação difere da soma do checklist
                  <span className="block text-[11px] text-muted-foreground">
                    Ative para definir manualmente a complexidade e justificar.
                  </span>
                </span>
              </label>
              {hasOverride && (
                <div className="space-y-3 pl-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Complexidade (override) (0-10)</Label>
                      <span className="text-sm tabular-nums text-accent font-medium">
                        {overrideComplexidade}/10
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={10}
                      step={1}
                      value={[overrideComplexidade]}
                      onValueChange={(v) => setOverrideComplexidade(v[0])}
                    />
                  </div>
                  <Textarea
                    rows={3}
                    placeholder="Explique por que sua avaliação difere da soma sugerida pelo checklist..."
                    value={overrideMotivo}
                    onChange={(e) => setOverrideMotivo(e.target.value)}
                    maxLength={1000}
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notas-tecnicas-complexidade">Notas da Avaliação Técnica</Label>
              <Textarea
                id="notas-tecnicas-complexidade"
                rows={4}
                placeholder="Justifique sua avaliação: por que essa complexidade? Quais são as principais dificuldades técnicas? Há riscos ou dependências a destacar? Sugestões de abordagem?"
                value={notasTecnicasComplexidade}
                onChange={(e) => setNotasTecnicasComplexidade(e.target.value)}
                maxLength={2000}
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-right tabular-nums">
                {notasTecnicasComplexidade.length}/2000
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Preview do score final:{" "}
                <span className="text-foreground font-medium tabular-nums">
                  {Math.round(
                    computeScoreFinal(solicitacao.scoreSolicitante, effectiveComplexidade) ?? 0,
                  )}
                </span>
              </div>
              <Button
                onClick={handleSaveComplexidadeDev}
                disabled={savingComplexDev}
              >
                <Save className="size-4" /> Salvar Avaliação Técnica
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(isDev || isOwner) && (
        <Card className="surface-1">
          <Collapsible defaultOpen={false}>
            <CardHeader className="pb-2">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
                <div>
                  <CardTitle className="text-base">Histórico de Avaliações Técnicas</CardTitle>
                  <CardDescription>
                    {scoreHistory.length === 0
                      ? "Nenhuma avaliação registrada ainda."
                      : `${scoreHistory.length} mudança${scoreHistory.length === 1 ? "" : "s"} registrada${scoreHistory.length === 1 ? "" : "s"}.`}
                  </CardDescription>
                </div>
                <ChevronDown className="size-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                {scoreHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
                ) : (
                  <ol className="relative border-l border-border pl-4 space-y-4">
                    {scoreHistory.map((event) => (
                      <li key={event.id} className="relative">
                        <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-accent border-2 border-background" />
                        <p className="text-sm font-medium">
                          Complexidade{" "}
                          <span className="tabular-nums">
                            {event.old_complexidade_dev ?? "—"} → {event.new_complexidade_dev ?? "—"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          por {event.changed_by_email ?? "desconhecido"} em{" "}
                          {new Date(event.changed_at).toLocaleString("pt-BR")}
                        </p>
                        {event.new_notas && (
                          <p className="text-xs mt-1 italic text-muted-foreground border-l-2 border-border pl-2">
                            {event.new_notas}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
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

const CHECKLIST_ITENS: { id: string; label: string; pontos: number; hint: string }[] = [
  { id: "apis", label: "Quantas APIs/sistemas precisam ser integrados?", hint: ">3 sistemas", pontos: 2 },
  { id: "logica", label: "Envolve lógica condicional complexa ou regras de negócio?", hint: "sim", pontos: 1 },
  { id: "tempo", label: "Quanto tempo um desenvolvedor sênior levaria do zero?", hint: ">1 semana", pontos: 3 },
  { id: "auth", label: "Requer autenticação/autorização custom?", hint: "sim", pontos: 1 },
  { id: "tech", label: "Depende de bibliotecas/tecnologias novas ou instáveis?", hint: "sim", pontos: 2 },
  { id: "errors", label: "Envolve tratamento complexo de erros ou edge cases?", hint: "sim", pontos: 1 },
  { id: "testes", label: "Requer testes automatizados específicos?", hint: "sim", pontos: 1 },
  { id: "impacto", label: "Impacta em outras automações/integrações?", hint: "sim", pontos: 2 },
];

const COMPLEXIDADE_ANCORAS = [
  { v: 0, label: "Trivial", desc: "Integração plug-and-play existente, <2h" },
  { v: 2, label: "Simples", desc: "1-2 APIs, fluxo linear, <1 dia" },
  { v: 4, label: "Moderada", desc: "Múltiplas APIs, lógica condicional, 2-5 dias" },
  { v: 6, label: "Complexa", desc: "Integrações custom, regras de negócio, 1-2 semanas" },
  { v: 8, label: "Muito Complexa", desc: "Arquitetura custom, múltiplos serviços, 2-4 semanas" },
  { v: 10, label: "Extremamente Complexa", desc: "Novo sistema, IA/ML, >1 mês" },
];

function checklistSum(marcados: Record<string, boolean>): number {
  return CHECKLIST_ITENS.reduce((acc, i) => acc + (marcados[i.id] ? i.pontos : 0), 0);
}

function computeComplexidadeFromChecklist(marcados: Record<string, boolean>): number {
  const sum = checklistSum(marcados);
  if (sum <= 0) return 0;
  if (sum >= 10) return 10;
  return sum;
}

function ChecklistAvaliacao({
  marcados,
  onToggle,
}: {
  marcados: Record<string, boolean>;
  onToggle: (id: string, val: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const total = checklistSum(marcados);
  const sugestao = computeComplexidadeFromChecklist(marcados);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-3 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="size-4 text-blue-600 dark:text-blue-300 shrink-0" />
          <span className="text-sm font-medium truncate">Checklist de avaliação</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs tabular-nums text-blue-700 dark:text-blue-300">
            soma: {total} → {sugestao}/10
          </span>
          <ChevronDown className={`size-4 text-blue-700 dark:text-blue-300 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-2">
        <ul className="space-y-2">
          {CHECKLIST_ITENS.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <Checkbox
                id={`chk-${item.id}`}
                checked={!!marcados[item.id]}
                onCheckedChange={(v) => onToggle(item.id, v === true)}
                className="mt-0.5"
              />
              <label htmlFor={`chk-${item.id}`} className="text-xs leading-snug cursor-pointer">
                <span className="text-foreground">{item.label}</span>{" "}
                <span className="text-muted-foreground">
                  ({item.hint} = +{item.pontos} {item.pontos === 1 ? "ponto" : "pontos"})
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="text-xs text-blue-700 dark:text-blue-300 pt-2 border-t border-blue-200 dark:border-blue-900/60">
          Soma dos pontos:{" "}
          <span className="font-semibold tabular-nums">{total}</span>
          {" — "}
          Equivalente a complexidade{" "}
          <span className="font-semibold tabular-nums">{sugestao}/10</span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
