# Gestor de Automações Bloco — Documentação Oficial

Este diretório é a **Single Source of Truth** do produto **Gestor de Automações Bloco**. Todo novo desenvolvimento deve partir daqui.

## Índice

1. [Product Vision](01-Product-Vision.md)
2. [Personas](02-Personas.md)
3. [Problema e Proposta de Valor](03-Problema-e-Proposta-de-Valor.md)
4. [Regras de Negócio](04-Regras-de-Negocio.md)
5. [Arquitetura](05-Arquitetura.md)
6. [Fluxos](06-Fluxos.md)
7. [Módulos](07-Modulos.md)
8. [IA](08-IA.md)
9. [Frontend](09-Frontend.md)
10. [Backend](10-Backend.md)
11. [Banco de Dados](11-Banco-de-Dados.md)
12. [Segurança](12-Seguranca.md)
13. [Permissões](13-Permissoes.md)
14. [Integrações](14-Integracoes.md)
15. [Design System](15-Design-System.md)
16. [Glossário](16-Glossario.md)
17. [Roadmap](17-Roadmap.md)
18. [Backlog](18-Backlog.md)
19. [ADR](19-ADR/)
20. [Changelog](20-Changelog.md)

## Objetivo do projeto

Centralizar a **gestão de demandas de automação e apps internos** da Bloco Construções: entrada, triagem, priorização, execução (Kanban/Gantt), integração com o ecossistema de sistemas existente e observabilidade da IA embarcada.

## Tecnologias principais

| Camada | Stack |
| --- | --- |
| Frontend | React 18, Vite 5, TypeScript 5, TailwindCSS 3, shadcn/ui, TanStack Query 5, React Router 6, @dnd-kit, @xyflow/react, recharts |
| Backend | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions Deno) |
| IA | HUB Bloco ID → Lovable AI Gateway (Gemini/GPT); fallback direto |
| SSO | Bloco ID (HUB `yzuvwhszpyxchlejxsjd`) |
| Testes | Vitest + Testing Library |

## Como executar

```bash
npm install
npm run dev      # http://localhost:8080
npm run build
npm run test
npm run lint
```

`.env` é populado automaticamente com `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

## Estrutura de pastas

```text
src/                # SPA React
supabase/functions  # Edge Functions (Deno)
supabase/migrations # Histórico de schema (aditivo)
docs/               # Esta documentação
```

## Convenções

- **RLS obrigatório** em toda tabela nova em `public`.
- **Score sempre server-side** (trigger `compute_scores`). IA sugere, humano confirma, servidor calcula.
- Migrations **aditivas e idempotentes** — nunca reescrever histórico.
- Componentes visuais consomem **tokens semânticos** (`index.css`), nunca cores hardcoded.
- Textos de UI em **pt-BR**.
- Commits descrevem intenção; ondas do plano são registradas em `20-Changelog.md`.
