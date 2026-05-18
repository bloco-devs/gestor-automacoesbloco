# Plano — Trocar "demanda" por "solicitação"

Aplica-se a tudo que é vocabulário do produto. Banco de dados, edge function (`assistente-demanda`) e o tipo gerado `src/integrations/supabase/types.ts` **não** são tocados — manter os nomes técnicos das tabelas (`demanda_solucoes`, `demanda_melhorias`, `demanda_tasks`) evita uma migração arriscada que não muda nada para o usuário final.

## 1. Texto visível ao usuário

Substituições caso-sensíveis:
- "demanda" → "solicitação"
- "demandas" → "solicitações"
- "Demanda" → "Solicitação"
- "Demandas" → "Solicitações"

Arquivos afetados (todas as strings em JSX/toasts/labels):

- `src/pages/NovaDemanda.tsx`: `<h1>Nova demanda</h1>`, botões "Enviar demanda", toast "Demanda registrada".
- `src/pages/MinhasDemandas.tsx`: `<h1>Minhas demandas</h1>`, "Nova demanda", "Nenhuma demanda ainda", "Criar demanda", textos de diálogo "...vinculada a esta demanda".
- `src/pages/DemandaDetail.tsx`: "Demanda não encontrada", toast "Descreva a demanda...", "Demanda atualizada", "Editar demanda", "Editar demanda"/"Descrição", descrições "...desta demanda".
- `src/pages/Solucoes.tsx`: labels "Vincular a uma demanda", "Com demanda vinculada", "Demanda vinculada", "Vincule a uma demanda existente".
- `src/pages/SolicitacoesGantt.tsx`: "...clique no nome para abrir a demanda".
- `src/lib/supabaseData.ts`: mensagens de erro "Faça login novamente para enviar uma demanda." e "...para editar a demanda."
- `src/components/AssistenteDescricao.tsx`: `<DialogTitle>Assistente de demanda</DialogTitle>`.
- `src/components/TasksChecklist.tsx`: "Checklist interno...para esta demanda."
- `src/pages/Configuracoes.tsx`: "...As demandas e soluções..."
- `src/components/AppLayout.tsx`: já está "Minhas Solicitações" / "Nova Solicitação" — nada a fazer.

## 2. Rotas com redirect das antigas

Novas rotas em `src/App.tsx`:
- `/minhas-demandas` → `/minhas-solicitacoes`
- `/nova-demanda` → `/nova-solicitacao`
- `/demanda/:id` → `/solicitacao/:id`

Adicionar rotas de redirect usando `<Navigate>` para que links antigos (favoritos, e-mails) continuem funcionando:

```text
<Route path="/minhas-demandas"  element={<Navigate to="/minhas-solicitacoes" replace />} />
<Route path="/nova-demanda"     element={<Navigate to="/nova-solicitacao" replace />} />
<Route path="/demanda/:id"      element={<RedirectDemanda />} />  // preserva :id
```

Atualizar todos os `navigate("/minhas-demandas")`, `navigate(\`/demanda/${id}\`)`, `<Link to="...">` em:
`Auth.tsx`, `Index.tsx`, `EscolherPerfil.tsx`, `ProtectedRoute.tsx`, `Dashboard.tsx`, `RequesterDashboard.tsx`, `Kanban.tsx`, `SolucoesKanban.tsx`, `Solicitacoes.tsx`, `SolicitacoesGantt.tsx`, `NovaDemanda.tsx`, `MinhasDemandas.tsx`.

## 3. Arquivos, componentes e variáveis internas

Renomear arquivos:
- `src/pages/NovaDemanda.tsx` → `src/pages/NovaSolicitacao.tsx`
- `src/pages/MinhasDemandas.tsx` → `src/pages/MinhasSolicitacoes.tsx`
- `src/pages/DemandaDetail.tsx` → `src/pages/SolicitacaoDetail.tsx`
- `src/components/minhas-demandas/` → `src/components/minhas-solicitacoes/`
  - `CardDestaqueLateral.tsx` (atualizar import interno)
  - `types.ts` (renomear `DemandaCardProps` → `SolicitacaoCardProps`)

Renomear componentes/exports e atualizar imports em `App.tsx`:
- `NovaDemanda` → `NovaSolicitacao`
- `MinhasDemandas` → `MinhasSolicitacoes`
- `DemandaDetail` → `SolicitacaoDetail`

Renomear variáveis/tipos:
- `DemandaCardProps` → `SolicitacaoCardProps`
- Em `src/pages/Solucoes.tsx`: `SortKey "demanda"` → `"solicitacao"`, `demandaTituloById` → `solicitacaoTituloById`, variável local `demanda` → `solicitacao`, label `"Demanda vinculada"` → `"Solicitação vinculada"`.

## O que NÃO é alterado

- Tabelas `demanda_solucoes`, `demanda_melhorias`, `demanda_tasks` e referências em `supabaseData.ts`/`useSupabaseData.ts` que apontam para elas.
- Edge function `assistente-demanda` (slug do invoke).
- Arquivo `src/integrations/supabase/types.ts` (gerado automaticamente).

## Validação

- Após as trocas, rodar `rg -ni "demanda" src` e conferir que sobraram apenas referências às tabelas do banco e à edge function.
- Testar manualmente: navegar para `/demanda/<id>` antigo e confirmar redirecionamento para `/solicitacao/<id>`; idem para `/minhas-demandas` e `/nova-demanda`.
