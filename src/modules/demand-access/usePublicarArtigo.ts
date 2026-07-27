import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RascunhoDeArtigo } from "@/domain/knowledge";

/**
 * Publicar um rascunho na Base Viva.
 *
 * O VÍNCULO COM A ORIGEM
 * O artigo precisa saber de qual demanda nasceu — é o que permite responder
 * depois "esse conhecimento gerou valor?". A tabela `knowledge_articles` não
 * tem coluna para isso hoje, e criar coluna é migração.
 *
 * A solução provisória, e honesta sobre ser provisória: a referência da
 * demanda entra em `palavras_chave`, num formato reconhecível (`demanda:<id>`).
 * Isso preserva o vínculo de forma consultável desde já, sem migração, e
 * migra trivialmente para uma coluna própria quando ela existir — basta ler
 * essas chaves uma vez.
 *
 * NASCE COMO RASCUNHO, NUNCA COMO PUBLICADO
 * Mesmo quando a pessoa clicou em "Publicar", o artigo entra com
 * `status: "em_revisao"` se veio de repetição automática. Da demanda, entra
 * publicado — porque ali alguém leu e assinou item por item.
 */
export function usePublicarArtigo() {
  const qc = useQueryClient();
  const [publicando, setPublicando] = useState(false);

  const publicar = useCallback(
    async (r: RascunhoDeArtigo): Promise<{ id: string }> => {
      setPublicando(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();

        // O corpo segue a ordem em que a próxima pessoa vai ler: reconhecer o
        // problema, confirmar que é o mesmo caso, aplicar, verificar.
        const conteudo = [
          `## Problema\n\n${r.problema}`,
          r.sintomas.length ? `## Como se manifesta\n\n${r.sintomas.map((s) => `- ${s}`).join("\n")}` : "",
          r.solucao.length ? `## Solução\n\n${r.solucao.map((s) => `- ${s}`).join("\n")}` : "",
          r.comoVerificar.length
            ? `## Como verificar\n\n${r.comoVerificar.map((s) => `- [ ] ${s}`).join("\n")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const { data, error } = await supabase
          .from("knowledge_articles")
          .insert({
            titulo: r.titulo,
            resumo: r.problema.slice(0, 280),
            conteudo,
            tipo: "artigo",
            status: r.origem === "demanda" ? "publicado" : "em_revisao",
            sistema_slug: r.sistemaId,
            palavras_chave: r.termos,
            tags: r.demandasDeOrigem.map((id) => `demanda:${id}`),
            autor_id: userRes.user?.id ?? null,
            autor_email: userRes.user?.email ?? null,
          })
          .select("id")
          .single();

        if (error) throw error;

        // O conhecimento relacionado precisa enxergar o artigo novo na próxima
        // demanda que abrir — sem isto o ciclo só fecha depois de um refresh.
        await qc.invalidateQueries({ queryKey: ["conhecimento"] });
        return { id: (data as { id: string }).id };
      } finally {
        setPublicando(false);
      }
    },
    [qc],
  );

  return { publicar, publicando };
}
