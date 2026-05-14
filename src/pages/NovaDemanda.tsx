import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { createSolicitacao } from "@/lib/supabaseData";
import { computeScoreSolicitante, scoreTone } from "@/lib/scoreV2";
import { SETORES, type Setor } from "@/lib/types";
import { ScorePill } from "@/components/ScorePill";
import { AssistenteDescricao } from "@/components/AssistenteDescricao";

const schema = z.object({
  titulo: z.string().trim().min(3, "Título muito curto").max(120),
  descricao: z.string().trim().max(2000),
  softwares: z.string().trim().max(500, "Informe no máximo 500 caracteres"),
  setor: z.string().refine((v) => (SETORES as readonly string[]).includes(v), { message: "Selecione o setor" }),
});

export default function NovaDemanda() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isDeveloper = user?.role === "developer";
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [softwares, setSoftwares] = useState("");
  const [setor, setSetor] = useState<Setor | "">("");
  const [frequencia, setFrequencia] = useState<number>(5);
  const [dificuldade, setDificuldade] = useState<number>(5);
  const [retorno, setRetorno] = useState<number>(5);

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
      });
      toast({ title: "Demanda registrada", description: "Você poderá acompanhar o status em tempo real." });
      navigate("/minhas-demandas");
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
        <h1 className="text-2xl font-semibold">Nova demanda</h1>
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
                  {!isDeveloper && <AssistenteDescricao onAccept={setDescricao} />}
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
                <Select value={setor} onValueChange={(v) => setSetor(v as Setor)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                  <SelectContent>
                    {SETORES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-1">
            <CardHeader>
              <CardTitle className="text-base">Critérios de priorização</CardTitle>
              <CardDescription>Tudo na escala 0-10. O score final será ajustado quando o dev fizer a avaliação técnica.</CardDescription>
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

          {!isDeveloper && (
            <Button type="submit" className="w-full sm:w-auto">
              Enviar demanda
            </Button>
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
                Enviar demanda
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
