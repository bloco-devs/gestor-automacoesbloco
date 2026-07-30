# Fase 7 — Código de rastreio legível (ticket_code)

Trocar o identificador exibido (hoje um pedaço do UUID, ex. `#a3367b`) por um código
profissional e temporal, ex. `RH-2607-0001`. O UUID continua sendo a chave primária;
o novo código é apenas para exibição e rastreio.

## O que muda para o usuário

- Toda demanda passa a ter um código fixo, curto e legível, gerado no momento da criação.
- O código aparece no mesmo lugar onde hoje aparece o `#a3367b`: cartões do Kanban,
  linhas de lista, detalhe da demanda e portal do solicitante.
- Demandas antigas (8 hoje) recebem um código de compatibilidade no formato `LEG-YYMM-0001`.

## Regra de formação

`[PREFIXO]-[AAMM]-[SEQUENCIAL 4 dígitos]`

- **Prefixo**: derivado do sistema da demanda — `rh` → `RH`, `processos`/`sgpo` → `GP`,
  `obra`/`obras` → `OBR`; sem sistema ou sistema desconhecido → `REQ`.
- **AAMM**: ano e mês da criação (julho/2026 → `2607`).
- **Sequencial**: reinicia a cada mês, por prefixo, com zeros à esquerda.

Observação importante sobre o estado atual: a coluna `demands.system_id` está **nula em
todas as 8 demandas existentes** (a IA propositalmente não grava o slug do ecossistema
nessa coluna uuid). Na prática, enquanto isso não mudar, todo código novo nascerá com o
prefixo `REQ`. O mapeamento de prefixos fica pronto e passa a valer automaticamente
assim que a demanda passar a carregar um sistema. Ligar a triagem ao `system_id` é
trabalho de outra fase, não desta.

## Banco de dados (uma migration)

1. `ALTER TABLE public.demands ADD COLUMN ticket_code text` + índice único.
2. Função `public.demand_prefixo(_system_id uuid)`: resolve o nome do sistema em
   `public.solucoes` (normalizado, sem acento) e devolve `RH` / `GP` / `OBR` / `REQ`.
3. Função `public.demands_set_ticket_code()` + trigger `BEFORE INSERT`:
   - só age quando `ticket_code` é nulo;
   - calcula prefixo e `AAMM`;
   - sequencial = maior sequencial já usado naquele prefixo+mês + 1, lido da própria
     tabela com `FOR UPDATE`-safe (bloqueio consultivo por prefixo+mês via
     `pg_advisory_xact_lock`) para não gerar duplicatas em inserts concorrentes;
   - retry em caso de colisão na constraint única.
4. Backfill idempotente: `UPDATE` das demandas existentes com
   `LEG-<AAMM da criação>-<sequência por mês, ordenada por created_at>`, apenas onde
   `ticket_code IS NULL`.
5. `NOT NULL` na coluna depois do backfill.

Sem alteração de RLS, grants ou chave primária.

## Front-end

- `src/modules/demands/types.ts`: adicionar `ticket_code: string | null` em `Demand`.
- `src/domain/demand/mappers/fromDemands.ts`: `referencia` passa a usar `ticket_code`,
  com o slice do UUID mantido apenas como fallback para linhas sem código.
- `src/domain/demand/mappers/fromAtividades.ts`: inalterado (cards do Trello não têm
  ticket_code; continuam com a referência curta atual).
- Nada muda em `DemandaRow.tsx`, `BoardLente.tsx`, `DemandaDetalhe.tsx`, Inbox e portal:
  todos já leem `demanda.referencia`, então recebem o novo código sozinhos.
- `src/modules/platform/spotlight/SpotlightProviders.tsx`: trocar `#${d.id.slice(0,8)}`
  pelo `ticket_code` (e torná-lo pesquisável na busca universal).
- Tipos do Supabase são regenerados após a migration.

## Verificação

- Consultar as 8 demandas legadas e conferir os códigos `LEG-…`.
- Criar uma demanda de teste e conferir `REQ-2607-0001` (e o incremento na segunda).
- Rodar os testes do domínio (`adapters.test.ts` cobre `referencia`).
