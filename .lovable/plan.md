## Nova aba: Atividades (Kanban estilo Trello)

Aba exclusiva para perfil **Desenvolvedor**, acessível em `/atividades`, com quadro Kanban de 5 colunas fixas para a equipe de tecnologia.

### Colunas
Backlog → A Fazer → Em Andamento → Em Revisão → Concluído

### Cards
Cada card terá:
- Título
- Descrição
- Responsável (escolhido entre devs/admins/builders via `list_assignable_users`)
- (Opcional) Vínculo a uma Solução existente — mostra um chip com o nome da Solução e link para `/solucoes/:id`

### Funcionalidades da UI
- Drag & drop entre colunas (usando `@dnd-kit`, mesmo padrão do Kanban atual)
- Botão "+ Novo card" em cada coluna abre um diálogo (título, descrição, responsável, solução opcional)
- Clicar no card abre diálogo de edição com os mesmos campos + botão excluir
- Avatar/iniciais do responsável no canto do card
- Contador de cards por coluna no cabeçalho

### Acesso
- Rota nova `/atividades` em `App.tsx` protegida por `<ProtectedRoute role="developer">`
- Item "Atividades" adicionado em `devNav` (`AppLayout.tsx`) com ícone `KanbanSquare` — não aparece para Solicitante nem Builder

---

### Detalhes técnicos

**Banco (migração nova):**
- `atividades_colunas` (id, chave, nome, ordem) — seed com as 5 colunas fixas
- `atividades_cards` (id, coluna_id, titulo, descricao, responsavel_id, solucao_id nullable → `demanda_solucoes.id`, ordem, created_by, created_at, updated_at)
- RLS: SELECT/INSERT/UPDATE/DELETE permitidos a admins (`private.has_role(auth.uid(),'admin')`) — mesmo padrão das tabelas `solucao_diagrama_*`
- GRANTs para `authenticated` e `service_role` (sem `anon`)
- Trigger `update_updated_at_column` em `atividades_cards`

**Frontend:**
- `src/lib/atividades.ts` — `listColunas`, `listCards`, `createCard`, `updateCard`, `moveCard`, `deleteCard`
- `src/pages/Atividades.tsx` — página com `DndContext`, colunas e cards
- `src/components/atividades/CardDialog.tsx` — diálogo de criar/editar
- Atualizar `src/App.tsx` (rota) e `src/components/AppLayout.tsx` (item de menu em `devNav`)

Sem mudanças em outras telas existentes.