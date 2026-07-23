# 79 — Studio Architecture

## Camadas
```
src/modules/studio/
├── types.ts              # Documento, nó, binding, breakpoint
├── store.ts              # Reducer + hooks (useStudio)
├── persistence.ts        # localStorage load/save
├── registry/
│   ├── components.ts     # Component Registry (catálogo visual)
│   └── bindings.ts       # Binding kinds e adaptadores read-only
├── ai/
│   └── templates.ts      # Templates client-side (sem exec de IA)
├── components/
│   ├── StudioShell.tsx
│   ├── Explorer.tsx
│   ├── Canvas.tsx
│   ├── CanvasNode.tsx
│   ├── Inspector.tsx
│   ├── Outline.tsx
│   ├── Toolbar.tsx
│   ├── StatusBar.tsx
│   ├── PreviewRuntime.tsx
│   ├── AIStudio.tsx
│   ├── PluginStudio.tsx
│   ├── WorkflowStudio.tsx
│   └── ExportPanel.tsx
└── index.ts
```

## Dependências
- DS 2.0 (`@/design-system`).
- `@/components/ui/*`.
- SDKs consumidos por leitura: `platform-sdk/services`, `workflow-sdk`, `ai-sdk`, `plugins`.
- `React.memo`, `useMemo`, `lazy`, `Suspense` para custo mínimo.

## Roteamento
`/studio` — `ProtectedRoute role="developer"`, lazy loaded a partir de `App.tsx`.

## Testes
`src/modules/studio/__tests__/store.test.ts` — verifica reducer, undo/redo, add/move/duplicate/remove e serialização.

## Restrições
Sem migrations, sem edge functions, sem alterações em contratos públicos ou motores. Todos os artefatos vivem em memória e `localStorage` do usuário.
