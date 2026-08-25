/**
 * CONCLUIR A DEMANDA EM UM LUGAR SÓ
 *
 * O problema que isto resolve: concluir exigia quatro atos em três telas —
 * mover o status, avisar o solicitante no chat, abrir o fechamento técnico e
 * escrever o relato, depois ir à classificação e justificar. Ninguém faz
 * quatro coisas quando tem vinte demandas. Foi assim que 45 de 46 entregas
 * ficaram sem relato, e o módulo inteiro ficou parecendo quebrado quando
 * estava só intransitável.
 *
 * Aqui é um texto e um clique. O mesmo resumo que você escreveria para o
 * solicitante vira a mensagem no chat, o relato técnico, e a base da
 * classificação.
 *
 * O QUE A IA FAZ, E ONDE ELA PARA
 *
 * Ela lê o relato, escolhe o nível e escreve a justificativa — tudo já
 * marcado na tela. O que ela não faz é gravar.
 *
 * Falta um clique, e ele não é burocracia. A justificativa existe para alguém
 * conferir a decisão meses depois; justificativa de IA defendendo decisão de
 * IA não permite conferir nada. E quem escreve o relato influencia a própria
 * classificação — com uma pessoa confirmando, existe alguém para sustentar o
 * número. Sem isso, o caminho para pontuar mais passaria a ser escrever um
 * resumo mais elaborado, e ninguém precisa ser desonesto para que aconteça.
 *
 * SE A IA NÃO RESPONDER, NADA TRAVA. A sugestão é aditiva: sem ela, a etapa
 * de classificação aparece em branco e a pessoa escolhe como sempre escolheu.
 * A função pode nem estar publicada — neste projeto, deploy de edge function
 * é pelo Lovable e já falhou antes.
 */

import { memo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SugestaoDeClassificacao } from "@/modules/relatorios/services/fechamento-data";

const NIVEIS = [
  { codigo: "facil", rotulo: "Fácil", pontos: 50 },
  { codigo: "media", rotulo: "Médio", pontos: 100 },
  { codigo: "dificil", rotulo: "Difícil", pontos: 200 },
] as const;

const CONFIANCA_AVISO: Record<string, string> = {
  baixa:
    "O Blink não achou base suficiente no relato para ter certeza. Confira com atenção — ou acrescente detalhe ao relato antes de confirmar.",
  media: "O Blink teve dúvida entre dois níveis. Vale um olhar.",
};

export interface ResultadoDaConclusao {
  /** O texto que vai para o chat e vira o relato técnico. */
  resumo: string;
}

interface Props {
  aberto: boolean;
  onFechar: () => void;
  /** Grava status, comentário e relato. Devolve a sugestão, ou null se não veio. */
  onConcluir: (resumo: string) => Promise<SugestaoDeClassificacao | null>;
  /** Grava a classificação confirmada. */
  onClassificar: (codigo: string, justificativa: string) => Promise<void>;
  ticket: string;
}

