import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil, Save, Sparkles, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  createSolucao,
  deleteSolicitacao,
  getSolicitacao,
  listSolucoesBySolicitacao,
  updateOwnSolicitacao,
  updateSolicitacao,
} from "@/lib/supabaseData";
import { FREQUENCIA_LABEL, PIPELINE_ORDER, STATUS_LABEL, statusToCategory, type Frequencia, type PipelineStatus } from "@/lib/types";
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
import { ScorePill } from "@/components/ScorePill";
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
  const [dificuldade, setDificuldade] = useState(solicitacao?.dificuldade ?? 3);
  const [status, setStatus] = useState<PipelineStatus>(solicitacao?.status ?? "novo");
  const [notas, setNotas] = useState(solicitacao?.notasTecnicas ?? "");
  const [descricaoDev, setDescricaoDev] = useState(solicitacao?.descricao ?? "");
  const [temIntegracao, setTemIntegracao] = useState<boolean>(solicitacao?.temIntegracao ?? false);
  const [integracoesText, setIntegracoesText] = useState((solicitacao?.integracoes ?? []).join(", "));
  const [isEditing, setIsEditing] = useState(false);
  const [editTitulo, setEditTitulo] = useState(solicitacao?.titulo ?? "");
  const [editDescricao, setEditDescricao] = useState(solicitacao?.descricao ?? "");
  const [editSoftwares, setEditSoftwares] = useState((solicitacao?.integracoes ?? []).join(", "));
  const [editFrequencia, setEditFrequencia] = useState<Frequencia>(solicitacao?.frequencia ?? 3);
  const [editComplexidade, setEditComplexidade] = useState(solicitacao?.complexidade ?? 3);
  const [editRetorno, setEditRetorno] = useState(solicitacao?.retorno ?? 3);

  const [solucaoTitulo, setSolucaoTitulo] = useState("");
  const [solucaoDesc, setSolucaoDesc] = useState("");

  useEffect(() => {
    if (!solicitacao) return;
    setComplex(solicitacao.complexidade);
    setRetorno(solicitacao.retorno);
    setDificuldade(solicitacao.dificuldade);
    setStatus(solicitacao.status);
    setNotas(solicitacao.notasTecnicas ?? "");
    setDescricaoDev(solicitacao.descricao);
    setTemIntegracao(solicitacao.temIntegracao ?? false);
    setIntegracoesText((solicitacao.integracoes ?? []).join(", "));
    setEditTitulo(solicitacao.titulo);
    setEditDescricao(solicitacao.descricao);
    setEditSoftwares((solicitacao.integracoes ?? []).join(", "));
    setEditFrequencia(solicitacao.frequencia);
    setEditComplexidade(solicitacao.complexidade);
    setEditRetorno(solicitacao.retorno);
  }, [solicitacao]);

  useEffect(() => {
    if (searchParams.get("editar") === "1" && isOwner) {
      setIsEditing(true);
    }
  }, [searchParams, isOwner]);

  const previewScore = useMemo(
    () => (solicitacao ? calcScore({ frequencia: solicitacao.frequencia, complexidade: complex, retorno, dificuldade }) : 0),
    [solicitacao, complex, retorno, dificuldade],
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
      dificuldade,
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

    const softwares = editSoftwares.split(",").map((s) => s.trim()).filter(Boolean);
    await updateOwnSolicitacao(id, {
      titulo: editTitulo.trim(),
      descricao: editDescricao.trim(),
      softwares,
      frequencia: editFrequencia,
      complexidade: editComplexidade,
      retorno: editRetorno,
      dificuldade,
    });
    setIsEditing(false);
    setSearchParams({});
    toast({ title: "Demanda atualizada" });
  }

  async function handleAddSolucao() {
    if (!solucaoTitulo.trim()) {
      toast({ title: "Informe um título para a solução", variant: "destructive" });
      return;
    }
    await createSolucao({ solicitacaoId: id, titulo: solucaoTitulo.trim(), descricao: solucaoDesc.trim(), createdBy: user?.id });
    setSolucaoTitulo("");
    setSolucaoDesc("");
    toast({ title: "Solução registrada" });
  }

  async function handleDelete() {
    await deleteSolicitacao(id);
    toast({ title: "Solicitação excluída" });
    navigate("/solicitacoes", { replace: true });
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
            {isDev && <ScorePill score={solicitacao.score} />}
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

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="text-base">{isEditing ? "Editar demanda" : "Descrição"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label htmlFor="edit-titulo">Título</Label>
                  <Input id="edit-titulo" value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="edit-descricao">Descrição da atividade atual</Label>
                  <Textarea id="edit-descricao" rows={6} value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} />
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
                <SliderField label="Complexidade / Chato de fazer" value={editComplexidade} onChange={setEditComplexidade} />
                <SliderField label="Retorno esperado" value={editRetorno} onChange={setEditRetorno} />
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
                  <div><dt className="text-xs text-muted-foreground">Retorno</dt><dd>{solicitacao.retorno}/5</dd></div>
                </dl>
              </>
            )}
            {!isEditing && solicitacao.temIntegracao && (
              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1">Integrações</div>
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

        {isDev && (
          <Card className="surface-1">
            <CardHeader>
              <CardTitle className="text-base">Ajustes do desenvolvedor</CardTitle>
              <CardDescription>Score recalculado: <ScorePill score={previewScore} /></CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
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
              <SliderField label="Retorno" value={retorno} onChange={setRetorno} />
              <SliderField label="Dificuldade" value={dificuldade} onChange={setDificuldade} />
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="tem-integracao">Possui integração?</Label>
                    <p className="text-xs text-muted-foreground">Esta solução se conecta a outro sistema ou software.</p>
                  </div>
                  <Switch
                    id="tem-integracao"
                    checked={temIntegracao}
                    onCheckedChange={setTemIntegracao}
                  />
                </div>
                {temIntegracao && (
                  <div>
                    <Label htmlFor="integracoes">Sistemas / softwares integrados</Label>
                    <Textarea
                      id="integracoes"
                      rows={2}
                      value={integracoesText}
                      onChange={(e) => setIntegracoesText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Separe múltiplos sistemas por vírgula.</p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="notas">Notas técnicas</Label>
                <Textarea id="notas" rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>
              <Button onClick={handleSave} className="w-full">
                <Save className="size-4" /> Salvar alterações
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {isDev && (
        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="size-4 text-accent" /> Soluções entregues</CardTitle>
            <CardDescription>Registre a solução final desenvolvida para esta demanda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-[1fr_1fr_auto] gap-2">
              <Input value={solucaoTitulo} onChange={(e) => setSolucaoTitulo(e.target.value)} />
              <Input value={solucaoDesc} onChange={(e) => setSolucaoDesc(e.target.value)} />
              <Button onClick={handleAddSolucao}>Adicionar</Button>
            </div>
            {solucoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solução registrada ainda.</p>
            ) : (
              <ul className="divide-y divide-border">
                {solucoes.map((s) => (
                  <li key={s.id} className="py-3">
                    <div className="font-medium text-sm">{s.titulo}</div>
                    {s.descricao && <p className="text-xs text-muted-foreground mt-0.5">{s.descricao}</p>}
                  </li>
                ))}
              </ul>
            )}
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
