import { describe, it, expect } from "vitest";
import { rankInbox, scoreItem, statusWeight, daysBetween } from "../services/priority-engine";
import type { InboxItem } from "../types";
import type { PipelineStatus } from "@/lib/types";

function mkItem(over: Partial<InboxItem> = {}): InboxItem {
  return {
    id: over.id ?? "1",
    title: over.title ?? "Item",
    system: null,
    status: (over.status ?? "desenvolvimento") as PipelineStatus,
    priority: over.priority ?? 50,
    responsibleId: over.responsibleId ?? null,
    responsibleName: null,
    requesterId: over.requesterId ?? "u-req",
    requesterName: "Req",
    tags: [],
    sprint: null,
    sla: over.sla ?? null,
    updatedAt: over.updatedAt ?? new Date().toISOString(),
    createdAt: over.createdAt ?? new Date().toISOString(),
    href: `/solicitacao/${over.id ?? "1"}`,
    ...over,
  };
}

describe("priority-engine", () => {
  it("statusWeight retorna pesos definidos", () => {
    expect(statusWeight("desenvolvimento" as PipelineStatus)).toBeGreaterThan(0);
    expect(statusWeight("entregue" as PipelineStatus)).toBeLessThan(20);
  });

  it("daysBetween nunca é negativo", () => {
    expect(daysBetween(new Date().toISOString())).toBeGreaterThanOrEqual(0);
  });

  it("prioridade alta produz score maior que baixa", () => {
    const hi = scoreItem(mkItem({ id: "hi", priority: 90 }));
    const lo = scoreItem(mkItem({ id: "lo", priority: 10 }));
    expect(hi.score).toBeGreaterThan(lo.score);
  });

  it("SLA vencido soma bônus e razão", () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const r = scoreItem(mkItem({ sla: past }));
    expect(r.reasons.some((x) => /SLA vencido/.test(x))).toBe(true);
  });

  it("itens entregues ficam com score baixo", () => {
    const r = scoreItem(mkItem({ status: "entregue" as PipelineStatus, priority: 100 }));
    expect(r.score).toBeLessThanOrEqual(30);
  });

  it("responsável = usuário atual soma bônus", () => {
    const withUser = scoreItem(mkItem({ responsibleId: "u1" }), { currentUserId: "u1" });
    const without = scoreItem(mkItem({ responsibleId: "u1" }), { currentUserId: "u2" });
    expect(withUser.score).toBeGreaterThan(without.score);
  });

  it("rankInbox ordena decrescente por score", () => {
    const list = rankInbox([
      mkItem({ id: "a", priority: 10 }),
      mkItem({ id: "b", priority: 80 }),
      mkItem({ id: "c", priority: 50 }),
    ]);
    expect(list[0].id).toBe("b");
    expect(list[list.length - 1].id).toBe("a");
  });

  it("tempo parado aumenta score", () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const fresh = new Date().toISOString();
    const a = scoreItem(mkItem({ id: "a", updatedAt: old }));
    const b = scoreItem(mkItem({ id: "b", updatedAt: fresh }));
    expect(a.score).toBeGreaterThan(b.score);
  });
});
