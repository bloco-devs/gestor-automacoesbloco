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
import { calcScore, scoreTone } from "@/lib/score";
import { FREQUENCIA_LABEL, SETORES, type Frequencia, type Setor } from "@/lib/types";
import { ScorePill } from "@/components/ScorePill";

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
  const [frequencia, setFrequencia] = useState<Frequencia>(3);
  const [complexidade, setComplexidade] = useState(3);
  const [retorno, setRetorno] = useState(3);
  const [dificuldade, setDificuldade] = useState(3);

  const previewScore = useMemo(
    () => calcScore({ frequencia, complexidade, retorno, dificuldade }),
    [frequencia, complexidade, retorno, dificuldade],
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
        complexidade,
        retorno,
        dificuldade,
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
                <Label htmlFor="descricao">Descrição da atividade atual</Label>
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
            </CardContent>
          </Card>

          <Card className="surface-1">
            <CardHeader>
              <CardTitle className="text-base">Critérios de priorização</CardTitle>
              {isDeveloper && <CardDescription>Esses fatores compõem o score (média 0-100).</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Frequência</Label>
                <Select value={String(frequencia)} onValueChange={(v) => setFrequencia(Number(v) as Frequencia)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {([4, 3, 2, 1] as Frequencia[]).map((f) => (
                      <SelectItem key={f} value={String(f)}>
                        {FREQUENCIA_LABEL[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SliderField label="Complexidade / Chato de fazer" value={complexidade} onChange={setComplexidade} hint="1 = simples · 5 = muito chato/complexo" />
              <SliderField label="Retorno esperado" value={retorno} onChange={setRetorno} hint="1 = baixo impacto · 5 = grande economia/impacto" />
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
              <CardTitle className="text-base">Score estimado</CardTitle>
              <CardDescription>Recalculado automaticamente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-semibold tabular-nums">{previewScore}</span>
                <ScorePill score={previewScore} />
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {scoreTone(previewScore) === "high" && "Alta prioridade prevista."}
                {scoreTone(previewScore) === "mid" && "Prioridade média."}
                {scoreTone(previewScore) === "low" && "Baixa prioridade."}
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

function SliderField({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{label}</Label>
        <span className="text-sm tabular-nums text-accent font-medium">{value}/5</span>
      </div>
      <Slider min={1} max={5} step={1} value={[value]} onValueChange={(v) => onChange(v[0])} />
      <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>
    </div>
  );
}
