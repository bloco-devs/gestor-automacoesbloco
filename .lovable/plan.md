## Objetivo
Criar um terceiro perfil **Builder**, que herda tudo do Solicitante e ainda pode cadastrar, editar e excluir **soluções vinculadas às próprias solicitações** — diretamente na página de detalhe da demanda. Sem aba "Soluções" no menu.

## Comportamento esperado

- **Builder vê o mesmo menu lateral do Solicitante** (Dashboard do Solicitante, Minhas Demandas, Nova Demanda, Solicitações: Lista/Kanban/Gantt). Nada de "Soluções" no menu.
- **Na página de detalhe de uma demanda própria**, o Builder vê a seção "Soluções vinculadas" com:
  - botão **"Adicionar solução"** (novo);
  - botões **Editar** e **Excluir** em cada solução que ele criou;
  - mesmos campos usados hoje pelo desenvolvedor: título, descrição, link, data início prevista, data fim prevista.
- **Em demandas que não são dele**, o Builder se comporta como Solicitante normal (sem botões de criar/editar/excluir solução).
- O perfil é exibido como **"Builder"** no header (hoje mostra "Solicitante"/"Desenvolvedor").
- Migração de contas existentes para Builder fica para depois — agora apenas criamos o tipo e a infraestrutura.

## Mudanças

### 1. Tipo de perfil

`src/lib/types.ts`
- `export type Role = "developer" | "requester" | "builder";`

### 2. Autenticação e roteamento

`src/hooks/useAuth.tsx`
- Aceitar `"builder"` em `getStoredViewAs` e em `setViewAs` (sem mudar quem é dual hoje).
- `ALLOWED_ACCOUNTS` permanece como está (nenhuma conta vira Builder agora).

`src/components/ProtectedRoute.tsx`
- Quando rota exige `role` específico e o usuário é Builder, tratar Builder como Solicitante para fins de redirecionamento (`/minhas-demandas`).
- Aceitar Builder em todas as rotas hoje liberadas para Solicitante: `/dashboard-solicitante`, `/minhas-demandas`, `/nova-demanda`, e nas rotas já compartilhadas `/solicitacoes*`.

`src/pages/Index.tsx` e `src/pages/Auth.tsx`
- Builder cai em `/minhas-demandas` após login (igual ao Solicitante).

### 3. Menu lateral

`src/components/AppLayout.tsx`
- Builder usa o mesmo `requesterNav`. Apenas trocar o label do badge de perfil para mostrar "Builder" quando `user.role === "builder"`.

### 4. Detalhe da demanda — criar/editar/excluir solução

`src/pages/DemandaDetail.tsx`
- Introduzir flag `canManageSolucoes = isDev || (user?.role === "builder" && isOwner)`.
- Renderizar a seção de soluções e seus controles com base em `canManageSolucoes` em vez de `isDev` (apenas dentro do bloco de soluções; demais blocos exclusivos do dev continuam usando `isDev`).
- Adicionar um **diálogo "Nova solução"** local à página com os campos da solução. No submit chama `createSolucao({ solicitacaoId: id, titulo, descricao, link, createdBy: user.id, dataInicioPrevista, dataFimPrevista })` (a função já existe em `src/lib/supabaseData.ts`; conferir/estender a assinatura se faltar suporte a datas).
- Adicionar botões **Editar** (abre o mesmo diálogo preenchido, chama `updateSolucao`) e **Excluir** (com `AlertDialog` + `deleteSolucao`) por solução, visíveis apenas quando `canManageSolucoes`.
- Recarregar a lista (`useSupabaseData` de `listSolucoesBySolicitacao`) após cada mutação.

### 5. Banco de dados (RLS)

As políticas atuais de `demanda_solucoes` permitem qualquer `is_allowed_user()` inserir/atualizar/excluir, então **funcionalmente o Builder já consegue**. Para travar de verdade (Builder só nas próprias solicitações), recomenda-se nova migration que substitui as políticas amplas por:

- **INSERT**: permitido se for admin OU se existir `solicitacao` com `user_id = auth.uid()` e id = `solicitacao_id`, e `created_by = auth.uid()`.
- **UPDATE/DELETE**: permitido se for admin OU se `created_by = auth.uid()` E a solicitação pertence ao usuário.
- **SELECT**: manter `is_allowed_user()` (já cobre dono via política específica).

Essa migration é opcional para o MVP funcionar, mas necessária para garantir o escopo. Recomendo incluir.

## Fora de escopo

- Migrar contas existentes para Builder (faremos quando você indicar os e-mails).
- Aba "Soluções" no menu do Builder, Kanban/Gantt de soluções para Builder.
- Permitir Builder editar soluções criadas por outros.

## Detalhes técnicos

- `Profile.role` passa a aceitar `"builder"`; revisar usos com `switch`/comparações estritas (busca por `=== "developer"` e `=== "requester"` em `src/` para garantir que Builder caia no caminho de Solicitante onde apropriado).
- `createSolucao` em `src/lib/supabaseData.ts` aceita `createdBy`; conferir se já persiste `data_inicio_prevista`/`data_fim_prevista` (a coluna existe). Caso não, adicionar ao payload.
- Componente `NovaSolucaoDialog` pode ficar inline em `DemandaDetail.tsx` (mesmo padrão usado para `NovoDepartamentoDialog`).
- Nada muda em `Auth.tsx` além do redirecionamento; Builder não é dual-role por padrão.