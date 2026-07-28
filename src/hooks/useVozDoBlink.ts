import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHAVE = "blink:voz:v1";

/**
 * A voz do Blink — controle de ligar/desligar e reprodução.
 *
 * DESLIGADA POR PADRÃO, E ISSO É DECISÃO DE PRODUTO
 * Áudio que toca sozinho num escritório com trinta pessoas encanta na
 * demonstração e é desligado na primeira semana. Pior: a primeira vez que
 * ele toca costuma ser no pior momento possível — reunião, ligação, alguém
 * de fone. Quem quiser ouvir liga uma vez, e o sistema lembra.
 *
 * SÓ APARECE SE ESTIVER CONFIGURADA
 * A função de voz responde a um GET dizendo se a chave existe. Sem ela, o
 * botão nem é oferecido: um controle que aparece e falha ensina a pessoa a
 * não confiar nos outros.
 *
 * UMA VOZ POR VEZ
 * Cada nova fala corta a anterior. Duas falas sobrepostas não são duas
 * informações, são ruído — e a segunda chega justamente quando a pessoa
 * ainda está entendendo a primeira.
 */
export function useVozDoBlink() {
  const [disponivel, setDisponivel] = useState(false);
  const [ligada, setLigada] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(CHAVE) === "1";
  });
  const [falando, setFalando] = useState(false);
  /**
   * O ERRO PRECISA CHEGAR A ALGUÉM
   *
   * A primeira versão engolia a falha em silêncio: a voz não saía e nada na
   * tela dizia por quê. Diagnosticar exigiu abrir o log da função no
   * Supabase — trabalho de quem construiu o sistema, não de quem usa.
   * Guardar o motivo aqui permite mostrá-lo onde a pessoa está olhando.
   */
  const [erro, setErro] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    supabase.functions
      .invoke("blink-voz", { method: "GET" })
      .then(({ data }) => {
        if (!cancelado) setDisponivel(!!(data as { disponivel?: boolean } | null)?.disponivel);
      })
      .catch(() => {
        if (!cancelado) setDisponivel(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const parar = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setFalando(false);
  }, []);

  useEffect(() => parar, [parar]);

  const alternar = useCallback(() => {
    setLigada((v) => {
      const proximo = !v;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CHAVE, proximo ? "1" : "0");
      }
      if (!proximo) parar();
      return proximo;
    });
  }, [parar]);

  const falar = useCallback(
    async (texto: string) => {
      if (!ligada || !disponivel || !texto.trim()) return;
      parar();
      setErro(null);
      setFalando(true);
      try {
        const { data, error } = await supabase.functions.invoke("blink-voz", {
          body: { texto },
        });
        if (error) throw error;

        const blob =
          data instanceof Blob ? data : new Blob([data as BlobPart], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => parar();
        // O navegador só toca áudio depois de alguma interação. Como a pessoa
        // digitou e enviou uma mensagem antes, a permissão já existe — mas se
        // por algum motivo não existir, falhar em silêncio é o certo: a
        // resposta escrita já está na tela, e ela é a informação.
        await audio.play().catch(() => parar());
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível gerar a voz.");
        parar();
      }
    },
    [ligada, disponivel, parar],
  );

  return { disponivel, ligada, falando, erro, alternar, falar, parar };
}
