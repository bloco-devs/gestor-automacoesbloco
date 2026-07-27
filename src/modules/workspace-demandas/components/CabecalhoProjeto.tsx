import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Resumo } from "@/domain/demand";
import type { ProjetoAtual } from "@/modules/demand-access";

/**
 * Cabeçalho do projeto — 3 linhas, ~90px.
 *
 * POR QUE ELE VOLTOU
 * Na reescrita do F027 eu removi o cabeçalho junto com o resto do módulo
 * antigo e não recoloquei. O resultado, visível na tela: dava para trabalhar
 * sem nunca saber em qual projeto se está, nem como ele vai. Trocar de projeto
 * também não dava sinal nenhum de que algo mudou.
 *
 * Não é um hero: é uma faixa fina. A ordem das informações segue a ordem das
 * perguntas de quem entra — onde estou, como vai, quem está junto, está vivo?
 *
 * Os números de atenção são clicáveis: um número que não leva a lugar nenhum é
 * decoração. "3 sem responsável" aplica a fila correspondente.
 */

interface Props {
  projeto: ProjetoAtual;
  resumo: Resumo;
  onFila: (fila: "em_risco" | "sem_responsavel") => void;
}

function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function tempoRelativo(iso: string | null): string {
  if (!iso) return "sem movimentação";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (dias < 1) return "ativo hoje";
  if (dias === 1) return "ativo ontem";
  if (dias < 30) return `ativo há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return `ativo há ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

function CabecalhoProjetoImpl({ projeto, resumo, onFila }: Props) {
  return (
    <header className="border-b border-border/50">
      <div className="mx-auto flex w-full max-w-[1400px] items-start gap-3 px-5 py-3 md:px-8">
        {/* Único lugar onde a cor escolhida para o projeto aparece. Substitui os
            papéis de parede em gradiente herdados do Trello. */}
        <span
          aria-hidden
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-border/60 bg-muted text-[13px] font-medium text-muted-foreground"
          style={!projeto.capaUrl && projeto.cor ? { backgroundColor: projeto.cor } : undefined}
        >
          {projeto.capaUrl ? (
            <img src={projeto.capaUrl} alt="" className="size-full object-cover" />
          ) : (
            // Sem capa, a inicial identifica melhor que um quadrado vazio.
            projeto.nome.trim().charAt(0).toUpperCase()
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="ds-h3 truncate">{projeto.nome}</h1>
          {projeto.descricao ? (
            <p className="ds-caption mt-0.5 line-clamp-1 text-muted-foreground">{projeto.descricao}</p>
          ) : null}

          <div className="ds-caption mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-1 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span
                  className="block h-full rounded-full bg-foreground/60 transition-[width] duration-slow ease-standard"
                  style={{ width: `${resumo.progresso}%` }}
                />
              </span>
              {/* Barra sem número obriga a estimar. */}
              <span className="tabular-nums text-foreground">
                {resumo.concluidas}/{resumo.total}
              </span>
              concluídas
            </span>

            {resumo.emRisco > 0 && (
              <button
                type="button"
                onClick={() => onFila("em_risco")}
                className="flex items-center gap-1.5 rounded px-1 -mx-1 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="size-1.5 rounded-full bg-destructive" aria-hidden />
                <span className="tabular-nums text-foreground">{resumo.emRisco}</span> em risco
              </button>
            )}

            {resumo.semResponsavel > 0 && (
              <button
                type="button"
                onClick={() => onFila("sem_responsavel")}
                className="flex items-center gap-1 rounded px-1 -mx-1 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="tabular-nums text-foreground">{resumo.semResponsavel}</span> sem responsável
              </button>
            )}

            {resumo.carga.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="flex -space-x-1.5" aria-label={`${resumo.carga.length} pessoas`}>
                  {resumo.carga.slice(0, 4).map((c) => (
                    <Avatar key={c.pessoa.id} className="size-5 ring-1 ring-background" title={c.pessoa.nome}>
                      {c.pessoa.avatarUrl && <AvatarImage src={c.pessoa.avatarUrl} alt={c.pessoa.nome} />}
                      <AvatarFallback className="bg-muted text-[9px]">{iniciais(c.pessoa.nome)}</AvatarFallback>
                    </Avatar>
                  ))}
                </span>
                {resumo.carga.length > 4 && (
                  <span className="tabular-nums">+{resumo.carga.length - 4}</span>
                )}
              </span>
            )}

            <span className={cn("ml-auto", !resumo.ultimaAtividade && "italic")}>
              {tempoRelativo(resumo.ultimaAtividade)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export const CabecalhoProjeto = memo(CabecalhoProjetoImpl);
