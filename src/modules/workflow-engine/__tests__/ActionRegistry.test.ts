import { describe, it, expect } from "vitest";
import {
  getExecutor,
  hasExecutor,
  listExecutors,
  registerExecutor,
} from "../registry/ActionRegistry";

describe("ActionRegistry", () => {
  it("registra executores default para todos os tipos usados", () => {
    const types = [
      "set_priority",
      "set_assignee",
      "run_smart_routing",
      "add_comment",
      "create_task",
      "relate_knowledge_article",
      "send_notification",
      "refresh_inbox",
      "log_audit",
    ] as const;
    for (const t of types) {
      expect(hasExecutor(t)).toBe(true);
      expect(getExecutor(t)?.type).toBe(t);
    }
    expect(listExecutors().length).toBeGreaterThanOrEqual(types.length);
  });

  it("permite override via registerExecutor", () => {
    const original = getExecutor("refresh_inbox");
    registerExecutor({
      type: "refresh_inbox",
      describe: () => "custom",
      execute: () => "custom-out",
    });
    expect(getExecutor("refresh_inbox")?.describe({ id: "x", type: "refresh_inbox", params: {} })).toBe("custom");
    if (original) registerExecutor(original);
  });
});
