import { useCallback, useSyncExternalStore } from "react";

/**
 * ETIQUETAS EXPANDIDAS — uma preferência, não um estado de componente.
 *
 * Antes cada cartão guardava o seu próprio `useState`: expandir um cartão não
 * expandia os outros, e trocar de rota devolvia tudo ao estado recolhido. No
 * Trello essa escolha é do usuário e vale para o quadro inteiro — por isso ela
 * mora num store de módulo (compartilhado por todos os cartões, sem depender
 * da árvore React) espelhado no localStorage.
 */
const CHAVE = "pref:kanban:etiquetas-expandidas";

function ler(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CHAVE) === "true";
  } catch {
    return false;
  }
}

let valor = ler();
const ouvintes = new Set<() => void>();

function inscrever(fn: () => void) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function definir(proximo: boolean) {
  if (proximo === valor) return;
  valor = proximo;
  try {
    window.localStorage.setItem(CHAVE, String(proximo));
  } catch {
    // Modo privado ou cota estourada: perder a preferência é aceitável.
  }
  ouvintes.forEach((fn) => fn());
}

export function useEtiquetasExpandidas(): [boolean, () => void] {
  const expandidas = useSyncExternalStore(
    inscrever,
    () => valor,
    () => false,
  );
  const alternar = useCallback(() => definir(!valor), []);
  return [expandidas, alternar];
}
