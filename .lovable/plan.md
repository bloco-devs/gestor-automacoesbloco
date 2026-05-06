## Objetivo

Adicionar um checklist simples de **tasks** dentro de cada solicitação, visível apenas para desenvolvedores, com possibilidade de atribuir cada task a um desenvolvedor cadastrado no sistema.

## Decisões

- **Quem é desenvolvedor**: liberar múltiplos. Vou remover a trava `enforce_single_developer_role` e o `sync_single_developer_role_from_profile` para que qualquer e-mail listado em `allowed_emails` possa receber a role `admin` (=desenvolvedor). A lista de assign mostra todos os usuários com role `admin`.
- **Tasks mínimas**: título, checkbox concluído, responsável opcional, ordem.
- **Onde aparece**: nova seção "Tasks" dentro da página `DemandaDetail` (`/demanda/:id`), renderizada apenas quando `user.role === "developer"`. O acesso a essa página já vem do clique nos cards do Dashboard.

## Banco de dados (uma migração)

1. Criar tabela `demanda_tasks`:
   - `id uuid pk`
   - `solicitacao_id uuid not null` (referência lógica)
   - `titulo text not null`
   - `concluida boolean not null default false`
   - `assigned_to uuid null` (id do desenvolvedor)
   - `ordem integer not null default 0`
   - `created_by uuid`, `created_at`, `updated_at` (com trigger `update_updated_at_column`)
2. RLS: apenas devs (`has_role(auth.uid(), 'admin')`) podem SELECT/INSERT/UPDATE/DELETE. Solicitantes não veem tasks.
3. Remover triggers `enforce_single_developer_role` e `sync_single_developer_role_from_profile` (e suas funções) para liberar múltiplos devs.
4. Criar view `public.developers` (security_invoker) expondo apenas `id`, `nome`, `email` de profiles que têm role `admin`, para popular o seletor de assign sem expor a tabela `profiles` inteira. SELECT permitido a qualquer usuário autenticado com role admin.

## Backend helpers (`src/lib/supabaseData.ts`)

- `listTasks(solicitacaoId)`, `createTask({ solicitacaoId, titulo })`, `updateTask(id, patch)`, `deleteTask(id)`.
- `listDevelopers()` → consulta a view `developers`.

## UI

### `DemandaDetail.tsx` (apenas se `isDev`)

Nova `Card` "Tasks" entre "Ajustes do desenvolvedor" e "Soluções entregues":

```text
┌─ Tasks ────────────────────────────────┐
│ [+ input título]            [Adicionar]│
│ ☐ Configurar webhook        [Ana ▾] [x]│
│ ☑ Validar payload           [Bruno ▾]  │
└────────────────────────────────────────┘
```

- Lista ordenada por `ordem` / `created_at`.
- Checkbox marca/desmarca `concluida` (update otimista).
- Select compacto com lista de devs (`listDevelopers()`) + opção "Sem responsável".
- Botão lixeira para remover.
- Input + Enter/botão para criar nova task.
- Realtime: adicionar a tabela `demanda_tasks` ao channel em `useSupabaseData.ts` para sincronizar entre devs.

### Permissões na UI

- A seção inteira só renderiza se `isDev`. Solicitantes nunca veem nem o título "Tasks".

## Arquivos afetados

- `supabase/migrations/<novo>.sql` (nova tabela + RLS + view + remoção de triggers)
- `src/lib/types.ts` — interface `Task`, `Developer`
- `src/lib/supabaseData.ts` — CRUD de tasks + listDevelopers
- `src/hooks/useSupabaseData.ts` — incluir `demanda_tasks` no realtime
- `src/pages/DemandaDetail.tsx` — nova seção Tasks
- (opcional) `src/components/TasksChecklist.tsx` — componente isolado para manter o arquivo enxuto

## Fora do escopo

- Notificações para o responsável.
- Prazo, prioridade, comentários nas tasks.
- Reordenação por drag-and-drop (fica para depois; por ora só ordem por criação).
