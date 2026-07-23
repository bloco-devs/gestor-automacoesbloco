/**
 * FEATURE 024 — Enterprise Security Center + Compliance Hub.
 * Módulo aditivo: nenhum consumidor externo é obrigatório a mudar.
 *
 * Estrutura interna:
 *  - score/         scores por categoria e Production Security Score
 *  - threats/       ring buffer de ameaças
 *  - compliance/    frameworks estáticos (LGPD, ISO27001, OWASP, SOC2, NIST)
 *  - policies/      store client-side (localStorage) preparado p/ Supabase
 *  - integrity/     verificadores read-only sobre Plugin Host/SDK/Mesh
 *  - timeline/      agregador de eventos existentes
 *  - reports/       geradores CSV
 */
export * from "./score";
export * from "./threats";
export * from "./compliance";
export * from "./policies";
export * from "./integrity";
export * from "./timeline";
export * from "./reports";
export * from "./permissions";
