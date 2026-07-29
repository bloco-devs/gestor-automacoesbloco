import { CheckCircle2, Flame, Tag, UserCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiPreview } from "@/hooks/useAIWorkspace";
import { prioridadeLabel } from "@/hooks/useAIWorkspace";
import { TIPO_DEMANDA_LABEL } from "@/lib/types";

interface Props {
  preview: AiPreview;
  score: number;
  onClose?: () => void;
  onTrack?: () => void;
}

function estimarTempo(complexidade: number): string {
  if (complexidade <= 2) return "~15 minutos";
  if (complexidade <= 4) return "~1 hora";
  if (complexidade <= 6) return "~1 dia útil";
  if (complexidade <= 8) return "~2 a 3 dias";
  return "1 semana ou mais";
}

function toneForPrioridade(label: string): string {
  if (label === "Alta") return "text-red-600 bg-red-500/10 dark:text-red-400";
  if (label === "Média") return "text-amber-600 bg-amber-500/10 dark:text-amber-400";
  return "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400";
}

/**
 * Confirmação rica pós-envio. Puramente visual — lê do `preview` e da
 * função `prioridadeLabel` já existente no hook.
 */
export function RichConfirmation({ preview, score, onClose, onTrack }: Props) {
  const prioridade = prioridadeLabel(score);
  const items = [
    {
      icon: Flame,
      label: "Prioridade",
      value: prioridade,
      tone: toneForPrioridade(prioridade),
    },
    {
      icon: Tag,
      label: "Categoria",
      // Antes vinha de `preview.setor`, que era o primeiro setor da lista em
      // ordem alfabética — um rótulo sorteado, exibido logo abaixo da frase
      // "Ela já foi classificada automaticamente". `tipoDemanda` é a
      // classificação que o modelo de fato produziu; quando ele não conseguiu
      // classificar, o travessão diz isso, e dizer "não sei" é melhor do que
      // dizer algo errado com convicção.
      value: preview.tipoDemanda ? TIPO_DEMANDA_LABEL[preview.tipoDemanda] : "—",
      tone: "text-sky-600 bg-sky-500/10 dark:text-sky-400",
    },
    {
      icon: UserCircle2,
      label: "Responsável sugerido",
      value: preview.responsavelSugerido || "Definido em instantes",
      tone: "text-violet-600 bg-violet-500/10 dark:text-violet-400",
    },
    {
      icon: Clock3,
      label: "Tempo estimado",
      value: estimarTempo(preview.complexidadeDev),
      tone: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
    },
  ];

  return (
    <div className="animate-fade-in rounded-3xl border border-border bg-card p-8 shadow-elev-2">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Pronto!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua solicitação foi criada com sucesso.
          <br />
          Ela já foi classificada automaticamente.
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.label}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-4"
            >
              <span
                aria-hidden
                className={`flex size-10 items-center justify-center rounded-xl ${it.tone}`}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {it.label}
                </dt>
                <dd className="mt-0.5 truncate text-sm font-semibold">{it.value}</dd>
              </div>
            </div>
          );
        })}
      </dl>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Você pode fechar esta tela. Nós avisaremos cada atualização.
      </p>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
        {onClose && (
          <Button variant="ghost" onClick={onClose} className="rounded-xl">
            Fechar
          </Button>
        )}
        {onTrack && (
          <Button onClick={onTrack} className="rounded-xl px-5">
            Acompanhar
          </Button>
        )}
      </div>
    </div>
  );
}
