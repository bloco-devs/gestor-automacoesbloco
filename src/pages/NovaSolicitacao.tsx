import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createSolicitacao } from "@/lib/supabaseData";
import { computeScoreSolicitante, scoreTone } from "@/lib/scoreV2";
import { useSetoresNomes } from "@/hooks/useSetores";
import { ScorePill } from "@/components/ScorePill";
import { AssistenteDescricao } from "@/components/AssistenteDescricao";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { DemandasSimilares } from "@/components/DemandasSimilares";
import { FieldHelp } from "@/components/FieldHelp";
import { useEcossistemaSistemas } from "@/hooks/useEcossistemaSistemas";
import { TIPO_DEMANDA_LABEL, type TipoDemanda } from "@/lib/types";

const schema = z.object({
  titulo: z.string().trim().min(3, "Título muito curto").max(120),
  descricao: z.string().trim().max(2000),
  softwares: z.string().trim().max(500, "Informe no máximo 500 caracteres"),
  setor: z.string().trim().min(1, "Selecione o setor"),
});

export default function NovaSolicitacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isDeveloper = user?.role === "developer";
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [softwares, setSoftwares] = useState("");
  const [setor, setSetor] = useState<string>("");
  const setoresDisponiveis = useSetoresNomes();
  const [frequencia, setFrequencia] = useState<number>(5);
  const [dificuldade, setDificuldade] = useState<number>(5);
  const [retorno, setRetorno] = useState<number>(5);
  const [tipoDemanda, setTipoDemanda] = useState<TipoDemanda | "">("");
  const [sistemaAlvoSlug, setSistemaAlvoSlug] = useState<string>("");
  const precisaSistema = tipoDemanda === "ajuste_existente" || tipoDemanda === "novo_modulo";
  const { sistemas: sistemasEcossistema, fonte: fonteSistemas } = useEcossistemaSistemas(precisaSistema);
  const [sugerindo, setSugerindo] = useState(false);
  const [sugestaoJustificativa, setSugestaoJustificativa] = useState<string | null>(null);

  async function handleSugerirPrioridade() {
    if (sugerindo) return;
    if (!descricao.trim() || descricao.trim().length < 10) {
      toast({
        title: "Descreva a demanda",
        description: "Escreva ao menos uma frase na descrição para a IA estimar.",
        variant: "destructive",
      });
      return;
    }
    setSugerindo(true);
    try {
      const { data, error } = await supabase.functions.invoke("triagem-demanda", {
        body: { titulo, descricao, setor },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (typeof data?.frequencia === "number") setFrequencia(data.frequencia);
      if (typeof data?.dificuldade === "number") setDificuldade(data.dificuldade);
      if (typeof data?.retorno === "number") setRetorno(data.retorno);
      setSugestaoJustificativa(data?.justificativa ?? null);
      toast({ title: "Prioridade sugerida", description: "Ajuste os valores se necessário." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      const friendly = /429|muitas solicita/i.test(msg)
        ? "Muitas solicitações à IA. Aguarde alguns instantes."
        : msg;
      toast({ title: "Não foi possível sugerir", description: friendly, variant: "destructive" });
    } finally {
      setSugerindo(false);
    }
  }

  const previewScore = useMemo(
    () => Math.round(computeScoreSolicitante(frequencia, dificuldade, retorno)),
    [frequencia, dificuldade, retorno],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      const v = schema.parse({ titulo, descricao, softwares, setor });
      const softwaresList = v.softwares
        .split(",")
        .map((software) => software.trim())
        .filter(Boolean);
      await createSolicitacao({
        titulo: v.titulo,
        descricao: v.descricao,
        softwares: softwaresList,
        frequencia,
        dificuldade,
        retorno,
        setor: v.setor,
        solicitanteId: user.id,
        solicitanteNome: user.nome,
        email: user.email,
        tipoDemanda: tipoDemanda || null,
        sistemaAlvoSlug: precisaSistema && sistemaAlvoSlug ? sistemaAlvoSlug : null,
      });
      toast({ title: "Solicitação registrada", description: "Você poderá acompanhar o status em tempo real." });
      navigate("/minhas-solicitacoes");
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0].message : "Erro ao salvar";
      toast({ title: "Verifique os campos", description: msg, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-3">
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <h1 className="text-2xl font-semibold">Nova solicitação</h1>
        <p className="text-sm text-muted-foreground">Descreva a atividade para que o desenvolvedor possa priorizar.</p>
      </div>

      <form onSubmit={handleSubmit} className={isDeveloper ? "grid gap-6 lg:grid-cols-[1fr_320px]" : "space-y-6"}>
        <div className="space-y-6">
          <Card className="surface-1">
            <CardHeader>
              <CardTitle className="text-base">Sobre a atividade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="descricao">Descrição da atividade atual</Label>
                  {!isDeveloper && (
                    <div className="flex items-center gap-1.5">
                      <AssistenteDescricao onAccept={setDescricao} />
                      <FieldHelp>A IA ajuda a redigir a descrição a partir de perguntas.</FieldHelp>
                    </div>
                  )}
                </div>
                <Textarea
                  id="descricao"
                  rows={6}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="softwares">Softwares envolvidos</Label>
                <Input
                  id="softwares"
                  value={softwares}
                  onChange={(e) => setSoftwares(e.target.value)}
                />
              </div>
              <div>
                <Label>Setor da empresa</Label>
                <Select value={setor} onValueChange={setSetor}>
                  <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                  <SelectContent>
                    {setoresDisponiveis.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de demanda</Label>
                <Select
                  value={tipoDemanda || undefined}
                  onValueChange={(v) => {
                    setTipoDemanda(v as TipoDemanda);
                    if (v === "novo_sistema") setSistemaAlvoSlug("");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_DEMANDA_LABEL) as TipoDemanda[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_DEMANDA_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {precisaSistema && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label>Sistema do ecossistema</Label>
                    {fonteSistemas && (
                      <span className="text-[10px] text-muted-foreground">
                        {fonteSistemas === "hub" ? "Ao vivo (HUB)" : "Semente"}
                      </span>
                    )}
                  </div>
                  <Select value={sistemaAlvoSlug || undefined} onValueChange={setSistemaAlvoSlug}>
                    <SelectTrigger><SelectValue placeholder="Selecione o sistema-alvo" /></SelectTrigger>
                    <SelectContent>
                      {sistemasEcossistema.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Recomendado para "ajuste" ou "novo módulo". Pode ficar em branco se não souber.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="surface-1">
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">Critérios de priorização</CardTitle>
                  <CardDescription>Tudo na escala 0-10. O score final será ajustado quando o dev fizer a avaliação técnica.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSugerirPrioridade}
                  disabled={sugerindo || !descricao.trim()}
                  aria-label="Sugerir prioridade com IA"
                >
                  {sugerindo ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Sugerir com IA
                </Button>
              </div>
              {sugestaoJustificativa && (
                <div className="mt-2 rounded-md border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground space-y-1">
                  <DataSourceBadge source="IA" />
                  <p className="leading-snug">{sugestaoJustificativa}</p>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <ScaleSlider
                label="Frequência de utilização"
                value={frequencia}
                onChange={setFrequencia}
                anchors={[
                  [0, "Nunca"],
                  [2, "Raro (<1×/mês)"],
                  [4, "Mensal"],
                  [6, "Semanal"],
                  [8, "Diário"],
                  [10, "Várias vezes/dia"],
                ]}
              />
              <ScaleSlider
                label="Dificuldade"
                value={dificuldade}
                onChange={setDificuldade}
                anchors={[
                  [0, "Trivial"],
                  [2, "Fácil"],
                  [4, "Moderada"],
                  [6, "Difícil"],
                  [8, "Muito difícil"],
                  [10, "Crítica"],
                ]}
              />
              <ScaleSlider
                label="Retorno financeiro"
                value={retorno}
                onChange={setRetorno}
                anchors={[
                  [0, "Nenhum (R$ 0)"],
                  [2, "Baixo (R$ 0–500/mês)"],
                  [4, "Médio (R$ 500–2,5k/mês)"],
                  [6, "Médio-alto (R$ 2,5k–10k/mês)"],
                  [8, "Alto (R$ 10k–50k/mês)"],
                  [10, "Muito alto (R$ 50k+/mês)"],
                ]}
              />
            </CardContent>
          </Card>

          <DemandasSimilares titulo={titulo} descricao={descricao} />


          {!isDeveloper && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-border bg-card/40 p-4">
              <div>
                <div className="text-sm font-medium flex items-center gap-1.5">
                  Score estimado: <span className="tabular-nums">{previewScore}/100</span>
                  <FieldHelp>
                    Score de priorização (0-100). Será ajustado pela complexidade técnica avaliada pelo desenvolvedor.
                  </FieldHelp>
                </div>
                <div className="text-xs text-muted-foreground">Será ajustado quando o dev fizer a avaliação técnica.</div>
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                Enviar solicitação
              </Button>
            </div>
          )}
        </div>

        {isDeveloper && <div className="space-y-4">
          <Card className="surface-2 sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Score estimado: {previewScore}/100</CardTitle>
              <CardDescription>Será ajustado quando o dev fizer a avaliação técnica.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-semibold tabular-nums">{previewScore}</span>
                <ScorePill score={previewScore} />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {scoreTone(previewScore, "solicitante") === "high" && "Alta prioridade prevista."}
                {scoreTone(previewScore, "solicitante") === "mid" && "Prioridade média."}
                {scoreTone(previewScore, "solicitante") === "low" && "Baixa prioridade."}
              </div>
              <Button type="submit" className="w-full mt-6">
                Enviar solicitação
              </Button>
            </CardContent>
          </Card>
        </div>}
      </form>
    </div>
  );
}

/**
 * Slider 0-10 com âncoras textuais. Mostra o rótulo da âncora mais próxima
 * abaixo do valor selecionado para dar contexto qualitativo ao número.
 */
function ScaleSlider({
  label,
  value,
  onChange,
  anchors,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  anchors: Array<[number, string]>;
}) {
  const nearest = anchors.reduce((acc, cur) =>
    Math.abs(cur[0] - value) < Math.abs(acc[0] - value) ? cur : acc,
  );
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{label}</Label>
        <span className="text-sm tabular-nums text-accent font-medium">
          {value}/10 · <span className="text-muted-foreground font-normal">{nearest[1]}</span>
        </span>
      </div>
      <Slider min={0} max={10} step={1} value={[value]} onValueChange={(v) => onChange(v[0])} />
      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground tabular-nums">
        {anchors.map(([n, lab]) => (
          <span key={n} className="flex flex-col items-center">
            <span>{n}</span>
            <span className="hidden sm:block max-w-[7ch] text-center leading-tight">{lab}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

