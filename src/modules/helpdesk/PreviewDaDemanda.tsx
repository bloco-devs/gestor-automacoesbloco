import { memo, useState } from "react";
import { ChevronDown, Loader2, Paperclip, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  COMPLEXIDADE_ROTULO,
  PRIORIDADE_ROTULO,
  TIPO_ROTULO,
  problemasDe,
  type NovaDemanda,
} from "@/domain/demand";

/**
 * O preview — a única tela em que o solicitante vê o que a IA entendeu.
 *
 * A REGRA QUE ORGANIZA ESTA TELA
 * O usuário comum nunca precisa entender linguagem técnica. Ele precisa
 * responder uma pergunta: *é isso mesmo que eu quis dizer?* Tudo que não ajuda
 * a responder isso está escondido.
 *
 * VISÍVEL          o que a IA entendeu · tipo · sistema · prioridade ·
 *                  critérios de aceite
 * RECOLHIDO        descrição técnica, complexidade, confiança da IA
 *
 * O QUE ESTA TELA NÃO TEM, DE PROPÓSITO
 * Campos editáveis. O modelo anterior pedia que a pessoa corrigisse `setor`
 * num select e `tipo` em outro — ou seja, devolvia o formulário que a conversa
 * existia para eliminar. Aqui só há dois caminhos: **confirmar**, ou **"não é
 * isso"**, que devolve à conversa para explicar com as próprias palavras. Quem
 * corrige é a IA, não o usuário preenchendo campo.
 *
 * A CONFIANÇA APARECE, MAS SEM NÚMERO
 * Percentual de confiança é informação para quem calibra o modelo, não para
 * quem pediu ajuda. Quando a IA está insegura, a tela diz isso em português e
 * sugere revisar — que é a ação, não a métrica.
 */

interface Props {
  nova: NovaDemanda;
  /** O nome do sistema, já resolvido: esta tela não consulta nada. */
  sistemaNome: string | null;
  /**
   * O que a pessoa anexou durante a conversa e vai junto na criação.
   *
   * Aparece aqui pela regra que abre este arquivo: preview que mostra uma coisa
   * e grava outra é pior que não ter preview. A barra de conversa some nesta
   * fase, e com ela sumiriam as fichas dos arquivos — a pessoa confirmaria sem
   * ver que o print que ela mandou está incluído.
   */
  anexos?: Array<{ id: string; nome: string }>;
  onConfirmar: () => void;
  onVoltarParaConversa: () => void;
  enviando: boolean;
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="w-24 shrink-0 text-[12px] text-muted-foreground">{rotulo}</span>
      <span className="min-w-0 flex-1 text-[13px]">{children}</span>
    </div>
  );
}

function PreviewDaDemandaImpl({
  nova,
  sistemaNome,
  anexos = [],
  onConfirmar,
  onVoltarParaConversa,
  enviando,
}: Props) {
  const [detalhes, setDetalhes] = useState(false);
  const problemas = problemasDe(nova);
  const insegura = nova.confianca < 0.6;

  return (
    <section
      aria-label="Confira o que entendemos"
      className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card"
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
        <h2 className="text-[15px] font-medium">Confira se entendi certo</h2>
      </header>

      <div className="px-5 py-4">
        <p className="text-[15px] font-medium leading-snug">{nova.titulo}</p>
        {/*
          `whitespace-pre-wrap` porque a descrição vem em blocos — O QUE
          ACONTECE, COMO REPRODUZIR, COMPORTAMENTO ESPERADO — separados por
          linha em branco. Sem isso o HTML colapsa tudo num parágrafo só, e o
          formato que existe justamente para ser escaneável em três segundos
          vira um bloco corrido que ninguém lê.
        */}
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
          {nova.resumo}
        </p>

        <div className="mt-4 border-t border-border/50 pt-2">
          <Campo rotulo="Tipo">{TIPO_ROTULO[nova.tipo]}</Campo>
          <Campo rotulo="Sistema">
            {sistemaNome ?? <span className="text-muted-foreground">Não identificado</span>}
          </Campo>
          <Campo rotulo="Prioridade">{PRIORIDADE_ROTULO[nova.prioridade]}</Campo>
        </div>

        <div className="mt-4">
          <p className="text-[12px] text-muted-foreground">Vamos considerar resolvido quando</p>
          <ul className="mt-1.5 space-y-1">
            {nova.criteriosDeAceite.map((c) => (
              <li key={c} className="flex gap-2 text-[13px] leading-snug">
                <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {anexos.length > 0 && (
          <div className="mt-4">
            <p className="text-[12px] text-muted-foreground">Vai junto</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {anexos.map((a) => (
                <li
                  key={a.id}
                  className="flex max-w-[15rem] items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2 py-1 text-[12px]"
                >
                  <Paperclip className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate" title={a.nome}>
                    {a.nome}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {insegura && (
          <p className="mt-4 rounded-md bg-warning/10 px-3 py-2 text-[13px] text-warning-foreground">
            Não tenho certeza de que entendi bem. Vale reler antes de confirmar.
          </p>
        )}

        {problemas.length > 0 && (
          <ul className="mt-4 space-y-1" role="alert">
            {problemas.map((p) => (
              <li key={p} className="text-[13px] text-destructive">
                {p}
              </li>
            ))}
          </ul>
        )}

        <Collapsible open={detalhes} onOpenChange={setDetalhes} className="mt-4">
          <CollapsibleTrigger
            className={cn(
              "flex items-center gap-1 rounded text-[12px] text-muted-foreground",
              "transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform duration-fast", detalhes && "rotate-180")}
              aria-hidden
            />
            Ver detalhes técnicos
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 rounded-md bg-muted/40 px-3 py-2.5">
            <Campo rotulo="Complexidade">{COMPLEXIDADE_ROTULO[nova.complexidade]}</Campo>
            {nova.descricaoTecnica && (
              <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">
                {nova.descricaoTecnica}
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <footer className="flex items-center gap-2 border-t border-border/60 px-5 py-3">
        <Button onClick={onConfirmar} disabled={enviando || problemas.length > 0} className="gap-2">
          {enviando && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {enviando ? "Criando…" : "Confirmar"}
        </Button>
        {/* Corrigir é falar de novo, não preencher campo. */}
        <Button variant="ghost" onClick={onVoltarParaConversa} disabled={enviando}>
          Não é isso
        </Button>
      </footer>
    </section>
  );
}

export const PreviewDaDemanda = memo(PreviewDaDemandaImpl);
