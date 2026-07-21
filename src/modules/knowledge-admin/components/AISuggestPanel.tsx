import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { aiWorkspaceService } from "@/modules/ai/services/ai-workspace-service";
import { useToast } from "@/hooks/use-toast";

type Action = "melhorar" | "resumir" | "expandir" | "faq" | "tags" | "titulo";

const PROMPTS: Record<Action, string> = {
  melhorar: "Melhore este artigo tornando-o mais claro, direto e amigável, preservando o significado. Devolva apenas o texto revisado em Markdown:",
  resumir: "Resuma este artigo em 2-3 parágrafos objetivos, em Markdown:",
  expandir: "Expanda este artigo adicionando exemplos práticos e passos numerados, em Markdown:",
  faq: "Extraia 3-5 perguntas frequentes com respostas curtas a partir deste artigo. Formate como Markdown (### Pergunta / resposta):",
  tags: "Sugira 5 a 8 palavras-chave (uma por linha, sem marcadores) que descrevam este artigo:",
  titulo: "Sugira 3 títulos curtos e diretos (um por linha, sem numeração) para este artigo:",
};

export function AISuggestPanel({
  content,
  onApply,
}: {
  content: string;
  onApply: (suggestion: string, action: Action) => void;
}) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [result, setResult] = useState<string>("");
  const [lastAction, setLastAction] = useState<Action | null>(null);
  const { toast } = useToast();

  async function run(action: Action) {
    if (!content.trim()) {
      toast({ title: "Sem conteúdo", description: "Escreva algo antes de pedir ajuda à IA." });
      return;
    }
    setBusy(action);
    setLastAction(action);
    setResult("");
    try {
      // Reuso do pipeline existente: `generate_description` do assistente aceita
      // uma "conversa" e devolve texto revisado. Injetamos um turno com o prompt.
      const suggestion = await aiWorkspaceService.generateDescription([
        {
          role: "user",
          content: `${PROMPTS[action]}\n\n---\n${content.slice(0, 6000)}`,
        },
      ]);
      setResult(suggestion || "(sem sugestão)");
    } catch (e) {
      toast({
        title: "IA indisponível",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  const actions: Array<{ key: Action; label: string }> = [
    { key: "melhorar", label: "Melhorar" },
    { key: "resumir", label: "Resumir" },
    { key: "expandir", label: "Expandir" },
    { key: "faq", label: "Gerar FAQ" },
    { key: "tags", label: "Palavras-chave" },
    { key: "titulo", label: "Sugerir título" },
  ];

  return (
    <div className="rounded-md border p-3 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-primary" />
        Sugestões de IA
        <span className="text-xs text-muted-foreground font-normal">
          A IA nunca salva sozinha — você revisa e aplica.
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.key}
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => run(a.key)}
          >
            {busy === a.key ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
            {a.label}
          </Button>
        ))}
      </div>
      {result && (
        <div className="space-y-2">
          <Textarea value={result} onChange={(e) => setResult(e.target.value)} rows={6} className="text-sm" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setResult("")}>
              Descartar
            </Button>
            <Button size="sm" onClick={() => lastAction && onApply(result, lastAction)}>
              Aplicar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
