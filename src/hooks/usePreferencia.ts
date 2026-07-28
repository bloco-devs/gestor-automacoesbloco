import { useCallback, useEffect, useState } from "react";

/**
 * Uma escolha que a pessoa fez e o sistema não esquece.
 *
 * O PROBLEMA QUE ISTO RESOLVE
 * Filtro, lente, painel aberto, coluna recolhida: o sistema tinha vários
 * controles cujo valor morria ao mudar de página. A pessoa escolhia "Board",
 * ia ver uma demanda, voltava — e estava em "Lista" de novo. Cada volta
 * cobrava o mesmo clique, e a impressão que fica é a de um sistema que não
 * presta atenção em quem usa.
 *
 * Não é detalhe de conveniência: um controle que esquece ensina a pessoa a
 * não personalizar nada, porque personalizar não compensa.
 *
 * POR QUE UM HOOK, E NÃO localStorage SOLTO EM CADA TELA
 * Já existiam três implementações diferentes disso espalhadas — uma para a
 * fila de Hoje, uma para o modo recolhido da barra, uma para as seções da
 * demanda. Cada uma com o seu jeito de versionar chave e tratar valor
 * inválido. Aqui a regra é uma só, e o próximo controle que precisar disso
 * não vai inventar a quarta.
 *
 * O VALIDADOR EXISTE POR UM MOTIVO
 * O que está guardado veio de uma versão anterior do código. Uma lente
 * chamada "lista" que não existe mais, um filtro removido: sem validar, a
 * tela quebra ou fica vazia sem explicação. Com validador, cai no padrão em
 * silêncio — que é o comportamento certo para uma preferência.
 */
export function usePreferencia<T>(
  chave: string,
  padrao: T,
  valido?: (v: unknown) => v is T,
): [T, (valor: T) => void] {
  const chaveCompleta = `pref:${chave}`;

  const [valor, setValor] = useState<T>(() => {
    if (typeof window === "undefined") return padrao;
    const cru = window.localStorage.getItem(chaveCompleta);
    if (cru === null) return padrao;
    try {
      const lido = JSON.parse(cru) as unknown;
      if (valido && !valido(lido)) return padrao;
      return lido as T;
    } catch {
      return padrao;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(chaveCompleta, JSON.stringify(valor));
    } catch {
      // Modo privado, cota estourada: perder a preferência é aceitável;
      // derrubar a tela por causa dela, não.
    }
  }, [chaveCompleta, valor]);

  const guardar = useCallback((v: T) => setValor(v), []);

  return [valor, guardar];
}
