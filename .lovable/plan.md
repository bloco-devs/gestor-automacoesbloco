# Cartões coloridos por etapa no Kanban do /workspace

Objetivo: dar leitura imediata da etapa em que cada cartão está, através de uma faixa de cor na borda esquerda do cartão.

## Como vai ficar

Cada cartão do quadro ganha uma borda esquerda colorida conforme a etapa da coluna onde ele está:

- Backlog / etapas comuns: cinza neutro
- Em desenvolvimento / em andamento: âmbar
- Em testes / revisão / homologação: azul (info)
- Concluído: verde
- Bloqueado / cancelado: vermelho

A cor acompanha o cartão automaticamente quando ele é arrastado para outra coluna, porque é derivada da etapa em que ele está — nada muda no arrasto nem nos dados.

## Detalhes técnicos

Arquivo único: `src/modules/workspace-demandas/components/BoardLente.tsx`.

1. O componente `Cartao` hoje não sabe em que coluna está. Adicionar uma prop `tom: TomDaEtapa` (opcional, padrão `neutro`), passada por `Coluna` a partir do valor já calculado ali (`tomDaEtapa(grupo.rotulo)`) — sem nova chamada nem nova estrutura de dados. O cartão da sobreposição de arrasto recebe o mesmo tom da coluna de origem.
2. Estender o mapa `PALETA` (que já existe e já usa tokens semânticos do design system) com uma chave `borda` por tom: `border-l-border`, `border-l-warning`, `border-l-info`, `border-l-success`, `border-l-destructive`.
3. No container principal do `Cartao`, acrescentar `border-l-4` fixo mais `PALETA[tom].borda` dinâmico, mantendo todas as classes atuais (superfície, hover, estados de arrasto).
4. A régua vertical interna de risco (SLA/atraso) continua como está: ela responde "isto está em risco?", enquanto a nova borda responde "em que etapa isto está?" — canais diferentes, sem conflito. Ajuste apenas o espaçamento esquerdo do conteúdo se a borda apertar o layout.

Sem uso de cores fixas do Tailwind (`slate-400`, `blue-500`, etc.): o projeto usa tokens semânticos que já têm variante para tema escuro; as cores propostas equivalem ao padrão pedido.

Nada de alteração em drag and drop, hooks, banco ou Edge Functions.
