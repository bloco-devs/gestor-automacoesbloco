import { useCallback, useEffect, useState } from "react";

/**
 * O fundo da Caixa de Entrada vive no navegador.
 *
 * POR QUE NÃO NO BANCO
 * A Caixa de Entrada não é um registro: ela é "tudo o que ainda não foi
 * classificado em um quadro". Não existe linha para guardar a preferência sem
 * inventar uma entidade só para isso. E a escolha é puramente estética e
 * pessoal — perder o fundo ao trocar de máquina é bem menos grave do que criar
 * uma tabela de configuração para uma imagem.
 */
const CHAVE = "gestor-inbox-bg";

function ler(): string | null {
  try {
    return window.localStorage.getItem(CHAVE) || null;
  } catch {
    // Navegação privada e políticas de storage podem recusar a leitura. Sem
    // fundo é um estado válido; quebrar a tela por causa dele não é.
    return null;
  }
}

export function useFundoDaInbox(): {
  fundo: string | null;
  definirFundo: (url: string | null) => void;
} {
  const [fundo, setFundo] = useState<string | null>(() =>
    typeof window === "undefined" ? null : ler(),
  );

  // Duas abas abertas na mesma Caixa de Entrada devem concordar sobre o fundo.
  useEffect(() => {
    const aoMudar = (e: StorageEvent) => {
      if (e.key === CHAVE) setFundo(ler());
    };
    window.addEventListener("storage", aoMudar);
    return () => window.removeEventListener("storage", aoMudar);
  }, []);

  const definirFundo = useCallback((url: string | null) => {
    setFundo(url);
    try {
      if (url) window.localStorage.setItem(CHAVE, url);
      else window.localStorage.removeItem(CHAVE);
    } catch {
      // A tela já mudou; a persistência é o bônus, não o efeito principal.
    }
  }, []);

  return { fundo, definirFundo };
}
