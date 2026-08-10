# Stepper amigável no topo da demanda

Refatorar a linha de progresso do topo da página de detalhes da demanda para um stepper de rastreio claro, com linha de conexão, check nas etapas cumpridas, destaque forte na etapa atual e nomes amigáveis para quem não é técnico.

## O que muda visualmente

- Linha horizontal conectando todas as etapas. O trecho que chega a uma etapa cumprida fica na cor de sucesso; o restante fica cinza.
- Etapa cumprida: círculo preenchido com cor de sucesso e ícone de check.
- Etapa atual: círculo maior, borda na cor primária, fundo claro, rótulo em negrito e a etiqueta de tempo ("hoje", "3 dias") logo abaixo do círculo.
- Etapas futuras: círculo e texto em cinza (tokens `muted`).
- Etapa pulada continua distinta (círculo vazado tracejado + rótulo riscado) — pintar de verde o que ninguém fez seria informação falsa.
- Container próprio com respiro e separador (`py-4 border-b`), separando o stepper do conteúdo abaixo.
- Flex com distribuição uniforme; em telas pequenas os rótulos das etapas não atuais somem e ficam só os círculos + a etapa atual, evitando quebra feia.
- O aviso de retrabalho ("Voltou N vezes para uma etapa anterior") permanece.

## Terminologia amigável

Dicionário de exibição aplicado apenas na renderização (IDs, status e lógica de banco intactos):

- Backlog → Na fila
- A Fazer / To Do → Pronto para iniciar
- Em Desenvolvimento → Em atendimento
- Em Testes / Homologação → Em validação
- Concluído → Entregue

Casamento por rótulo normalizado (sem acento/caixa), com fallback ao rótulo original quando não houver correspondência — quadros personalizados continuam mostrando o nome que o time deu à coluna.

## Detalhes técnicos

- Arquivo alterado: `src/modules/workspace-demandas/demanda/Progresso.tsx` (o consumo em `DemandaDetalhe.tsx` continua igual; só ajusto as classes passadas via `className` se necessário).
- Novo módulo de exibição `rotuloAmigavel(rotulo: string): string` junto ao componente, tipado estritamente, exportado para reuso.
- Mantém `memo`, o tipo `Progressao`/`Etapa` do domínio e zero chamadas de IA/rede.
- Somente tokens semânticos do design system (`primary`, `success`/`emerald` do tema, `muted`, `border`) — sem cores cruas hardcoded fora dos tokens já usados no projeto.
- Sem mudanças em banco, RLS ou edge functions.
