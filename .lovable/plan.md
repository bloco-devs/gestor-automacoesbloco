# Rosto oficial do Blink na mensagem automática do fio

O ícone oficial do Blink já existe como componente reutilizável (`src/components/blink/Blink.tsx`) e é o que a lateral direita renderiza ao lado do título "Blink". Não é SVG inline — não há nada a extrair.

O único ponto fora do padrão é o avatar da mensagem automática no fio de comentários: hoje ele usa o ícone genérico `Bot` do lucide, enquanto a fala da IA no mesmo fio já usa o Blink.

## O que muda

- Em `src/modules/workspace-demandas/demanda/Fio.tsx`, o avatar do caso `sistema` passa a renderizar `<Blink />` dentro do mesmo círculo de 28px (`size-7`, `rounded-full`, `overflow-hidden`), igual ao avatar da IA, com `aria-label="Blink"`.
- Remover o import agora ocioso de `Bot` (usado só nesse ponto do arquivo).
- Manter o badge "automático", que é o que diferencia o aviso do sistema de uma fala da IA — a identidade visual passa a ser a mesma, a etiqueta continua distinguindo a origem.

## Detalhes técnicos

- `Blink` aceita `className` e `animado`; no fio ele fica estático (`animado` ausente), como já acontece na fala da IA.
- Sem alteração de tipos, dados ou lógica de permissão; nenhuma mudança em `CardComentario.tsx` (o modal do Kanban não renderiza avatar de sistema).
