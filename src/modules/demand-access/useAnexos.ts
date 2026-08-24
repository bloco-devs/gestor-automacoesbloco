import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttachmentSignedUrl, listAttachments } from "@/modules/demands/service";
import { enviarVarios, excluirAnexoDaDemanda } from "@/modules/demands/anexos";
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
  /**
   * Id do anexo em exclusão — não um booleano.
   *
   * Com booleano, apagar um anexo faria TODOS os botões da lista girarem, e a
   * pessoa não saberia qual está saindo. O id faz o estado pertencer à linha.
   */
  const [excluindo, setExcluindo] = useState<string | null>(null);

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

  /**
   * ELE DEVOLVE O PLACAR EM VEZ DE LANÇAR — E ISSO É O CONSERTO
   *
   * Antes, `enviar` lançava. Quem chama é `onEnviar={(a) => void anexos.enviar(a)}`
   * em `DemandaDetalhe`, e `void` numa promise rejeitada é uma rejeição sem
   * dono: o spinner parava, o anexo não aparecia, o console ficava limpo e a
   * pessoa concluía "o sistema não deixa anexar" — que é literalmente o
   * relato que abriu este conserto. Um erro que ninguém vê não é um erro
   * tratado, é um erro escondido.
   *
   * Devolvendo `{ anexados, falhas }` a tela é obrigada a decidir o que dizer,
   * e o caso parcial (quatro prints sobem, um é grande demais) para de ser
   * "tudo ou nada".
   */
  const enviar = useCallback(
    async (arquivos: File[]): Promise<{ anexados: number; falhas: string[] }> => {
      if (!demandaId || arquivos.length === 0) return { anexados: 0, falhas: [] };
      setEnviando(true);
      try {
        const placar = await enviarVarios(demandaId, arquivos);
        if (placar.anexados > 0) {
          await qc.invalidateQueries({ queryKey: ["demanda", demandaId, "anexos"] });
        }
        return placar;
      } finally {
        setEnviando(false);
      }
    },
    [demandaId, qc],
  );

  /**
   * Devolve a mensagem de erro em vez de lançar, no mesmo espírito de `enviar`
   * e pelo mesmo motivo: quem chama usa `void`, e `void` numa promise
   * rejeitada é rejeição sem dono — o erro morre no console e a pessoa fica
   * olhando um anexo que aparentemente não saiu.
   */
  const excluir = useCallback(
    async (anexoId: string, caminho: string): Promise<string | null> => {
      setExcluindo(anexoId);
      try {
        await excluirAnexoDaDemanda(anexoId, caminho);
        await qc.invalidateQueries({ queryKey: ["demanda", demandaId, "anexos"] });
        return null;
      } catch (erro) {
        return erro instanceof Error ? erro.message : "Não foi possível excluir o anexo.";
      } finally {
        setExcluindo(null);
      }
    },
    [demandaId, qc],
  );

  return {
    anexos,
    carregando: q.isLoading,
    enviando,
    enviar,
    excluir,
    excluindo,
    podeAnexar: habilitado,
  };
}
