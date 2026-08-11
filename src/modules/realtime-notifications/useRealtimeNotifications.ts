import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { tocarAvisoDeMensagem } from "./som";

interface LinhaDeNotificacao {
  id: string;
  title: string;
  message: string;
  type: string;
  link_url: string | null;
}

/**
 * O aviso que chega enquanto você está em outra tela.
 *
 * O sino já se atualiza sozinho pelo canal do `useNotifications` — o que
 * faltava era o empurrão: som e um toast clicável no instante em que a
 * mensagem entra. Monta UMA vez, no layout: dois listeners significariam dois
 * sons por mensagem.
 */
export function useRealtimeNotifications(ativo: boolean): void {
  const navigate = useNavigate();
  // O toast navega, e navegar depende do `navigate` atual — mas ele não pode
  // entrar nas dependências do efeito, senão a assinatura é derrubada e
  // recriada a cada troca de rota.
  const navegarRef = useRef(navigate);
  navegarRef.current = navigate;
  const vistos = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!ativo) return;
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let cancelado = false;

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid || cancelado) return;
      canal = supabase
        .channel(`avisos-tempo-real-${uid}-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          (payload) => {
            const linha = payload.new as unknown as LinhaDeNotificacao;
            if (!linha?.id || linha.type !== "new_comment") return;
            // Realtime pode reentregar o mesmo evento; som duplicado é o tipo
            // de ruído que faz a pessoa desligar o som para sempre.
            if (vistos.current.has(linha.id)) return;
            vistos.current.add(linha.id);

            tocarAvisoDeMensagem();
            toast(linha.title, {
              description: linha.message,
              action: linha.link_url
                ? { label: "Abrir", onClick: () => navegarRef.current(linha.link_url as string) }
                : undefined,
            });
          },
        )
        .subscribe();
    });

    return () => {
      cancelado = true;
      if (canal) supabase.removeChannel(canal);
    };
  }, [ativo]);
}
