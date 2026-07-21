# 26 — Human First UX

Filosofia oficial da plataforma: a interface fala a linguagem do **negócio**, não da engenharia.

## Personas oficiais

| Persona | Public | Linguagem |
|---|---|---|
| `solicitante` | RH, Financeiro, Comercial, colaboradores em geral | Extremamente simples, sem jargão |
| `tecnica` | Equipe técnica / desenvolvedores / builders | Termos originais preservados |
| `gestor` | Gestores e Diretoria | Executiva, orientada a resultado |

Toda nova tela deve declarar explicitamente para qual persona foi projetada.
**Nenhuma interface deve misturar** linguagem técnica e linguagem de negócio.

## Módulo `src/modules/ux/`

```
language/
  types/          → Persona, TermKey, FriendlyError
  dictionary/     → Dicionário por persona + catálogo de erros
  providers/      → LanguageProvider + useLanguage
  hooks/          → useT, usePersona, useIsLayUser, useTerms, useFriendlyError
  labels/         → EMPTY_STATES, MICROCOPY
__tests__/
```

### Uso rápido

```tsx
import { useT } from "@/modules/ux";

function MyPage() {
  const t = useT();
  return <h1>{t("my_issues")}</h1>; // "Meus pedidos" / "Minhas Issues" / "Minhas demandas"
}
```

## Tom de voz

- Curto, objetivo, sem siglas nem inglês.
- Responde "o que você quer fazer?" e não "como o sistema funciona?".
- Erros sempre trazem **ação sugerida**.

## Microcopy — antes / depois

| Ruim | Bom |
|---|---|
| Erro ao executar operação. | Não foi possível concluir sua solicitação. Tente novamente. |
| Request failed. | Ocorreu um problema de comunicação. |
| Timeout. | A resposta demorou mais do que o esperado. |
| No data. | Você ainda não possui solicitações. |

## Empty states

Use `EMPTY_STATES` (labels) em vez de strings inline. Sempre com título + descrição + ação (quando aplicável).

## Catálogo de erros

`FRIENDLY_ERRORS` mapeia `generic | network | timeout | unauthorized | notFound | rateLimit | server` → `{ title, message, action, icon }`. Use `useFriendlyError()` para resolver `Error` cru em mensagem humana.

## Restrições

Este módulo **apenas adapta a experiência**. Não altera regras de negócio, banco, RLS, autenticação, AI Engine, Context Engine nem Platform Layer.
