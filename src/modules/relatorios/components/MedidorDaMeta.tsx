import { memo, useCallback, useMemo, type ReactNode } from "react";
import { formatarPercentual, formatarReais } from "../services/apuracao-data";
import { ALTURA_DA_LINHA, distribuirEmLinhas } from "../services/rotulos-do-medidor";
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
  const posicao = useCallback((v: number) => Math.min(100, (v / teto) * 100), [teto]);

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

  /**
   * Só as faixas com um degrau visível interessam ao desenho. A primeira
   * (0–80%) é o chão, não um marco. A linha de cada rótulo sai de
   * `distribuirEmLinhas`, para que dois degraus vizinhos não se sobreponham.
   */
  const marcos = useMemo(() => {
    const map = new Map<number, { pct: number; rotulo: string; valor: number | null; alcancado: boolean }>();
    for (const f of faixas.filter((f) => f.percentualMin > 0)) {
      if (!map.has(f.percentualMin)) {
        map.set(f.percentualMin, {
          pct: f.percentualMin,
          // Duas casas, não zero. Arredondando, 100,01% era escrito "100%" — e
          // a régua passava a mostrar dois degraus distintos com o mesmo nome,
          // um pagando R$ 1.000,00 e o outro "a definir".
          rotulo: `${f.percentualMin.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`,
          valor: f.valorReais,
          alcancado: pct >= f.percentualMin,
        });
      }
    }

    const ordenados = Array.from(map.values()).sort((a, b) => a.pct - b.pct);
    const posicoes = ordenados.map((m) => posicao(m.pct));
    const linhas = distribuirEmLinhas(posicoes);

    return ordenados.map((m, i) => ({ ...m, pos: posicoes[i], linha: linhas[i] }));
  }, [faixas, pct, posicao]);

  const alturaDosRotulos =
    (Math.max(0, ...marcos.map((m) => m.linha)) + 1) * ALTURA_DA_LINHA;

  const tom = indefinida
    ? "warning"
    : pct >= 100
      ? "success"
      : pct >= 80
        ? "info"
        : "muted";

  const CORES = {
    success: { barra: "bg-success", texto: "text-success", pilula: "bg-success text-success-foreground" },
    info:    { barra: "bg-info",    texto: "text-info",    pilula: "bg-info text-info-foreground" },
    warning: { barra: "bg-warning", texto: "text-warning", pilula: "bg-warning text-warning-foreground" },
    muted:   { barra: "bg-muted-foreground", texto: "text-muted-foreground", pilula: "bg-muted-foreground text-background" },
  } as const;
  const cor = CORES[tom];

  /**
   * A régua virada em segmentos.
   *
   * Cada faixa cadastrada é uma fatia com largura proporcional. A faixa de
   * "exatamente 100%" tem largura zero por definição — recebe um mínimo
   * visível, senão a regra mais importante da escala simplesmente não
   * apareceria.
   *
   * A faixa alcançada fica sólida; as ainda não alcançadas, apagadas. Assim
   * a barra informa duas coisas ao mesmo tempo: qual é a regra, e até onde a
   * equipe chegou.
   */
  const segmentos = useMemo(() => {
    const ordenadas = [...faixas].sort((a, b) => a.percentualMin - b.percentualMin);
    return ordenadas.map((f, i) => {
      const fim = f.percentualMax ?? teto;
      const bruta = posicao(fim) - posicao(f.percentualMin);
      const largura = Math.max(bruta, f.percentualMax === f.percentualMin ? 1.5 : 0.5);
      const alcancado = pct >= f.percentualMin;
      const semValor = f.valorReais === null;

      const classe = semValor
        ? "shrink-0"
        : f.valorReais === 0
          ? alcancado ? "bg-muted-foreground/60" : "bg-muted"
          : i === ordenadas.length - 1
            ? alcancado ? "bg-success" : "bg-success/20"
            : alcancado ? "bg-info" : "bg-info/20";

      return {
        chave: f.id,
        largura,
        classe,
        hachurado: semValor,
        titulo: semValor
          ? `${f.percentualMin}% a ${f.percentualMax}% — valor não definido`
          : `${f.rotulo ?? ""} — ${formatarReais(f.valorReais)}`,
      };
    });
  }, [faixas, pct, teto, posicao]);

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

      {/* ======================================================
          A RÉGUA, COMO ESCALA SEGMENTADA

          A primeira versão era uma barra de progresso: trilha cinza mais um
          preenchimento até a posição atual, e as marcas dos degraus como
          linhas de 1px usando `bg-border-strong` — classe que NÃO EXISTE neste
          projeto. As linhas ficavam invisíveis, e sobrava cinza com um
          retalho hachurado flutuando no meio, que parece defeito.

          Além do erro de classe, o desenho estava errado: barra de progresso
          com zero por cento não mostra nada, e a regra de remuneração
          desaparecia junto. Agora cada faixa é um SEGMENTO sempre visível —
          a régua inteira se lê mesmo com 0 pontos — e a posição da equipe é
          um ponteiro por cima.
          ====================================================== */}
      <div className="mt-6">
        <div className="flex h-3 w-full gap-px overflow-hidden rounded-full">
          {segmentos.map((seg) => (
            <div
              key={seg.chave}
              className={seg.classe}
              style={{
                width: `${seg.largura}%`,
                ...(seg.hachurado
                  ? {
                      backgroundImage:
                        "repeating-linear-gradient(45deg, hsl(var(--warning)/0.5) 0 4px, hsl(var(--warning)/0.12) 4px 8px)",
                    }
                  : {}),
              }}
              title={seg.titulo}
            />
          ))}
        </div>

        {/* O ponteiro. Some quando não há ponto nenhum — apontar para o zero
            absoluto só polui a borda esquerda. */}
        {pct > 0 && (
          <div className="relative h-0">
            <div
              className="absolute -top-[18px] flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${posicao(pct)}%` }}
            >
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${cor.pilula}`}
              >
                {formatarPercentual(percentual)}
              </span>
              <span className={`h-2 w-px ${cor.barra}`} />
            </div>
          </div>
        )}

        {/* As legendas dos degraus, com o que cada um paga. A altura acompanha
            quantas linhas `distribuirEmLinhas` precisou abrir — fixá-la faria o
            bloco cortar os rótulos empilhados no pé. */}
        <div className="relative mt-3" style={{ height: `${alturaDosRotulos}px` }}>
          {marcos.map((m) => (
            <div
              key={m.pct}
              className={`absolute flex flex-col gap-0.5 whitespace-nowrap leading-tight ${ancora(m.pos)}`}
              style={{ left: `${m.pos}%`, top: `${m.linha * ALTURA_DA_LINHA}px` }}
            >
              <span
                className={[
                  "text-[11px] font-semibold tabular-nums leading-none",
                  m.alcancado ? "text-foreground font-bold" : "text-muted-foreground",
                ].join(" ")}
              >
                {m.rotulo}
              </span>
              <span
                className={[
                  "text-[11px] tabular-nums leading-none",
                  m.valor === null ? "text-warning font-medium" : "text-muted-foreground",
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
