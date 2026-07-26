import { memo } from "react";
import { Section } from "@/design-system";
import TaskCard from "./TaskCard";
import type { RankedInboxItem } from "../types";
import EmptyInbox from "./EmptyInbox";

interface Props {
  items: RankedInboxItem[];
}

/**
 * DS 3.0 — sem Card em volta: um título de seção e uma lista separada por
 * hairline bastam. Isso remove um nível inteiro de caixa (card > card) que
 * era a principal fonte de ruído desta página.
 */
function TaskList({ items }: Props) {
  return (
    <Section title="Minhas tarefas">
      {items.length === 0 ? (
        <EmptyInbox message="Nenhuma tarefa atribuída no momento." />
      ) : (
        <ul className="divide-y divide-border/50 border-y border-border/50" role="list">
          {items.map((it) => (
            <li key={it.id}>
              <TaskCard item={it} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export default memo(TaskList);
