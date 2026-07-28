import { memo, useState } from "react";
import { Loader2, Lock, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Briefing as DadosDoBriefing, Evento } from "@/domain/demand";
import { Briefing } from "./Briefing";
import { Blink } from "@/components/blink/Blink";

/**
 * A conversa — o centro da tela.
 *
 * A IA NÃO TEM PAINEL. ELA TEM VEZ DE FALAR.
 * Uma resposta da IA é uma mensagem no fio, na ordem cronológica, com o mesmo
 * peso visual de uma pessoa. O que a identifica é o símbolo `✦` no lugar do
 * avatar — e nada mais: nem cor de fundo diferente, nem caixa, nem borda.
 *
 * Isso é uma decisão de produto, não de estética. IA em painel separado é um
 * chatbot acoplado ao sistema, e a pessoa aprende que existem dois lugares para
 * olhar. IA no fio é uma colega que respondeu — e quando ela erra, alguém
 * responde embaixo, no mesmo lugar, como responderia a qualquer um.
 *
 * MUDANÇAS NÃO SÃO MENSAGENS
 * "Fulano moveu para Em Testes" entra no mesmo fio, porque quem espera quer a
 * história completa. Mas entra como uma linha fina, sem avatar e sem balão:
 * ela informa, não pede leitura nem resposta. Dar a ela o mesmo peso de uma
 * fala afogaria as falas — que é o que acontece hoje em quase todo sistema de
 * chamado.
 */

function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function quando(iso: string): string {
  const d = new Date(iso);
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const dias = Math.floor(h / 24);
  if (dias < 7) return `${dias} d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function Mudanca({ evento }: { evento: Evento }) {
  return (
    <li className="flex items-baseline gap-2 py-1 pl-9 text-[12px] text-muted-foreground">
      <span aria-hidden className="size-1 shrink-0 rounded-full bg-border" />
      <span className="min-w-0">
        <span className="text-foreground/70">{evento.autor?.nome ?? "Sistema"}</span> {evento.texto}
      </span>
      <time className="ml-auto shrink-0 tabular-nums" dateTime={evento.em}>
        {quando(evento.em)}
      </time>
    </li>
  );
}

/**
 * Anexo no fio.
 *
 * Mais alto que uma mudança e mais baixo que uma fala: ele não pede leitura
 * como um texto, mas pede clique — e um clique só acontece se o item for
 * visível o bastante para ser notado enquanto se rola.
 */
function Anexo({ evento, onAbrir }: { evento: Evento; onAbrir?: (anexoId: string) => void }) {
  return (
    <li className="flex items-center gap-2 py-1.5 pl-9 text-[12px]">
      <Paperclip className="size-3 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">{evento.autor?.nome ?? "Alguém"} anexou</span>
      <button
        type="button"
        onClick={() => evento.anexoId && onAbrir?.(evento.anexoId)}
        className="min-w-0 truncate text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline focus:outline-none focus-visible:underline"
      >
        {evento.texto}
      </button>
      <time className="ml-auto shrink-0 tabular-nums text-muted-foreground" dateTime={evento.em}>
        {quando(evento.em)}
      </time>
    </li>
  );
}

function Fala({ evento }: { evento: Evento }) {
  const ia = evento.autor?.ia ?? false;
  return (
    <li className={cn("flex gap-3 py-3", evento.interna && "rounded-md bg-warning/5 px-2 -mx-2")}>
      {ia ? (
        /* Quem fala no fio tem rosto: as pessoas têm avatar, e o Blink
           tinha um ícone de brilho. Um símbolo abstrato ao lado de fotos faz
           a IA parecer um carimbo do sistema, não um participante. */
        <span className="mt-0.5 size-7 shrink-0 overflow-hidden rounded-full bg-muted/50" aria-label="Blink">
          <Blink className="size-full" />
        </span>
      ) : (
        <Avatar className="mt-0.5 size-7 shrink-0">
          {evento.autor?.avatarUrl && <AvatarImage src={evento.autor.avatarUrl} alt="" />}
          <AvatarFallback className="bg-muted text-[10px]">
            {iniciais(evento.autor?.nome ?? "?")}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium">{evento.autor?.nome ?? "Alguém"}</span>
          {evento.interna && (
            <span className="inline-flex items-center gap-1 text-[11px] text-warning">
              <Lock className="size-3" aria-hidden />
              nota interna
            </span>
          )}
          <time className="ml-auto shrink-0 text-[12px] tabular-nums text-muted-foreground" dateTime={evento.em}>
            {quando(evento.em)}
          </time>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed">{evento.texto}</p>
      </div>
    </li>
  );
}

interface Props {
  eventos: Evento[];
  /** O resumo de 30 segundos. Ele aparece antes da primeira mensagem. */
  briefing: DadosDoBriefing;
  podeComentar: boolean;
  /** Só a equipe escreve nota interna; o solicitante nem vê a opção. */
  podeNotaInterna: boolean;
  onComentar: (texto: string, interna: boolean) => Promise<void>;
  onAbrirAnexo?: (anexoId: string) => void;
  vazio: string;
}

function FioImpl({ eventos, briefing, podeComentar, podeNotaInterna, onComentar, onAbrirAnexo, vazio }: Props) {
  const [texto, setTexto] = useState("");
  const [interna, setInterna] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    try {
      await onComentar(t, interna);
      setTexto("");
      setInterna(false);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        <Briefing briefing={briefing} falas={eventos.filter((e) => e.tipo === "fala").length} />
        <ol>
        {eventos.length === 0 && <li className="py-8 text-center text-[13px] text-muted-foreground">{vazio}</li>}
        {eventos.map((e) => {
          if (e.tipo === "fala") return <Fala key={e.id} evento={e} />;
          if (e.tipo === "anexo") return <Anexo key={e.id} evento={e} onAbrir={onAbrirAnexo} />;
          return <Mudanca key={e.id} evento={e} />;
        })}
        </ol>
      </div>

      {podeComentar && (
        <div className="shrink-0 border-t border-border/60 px-5 py-3">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Enviar com ⌘/Ctrl+Enter. Enter puro quebra linha, porque
              // resposta de chamado quase sempre tem mais de um parágrafo.
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void enviar();
              }
            }}
            data-fio-resposta
            placeholder={interna ? "Nota visível só para a equipe…" : "Escreva uma resposta…"}
            aria-label="Escrever no fio da demanda"
            className="min-h-[68px] resize-none border-border/60 text-[13px]"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={() => void enviar()} disabled={!texto.trim() || enviando} className="gap-2">
              {enviando && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Responder
            </Button>
            {podeNotaInterna && (
              <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={interna}
                  onChange={(e) => setInterna(e.target.checked)}
                  className="size-3.5 accent-current"
                />
                Nota interna
              </label>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground/70">⌘↵ envia</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const Fio = memo(FioImpl);
