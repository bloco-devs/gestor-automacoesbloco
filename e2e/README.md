# Testes E2E (Playwright)

## Rodar

```bash
E2E_SOLICITANTE_EMAIL=... E2E_SOLICITANTE_SENHA=... \
E2E_DEV_EMAIL=... E2E_DEV_SENHA=... \
bun run e2e
```

Sem essas variáveis os fluxos são **skipped** (nunca falso-verde), porque o E2E
roda contra o Supabase real — não há mock de sessão.

- `helpdesk.spec.ts` — solicitante cria demanda → dev vê na Caixa de Entrada →
  arrasta para Concluída → lixeira + confirm → cartão desaparece.
- `kanban.spec.ts` — cria quadro → cartão em "A Fazer" → etiqueta (valida que o
  auto-save não devolveu 4xx/5xx) → concluir pela bolinha da capa.

Diagnóstico de falha: `trace`, `screenshot` e `video` retidos apenas em falha.
Relatório: `bun run e2e:report`.

## Localizadores

Os testes usam `data-testid` estáveis: `card-demanda`, `coluna`,
`cartao-concluir`, `cartao-excluir`, `compor-cartao-*`, `card-detail-modal`,
`modal-concluir`, `botao-etiquetas`, `popover-etiquetas`, `etiqueta-*`,
`abrir-criar-quadro`, `criar-quadro-salvar`.
