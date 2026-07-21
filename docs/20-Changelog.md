# Changelog

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/). Datas em ISO 8601.

## [Unreleased]
- Consolidação documental oficial (`docs/00-README.md` .. `docs/20-Changelog.md`, `docs/19-ADR/ADR-001.md`).

## 2026-07-21 — Documentação oficial (Task 002)
### Added
- Pasta `/docs` com 20 documentos fundacionais + ADR-001.
- Diagramas Mermaid dos fluxos principais em `/mnt/documents/`.

## 2026-06-27 — Realtime & UX Atividades
### Fixed
- `REPLICA IDENTITY FULL` nas tabelas de Atividades para eventos completos.
- Fallback de URL pública em `BoardCard` quando URL assinada expira.
- Contraste de avatares e header do board.

### Changed
- Fundo dos cards fixo (`#ffffff`) para contraste sobre colunas coloridas.
- Sidebar reorganizada; `ThemeToggle` reposicionado.

## 2026-06-26 — Ondas 0–11 & Módulo Atividades RC1
### Added
- Ondas 0..10 de IA (guardrails, triagem, similares, resumo, mapa vivo, saúde de integrações, observabilidade, testes).
- Épicos A/B: classificação por `tipo_demanda` + motor de Consolidação.
- Importador Trello (RFC-001) com wizard 7 passos, jobs, entities, member map.
- Sistema de avatares (`profiles.avatar_url`) com editor tipo LinkedIn.
- Capas customizadas de boards em Storage `atividades-capas`.

### Changed
- Kit UX (`DataSourceBadge`, `EmptyState`, `ListState`, `FieldHelp`) integrado ao Dashboard/Listas.
- Paleta Trello oficial em etiquetas + `readableTextOn` + `colunaAccent` pastel.
- Scrollbar global minimalista.

### Security
- Rate limit 20/60s nas funções de IA.
- Endurecimento inicial de RLS documentado em `docs/RLS_AUDIT.md`.
