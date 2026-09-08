/**
 * O rateio dos pontos de um projeto, e as regras do formulário.
 *
 * POR QUE ISTO É UM ARQUIVO SEM DEPENDÊNCIA NENHUMA
 *
 * Cada função aqui ESPELHA uma regra que vive no Postgres, em
 * `relatorio_classificar_projeto` e `relatorio_fechar_ciclo`. Elas existem do
 * lado do cliente por dois motivos, e nenhum deles é "calcular":
 *
 *   1. Para a tela mostrar a divisão ANTES de confirmar. Descobrir quanto cada
 *      um levou no fechamento do ciclo é tarde.
 *   2. Para o botão não deixar enviar o que o banco vai recusar. A alternativa
 *      é o usuário receber um erro cru de Postgres.
 *
 * O banco continua sendo a autoridade — ele valida de novo, e é o número dele
 * que vira dinheiro. Se as duas contas divergirem, o teste ao lado é que vai
 * gritar; foi para isso que este arquivo não tem import.
 */

/** O que cada responsável recebe. Espelha o SELECT de `relatorio_fechar_ciclo`. */
export interface Rateio {
  /** Piso da divisão: o que TODOS recebem. */
  porPessoa: number;
  /** O que sobra da divisão inteira. Vai para o primeiro da lista. */
  sobra: number;
  /** O que o primeiro responsável recebe: piso + sobra. */
  primeiroRecebe: number;
  /** Soma de todas as linhas. Precisa ser exatamente `pontos`. */
  total: number;
}

/**
 * Divide `pontos` entre `responsaveis`, em partes iguais, e entrega o resto ao
 * primeiro.
 *
 * O SQL faz `(cp.pontos / t.n) + CASE WHEN r.ordem = 0 THEN cp.pontos % t.n
 * ELSE 0 END`. Em Postgres, `/` entre inteiros trunca; em JavaScript não —
 * daí o `Math.floor`. Errar isso aqui daria uma tela prometendo 33,33 pontos
 * e um fechamento gravando 33.
 */
export function ratearPontos(pontos: number, responsaveis: number): Rateio {
  if (!Number.isFinite(pontos) || !Number.isFinite(responsaveis) || responsaveis < 1) {
    return { porPessoa: 0, sobra: 0, primeiroRecebe: 0, total: 0 };
  }
  const porPessoa = Math.floor(pontos / responsaveis);
  const sobra = pontos - porPessoa * responsaveis;
  return {
    porPessoa,
    sobra,
    primeiroRecebe: porPessoa + sobra,
    // Não é `pontos` copiado: é a soma reconstruída das linhas. Se algum dia a
    // conta acima quebrar, é aqui que o teste percebe.
    total: porPessoa * responsaveis + sobra,
  };
}

/**
 * O banco recusa classificar quando a divisão deixa alguém com zero:
 * `rci_pontos_positivos` exige `pontos > 0` em cada linha congelada, e a RPC
 * verifica antes com `IF v_pontos / v_n < 1`.
 *
 * Na prática isso só acontece com mais responsáveis do que pontos — 51 pessoas
 * num "Fácil" de 50. Existe porque um `CHECK` estourando no fechamento do
 * ciclo apareceria longe da causa.
 */
export function podeRatear(pontos: number, responsaveis: number): boolean {
  if (responsaveis < 1) return false;
  return Math.floor(pontos / responsaveis) >= 1;
}

// ---------------------------------------------------------------------------
// A guarda do formulário
// ---------------------------------------------------------------------------

export interface EstadoDoProjetoNaFila {
  /** Já tem classificação: exige motivo para alterar. */
  jaClassificado: boolean;
  /** Quantos vão dividir os pontos. Zero impede classificar. */
  responsaveis: number;
  /** Rótulo do ciclo em que foi congelado, ou nulo. */
  apuradoNoCiclo: string | null;
}

export type Impedimento =
  | "congelado"
  | "sem-responsavel"
  | "sem-classificacao"
  | "justificativa-curta"
  | "motivo-obrigatorio"
  | "rateio-impossivel";

/**
 * Por que NÃO dá para classificar — ou `null` quando dá.
 *
 * A ordem das verificações é a mesma da RPC, e isso importa: um projeto
 * congelado com justificativa curta tem de reclamar de estar congelado, não
 * da justificativa. Reclamar do problema errado manda a pessoa consertar o
 * que não é o problema.
 */
export function impedimentoParaClassificar(
  estado: EstadoDoProjetoNaFila,
  entrada: { classificacao: string | null; pontos: number | null; justificativa: string; motivo: string },
): Impedimento | null {
  if (estado.apuradoNoCiclo) return "congelado";
  if (estado.responsaveis < 1) return "sem-responsavel";
  if (!entrada.classificacao) return "sem-classificacao";
  if (entrada.pontos !== null && !podeRatear(entrada.pontos, estado.responsaveis)) {
    return "rateio-impossivel";
  }
  // Os dois limites são os do banco: `rcpj_justificativa_substantiva` exige 15,
  // e a RPC exige 10 no motivo da alteração.
  if (entrada.justificativa.trim().length < 15) return "justificativa-curta";
  if (estado.jaClassificado && entrada.motivo.trim().length < 10) return "motivo-obrigatorio";
  return null;
}

// ---------------------------------------------------------------------------
// O resumo da fila
// ---------------------------------------------------------------------------

export interface ResumoDaFila {
  aguardando: number;
  classificadas: number;
  pontos: number;
  /** Quantos dos que aguardam são projeto — a tela usa como dica. */
  projetosAguardando: number;
}

/**
 * Junta demanda e projeto num só resumo.
 *
 * Para quem apura, uma entrega é uma entrega: separar os contadores faria a
 * pessoa somar de cabeça para saber quanto falta. Os pontos também somam, e
 * aqui somam INTEGRAIS — o rateio é assunto de quem recebe, não do total.
 */
export function resumoDaFila(
  demandas: { ja_classificada: boolean; pontos: number | null }[],
  projetos: { ja_classificado: boolean; pontos: number | null }[],
): ResumoDaFila {
  const dCls = demandas.filter((d) => d.ja_classificada);
  const pCls = projetos.filter((p) => p.ja_classificado);
  return {
    aguardando: demandas.length - dCls.length + (projetos.length - pCls.length),
    classificadas: dCls.length + pCls.length,
    pontos:
      dCls.reduce((s, d) => s + (d.pontos ?? 0), 0) +
      pCls.reduce((s, p) => s + (p.pontos ?? 0), 0),
    projetosAguardando: projetos.length - pCls.length,
  };
}
