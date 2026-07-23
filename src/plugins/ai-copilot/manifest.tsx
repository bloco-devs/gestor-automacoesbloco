/**
 * PLUGIN 001 — AI Copilot Enterprise
 * Primeiro plugin oficial da plataforma. Zero mudanças no core.
 *
 * Consome:
 *  - Platform SDK (FEATURE 100)
 *  - Plugin Host Runtime (FEATURE 101)
 *  - Context Engine (read-only)
 */
import { definePlugin } from "@/platform-sdk";
import { copilotCommands } from "./commands";
import CopilotDock from "./widgets/CopilotDock";
import CopilotFloatingButton from "./widgets/CopilotFloatingButton";
import CopilotContextPanel from "./widgets/CopilotContextPanel";
import { emitCopilotEvent } from "./events";

export const AICopilotPlugin = definePlugin({
  id: "plugin.ai-copilot",
  name: "AI Copilot",
  version: "1.0.0",
  category: "ai",
  description: "AI Copilot contextual — primeiro plugin oficial da plataforma.",
  author: "Platform Team",
  permissions: {
    requires: ["ai.use", "knowledge.read", "routing.read", "workflow.read", "analytics.read"],
    provides: ["ai.chat", "ai.context", "ai.actions"],
  },
  commands: copilotCommands,
  widgets: [
    {
      id: "copilot.dock",
      slot: "copilot",
      title: "Copilot Dock",
      order: 10,
      render: () => <CopilotDock />,
    },
    {
      id: "copilot.floating",
      slot: "workspace",
      title: "Copilot Floating Button",
      order: 90,
      render: () => <CopilotFloatingButton />,
    },
    {
      id: "copilot.context-panel",
      slot: "contextPanel",
      title: "Copilot Context Panel",
      order: 10,
      render: () => <CopilotContextPanel />,
    },
    {
      id: "copilot.portal-hint",
      slot: "portal",
      title: "Copilot Portal Hint",
      order: 50,
      render: () => <CopilotContextPanel />,
    },
    {
      id: "copilot.analytics-hint",
      slot: "analytics",
      title: "Copilot Analytics Hint",
      order: 50,
      render: () => <CopilotContextPanel />,
    },
    {
      id: "copilot.operations-hint",
      slot: "operations",
      title: "Copilot Operations Hint",
      order: 50,
      render: () => <CopilotContextPanel />,
    },
    {
      id: "copilot.command-palette",
      slot: "commandPalette",
      title: "Copilot Command Palette",
      order: 10,
      render: () => null,
    },
  ],
  activate: (ctx) => {
    ctx.logger("[ai-copilot] activated");
    // PLUGIN 003 — Copilot descobre serviços via Service Mesh (sem imports diretos).
    ctx.permissions.grant("plugin.ai-copilot", "knowledge.read");
    ctx.permissions.grant("plugin.ai-copilot", "routing.read");
    ctx.permissions.grant("plugin.ai-copilot", "analytics.read");
    emitCopilotEvent("plugin.loaded", { pluginId: "plugin.ai-copilot", at: Date.now() });
  },
  deactivate: () => {
    // Nada persistente para limpar; memória e buffers são scoped.
  },
});

export default AICopilotPlugin;
