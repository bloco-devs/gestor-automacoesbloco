import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TaskCard from "./TaskCard";
import type { RankedInboxItem } from "../types";
import EmptyInbox from "./EmptyInbox";

interface Props {
  items: RankedInboxItem[];
}

function TaskList({ items }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Minhas tarefas</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyInbox message="Nenhuma tarefa atribuída no momento." />
        ) : (
          <ul className="space-y-2" role="list">
            {items.map((it) => (
              <li key={it.id}>
                <TaskCard item={it} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(TaskList);
