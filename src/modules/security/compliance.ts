/**
 * Compliance Center — dados estáticos por framework.
 * Cada item tem status: covered | partial | missing. Score = %covered + 0.5*%partial.
 */
export type ComplianceStatus = "covered" | "partial" | "missing";

export interface ComplianceItem {
  id: string;
  label: string;
  status: ComplianceStatus;
  note?: string;
}

export interface ComplianceFramework {
  id: "lgpd" | "iso27001" | "owasp" | "soc2" | "nist";
  label: string;
  description: string;
  items: ComplianceItem[];
}

export const FRAMEWORKS: ComplianceFramework[] = [
  {
    id: "lgpd",
    label: "LGPD",
    description: "Lei Geral de Proteção de Dados (Brasil).",
    items: [
      { id: "consent", label: "Coleta de dados com base legal", status: "covered", note: "Fluxo Bloco ID SSO." },
      { id: "portability", label: "Portabilidade de dados", status: "partial", note: "Exportação por área (CSV)." },
      { id: "right-to-be-forgotten", label: "Direito ao esquecimento", status: "partial", note: "Executado via painel Supabase." },
      { id: "dpo", label: "DPO designado", status: "covered" },
      { id: "breach-response", label: "Plano de resposta a incidentes", status: "partial" },
      { id: "purpose-limitation", label: "Limitação de finalidade", status: "covered" },
      { id: "minimization", label: "Minimização de coleta", status: "covered" },
      { id: "encryption-rest", label: "Criptografia em repouso", status: "covered", note: "Supabase-managed." },
      { id: "encryption-transit", label: "Criptografia em trânsito (TLS)", status: "covered" },
      { id: "audit-log", label: "Log de acesso auditável", status: "covered", note: "Audit Center." },
    ],
  },
  {
    id: "iso27001",
    label: "ISO 27001",
    description: "Sistema de Gestão de Segurança da Informação.",
    items: [
      { id: "a5", label: "A.5 Políticas de segurança", status: "partial", note: "Policy Center in-memory." },
      { id: "a6", label: "A.6 Organização", status: "covered" },
      { id: "a8", label: "A.8 Gestão de ativos", status: "covered" },
      { id: "a9", label: "A.9 Controle de acesso", status: "covered", note: "RLS + Roles." },
      { id: "a10", label: "A.10 Criptografia", status: "covered" },
      { id: "a12", label: "A.12 Operações", status: "covered" },
      { id: "a13", label: "A.13 Comunicações", status: "covered" },
      { id: "a14", label: "A.14 SDLC", status: "partial" },
      { id: "a16", label: "A.16 Gestão de incidentes", status: "partial" },
      { id: "a17", label: "A.17 Continuidade", status: "partial" },
    ],
  },
  {
    id: "owasp",
    label: "OWASP Top 10",
    description: "Top 10 riscos de aplicações web (2021).",
    items: [
      { id: "a01", label: "A01: Broken Access Control", status: "covered", note: "RLS + has_role()." },
      { id: "a02", label: "A02: Cryptographic Failures", status: "covered" },
      { id: "a03", label: "A03: Injection", status: "covered", note: "Sanitize markdown + queries via SDK." },
      { id: "a04", label: "A04: Insecure Design", status: "covered" },
      { id: "a05", label: "A05: Security Misconfiguration", status: "partial" },
      { id: "a06", label: "A06: Vulnerable Components", status: "partial", note: "Auditoria manual." },
      { id: "a07", label: "A07: ID & Auth Failures", status: "covered" },
      { id: "a08", label: "A08: Software & Data Integrity", status: "covered", note: "Assinatura SHA-256 + Integrity Center." },
      { id: "a09", label: "A09: Logging & Monitoring", status: "covered", note: "Audit + Error + Threat." },
      { id: "a10", label: "A10: SSRF", status: "covered" },
    ],
  },
  {
    id: "soc2",
    label: "SOC 2",
    description: "Trust Services Criteria (segurança, disponibilidade, confidencialidade).",
    items: [
      { id: "cc1", label: "CC1 Ambiente de controle", status: "covered" },
      { id: "cc2", label: "CC2 Comunicação", status: "covered" },
      { id: "cc3", label: "CC3 Avaliação de risco", status: "partial" },
      { id: "cc4", label: "CC4 Monitoramento", status: "covered" },
      { id: "cc5", label: "CC5 Atividades de controle", status: "covered" },
      { id: "cc6", label: "CC6 Acesso lógico e físico", status: "covered" },
      { id: "cc7", label: "CC7 Operações", status: "covered" },
      { id: "cc8", label: "CC8 Gestão de mudanças", status: "partial" },
      { id: "cc9", label: "CC9 Mitigação de risco", status: "partial" },
    ],
  },
  {
    id: "nist",
    label: "NIST CSF",
    description: "Cybersecurity Framework — Identify/Protect/Detect/Respond/Recover.",
    items: [
      { id: "id", label: "Identify", status: "covered" },
      { id: "pr", label: "Protect", status: "covered" },
      { id: "de", label: "Detect", status: "covered", note: "Threat + Error Center." },
      { id: "rs", label: "Respond", status: "partial" },
      { id: "rc", label: "Recover", status: "partial", note: "Backup gerido pelo Supabase." },
    ],
  },
];

export function scoreFramework(fw: ComplianceFramework): number {
  const total = fw.items.length;
  if (!total) return 0;
  let s = 0;
  for (const it of fw.items) {
    if (it.status === "covered") s += 1;
    else if (it.status === "partial") s += 0.5;
  }
  return Math.round((s / total) * 100);
}

export function frameworkPending(fw: ComplianceFramework): ComplianceItem[] {
  return fw.items.filter((i) => i.status !== "covered");
}
