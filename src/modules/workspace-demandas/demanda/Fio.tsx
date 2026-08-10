import { memo, useMemo, useState } from "react";
import {
  Bot,
  ChevronDown,
  Loader2,
  Lock,
  LockOpen,
  Paperclip,
  Pencil,
  SendHorizontal,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import { dobrarMudancas, representanteDaDobra } from "@/domain/demand";
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
 * Uma sequência de mudanças, dobrada.
 *
 * A linha fechada mostra o ESTADO ATUAL — o último movimento da sequência — e
 * quantos passos houve até ele. Se alguém moveu para Testes, voltou para
 * Backlog e terminou em Concluído, o que interessa ler é "Concluído"; o
 * caminho se consulta quando se quer.
 *
 * Ela abre no próprio lugar, em vez de mandar a pessoa a outra tela, porque
 * aqui não há para onde mandar: o fio É o lugar do histórico. Aberta, os
 * eventos voltam na ordem original, sem nada resumido.
 */
function Dobra({ eventos }: { eventos: Evento[] }) {
  const [aberta, setAberta] = useState(false);
  const atual = representanteDaDobra(eventos);

  if (aberta) {
    return (
      <>
        {eventos.map((e) => (
          <Mudanca key={e.id} evento={e} />
        ))}
        <li className="pl-9">
          <button
            type="button"
            onClick={() => setAberta(false)}
            className="rounded text-[12px] text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Recolher
          </button>
        </li>
      </>
    );
  }

  return (
    <li className="py-1 pl-9">
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-expanded={false}
        className={cn(
          "group/dobra flex w-full items-baseline gap-2 rounded text-left text-[12px] text-muted-foreground",
          "transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <span aria-hidden className="size-1 shrink-0 rounded-full bg-border" />
        <span className="min-w-0">
          <span className="text-foreground/70">{atual.autor?.nome ?? "Sistema"}</span> {atual.texto}
        </span>
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
          +{eventos.length - 1}
        </span>
        <ChevronDown
          aria-hidden
          className="size-3 shrink-0 opacity-0 transition-opacity group-hover/dobra:opacity-100"
        />
        <time className="ml-auto shrink-0 tabular-nums" dateTime={atual.em}>
          {quando(atual.em)}
        </time>
      </button>
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

/**
 * Uma fala do fio.
 *
 * AS AÇÕES SÓ APARECEM NO HOVER, E SÓ PARA QUEM ESCREVEU
 * Lápis e lixeira visíveis em toda mensagem transformam a conversa numa
 * planilha de linhas editáveis. Escondidos até o mouse chegar, eles existem
 * quando se precisa deles e desaparecem quando se está lendo. `focus-within`
 * mantém a promessa para quem navega por teclado — ali o hover não acontece.
 */
function Fala({
  evento,
  onEditar,
  onExcluir,
}: {
  evento: Evento;
  onEditar?: (comentarioId: string, texto: string) => Promise<void>;
  onExcluir?: (comentarioId: string) => Promise<void>;
}) {
  const ia = evento.autor?.ia ?? false;
  const sistema = evento.autor?.sistema ?? false;
  const podeAgir = !!evento.comentarioId && !!evento.editavel && (!!onEditar || !!onExcluir);

  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(evento.texto);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const salvar = async () => {
    const t = rascunho.trim();
    if (!t || !evento.comentarioId || !onEditar || salvando) return;
    setSalvando(true);
    try {
      await onEditar(evento.comentarioId, t);
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <li
      className={cn(
        "group/fala flex gap-3 py-3",
        evento.interna && "rounded-md bg-warning/5 px-2 -mx-2",
      )}
    >
      {sistema ? (
        /* O aviso automático não tem rosto porque não tem autor. O ícone diz
           "isto veio do sistema" sem se disfarçar de pessoa nem de IA. */
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-label="Sistema"
        >
          <Bot className="size-3.5" aria-hidden />
        </span>
      ) : ia ? (
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
          <span className="text-[13px] font-medium">
            {sistema ? "Blink" : (evento.autor?.nome ?? "Alguém")}
          </span>
          {sistema && (
            <Badge variant="neutral" className="text-[10px] font-normal">
              automático
            </Badge>
          )}
          {evento.interna && (
            <span className="inline-flex items-center gap-1 text-[11px] text-warning">
              <Lock className="size-3" aria-hidden />
              nota interna
            </span>
          )}

          <span className="ml-auto flex shrink-0 items-center gap-1">
            {podeAgir && !editando && (
              <span
                className={cn(
                  "flex items-center gap-0.5 opacity-0 transition-opacity",
                  "group-hover/fala:opacity-100 focus-within:opacity-100",
                )}
              >
                {onEditar && (
                  <button
                    type="button"
                    aria-label="Editar comentário"
                    title="Editar"
                    onClick={() => {
                      setRascunho(evento.texto);
                      setEditando(true);
                    }}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Pencil className="size-3" aria-hidden />
                  </button>
                )}
                {onExcluir && (
                  <button
                    type="button"
                    aria-label="Excluir comentário"
                    title="Excluir"
                    onClick={() => setConfirmando(true)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Trash2 className="size-3" aria-hidden />
                  </button>
                )}
              </span>
            )}
            <time className="text-[12px] tabular-nums text-muted-foreground" dateTime={evento.em}>
              {quando(evento.em)}
              {evento.editadoEm ? " · editado" : ""}
            </time>
          </span>
        </div>

        {editando ? (
          <div className="mt-1.5 space-y-1.5">
            <Textarea
              value={rascunho}
              autoFocus
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void salvar();
                }
                if (e.key === "Escape") setEditando(false);
              }}
              aria-label="Editar o texto do comentário"
              className="min-h-[64px] resize-none text-[13px] leading-relaxed"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-[12px]" disabled={!rascunho.trim() || salvando} onClick={() => void salvar()}>
                {salvando ? <Loader2 className="size-3 animate-spin" aria-hidden /> : "Salvar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[12px]"
                onClick={() => setEditando(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed">{evento.texto}</p>
        )}
      </div>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Ele sai da conversa para todos. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (evento.comentarioId && onExcluir) void onExcluir(evento.comentarioId);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}


interface Props {
  eventos: Evento[];
  /**
   * O pedido original, como quem abriu escreveu.
   *
   * Ele vivia num painel à parte, no fim da coluna de detalhes — abaixo de
   * onze campos. Era o texto mais importante da tela, no lugar de menor
   * prioridade visual, e obrigava a cruzar duas leituras para entender uma
   * conversa que começava pela metade.
   *
   * Aqui ele é o que sempre foi: a primeira fala.
   */
  pedido?: { texto: string; autor: Evento["autor"]; em: string } | null;
  /** O resumo de 30 segundos. Ele aparece antes da primeira mensagem. */
  briefing: DadosDoBriefing;
  podeComentar: boolean;
  /** Só a equipe escreve nota interna; o solicitante nem vê a opção. */
  podeNotaInterna: boolean;
  onComentar: (texto: string, interna: boolean) => Promise<void>;
  /** Ausentes quando a origem da demanda não guarda comentários editáveis. */
  onEditarComentario?: (comentarioId: string, texto: string) => Promise<void>;
  onExcluirComentario?: (comentarioId: string) => Promise<void>;
  onAbrirAnexo?: (anexoId: string) => void;
  vazio: string;
}

function FioImpl({
  eventos,
  pedido,
  briefing,
  podeComentar,
  podeNotaInterna,
  onComentar,
  onEditarComentario,
  onExcluirComentario,
  onAbrirAnexo,
  vazio,
}: Props) {
  const itens = useMemo(() => dobrarMudancas(eventos), [eventos]);
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
        {pedido && (
          <Fala
            evento={{
              id: "pedido-original",
              tipo: "fala",
              autor: pedido.autor,
              em: pedido.em,
              texto: pedido.texto,
              interna: false,
            }}
          />
        )}
        {eventos.length === 0 && !pedido && (
          <li className="py-8 text-center text-[13px] text-muted-foreground">{vazio}</li>
        )}
        {itens.map((item) => {
          if (item.tipo === "dobra") return <Dobra key={item.id} eventos={item.eventos} />;
          const e = item.evento;
          if (e.tipo === "fala")
            return <Fala key={e.id} evento={e} onEditar={onEditarComentario} onExcluir={onExcluirComentario} />;
          if (e.tipo === "anexo") return <Anexo key={e.id} evento={e} onAbrir={onAbrirAnexo} />;
          return <Mudanca key={e.id} evento={e} />;
        })}
        </ol>
      </div>

      {podeComentar && (
        /**
         * O COMPOSITOR PARECE UM CAMPO DE CONVERSA, NÃO UM FORMULÁRIO
         *
         * Antes: uma caixa de texto retangular e, abaixo dela, um botão, uma
         * caixinha de seleção e um atalho — quatro elementos soltos numa
         * fileira, cada um com peso próprio. Lia-se como formulário de
         * cadastro, e formulário passa a impressão de que responder custa
         * trabalho. Numa tela cujo objetivo é fazer as pessoas conversarem,
         * essa impressão é cara.
         *
         * Agora tudo vive dentro de uma única superfície arredondada, com o
         * enviar como botão circular no canto — a forma que qualquer pessoa
         * reconhece de mensageiro. O contorno acende quando o campo tem foco,
         * então a área ativa é evidente sem precisar de rótulo.
         *
         * A nota interna vira um botão de alternância em vez de checkbox, e
         * pinta o campo inteiro de âmbar quando ligada. Mandar para o cliente
         * o que era para ficar entre a equipe é o erro mais caro possível
         * aqui — ele precisa ser visível o tempo todo, não a partir de um
         * quadradinho de 14px.
         */
        <div className="shrink-0 border-t border-border/60 px-5 py-3">
          <div
            className={cn(
              "rounded-2xl border bg-background transition-colors duration-fast",
              "focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/15",
              interna ? "border-warning/50 bg-warning/5" : "border-border/70",
            )}
          >
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                // Enter envia, como em qualquer mensageiro. Shift+Enter quebra
                // linha para quem precisa de mais de um parágrafo, e
                // ⌘/Ctrl+Enter continua valendo por hábito.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar();
                }
              }}
              data-fio-resposta
              placeholder={interna ? "Nota visível só para a equipe…" : "Escreva uma resposta…"}
              aria-label="Escrever no fio da demanda"
              className={cn(
                "min-h-[52px] resize-none border-0 bg-transparent px-4 pt-3 text-[13px] leading-relaxed",
                "shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
              )}
            />

            <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-0.5">
              {podeNotaInterna && (
                <button
                  type="button"
                  onClick={() => setInterna((v) => !v)}
                  aria-pressed={interna}
                  title={
                    interna
                      ? "Esta nota fica só para a equipe"
                      : "Marcar como nota interna — quem abriu não vê"
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    interna
                      ? "bg-warning/15 text-warning-foreground ring-1 ring-warning/40"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {interna ? (
                    <Lock className="size-3" aria-hidden />
                  ) : (
                    <LockOpen className="size-3" aria-hidden />
                  )}
                  {interna ? "Só para a equipe" : "Nota interna"}
                </button>
              )}

              <span className="ml-auto hidden text-[11px] text-muted-foreground/60 sm:inline">
                ⌘↵ envia
              </span>

              <button
                type="button"
                onClick={() => void enviar()}
                disabled={!texto.trim() || enviando}
                aria-label={interna ? "Salvar nota interna" : "Responder"}
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-fast",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  texto.trim() && !enviando
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground/50",
                )}
              >
                {enviando ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <SendHorizontal className="size-3.5" aria-hidden />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Fio = memo(FioImpl);
