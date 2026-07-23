import type { DocGroup } from "../types";

/**
 * Índice curado da pasta docs/, agrupado por área.
 * Mantido em código para leitura instantânea (sem I/O em runtime).
 */
export const DOC_GROUPS: DocGroup[] = [
  {
    id: "arquitetura",
    label: "Arquitetura",
    items: [
      { file: "docs/05-Arquitetura.md", title: "Arquitetura" },
      { file: "docs/07-Modulos.md", title: "Módulos" },
      { file: "docs/09-Frontend.md", title: "Frontend" },
      { file: "docs/10-Backend.md", title: "Backend" },
      { file: "docs/11-Banco-de-Dados.md", title: "Banco de Dados" },
      { file: "docs/19-ADR", title: "ADRs" },
    ],
  },
  {
    id: "features",
    label: "Features",
    items: [
      { file: "docs/21-AI-Workspace.md", title: "AI Workspace" },
      { file: "docs/22-AI-Intent-Engine.md", title: "AI Intent Engine" },
      { file: "docs/23-Context-Engine.md", title: "Context Engine" },
      { file: "docs/24-Intelligent-Inbox.md", title: "Intelligent Inbox" },
      { file: "docs/25-Platform-Productivity.md", title: "Productivity Layer" },
      { file: "docs/26-Human-First-UX.md", title: "Human First UX" },
      { file: "docs/48-AdminHub-2.md", title: "AdminHub 2.0" },
      { file: "docs/49-Platform-Governance.md", title: "Platform Governance" },
    ],
  },
  {
    id: "roadmaps",
    label: "Roadmaps",
    items: [
      { file: "docs/17-Roadmap.md", title: "Roadmap" },
      { file: "docs/18-Backlog.md", title: "Backlog" },
      { file: "docs/20-Changelog.md", title: "Changelog" },
    ],
  },
  {
    id: "auditorias",
    label: "Auditorias",
    items: [
      { file: "docs/40-Production-Readiness.md", title: "Production Readiness" },
      { file: "docs/43-Auditoria-Ecossistema.md", title: "Auditoria Ecossistema" },
      { file: "docs/47-AdminHub-Auditoria.md", title: "AdminHub Auditoria" },
      { file: "docs/RLS_AUDIT.md", title: "RLS Audit" },
    ],
  },
  {
    id: "design-system",
    label: "Design System",
    items: [
      { file: "docs/15-Design-System.md", title: "Design System" },
      { file: "docs/34-Design-System-2.md", title: "Design System 2.0" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { file: "docs/42-Analytics.md", title: "Analytics" },
      { file: "docs/46-System-Affinity-Analytics.md", title: "Analytics de Afinidade" },
    ],
  },
  {
    id: "workflow",
    label: "Workflow",
    items: [
      { file: "docs/32-Workflow-Builder.md", title: "Workflow Builder" },
      { file: "docs/33-Workflow-Engine.md", title: "Workflow Engine" },
    ],
  },
  {
    id: "routing",
    label: "Routing",
    items: [{ file: "docs/31-Smart-Routing.md", title: "Smart Routing" }],
  },
  {
    id: "knowledge",
    label: "Knowledge",
    items: [
      { file: "docs/28-Central-Inteligente-Solucoes.md", title: "Central de Soluções" },
      { file: "docs/29-Knowledge-Admin.md", title: "Knowledge Admin" },
    ],
  },
  {
    id: "ecossistema",
    label: "Ecossistema",
    items: [
      { file: "docs/43-Auditoria-Ecossistema.md", title: "Auditoria Ecossistema" },
      { file: "docs/14-Integracoes.md", title: "Integrações" },
    ],
  },
];

export const DOC_TOTAL = 45;
