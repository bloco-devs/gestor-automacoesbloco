/**
 * O som é um aviso, não uma imposição.
 *
 * Quem trabalha com fone e vinte demandas abertas precisa poder desligar sem
 * perder o sino. A preferência mora no navegador porque é sobre o AMBIENTE de
 * quem está ali (sala aberta, reunião, fone), não sobre a conta.
 */
const CHAVE = "app:somDeNotificacao";

export function somLigado(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CHAVE) !== "0";
}

export function definirSom(ligado: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAVE, ligado ? "1" : "0");
}
