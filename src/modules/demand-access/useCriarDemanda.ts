import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createDemand, createTask } from "@/modules/demands/service";
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
          type: nova.tipo,
          priority: nova.prioridade,
          complexity: nova.complexidade,
        });

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
