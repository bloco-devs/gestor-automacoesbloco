import { useState } from "react";
import { CheckCircle2, FolderKanban, Info, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatarData } from "../services/relatorios-service";
import type { ProjetoParaClassificar } from "../services/projetos-data";
import { impedimentoParaClassificar, ratearPontos } from "../services/projeto-rateio";

/**
 * O cartão de um PROJETO na fila de classificação.
 *
 * POR QUE NÃO REUSEI O CARTÃO DE DEMANDA
 *
 * O de demanda mostra problema, solução, alterações, resultado, testes, fio da
 * conversa, tarefas e anexos — tudo que vem do fechamento técnico. Projeto não
 * tem fechamento técnico: foi decisão do André, para não criar uma fila que
 * ninguém preenche. Encaixar projeto naquele cartão significaria cinco blocos
 * vazios e a pergunta "por que está faltando relato aqui?".
 *
 * O que um projeto tem, e a demanda não: mais de uma pessoa. E é isso que o
 * cartão precisa deixar claro antes de alguém apertar Difícil — porque os
 * pontos vão ser divididos.
 */

const TIPOS_ORDEM = ["facil", "media", "dificil"] as const;

export function CartaoDeProjeto({
  item,
  tipos,
  salvando,
  aoClassificar,
}: {
  item: ProjetoParaClassificar;
  tipos: { codigo: string; rotulo: string; pontos: number }[];
  salvando: boolean;
  aoClassificar: (codigo: string, justificativa: string, motivo?: string) => void;
}) {
  const [escolha, setEscolha] = useState<string | null>(item.classificacao);
  const [justificativa, setJustificativa] = useState(item.justificativa ?? "");
  const [motivo, setMotivo] = useState("");

  const congelado = !!item.apurado_no_ciclo;
  const alterando = item.ja_classificado;
  const ordenados = [...tipos].sort(
    (a, b) => TIPOS_ORDEM.indexOf(a.codigo as never) - TIPOS_ORDEM.indexOf(b.codigo as never),
  );

  const pontosEscolhidos = ordenados.find((t) => t.codigo === escolha)?.pontos ?? null;
  /*
   * A conta e a guarda vêm de `projeto-rateio`, que espelha o SQL e é testado
   * contra ele. Refazer aqui seria a segunda conta para o mesmo valor — e a
   * tela prometeria um número que o fechamento não grava.
   */
  const rateio =
    pontosEscolhidos !== null ? ratearPontos(pontosEscolhidos, item.responsaveis) : null;

  const impedimento = impedimentoParaClassificar(
    {
      jaClassificado: item.ja_classificado,
      responsaveis: item.responsaveis,
      apuradoNoCiclo: item.apurado_no_ciclo,
    },
    { classificacao: escolha, pontos: pontosEscolhidos, justificativa, motivo },
  );
  const podeSalvar = impedimento === null;

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <h3 className="ds-card-title truncate">{item.nome}</h3>
            <Badge variant="outline" className="shrink-0">
              Projeto
            </Badge>
          </div>
          <p className="ds-caption mt-1 text-muted-foreground">
            Concluído em {formatarData(item.concluido_em)}
            {item.concluido_por ? ` por ${item.concluido_por}` : ""} ·{" "}
            {item.cartoes} {item.cartoes === 1 ? "tarefa" : "tarefas"}
          </p>
        </div>
        {item.ja_classificado && item.rotulo && (
          <Badge className="shrink-0">
            {item.rotulo} · {item.pontos} pts
          </Badge>
        )}
      </header>

      {/* Quem recebe, e quanto. É a informação que o cartão de demanda não
          precisa ter, porque demanda tem um responsável só. */}
      <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 p-2.5">
        <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="ds-caption">
            {item.responsaveis === 0
              ? "Nenhum responsável registrado"
              : item.responsavel_nomes}
          </p>
          {item.responsaveis === 0 ? (
            <p className="ds-label text-destructive">
              Sem responsável não há a quem creditar os pontos. Reabra e conclua o
              projeto de novo, escolhendo quem trabalhou nele.
            </p>
          ) : (
            <p className="ds-label text-muted-foreground">
              {item.responsaveis === 1
                ? "Os pontos vão inteiros para esta pessoa."
                : `Os pontos serão divididos igualmente entre ${item.responsaveis} pessoas.`}
            </p>
          )}
        </div>
      </div>

      {congelado && (
        <p className="mt-3 flex items-center gap-1.5 ds-caption text-muted-foreground">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          Já apurado no ciclo {item.apurado_no_ciclo}. A classificação não muda mais.
        </p>
      )}

      {!congelado && item.responsaveis > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <Label className="ds-label text-muted-foreground">Classificação</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ordenados.map((t) => (
                <Button
                  key={t.codigo}
                  type="button"
                  variant={escolha === t.codigo ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEscolha(t.codigo)}
                >
                  {t.rotulo} · {t.pontos} pts
                </Button>
              ))}
            </div>
          </div>

          {rateio && (
            <p
              className={cn(
                "flex items-start gap-1.5 ds-caption",
                impedimento === "rateio-impossivel"
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {impedimento === "rateio-impossivel"
                ? `${pontosEscolhidos} pontos não dividem entre ${item.responsaveis} pessoas sem alguém ficar com zero.`
                : item.responsaveis === 1
                  ? `${rateio.porPessoa} pontos para ${item.responsavel_nomes}.`
                  : rateio.sobra === 0
                    ? `${rateio.porPessoa} pontos para cada uma das ${item.responsaveis} pessoas.`
                    : `${rateio.porPessoa} pontos para cada, e ${rateio.primeiroRecebe} para o primeiro responsável — a divisão de ${pontosEscolhidos} por ${item.responsaveis} não é exata.`}
            </p>
          )}

          <div>
            <Label htmlFor={`just-${item.projeto_id}`} className="ds-label text-muted-foreground">
              Justificativa
            </Label>
            <Textarea
              id={`just-${item.projeto_id}`}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Por que o escopo, o impacto ou o risco deste projeto levam a esta classificação?"
              className="mt-1.5"
            />
            <p className="mt-1 ds-label text-muted-foreground">
              {justificativa.trim().length < 15
                ? `Faltam ${15 - justificativa.trim().length} caracteres.`
                : "Projeto não tem fechamento técnico: esta justificativa é o que sustenta a decisão numa revisão futura."}
            </p>
          </div>

          {alterando && (
            <div>
              <Label htmlFor={`mot-${item.projeto_id}`} className="ds-label text-muted-foreground">
                Motivo da alteração
              </Label>
              <Textarea
                id={`mot-${item.projeto_id}`}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                placeholder="O que mudou no entendimento desde a classificação anterior?"
                className="mt-1.5"
              />
            </div>
          )}

          {item.autoclassificada && (
            <p className="ds-label text-muted-foreground">
              Registrado como autoclassificação: quem classificou também é responsável
              pelo projeto.
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={!podeSalvar || salvando}
              onClick={() =>
                escolha &&
                aoClassificar(
                  escolha,
                  justificativa.trim(),
                  alterando ? motivo.trim() : undefined,
                )
              }
            >
              <CheckCircle2 className="mr-1.5 size-4" aria-hidden />
              {alterando ? "Alterar classificação" : "Classificar"}
            </Button>
            {item.vezes_alterada > 0 && (
              <span className={cn("ds-label text-muted-foreground")}>
                alterada {item.vezes_alterada}×
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
