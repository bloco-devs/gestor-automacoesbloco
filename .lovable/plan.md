## Objetivo

Permitir que você compare visualmente 3 propostas de UX para os cards de demandas em **Minhas Demandas** e ajustar o tom de verde (success) no modo claro para melhor contraste.

## 1. Seletor de mockup na tela

No topo da página `/minhas-demandas`, adicionar um pequeno controle (Tabs com 3 opções: "Compacto", "Destaque lateral", "Painel moderno"). A escolha fica salva em `localStorage` apenas para esta fase de avaliação. Os 3 layouts renderizam os mesmos dados — só muda a apresentação. Após sua decisão, removo o seletor e os outros 2 layouts.

## 2. Os 3 layouts

**A — Compacto e denso**
- Linha única por card: título + StatusBadge à esquerda, métricas como chips pequenos no centro, ações em ícones (Editar, Abrir chamado) à direita.
- Timeline em barra ultra-fina (4px) abaixo, sem labels.
- Descrição truncada em 1 linha, aparece em tooltip.
- Padding reduzido (`p-3`), bom para listas longas.

**B — Destaque lateral por status**
- Barra colorida vertical de 4px na borda esquerda do card, na cor do status (`bg-info`, `bg-warning`, `bg-success` etc.).
- Header com título grande + StatusBadge; descrição em 2 linhas.
- Métricas como chips arredondados em linha (Frequência, Complexidade, Retorno, Dificuldade).
- Timeline horizontal compacta + ações como botões outline no rodapé.

**C — Painel moderno**
- Header com fundo `bg-muted/40` arredondado contendo título, badge e timestamp.
- Grid 2x2 (mobile) / 4x1 (desktop) de chips de métricas com ícones.
- Timeline com marcos numerados e rótulos curtos.
- Rodapé separado por `border-t` com ações alinhadas à direita.

Todos respeitam tokens semânticos (sem cores hard-coded), mantém o clique no card abrindo detalhes e `stopPropagation` nas ações.

## 3. Ajuste do verde no light mode

Em `src/index.css`, alterar apenas no bloco `:root` (light):
- `--success: 142 55% 38%` → `142 65% 26%` (verde mais escuro e saturado, contraste AA sobre fundo areia).
- `--success-foreground` mantém-se claro.
- Dark mode permanece inalterado.

Isto afeta `StatusBadge` (status "pronto"), `StatusTimeline` (etapas concluídas) e qualquer uso de `bg-success/text-success`.

## Detalhes técnicos

- Novos componentes: `src/components/minhas-demandas/CardCompacto.tsx`, `CardDestaqueLateral.tsx`, `CardPainelModerno.tsx`.
- `MinhasDemandas.tsx` passa a renderizar o card escolhido pelo `Tabs`. Estado e dialog de "Abrir chamado" permanecem onde estão.
- Nenhuma mudança em dados, rotas ou Supabase.

## Fora de escopo

- Outras abas (Dashboard, Solicitações, Kanban, Soluções).
- Mudanças em status, dados, ou regras de negócio.
