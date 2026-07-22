/**
 * Adapters REAIS — conectam o Workflow Engine aos serviços existentes.
 * Reutilizam supabase client / services. Nenhuma lógica de negócio duplicada.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  AdapterCallContext,
  DemandAdapter,
  EngineAdapters,
  InboxAdapter,
  KnowledgeAdapter,
  NotificationAdapter,
  OperationsAdapter,
  RoutingAdapter,
} from "@/modules/workflow-engine/adapters/interfaces";
import {
  assignDemand,
  updateDemandStatus,
  createTask as createDemandTask,
} from "@/modules/demands/service";
import type { DemandPriority, DemandStatus } from "@/modules/demands/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function demandIdOf(ctx: AdapterCallContext): string | null {
  const p = ctx.engine.payload as { id?: string; demand_id?: string } | undefined;
  return p?.id ?? p?.demand_id ?? null;
}

/* -------- Demand -------- */
const demand: DemandAdapter = {
  async setPriority(ctx, priority) {
    const id = demandIdOf(ctx);
    if (!id) return;
    const { error } = await db
      .from("demands")
      .update({ priority: priority as DemandPriority })
      .eq("id", id);
    if (error) throw error;
  },
  async setAssignee(ctx, assignee) {
    const id = demandIdOf(ctx);
    if (!id) return;
    await assignDemand(id, assignee || null);
  },
  async addComment(ctx, text) {
    const id = demandIdOf(ctx);
    if (!id || !text) return;
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await db.from("demand_comments").insert({
      demand_id: id,
      body: text,
      author_id: userRes.user?.id ?? null,
      is_internal: true,
    });
    if (error) throw error;
  },
  async createTask(ctx, title) {
    const id = demandIdOf(ctx);
    if (!id || !title) return;
    await createDemandTask(id, title);
  },
};

/* -------- Notification -------- */
const notification: NotificationAdapter = {
  async send(_ctx, to, message) {
    if (!to) return;
    const { error } = await db.from("notifications").insert({
      user_id: to,
      title: "Workflow",
      body: message ?? "",
      link: null,
      read: false,
    });
    if (error) throw error;
  },
};

/* -------- Knowledge -------- */
const knowledge: KnowledgeAdapter = {
  async relateArticle(ctx, articleId) {
    const id = demandIdOf(ctx);
    if (!id || !articleId) return;
    const { error } = await db
      .from("demands")
      .update({ ai_response_article_id: articleId })
      .eq("id", id);
    if (error) throw error;
  },
};

/* -------- Routing (Smart Routing sugere; workflow apenas registra) -------- */
const routing: RoutingAdapter = {
  logAudit: undefined as never,
  async runSmartRouting(_ctx) {
    // Smart Routing atual é frontend puro — não faz auto-assign.
    // O runtime apenas registra que foi solicitado; a sugestão continua na UI.
    return;
  },
} as RoutingAdapter;

/* -------- Inbox -------- */
const inbox: InboxAdapter = {
  async refresh(_ctx) {
    // Inbox se atualiza via Realtime nas próprias tabelas. Nada a fazer.
    return;
  },
};

/* -------- Operations (audit) -------- */
const operations: OperationsAdapter = {
  async logAudit(ctx, event) {
    const id = demandIdOf(ctx);
    if (!id) return;
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await db.from("demand_audit_logs").insert({
      demand_id: id,
      actor_id: userRes.user?.id ?? null,
      event: event || "workflow",
      metadata: { workflow_id: ctx.workflowId, step_id: ctx.stepId },
    });
    if (error) throw error;
  },
};

export const realAdapters: EngineAdapters = {
  demand,
  notification,
  knowledge,
  routing,
  inbox,
  operations,
};
