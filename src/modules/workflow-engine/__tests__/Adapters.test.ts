import { describe, it, expect } from "vitest";
import { createMockAdapters } from "../adapters/mocks";

describe("Mock Adapters", () => {
  it("registra chamadas e permite reset", () => {
    const a = createMockAdapters();
    const ctx = { engine: {}, workflowId: "w1", stepId: "s1" };
    a.demand.setPriority(ctx, "alta");
    a.notification.send(ctx, "ops", "oi");
    a.routing.runSmartRouting(ctx);
    a.inbox.refresh(ctx);
    a.operations.logAudit(ctx, "evt");
    a.knowledge.relateArticle(ctx, "art-1");
    expect(a.__calls).toHaveLength(6);
    a.reset();
    expect(a.__calls).toHaveLength(0);
  });
});
