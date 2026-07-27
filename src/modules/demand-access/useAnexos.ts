import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addAttachment, getAttachmentSignedUrl, listAttachments } from "@/modules/demands/service";
import { generoDe, ordenarAnexos, type Anexo } from "@/domain/demand";

/**
 * Os anexos de uma demanda.
 *
 * A DECISÃO QUE FAZ ELES SEREM ÚTEIS: URL ASSINADA PARA TODOS, DE UMA VEZ
 * O banco guarda caminho de storage, não URL. Sem assinar, nada aparece — e a
 * tentação é assinar sob demanda, quando a pessoa clica. Isso transformaria
 * toda imagem num clique e uma espera, ou seja, no mesmo atrito do download
 * que estamos tentando eliminar.
 *
 * Então assinamos todos ao carregar, numa query separada da lista. A lista
 * aparece imediatamente com nome e tipo; as miniaturas entram logo depois. É a
 * mesma escolha feita nas capas de projeto, pelo mesmo motivo: nenhuma tela
 * deve esperar por imagem.
 *
 * As URLs valem 30 minutos. Renovar é invalidar esta query.
 */
export interface AnexoExibivel extends Anexo {
  /** URL assinada, pronta para `src`. `null` enquanto não chegou. */
  url: string | null;
}

export function useAnexos(demandaId: string | null, habilitado: boolean) {
  const qc = useQueryClient();
  const [enviando, setEnviando] = useState(false);

  const q = useQuery({
    queryKey: ["demanda", demandaId, "anexos"],
    enabled: habilitado && !!demandaId,
    queryFn: () => listAttachments(demandaId as string),
  });

  const base = useMemo<Anexo[]>(
    () =>
      ordenarAnexos(
        (q.data ?? []).map((a) => ({
          id: a.id,
          nome: a.file_name ?? a.file_url.split("/").pop() ?? "arquivo",
          caminho: a.file_url,
          genero: generoDe(a.file_name, a.file_type),
          tipo: a.file_type,
          em: a.created_at,
          autorId: a.uploaded_by,
        })),
      ),
    [q.data],
  );

  const urlsQ = useQuery({
    queryKey: ["demanda", demandaId, "anexos", "urls", base.map((a) => a.id).join(",")],
    enabled: base.length > 0,
    staleTime: 25 * 60_000,
    queryFn: async () => {
      const pares = await Promise.all(
        base.map(async (a) => [a.id, await getAttachmentSignedUrl(a.caminho)] as const),
      );
      return Object.fromEntries(pares) as Record<string, string | null>;
    },
  });

  const anexos = useMemo<AnexoExibivel[]>(
    () => base.map((a) => ({ ...a, url: urlsQ.data?.[a.id] ?? null })),
    [base, urlsQ.data],
  );

  const enviar = useCallback(
    async (arquivos: File[]) => {
      if (!demandaId || arquivos.length === 0) return;
      setEnviando(true);
      try {
        for (const arquivo of arquivos) {
          const caminho = `${demandaId}/${crypto.randomUUID()}-${arquivo.name}`;
          const { error } = await supabase.storage
            .from("demand-attachments")
            .upload(caminho, arquivo, { upsert: false, contentType: arquivo.type });
          if (error) throw error;
          await addAttachment(demandaId, {
            file_url: caminho,
            file_type: arquivo.type || null,
            file_name: arquivo.name,
          });
        }
        await qc.invalidateQueries({ queryKey: ["demanda", demandaId, "anexos"] });
      } finally {
        setEnviando(false);
      }
    },
    [demandaId, qc],
  );

  return {
    anexos,
    carregando: q.isLoading,
    enviando,
    enviar,
    podeAnexar: habilitado,
  };
}
