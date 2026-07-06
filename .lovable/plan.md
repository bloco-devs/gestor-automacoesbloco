
# Evolução do Kanban ao padrão Trello

O quadro `/atividades` já tem: colunas com drag-and-drop entre e dentro da coluna, modal de cartão com título/descrição, responsáveis (com avatares/iniciais), vínculo com Solução, checklist, links, comentários, rascunhos e filtros por Responsável/Solução. Faltam os itens abaixo para chegar ao padrão Trello.

## O que vai mudar

### 1. Banco de dados (migração aditiva, não quebra nada)
- Nova tabela `atividades_labels` (etiquetas por quadro): `nome`, `cor` (token semântico), `ordem`. RLS igual às demais tabelas de atividades (usuário permitido lê/escreve).
- Nova tabela `atividades_card_labels` (N:N cartão↔etiqueta).
- Nova tabela `atividades_atividade_log` (histórico do cartão): `card_id`, `user_id`, `tipo` (`criado`, `movido`, `renomeado`, `checklist`, `label`, `prazo`, `responsavel`, `comentario`), `payload jsonb`, `created_at`.
- Colunas novas em `atividades_cards`: `data_entrega timestamptz`, `data_inicio timestamptz`, `concluido boolean default false`, `cover_cor text` (cor de capa opcional, estilo Trello), `descricao_markdown boolean default true` (a coluna `descricao` existente passa a ser tratada como Markdown; nenhum dado atual perdido).
- Triggers para popular o log automaticamente em `INSERT/UPDATE/DELETE` de `atividades_cards` (movido, renomeado, prazo, conclusão) e em `atividades_comentarios`.
- Todas com `GRANT` + `ENABLE RLS` + policies + `updated_at` trigger, seguindo o padrão do projeto.

### 2. Detalhes do cartão (modal) — `CardDialog.tsx`
- Descrição em **Markdown** com preview (renderizar com `react-markdown` + `remark-gfm`; sanitizado). Toggle "Editar / Visualizar".
- **Data de entrega** com o `DatePickerDemo` do shadcn + hora opcional. Badge de status calculado no cliente: **Atrasada** (vermelho), **Vence hoje** (âmbar), **No prazo** (neutro), **Concluída** (verde, quando `concluido = true`).
- **Etiquetas coloridas**: seletor tipo popover com criação inline (nome + cor a partir de uma paleta de tokens semânticos). Aparecem como pills no cartão e no modal.
- **Checklist com barra de progresso** (Progress do shadcn) — hoje mostra apenas `2/5`; passa a mostrar barra + %.
- **Membros com avatares** já existe — reforçar exibindo empilhados no topo do modal com tooltip.
- Nova aba/seção **"Atividade"** com timeline lida de `atividades_atividade_log` unindo comentários (agrupamento cronológico estilo Trello).
- Botão **"Marcar como concluído"** que seta `concluido = true` e move opcionalmente para a última coluna.

### 3. Quadro — `Atividades.tsx`
- **Barra superior fixa** com:
  - Campo de **busca rápida** (filtra por título/descrição no cliente, debounce 150ms).
  - Filtros existentes (Responsável, Solução) + novos: **Etiquetas**, **Prazo** (`Sem prazo`, `Vence esta semana`, `Atrasadas`, `Concluídas`).
  - Contador "X de Y cartões" quando algum filtro ativo.
- **Cartão no quadro** ganha, no rodapé: pills de etiquetas, ícone de prazo colorido, barra de progresso do checklist, contador de comentários, avatares empilhados.
- **Cover** opcional (faixa colorida no topo do cartão) quando `cover_cor` estiver setado.

### 4. Polimento visual (padrão Trello, tokens semânticos — sem cores hardcoded)
- Cantos mais arredondados (`rounded-xl`), sombras suaves (`shadow-sm` no cartão, `shadow-md` durante drag).
- Transição fluida no `DragOverlay` (scale/rotate leve).
- Espaçamento consistente entre colunas; largura fixa de coluna (272px, como Trello) com scroll horizontal.
- Hover states sutis; foco visível nos cartões.

### 5. Preservado / não muda
- SSO Bloco ID: **não tocado**.
- RLS e policies existentes: **não alteradas**, apenas adicionadas para as tabelas novas.
- Estrutura de rotas, layout, sidebar, tema: **inalterados**.
- Nenhuma coluna/tabela existente é dropada nem renomeada.

## Detalhes técnicos

- **Dependência nova:** `react-markdown` e `remark-gfm` (leves, ~30KB gzip).
- **Tokens de cor de etiqueta:** adicionar em `index.css` uma paleta `--label-{red,orange,yellow,green,teal,blue,purple,pink}` em HSL e mapear no `tailwind.config.ts`.
- **Realtime:** o hook de kanban de atividades continua com fetch inicial; adicionar subscribe em `atividades_cards`, `atividades_card_labels`, `atividades_atividade_log` seguindo o padrão do `useSupabaseData` (cleanup no `useEffect`).
- **Migração:** um único arquivo idempotente com `create table if not exists`, `alter table add column if not exists`, grants, RLS, policies e triggers.
- **Testes:** um teste unitário simples para o cálculo de status do prazo em `src/lib/__tests__/`.

## Ordem de execução
1. Migração do Supabase (aprovar antes do código depender dos tipos gerados).
2. `src/lib/atividades.ts`: novos tipos/CRUDs (labels, log, prazo).
3. `CardDialog.tsx`: Markdown, prazo, etiquetas, progresso, aba Atividade.
4. `Atividades.tsx`: barra de busca, novos filtros, cartão redesenhado.
5. Polimento visual + tokens.
6. Testes + build.

Pronto para implementar quando aprovar.
