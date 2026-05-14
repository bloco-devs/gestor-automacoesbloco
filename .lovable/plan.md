# Sub-navegação e novas visões para Solicitações e Soluções

## O que muda

A barra lateral do desenvolvedor passa a ter dois itens expansíveis:

```text
Dashboard
Solicitações  ▾
   ├─ Lista
   ├─ Kanban
   └─ Gantt
Soluções  ▾
   ├─ Lista
   ├─ Kanban
   └─ Gantt
```

- Clicar no item pai apenas expande/colapsa (não navega).
- O item top-level "Kanban" atual é removido (vira sub-item de Solicitações).
- Sub-item ativo fica destacado; o pai correspondente abre automaticamente quando a rota atual pertence a ele.
- O badge "⚙ N" de avaliações pendentes continua aparecendo, agora ao lado de "Solicitações" (pai) e replicado no sub-item Lista.

## Rotas

Novas rotas (todas protegidas, role developer):

- `/solicitacoes` → Lista (atual)
- `/solicitacoes/kanban` → Kanban (componente atual movido)
- `/solicitacoes/gantt` → Gantt (novo)
- `/solucoes` → Lista (atual)
- `/solucoes/kanban` → Kanban (novo, agrupado por solicitação vinculada)
- `/solucoes/gantt` → Gantt (novo)

A rota antiga `/kanban` redireciona para `/solicitacoes/kanban`.

## Visões novas

### Kanban de Soluções (por solicitação vinculada)
Colunas dinâmicas, uma por `solicitacao` que possua soluções vinculadas, mais uma coluna "Sem solicitação" para soluções com `solicitacao_id = null`. Cada card mostra título, descrição curta, link externo, botão para abrir `/solucoes/:id`. Sem drag-and-drop nesta primeira versão (mover entre colunas exigiria reatribuir a solicitação, fora do escopo).

### Gantt (Solicitações e Soluções)
Timeline horizontal com barras posicionadas por `data_inicio_prevista` e `data_fim_prevista`. Header com escala de tempo (semanas/meses, com zoom simples: semana / mês / trimestre). Linhas agrupadas por status. Itens sem datas planejadas aparecem em uma seção "Sem cronograma" no topo, com CTA para definir datas.

Edição: clicar em uma barra abre um popover com dois date pickers (início/fim) e botão Salvar. Sem drag-and-drop nesta versão.

## Backend (migration)

Adicionar colunas de planejamento em `solicitacoes` e `demanda_solucoes`:

```sql
alter table public.solicitacoes
  add column data_inicio_prevista date,
  add column data_fim_prevista date;

alter table public.demanda_solucoes
  add column data_inicio_prevista date,
  add column data_fim_prevista date;
```

RLS: as policies existentes já cobrem update por admin/owner — sem mudanças. Trigger `enforce_dev_only_columns` não precisa proteger essas colunas (planejamento é compartilhado dev/solicitante? — se quiser restringir a dev, posso adicionar; default proposto: editável por admin apenas no UI, mas tecnicamente owner também pode via RLS atual).

## Frontend — arquivos

- `src/App.tsx` — registrar novas rotas + redirect `/kanban` → `/solicitacoes/kanban`.
- `src/components/AppLayout.tsx` — refatorar `devNav` para suportar `children`; adicionar estado de expansão (auto-abre quando rota filha está ativa); remover item Kanban top-level.
- `src/pages/Kanban.tsx` — mantido, agora montado em `/solicitacoes/kanban`.
- `src/pages/SolucoesKanban.tsx` *(novo)* — Kanban agrupado por solicitação.
- `src/pages/SolicitacoesGantt.tsx` *(novo)* — Gantt das solicitações.
- `src/pages/SolucoesGantt.tsx` *(novo)* — Gantt das soluções.
- `src/components/GanttChart.tsx` *(novo, reutilizável)* — recebe `items: { id, title, status, start, end }[]` e callbacks de edição.
- `src/lib/types.ts` + `src/lib/supabaseData.ts` — incluir `dataInicioPrevista`/`dataFimPrevista` no mapeamento e no update.

## Detalhes técnicos do Gantt

- Renderizado em SVG ou via grid CSS (linhas absolutas posicionadas por `left%`/`width%`).
- Eixo X calculado a partir de `min(start)` e `max(end)` de todos os itens (com padding de 1 semana).
- Toggle de zoom (Semana / Mês / Trimestre) altera a granularidade do header.
- Barras coloridas pelo `status` (mesmas cores do `StatusBadge`).
- Linhas vazias (sem datas) listadas em uma seção destacada acima da timeline.

## Pontos a confirmar (não bloqueantes)

- Datas de planejamento: editáveis também pelo solicitante ou apenas pelo dev? (default proposto: apenas dev, sem trigger novo — UI restringe).
- Drag-and-drop nas barras do Gantt: fora do escopo desta entrega; clique abre popover de edição.