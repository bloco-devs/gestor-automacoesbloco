# 74 — Compliance Hub

Rota: `/admin/security/compliance`.

Cinco frameworks estáticos avaliados por checklist. Score = `%covered + 0.5 * %partial`.

## Frameworks

- **LGPD** — 10 itens · Base legal, portabilidade, direito ao esquecimento, DPO, resposta a incidentes, minimização, criptografia repouso/trânsito, log auditável.
- **ISO 27001** — 10 controles-chave (A.5, A.6, A.8, A.9, A.10, A.12, A.13, A.14, A.16, A.17).
- **OWASP Top 10 (2021)** — A01 a A10.
- **SOC 2** — CC1 a CC9 (Trust Services Criteria).
- **NIST CSF** — Identify, Protect, Detect, Respond, Recover.

## Status possíveis
`covered` · `partial` · `missing`. Cada item pode ter uma nota curta explicando a evidência ou o gap.

## Fonte da verdade
Este módulo é uma **auto-avaliação** e não substitui auditoria externa. As notas seguem revisões periódicas da equipe de Plataforma.

## Sem backend
Sem tabelas. Sem edge functions. Preparado para persistência futura (`compliance_findings`) sem alterar consumidores.
