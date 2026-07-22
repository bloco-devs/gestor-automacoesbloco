import { describe, it, expect } from "vitest";
import {
  applyFilters,
  buildDevRows,
  buildKnowledgeStats,
  buildRoutingStats,
  buildSlaStats,
  buildSystemRows,
  buildTrend,
  buildWorkflowStats,
  periodSinceIso,
} from "../services/analytics-service";
import { toCsv } from "../utils/csv";
import type { Demand } from "@/modules/demands/types";
import type { UserWorkload } from "@/modules/demands/service";

const NOW = new Date("2026-07-22T12:00:00Z").getTime();

function demand(overrides: Partial<Demand>): Demand {
  return {
    id: "d1",
    title: "T",
    description: null,
    system_id: null,
    status: "backlog",
    priority: "media",
    type: "melhoria",
    complexity: "media",
    assigned_to: null,
    created_by: "u",
    created_at: new Date(NOW - 2 * 86400000).toISOString(),
    updated_at: new Date(NOW - 2 * 86400000).toISOString(),
    deleted_at: null,
    sla_due_at: null,
    sla_first_response_at: null,
    sla_status: "no_prazo",
    ...overrides,
  };
}

describe("analytics-service", () => {
  it("periodSinceIso respeita a janela", () => {
    const iso = periodSinceIso("7d", NOW);
    expect(NOW - new Date(iso).getTime()).toBe(7 * 86400000);
  });

  it("applyFilters filtra por sistema, prioridade e status", () => {
    const ds = [
      demand({ id: "a", system_id: "s1", priority: "alta", status: "backlog" }),
      demand({ id: "b", system_id: "s2", priority: "baixa", status: "concluido" }),
      demand({ id: "c", system_id: "s1", priority: "baixa", status: "backlog" }),
    ];
    const out = applyFilters(ds, { period: "30d", systemId: "s1", priority: "baixa" }, NOW);
    expect(out.map((d) => d.id)).toEqual(["c"]);
  });

  it("buildTrend gera buckets com criadas/concluidas/backlog acumulado", () => {
    const ds = [
      demand({ id: "a", created_at: new Date(NOW - 3 * 86400000).toISOString(), status: "backlog", updated_at: new Date(NOW - 3 * 86400000).toISOString() }),
      demand({
        id: "b",
        created_at: new Date(NOW - 2 * 86400000).toISOString(),
        updated_at: new Date(NOW - 86400000).toISOString(),
        status: "concluido",
      }),
    ];
    const trend = buildTrend(ds, "7d", NOW);
    expect(trend).toHaveLength(7);
    const totalCriadas = trend.reduce((s, p) => s + p.criadas, 0);
    const totalConcluidas = trend.reduce((s, p) => s + p.concluidas, 0);
    expect(totalCriadas).toBe(2);
    expect(totalConcluidas).toBe(1);
    // Último dia: "a" segue aberto → backlog >= 1.
    expect(trend[trend.length - 1].backlog).toBeGreaterThanOrEqual(1);
  });

  it("buildDevRows soma concluídas e SLA por responsável", () => {
    const ds = [
      demand({
        id: "1",
        assigned_to: "u1",
        status: "concluido",
        sla_status: "cumprido",
        created_at: new Date(NOW - 2 * 86400000).toISOString(),
        updated_at: new Date(NOW - 86400000).toISOString(),
      }),
      demand({ id: "2", assigned_to: "u1", status: "backlog" }),
      demand({
        id: "3",
        assigned_to: "u2",
        status: "concluido",
        sla_status: "estourado",
        created_at: new Date(NOW - 3 * 86400000).toISOString(),
        updated_at: new Date(NOW - 86400000).toISOString(),
      }),
    ];
    const wl: UserWorkload[] = [
      { user_id: "u1", nome: "Ana", email: null, avatar_url: null, active_count: 1 },
      { user_id: "u2", nome: "Beto", email: null, avatar_url: null, active_count: 0 },
    ];
    const rows = buildDevRows(ds, wl, new Map());
    const u1 = rows.find((r) => r.user_id === "u1")!;
    const u2 = rows.find((r) => r.user_id === "u2")!;
    expect(u1.concluidas).toBe(1);
    expect(u1.backlogAtual).toBe(1);
    expect(u1.slaCumprimentoPct).toBe(100);
    expect(u2.slaCumprimentoPct).toBe(0);
  });

  it("buildSystemRows agrupa por sistema e conta tipos", () => {
    const ds = [
      demand({ id: "1", system_id: "s1", type: "bug" }),
      demand({ id: "2", system_id: "s1", type: "melhoria" }),
      demand({ id: "3", system_id: "s2", type: "automacao", status: "concluido", sla_status: "cumprido" }),
    ];
    const rows = buildSystemRows(ds, [
      { id: "s1", nome: "Sistema A" },
      { id: "s2", nome: "Sistema B" },
    ]);
    const a = rows.find((r) => r.id === "s1")!;
    expect(a.bugs).toBe(1);
    expect(a.melhorias).toBe(1);
    expect(a.backlog).toBe(2);
    const b = rows.find((r) => r.id === "s2")!;
    expect(b.automacoes).toBe(1);
    expect(b.slaCumprimentoPct).toBe(100);
  });

  it("buildWorkflowStats calcula sucesso/falha/duração", () => {
    const stats = buildWorkflowStats(
      [
        { id: "1", workflow_id: "w", demand_id: null, status: "success", duration_ms: 200, execution_result: {}, actor_id: null, created_at: "" },
        { id: "2", workflow_id: "w", demand_id: null, status: "error", duration_ms: 400, execution_result: {}, actor_id: null, created_at: "" },
      ],
      [],
    );
    expect(stats.execucoes).toBe(2);
    expect(stats.sucesso).toBe(1);
    expect(stats.falhas).toBe(1);
    expect(stats.duracaoMediaMs).toBe(300);
    expect(stats.economiaEstimadaMin).toBe(2);
  });

  it("buildKnowledgeStats calcula deflexão e top", () => {
    const s = buildKnowledgeStats({
      publicados: 5,
      articles: [
        { id: "a", titulo: "A", views: 10 },
        { id: "b", titulo: "B", views: 25 },
      ],
      feedback: [
        { resolved: true, article_id: "a" },
        { resolved: false, article_id: "b" },
        { resolved: true, article_id: "b" },
      ],
    });
    expect(s.deflexao).toBe(2);
    expect(s.topArtigos[0].id).toBe("b");
    expect(Math.round(s.taxaResolucaoPct)).toBe(67);
  });

  it("buildSlaStats agrega cumprimento por prioridade", () => {
    const ds = [
      demand({ id: "1", status: "concluido", priority: "alta", sla_status: "cumprido" }),
      demand({ id: "2", status: "concluido", priority: "alta", sla_status: "estourado" }),
      demand({ id: "3", status: "concluido", priority: "critica", sla_status: "cumprido" }),
    ];
    const s = buildSlaStats(ds);
    expect(s.cumpridas).toBe(2);
    expect(s.violadas).toBe(1);
    expect(s.porPrioridade.find((p) => p.priority === "alta")!.cumprimentoPct).toBe(50);
    expect(s.porPrioridade.find((p) => p.priority === "critica")!.cumprimentoPct).toBe(100);
  });

  it("buildRoutingStats resume carga da equipe", () => {
    const s = buildRoutingStats(
      [
        { user_id: "u1", nome: "Ana", email: null, avatar_url: null, active_count: 4 },
        { user_id: "u2", nome: "Beto", email: null, avatar_url: null, active_count: 2 },
        { user_id: "u3", nome: "Caio", email: null, avatar_url: null, active_count: 0 },
      ],
      [
        { user_id: "u1", nome: "Ana", active_count: 4 },
        { user_id: "u2", nome: "Beto", active_count: 2 },
        { user_id: "u3", nome: "Caio", active_count: 0 },
        { user_id: "u4", nome: "Dani", active_count: 0 },
      ],
    );
    expect(s.candidatos).toBe(4);
    expect(s.ativos).toBe(2);
    expect(s.cargaMax).toBe(4);
    expect(Number(s.cargaMedia.toFixed(2))).toBe(2);
  });
});

describe("csv util", () => {
  it("escapa vírgulas e aspas", () => {
    const csv = toCsv([{ a: "x,y", b: 'ab"c' }]);
    expect(csv).toContain('"x,y"');
    expect(csv).toContain('"ab""c"');
  });
});
