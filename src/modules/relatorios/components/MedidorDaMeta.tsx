import { memo, useMemo, type ReactNode } from "react";
import { formatarPercentual, formatarReais } from "../services/apuracao-data";
import type { Faixa } from "../types";

/**
 * O medidor da meta.
 *
 * POR QUE ELE EXISTE
 *
 * A primeira versão da apuração dava quatro números do mesmo tamanho — pontos,
 * meta, alcance, remuneração — e deixava o leitor dividir de cabeça. A
 * pergunta que traz alguém a esta tela não é "quantos pontos temos", é
 * "quanto falta para a próxima faixa, e quanto ela vale". Nenhum dos quatro
 * números respondia isso.
 *
 * Aqui a régua inteira fica visível: onde a equipe está, onde ficam os
 * degraus, e quanto cada degrau paga. As marcas vêm das faixas cadastradas —
 * se o RH mudar a regra, o medidor muda com ela.
 *
 * O DEGRAU SEM VALOR APARECE COMO LACUNA
 *
 * A faixa de 100,01% a 119,99% tem valor nulo. No medidor ela é hachurada, e
 * a marca diz "a definir" em vez de um número. É a única forma honesta de
 * desenhar uma regra que ainda não existe: mostrar o vão em vez de esticar a
 * faixa vizinha para cobri-lo.
 */

interface Props {
  /** Rótulo e janela do ciclo. Ficam dentro do cartão, e não num título de
   *  seção acima dele — ali colidiam com o subtítulo da página. */
  rotulo: string;
  periodo: string;
  situacao: ReactNode;
  pontos: number;
  meta: number;
  percentual: number | null;
  faixas: Faixa[];
  /** Situação da faixa atual, resolvida no banco. */
  indefinida: boolean;
  faixaRotulo: string | null;
  valorReais: number | null;
}

function MedidorImpl({
  rotulo,
  periodo,
  situacao,
  pontos,
  meta,
  percentual,
  faixas,
  indefinida,
  faixaRotulo,
  valorReais,
}: Props) {
  const pct = percentual ?? 0;

  // A régua vai até o último degrau ou até onde a equipe chegou, o que for
  // maior, com folga de 15% à direita. A folga não é estética: sem ela o
  // marcador de 120% cai a 95% da largura e a legenda, centrada, vaza para
  // fora da caixa — foi exatamente o que aconteceu.
  const ultimoDegrau = Math.max(120, ...faixas.map((f) => f.percentualMin));
  const teto = Math.max(ultimoDegrau, Math.ceil(pct / 20) * 20) * 1.15;
  const posicao = (v: number) => Math.min(100, (v / teto) * 100);

  /**
   * Ancoragem consciente da borda.
   *
   * `-translate-x-1/2` centra a legenda no marcador, o que é certo no meio da
   * régua e errado nas pontas: metade do texto sai da caixa. Perto das bordas
   * a legenda passa a se alinhar por dentro.
   */
  const ancora = (posPct: number) =>
    posPct < 6 ? "translate-x-0 items-start"
    : posPct > 94 ? "-translate-x-full items-end"
    : "-translate-x-1/2 items-center";

  // Só as faixas com um degrau visível interessam ao desenho. A primeira
  // (0–80%) é o chão, não um marco.
  const marcos = useMemo(
    () =>
      faixas
        .filter((f) => f.percentualMin > 0)
        .sort((a, b) => a.percentualMin - b.percentualMin)
        .map((f) => ({
          pct: f.percentualMin,
          rotulo: `${f.percentualMin.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`,
          valor: f.valorReais,
          alcancado: pct >= f.percentualMin,
        })),
    [faixas, pct],
  );

  const tom = indefinida
    ? "warning"
    : pct >= 100
      ? "success"
      : pct >= 80
        ? "info"
        : "muted";

  const CORES = {
    success: { barra: "bg-success", texto: "text-success" },
    info: { barra: "bg-info", texto: "text-info" },
    warning: { barra: "bg-warning", texto: "text-warning" },
    muted: { barra: "bg-muted-foreground/40", texto: "text-muted-foreground" },
  } as const;
  const cor = CORES[tom];

  const faltamParaMeta = Math.max(0, meta - pontos);

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <div>
          <span className="ds-h3">{rotulo}</span>
          <span className="ds-caption ml-2 text-muted-foreground">{periodo}</span>
        </div>
        {situacao}
      </div>

      {/* O número que domina. Tudo o resto é contexto dele. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="ds-label text-muted-foreground">Pontos do ciclo</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="font-semibold tabular-nums tracking-tight"
              style={{ fontSize: "2.75rem", lineHeight: "1" }}
            >
              {pontos.toLocaleString("pt-BR")}
            </span>
            <span className="ds-h3 text-muted-foreground">/ {meta.toLocaleString("pt-BR")}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="ds-label text-muted-foreground">Alcance</span>
          <div className={`ds-metric mt-1 ${cor.texto}`}>{formatarPercentual(percentual)}</div>
        </div>
      </div>

      {/* A régua. */}
      <div className="mt-6">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {/* A lacuna, hachurada. Aparece só se houver faixa sem valor. */}
          {faixas
            .filter((f) => f.valorReais === null && f.percentualMax !== null)
            .map((f) => (
              <div
                key={f.id}
                className="absolute inset-y-0 opacity-60"
                style={{
                  left: `${posicao(f.percentualMin)}%`,
                  width: `${posicao(f.percentualMax!) - posicao(f.percentualMin)}%`,
                  backgroundImage:
                    "repeating-linear-gradient(45deg, hsl(var(--warning)/0.35) 0 4px, transparent 4px 8px)",
                }}
                title="Faixa sem valor definido"
              />
            ))}

          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${cor.barra}`}
            style={{ width: `${posicao(pct)}%` }}
          />

          {/* Os degraus, sobre a barra. */}
          {marcos.map((m) => (
            <div
              key={m.pct}
              className="absolute inset-y-0 w-px bg-border-strong"
              style={{ left: `${posicao(m.pct)}%` }}
              aria-hidden
            />
          ))}
        </div>

        {/* As legendas dos degraus, com o que cada um paga. */}
        <div className="relative mt-2 h-9">
          {marcos.map((m) => (
            <div
              key={m.pct}
              className={`absolute flex flex-col whitespace-nowrap ${ancora(posicao(m.pct))}`}
              style={{ left: `${posicao(m.pct)}%` }}
            >
              <span
                className={[
                  "text-[11px] tabular-nums",
                  m.alcancado ? "font-medium" : "text-muted-foreground",
                ].join(" ")}
              >
                {m.rotulo}
              </span>
              <span
                className={[
                  "text-[11px] tabular-nums",
                  m.valor === null ? "text-warning" : "text-muted-foreground",
                ].join(" ")}
              >
                {m.valor === null ? "a definir" : formatarReais(m.valor)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* A conclusão, em uma linha. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-[13px]">
        <span className={`font-medium ${cor.texto}`}>
          {indefinida ? "Faixa de remuneração não definida" : (faixaRotulo ?? "—")}
        </span>
        {!indefinida && valorReais !== null && (
          <span className="tabular-nums">{formatarReais(valorReais)}</span>
        )}
        {faltamParaMeta > 0 && (
          <span className="text-muted-foreground">
            faltam {faltamParaMeta.toLocaleString("pt-BR")} pontos para a meta
          </span>
        )}
        {indefinida && (
          <span className="text-muted-foreground">necessária definição do RH</span>
        )}
      </div>
    </div>
  );
}

export default memo(MedidorImpl);
export { MedidorImpl as MedidorDaMeta };
