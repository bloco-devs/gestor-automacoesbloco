## Objetivo

Registrar e exibir qual desenvolvedor realizou a avaliação técnica de cada solicitação (complexidade do dev / notas técnicas).

## 1. Banco de dados (migration)

Adicionar duas colunas em `public.solicitacoes`:

- `avaliado_por uuid` — id do usuário que salvou a avaliação técnica
- `avaliado_em timestamptz` — quando a avaliação foi salva

Atualizar a função `enforce_dev_only_columns()` (que hoje protege `complexidade_dev` e `notas_tecnicas_complexidade`) para também proteger `avaliado_por` / `avaliado_em` — só devs/admins podem alterar.

Atualizar a função `log_score_history()` para preencher automaticamente `avaliado_por = auth.uid()` e `avaliado_em = now()` sempre que `complexidade_dev` ou `notas_tecnicas_complexidade` mudarem (mantém o histórico já existente).

Backfill: para solicitações que já têm `complexidade_dev` preenchida, copiar o último `changed_by` / `changed_at` do `solicitacoes_score_history` (quando existir).

Sem mudanças nas policies de SELECT — solicitante já vê a sua própria solicitação inteira; devs/admins já veem todas.

## 2. Camada de dados (`src/lib/supabaseData.ts`)

- Incluir `avaliado_por` e `avaliado_em` em `SOLICITACAO_COLS` e no tipo `SolicitacaoRow`.
- Mapear para `avaliadoPor` e `avaliadoEm` no objeto `Solicitacao`.
- Em `updateSolicitacao`, não precisamos enviar `avaliado_por` — o trigger cuida disso.
- Buscar `profiles.nome` do avaliador via join leve (nova função `getAvaliadorInfo(userId)` ou já trazer em `fetchSolicitacaoCompleta` via segundo `select` em `profiles`).

## 3. Tipos (`src/lib/types.ts`)

Adicionar a `Solicitacao`:

```text
avaliadoPor: string | null
avaliadoEm: string | null
```

## 4. UI (`src/pages/SolicitacaoDetail.tsx`)

Logo abaixo da nota de complexidade do dev (próximo ao bloco "Salvar Avaliação Técnica" e no card resumo visível para o solicitante), exibir um rótulo discreto:

```text
Avaliado por <Nome do dev> em 19/05/2026 às 14:30
```

- Visível para devs/admins (`isDev`) **e** para o dono da solicitação (`isOwner`).
- Se ainda não houver avaliação: mostrar "Aguardando avaliação técnica" em `text-muted-foreground`.
- Nome vem de `profiles.nome` (fallback para email do histórico, depois "Desconhecido").

## 5. Validação

- Salvar avaliação como dev → confirmar que `avaliado_por` e `avaliado_em` foram preenchidos no banco e aparecem na UI.
- Abrir a mesma solicitação como o solicitante → confirmar que vê o nome do avaliador.
- Confirmar que o histórico de avaliações continua funcionando.
- Rodar `supabase--linter` após a migration.

## Fora de escopo

- Não alterar `assistente-demanda` nem tabelas legadas `demanda_*`.
- Não mexer no card de score do solicitante.
- Sem alterações em rotas ou autenticação.
