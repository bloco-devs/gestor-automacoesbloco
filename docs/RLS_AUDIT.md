# RLS Audit — Onda 8 (Bloco C)

Data: 2026-06-26
Escopo: tabelas com CRUD direto do browser (`solicitacoes`, `allowed_emails`,
`atividades_*`, comentários, soluções, diagrama). Auditoria **conservadora**:
não foram aplicadas migrações nesta onda para evitar risco de quebrar
acessos válidos em produção (gate G6 do `GAPS_automacoes`).

## Princípios usados na revisão

1. Tabelas com `auth.uid()` em `USING`/`WITH CHECK` ou `has_role(...)` /
   `is_allowed_user()` são consideradas seguras.
2. Policies com `USING (true)` sem condição extra são candidatas a
   endurecimento, **exceto** quando documentadamente públicas (não há
   esse caso no app).
3. Não foi alterada nenhuma policy do diagrama (`solucao_diagrama_*`)
   nem da telemetria de IA (`ia_uso_log`) — fora de escopo nesta onda.

## Observações por tabela

- `solicitacoes` (28 col, 6 policies): policies escopam por
  `auth.uid()`/`is_allowed_user()`/`has_role('admin')`. Triggers
  `enforce_dev_only_columns` + `compute_scores` blindam campos sensíveis
  (complexidade_dev, score). **OK.**
- `allowed_emails` (5 col, 4 policies): leitura/escrita restrita a
  `has_role('admin')` (gerenciada via `Configuracoes`). **OK.**
- `user_roles` (4 col, 7 policies): policies de grant/revoke restritas a
  `has_role('admin')`, leitura limitada ao próprio usuário. **OK.**
- `atividades_cards`, `atividades_colunas`, `atividades_comentarios`,
  `atividades_personas` (4–6 policies cada): escopadas a
  `is_allowed_user()` + ownership/papel. **OK** para o uso atual, mas
  vale revisar separação por board quando houver multi-tenant.
- `solucao_tasks`, `demanda_tasks`, `demanda_solucoes`,
  `demanda_melhorias`, `criterios_solucoes`, `solucoes`: policies usam
  `is_allowed_user()` e/ou ownership. **OK.**
- `solicitacoes_score_history` (3 policies): apenas leitura para
  `has_role('admin')` + inserts via trigger SECURITY DEFINER
  (`log_score_history`). **OK.**
- `notificacoes` (4 policies): usuário só lê/atualiza as próprias;
  insert via trigger SECURITY DEFINER. **OK.**
- `ia_uso_log` (1 policy): inserts via service_role nas edge functions;
  fora de escopo. **Sem mudança.**
- `solucao_diagrama_*` (posicoes, conexoes, conexao_colunas, notas):
  fora de escopo nesta onda. **Sem mudança.**

## Achados que NÃO viraram migração (motivação)

- Nenhuma tabela coberta acima apresenta `USING (true)` sem condição
  extra. Endurecimentos adicionais (ex.: restringir leitura de
  `atividades_*` por board do usuário) exigem mudança de modelo e
  podem regredir acesso. Recomendado tratar em onda dedicada com
  testes de regressão por papel.

## Próximas ondas

- Revisitar `atividades_*` quando houver multi-board/owner por board.
- Auditar policies do diagrama em conjunto com a Onda 5/6 (HUB), já
  que a fonte real poderá alterar contratos de leitura.
