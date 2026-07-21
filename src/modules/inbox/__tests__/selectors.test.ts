import { describe, it, expect } from "vitest";
import { selectInsights, selectMyTasks, selectPriorityItem, selectSummary, isDoneToday } from "../selectors";
import { scoreItem } from "../services/priority-engine";
import type { InboxItem, RankedInboxItem } from "../types";
import type { PipelineStatus } from "@/lib/types";

function mk(over: Partial<InboxItem>): RankedInboxItem {
  const base: InboxItem = {
    id: "x",
    title: "T",
    system: null,
    status: "desenvolvimento" as PipelineStatus,
    priority: 50,
    responsibleId: null,
    responsibleName: null,
    requesterId: "u",
    requesterName: "u",
    tags: [],
    sprint: null,
    sla: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    href: "/x",
    ...over,
  };
  return scoreItem(base);
}

describe("selectors", () => {
  it("selectSummary conta status corretamente", () => {
    const items = [
      mk({ id: "1", status: "qa" as PipelineStatus }),
      mk({ id: "2", status: "qa" as PipelineStatus }),
      mk({ id: "3", status: "desenvolvimento" as PipelineStatus }),
      mk({ id: "4", status: "entregue" as PipelineStatus }),
    ];
    const s = selectSummary(items);
    expect(s.waitingQa).toBe(2);
    expect(s.inProgress).toBe(1);
    expect(s.total).toBe(4);
  });

  it("selectPriorityItem ignora entregues/cancelados", () => {
    const items = [
      mk({ id: "1", status: "entregue" as PipelineStatus, priority: 100 }),
      mk({ id: "2", status: "desenvolvimento" as PipelineStatus, priority: 20 }),
    ].sort((a, b) => b.score - a.score);
    const p = selectPriorityItem(items);
    expect(p?.id).toBe("2");
  });

  it("selectMyTasks filtra por usuário", () => {
    const items = [
      mk({ id: "a", responsibleId: "u1" }),
      mk({ id: "b", requesterId: "u1" }),
      mk({ id: "c", responsibleId: "u2", requesterId: "u2" }),
    ];
    const mine = selectMyTasks(items, "u1");
    expect(mine.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("selectInsights gera aviso para QA e itens parados", () => {
    const stale = mk({
      id: "old",
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const qa1 = mk({ id: "q1", status: "qa" as PipelineStatus });
    const ins = selectInsights([stale, qa1]);
    expect(ins.some((i) => i.id === "qa-count")).toBe(true);
    expect(ins.some((i) => i.id.startsWith("stale-"))).toBe(true);
  });

  it("isDoneToday reconhece entregues no dia", () => {
    const today = mk({ status: "entregue" as PipelineStatus, updatedAt: new Date().toISOString() });
    const old = mk({
      status: "entregue" as PipelineStatus,
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(isDoneToday(today)).toBe(true);
    expect(isDoneToday(old)).toBe(false);
  });
});
