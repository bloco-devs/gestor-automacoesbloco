# 77 — Platform Studio

Rota: `/studio`. Ambiente visual low-code para desenvolvedores construírem aplicações reutilizando os SDKs, o Design System 2.0 e os módulos existentes da plataforma.

## Superfícies
- **Explorer** — árvore de páginas do rascunho atual.
- **Canvas** — área central com componentes arrastáveis; snap + grid opcional.
- **Outline** — hierarquia do nó selecionado.
- **Inspector / Properties** — edição de props, layout, tipografia, responsividade e bindings.
- **Toolbar** — undo, redo, breakpoint, tema, salvar, exportar.
- **Status Bar** — resumo (contagem de nós, breakpoint, tema, autosave).

## Painéis dedicados
- **AI Studio** — templates gerados via AI SDK (skills existentes; nada é executado sem confirmação).
- **Plugin Studio** — extension points (`sidebar`, `dashboard.widget`, `workspace.widget`, `copilot.action`, `context.panel`, `command`) montáveis em rascunho.
- **Workflow Studio** — leitura de triggers/conditions/actions/validators/hooks registrados via Workflow SDK.
- **Preview Runtime** — executa o layout do rascunho em Desktop/Tablet/Mobile e Light/Dark.
- **Export** — gera Plugin Manifest, Studio Manifest, Layout JSON, Bindings JSON, Preview Snapshot e Documentação.

## Persistência
- `localStorage: studio.v1.doc` — documento ativo.
- `localStorage: studio.v1.history` — pilhas de undo/redo (limite 50).
- Sem escrita no Supabase, sem edge function nova, sem mudanças em RLS.

## Integração com o Marketplace
O Studio prepara artefatos compatíveis com o Plugin Runtime (Feature 101) e o Extension Host (Plugin 004). A publicação em si permanece no Marketplace e não faz parte desta feature.
