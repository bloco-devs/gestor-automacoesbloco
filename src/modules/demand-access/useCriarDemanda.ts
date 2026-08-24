import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createDemand, createTask } from "@/modules/demands/service";
import { supabase } from "@/integrations/supabase/client";
import type { NovaDemanda } from "@/domain/demand";

/**
 * A porta de criação.
 *
 * POR QUE ELA EXISTE SEPARADA DE `useAcoesDemanda`
 * Aquela porta trabalha dentro de um escopo — mover e atribuir acontecem numa
 * lista que já está aberta. Criar não tem escopo: a conversa que gera a
 * demanda acontece no portal, longe de qualquer projeto.
 *
 * O QUE ELA GARANTE
 * Quem chama entrega uma `NovaDemanda` — o objeto do domínio — e não sabe em
 * que tabela isso vira linha. Era o último ponto do fluxo em que a IA
 * precisaria conhecer o esquema para funcionar.
 *
 * A demanda nasce em `demands`, e não em `solicitacoes`, porque só `demands`
 * tem SLA, tipo, complexidade e marca de IA. Uma demanda gerada por IA que
 * cai numa tabela sem esses campos perde exatamente o trabalho que a IA fez.
 *
 * OS CRITÉRIOS DE ACEITE VIRAM TAREFAS, NÃO TEXTO
 * Na primeira versão eu os gravava como `- [ ]` dentro da descrição. Parecia
 * suficiente e não era: markdown não se marca, então o desenvolvedor não tinha
 * como registrar progresso, `progresso.feitos` ficava sempre em zero, e a
 * sugestão "Concluir" — que depende de checklist completo — nunca aparecia.
 *
 * O critério gerado pela IA é a definição de pronto. Ele precisa ser a mesma
 * coisa que o desenvolvedor marca ao terminar; senão a IA escreve de um lado e
 * o trabalho acontece do outro, e ninguém consegue dizer se acabou.
 */
export function useCriarDemanda() {
  const qc = useQueryClient();
  const [executando, setExecutando] = useState(false);

  const criar = useCallback(
    async (nova: NovaDemanda): Promise<{ id: string }> => {
      setExecutando(true);
      try {
        const criada = await createDemand({
          title: nova.titulo,
          // O desenvolvedor recebe as três coisas em ordem de uso: o que a
          // pessoa quis dizer, o detalhe técnico, e como saber que terminou.
          description: [nova.resumo, nova.descricaoTecnica ? `\n\n---\n\n${nova.descricaoTecnica}` : ""]
            .join("")
            .trim(),
          system_id: nova.sistemaId,
          sistema_slug: nova.sistemaSlug ?? null,
          type: nova.tipo,
          priority: nova.prioridade,
          complexity: nova.complexidade,
        });

        /**
         * A CONVERSA VAI JUNTO, E A FALHA DELA NÃO DERRUBA A DEMANDA.
         *
         * A demanda já existe neste ponto. Se a gravação da conversa falhar,
         * lançar aqui faria a pessoa ver "erro ao criar", tentar de novo, e
         * abrir a segunda demanda idêntica — o mesmo estrago que o anexo já
         * causou no `NewTicketDialog` e que está documentado lá.
         *
         * Perder a transcrição é ruim; duplicar a demanda é pior, e visível
         * para todo mundo.
         */
        if (nova.conversa?.length) {
          // `as never` é a convenção do projeto para tabela que os tipos
          // gerados ainda não conhecem — `types.ts` vem do banco, e a tabela
          // nasce na migration. Mesmo padrão de `from("demands" as never)`.
          const { error } = await supabase.from("demanda_conversa" as never).insert(
            nova.conversa.map((m, i) => ({
              demanda_id: criada.id,
              // O índice é a ordem. `created_at` não serve: as linhas entram
              // no mesmo instante e empatariam.
              ordem: i,
              papel: m.papel,
              texto: m.texto,
            })) as never,
          );
          if (error) console.warn("[demanda] conversa não gravada:", error.message);
        }

        // Em série, e não em paralelo: `createTask` calcula a ordem a partir da
        // última tarefa existente, então disparar tudo junto embaralharia os
        // critérios — e a ordem deles é a ordem em que o trabalho acontece.
        for (const criterio of nova.criteriosDeAceite) {
          await createTask(criada.id, criterio);
        }

        // A lista do Workspace precisa enxergar a demanda nova sem recarregar
        // a página — senão o usuário confirma, chega na fila e não vê nada.
        await qc.invalidateQueries({ queryKey: ["demands"] });
        return { id: criada.id };
      } finally {
        setExecutando(false);
      }
    },
    [qc],
  );

  return { criar, executando };
}
