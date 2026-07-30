# Fase 6 — Títulos curtos da IA + etiqueta de sistema no cartão

Duas melhorias pontuais. Nada de banco, RLS, ESTEIRA ou lógica de assumir/mover.

## Objetivo 1 — Título resumido (5 a 7 palavras)

Situação atual verificada: o título **não** é gerado por LLM. Em `src/modules/ai/services/ai-orchestrator.ts`, a função `deriveTitulo()` apenas corta a primeira frase da descrição em até 90 caracteres — por isso os títulos saem longos.

Mudanças:

1. `supabase/functions/assistente-demanda/index.ts`: nova ação `generate_title`, com system prompt estrito — título extremamente resumido, direto e claro, no máximo 5 a 7 palavras, sem ponto final, sem aspas, sem prefixos; detalhes ficam só na descrição. Mesmo padrão de rate limit, CORS e log das ações existentes.
2. `src/modules/ai/services/ai-workspace-service.ts`: método `generateTitle(conversation)`.
3. `src/modules/ai/services/ai-orchestrator.ts`: no `finalize`, pedir o título à IA; se falhar ou vier vazio, cair no `deriveTitulo()` atual. Guarda-chuva adicional: cortar para no máximo 7 palavras antes de devolver.

O contrato de retorno de `finalize` (`{ titulo, descricao, triagem, similares, decision }`) não muda, então o Workspace não é tocado.

## Objetivo 2 — Etiqueta de sistema no cartão do Kanban

Em `src/modules/workspace-demandas/components/BoardLente.tsx`, no componente `Cartao`: hoje o nome do sistema aparece diluído na linha de meta (`prioridade · sistema · referência`).

Mudanças:
- Renderizar o sistema como badge no topo do cartão (acima do título), estilo Trello: `inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider`, usando tokens semânticos (`bg-muted text-muted-foreground`) em vez de `bg-gray-100`, para não quebrar tema escuro.
- Remover o sistema da linha de meta para não duplicar a informação; prioridade e referência permanecem.
- Badge só aparece quando `sinais.sistema` está ativo e a demanda tem sistema.
- Nenhuma alteração em `useDraggable`, no botão Assumir, no `tom`/borda colorida ou nas props do componente.

## Detalhes técnicos

- Arquivos tocados: 1 edge function + 2 arquivos do módulo de IA + 1 componente de cartão.
- A edge function precisa de deploy após a alteração.
- Sem migration, sem mudança de schema, sem mudança em políticas RLS.
