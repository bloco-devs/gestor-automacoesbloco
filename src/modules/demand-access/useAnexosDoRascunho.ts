import { useCallback, useMemo, useRef, useState } from "react";
import {
  descartarRascunho,
  enviarRascunho,
  promoverRascunhos,
  type AnexoDeRascunho,
} from "@/modules/demands/anexos";

/**
 * Os anexos de uma demanda que ainda não existe.
 *
 * POR QUE ELE PRECISA EXISTIR SEPARADO DE `useAnexos`
 * `useAnexos` recebe um `demandaId` e não funciona sem ele — ele lista, assina
 * URL e grava linha, e as três coisas dependem da demanda. Durante a conversa
 * com a IA não há demanda: há uma pessoa com um print na mão e um problema que
 * ela acabou de encontrar.
 *
 * A DECISÃO: O UPLOAD ACONTECE NA HORA, NÃO NA CONFIRMAÇÃO
 * O caminho oposto — segurar os `File` em memória e subir tudo ao confirmar —
 * é mais simples de escrever e pior de usar: transforma o clique em "Confirmar"
 * numa espera de tamanho imprevisível, logo depois de uma conversa que a pessoa
 * já achou longa. Pior, é onde a falha aparece: um PDF de 30 MB derruba a
 * confirmação em vez de ser recusado no segundo em que foi escolhido.
 * Subindo na hora, cada arquivo tem o próprio progresso e o próprio erro, e
 * confirmar é sempre instantâneo.
 *
 * O PREÇO, E POR QUE ELE É ACEITÁVEL
 * Quem anexa e desiste da conversa deixa um objeto em `rascunhos/<user_id>/`
 * sem nenhuma linha apontando para ele. `limpar()` cobre a desistência
 * explícita (recomeçar a conversa); fechar a aba, não. Órfão em pasta privada,
 * dentro do teto de 25 MB, é um problema de faxina — e faxina é `storage`
 * lifecycle, não regra de tela.
 */
export interface AnexosDoRascunho {
  itens: AnexoDeRascunho[];
  enviando: boolean;
  /** Sobe os arquivos agora. Devolve o placar; nunca lança. */
  anexar: (arquivos: File[]) => Promise<{ anexados: number; falhas: string[] }>;
  remover: (id: string) => void;
  /** Descarta tudo que subiu. Use ao recomeçar a conversa. */
  limpar: () => void;
  /** Liga os rascunhos à demanda recém-criada. Nunca lança. */
  promover: (demandaId: string) => Promise<{ anexados: number; falhas: string[] }>;
}

export function useAnexosDoRascunho(): AnexosDoRascunho {
  const [itens, setItens] = useState<AnexoDeRascunho[]>([]);
  const [enviando, setEnviando] = useState(false);

  /**
   * `promover` é chamado de dentro de um `useCallback` que não deve mudar de
   * identidade a cada arquivo anexado — senão `confirmSubmit` se recria a cada
   * print e qualquer memoização acima dele se perde. A ref mantém a lista atual
   * sem entrar na lista de dependências.
   */
  const atuais = useRef<AnexoDeRascunho[]>([]);
  const guardar = useCallback((proximos: AnexoDeRascunho[]) => {
    atuais.current = proximos;
    setItens(proximos);
  }, []);

  const anexar = useCallback(
    async (arquivos: File[]) => {
      if (arquivos.length === 0) return { anexados: 0, falhas: [] };
      setEnviando(true);
      const falhas: string[] = [];
      const novos: AnexoDeRascunho[] = [];
      try {
        for (const arquivo of arquivos) {
          try {
            novos.push(await enviarRascunho(arquivo));
          } catch (erro) {
            falhas.push(erro instanceof Error ? erro.message : `Falha ao enviar "${arquivo.name}".`);
          }
        }
        if (novos.length > 0) guardar([...atuais.current, ...novos]);
        return { anexados: novos.length, falhas };
      } finally {
        setEnviando(false);
      }
    },
    [guardar],
  );

  const remover = useCallback(
    (id: string) => {
      const alvo = atuais.current.find((a) => a.id === id);
      guardar(atuais.current.filter((a) => a.id !== id));
      // O objeto sai do bucket em segundo plano: tirar da lista é o que a
      // pessoa pediu, e ela não deve esperar uma ida ao servidor para desfazer
      // um clique.
      if (alvo) void descartarRascunho(alvo);
    },
    [guardar],
  );

  const limpar = useCallback(() => {
    const anteriores = atuais.current;
    guardar([]);
    for (const a of anteriores) void descartarRascunho(a);
  }, [guardar]);

  const promover = useCallback(
    async (demandaId: string) => {
      const lista = atuais.current;
      if (lista.length === 0) return { anexados: 0, falhas: [] };
      const placar = await promoverRascunhos(demandaId, lista);
      // Já viraram anexos da demanda: manter na lista faria a próxima conversa
      // nascer com os arquivos da anterior.
      guardar([]);
      return placar;
    },
    [guardar],
  );

  /**
   * O objeto de retorno é memoizado porque `useAIWorkspace` o coloca nas
   * dependências de `reset` e `confirmSubmit`. Devolvendo literal novo a cada
   * render, essas duas funções mudariam de identidade sempre, e `PreviewDaDemanda`
   * — que é `memo` — voltaria a renderizar a cada tecla digitada no chat. É o
   * mesmo motivo da `ref` acima: nada aqui deve invalidar quem está por cima.
   */
  return useMemo(
    () => ({ itens, enviando, anexar, remover, limpar, promover }),
    [itens, enviando, anexar, remover, limpar, promover],
  );
}

export type { AnexoDeRascunho };