function ConcluirDemandaImpl({ aberto, onFechar, onConcluir, onClassificar, ticket }: Props) {
  const [resumo, setResumo] = useState("");
  const [etapa, setEtapa] = useState<"resumo" | "classificar">("resumo");
  const [ocupado, setOcupado] = useState(false);
  const [sugestao, setSugestao] = useState<SugestaoDeClassificacao | null>(null);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");

  function reiniciar() {
    setResumo("");
    setEtapa("resumo");
    setSugestao(null);
    setEscolha(null);
    setJustificativa("");
  }

  async function concluir() {
    if (resumo.trim().length < 20 || ocupado) return;
    setOcupado(true);
    try {
      const s = await onConcluir(resumo.trim());
      setSugestao(s);
      // Vem já marcado. É a diferença entre "preencha o formulário" e
      // "confirme se está certo".
      if (s) {
        setEscolha(s.classificacao);
        setJustificativa(s.justificativa);
      }
      setEtapa("classificar");
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar() {
    if (!escolha || justificativa.trim().length < 15 || ocupado) return;
    setOcupado(true);
    try {
      await onClassificar(escolha, justificativa.trim());
      reiniciar();
      onFechar();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        if (!v) {
          reiniciar();
          onFechar();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {etapa === "resumo" ? `Concluir ${ticket}` : "Confirmar a classificação"}
          </DialogTitle>
          <DialogDescription>
            {etapa === "resumo"
              ? "Escreva uma vez. O texto vai para quem pediu e vira o relato técnico da entrega."
              : "O Blink leu o relato e sugeriu. Confira e confirme — quem assina é você."}
          </DialogDescription>
        </DialogHeader>

        {etapa === "resumo" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="resumo">Como ficou?</Label>
            <Textarea
              id="resumo"
              rows={7}
              autoFocus
              placeholder="Do jeito que você contaria para quem pediu. O que estava acontecendo, o que você fez, e como ficou."
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
            />
            {resumo.trim().length > 0 && resumo.trim().length < 20 && (
              <p className="ds-caption text-muted-foreground">
                Faltam {20 - resumo.trim().length} caracteres.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {!sugestao && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-[13px]">
                A demanda foi concluída e o relato ficou gravado. O Blink não conseguiu sugerir
                uma classificação agora — escolha o nível e escreva a justificativa.
              </div>
            )}

            {sugestao && sugestao.confianca !== "alta" && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[13px]">
                {CONFIANCA_AVISO[sugestao.confianca]}
              </div>
            )}

            <div>
              <Label>Classificação</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {NIVEIS.map((n) => (
                  <button
                    key={n.codigo}
                    type="button"
                    onClick={() => setEscolha(n.codigo)}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-[13px] transition-colors",
                      escolha === n.codigo
                        ? "border-foreground bg-foreground text-background"
                        : "hover:bg-accent",
                    )}
                  >
                    {n.rotulo} — {n.pontos} pontos
                    {sugestao?.classificacao === n.codigo && escolha === n.codigo && (
                      <Sparkles className="ml-1.5 inline size-3" aria-hidden />
                    )}
                  </button>
                ))}
              </div>
              {sugestao && escolha !== sugestao.classificacao && (
                <p className="ds-caption mt-1.5 text-muted-foreground">
                  Você trocou a sugestão do Blink. Vale ajustar a justificativa para dizer por quê.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="just">
                Justificativa <span className="text-[11px] font-normal">obrigatória</span>
              </Label>
              <p className="ds-caption mb-1.5 mt-0.5 text-muted-foreground">
                É o que sustenta a decisão se alguém revisar depois. Pode editar à vontade.
              </p>
              <Textarea
                id="just"
                rows={5}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
              {justificativa.trim().length > 0 && justificativa.trim().length < 15 && (
                <p className="ds-caption mt-1 text-muted-foreground">
                  Faltam {15 - justificativa.trim().length} caracteres.
                </p>
              )}
            </div>

            {sugestao && (
              <Badge variant="outline" className="w-fit gap-1 font-normal">
                <Sparkles className="size-3" aria-hidden />
                sugerido pelo Blink · confirmado por você
              </Badge>
            )}
          </div>
        )}

        <DialogFooter>
          {etapa === "resumo" ? (
            <>
              <Button type="button" variant="ghost" onClick={onFechar} disabled={ocupado}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => void concluir()}
                disabled={resumo.trim().length < 20 || ocupado}
              >
                {ocupado && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Concluir demanda
              </Button>
            </>
          ) : (
            <>
              {/* A demanda JÁ foi concluída neste ponto. Fechar aqui não desfaz
                  nada — só adia a classificação, que continua na fila. Dizer
                  isso evita que alguém confirme às pressas achando que vai
                  perder o trabalho. */}
              <Button type="button" variant="ghost" onClick={onFechar} disabled={ocupado}>
                Classificar depois
              </Button>
              <Button
                type="button"
                onClick={() => void confirmar()}
                disabled={!escolha || justificativa.trim().length < 15 || ocupado}
              >
                {ocupado && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Confirmar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const ConcluirDemanda = memo(ConcluirDemandaImpl);
