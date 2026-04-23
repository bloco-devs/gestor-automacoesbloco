import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSubscription } from "@/hooks/useStore";
import {
  createSolucao,
  getSolicitacao,
  listSolucoes,
  updateSolicitacao,
} from "@/lib/store";
import { FREQUENCIA_LABEL, PIPELINE_ORDER, STATUS_LABEL, type PipelineStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { ScorePill } from "@/components/ScorePill";
import { calcScore } from "@/lib/score";
import { useToast } from "@/hooks/use-toast";

export default function DemandaDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isDev = user?.role === "developer";

  const solicitacao = useStoreSubscription(() => getSolicitacao(id));
  const solucoes = useStoreSubscription(() => listSolucoes().filter((s) => s.solicitacaoId === id));

  const [complex, setComplex] = useState(solicitacao?.complexidade ?? 3);
  const [retorno, setRetorno] = useState(solicitacao?.retorno ?? 3);
  const [dificuldade, setDificuldade] = useState(solicitacao?.dificuldade ?? 3);
  const [status, setStatus] = useState<PipelineStatus>(solicitacao?.status ?? "novo");
  const [notas, setNotas] = useState(solicitacao?.notasTecnicas ?? "");
  const [temIntegracao, setTemIntegracao] = useState<boolean>(solicitacao?.temIntegracao ?? false);
  const [integracoesText, setIntegracoesText] = useState((solicitacao?.integracoes ?? []).join(", "));

  const [solucaoTitulo, setSolucaoTitulo] = useState("");
  const [solucaoDesc, setSolucaoDesc] = useState("");

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

  function handleSave() {
    const integracoes = temIntegracao
      ? integracoesText.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    updateSolicitacao(id, {
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

  function handleAddSolucao() {
    if (!solucaoTitulo.trim()) {
      toast({ title: "Informe um título para a solução", variant: "destructive" });
      return;
    }
    createSolucao({ solicitacaoId: id, titulo: solucaoTitulo.trim(), descricao: solucaoDesc.trim() });
    setSolucaoTitulo("");
    setSolucaoDesc("");
    toast({ title: "Solução registrada" });
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3">
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold">{solicitacao.titulo}</h1>
          <StatusBadge status={solicitacao.status} />
          <ScorePill score={solicitacao.score} />
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
            <CardTitle className="text-base">Descrição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">{solicitacao.descricao}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-border">
              <div><dt className="text-xs text-muted-foreground">Frequência</dt><dd>{FREQUENCIA_LABEL[solicitacao.frequencia]}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Complexidade</dt><dd>{solicitacao.complexidade}/5</dd></div>
              <div><dt className="text-xs text-muted-foreground">Retorno</dt><dd>{solicitacao.retorno}/5</dd></div>
              <div><dt className="text-xs text-muted-foreground">Dificuldade</dt><dd>{solicitacao.dificuldade}/5</dd></div>
            </dl>
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
              <div>
                <Label htmlFor="notas">Notas técnicas</Label>
                <Textarea id="notas" rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Decisões, dependências, riscos..." />
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
              <Input placeholder="Título da solução" value={solucaoTitulo} onChange={(e) => setSolucaoTitulo(e.target.value)} />
              <Input placeholder="Descrição" value={solucaoDesc} onChange={(e) => setSolucaoDesc(e.target.value)} />
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
