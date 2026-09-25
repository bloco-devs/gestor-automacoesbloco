import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * NOTA INTERNA SÓ PODE IR PARA A EQUIPE
 *
 * `trg_demand_comment_notify()` monta os destinatários do aviso com QUALQUER
 * pessoa que já comentou na demanda — não só o dono. A versão de
 * 20260811142611 filtrava nota interna excluindo só `v_criador` (quem abriu a
 * demanda): um segundo solicitante que comentasse na mesma demanda recebia,
 * no sininho, o trecho de toda nota interna que a equipe escrevesse ali.
 *
 * Este teste lê a versão VIGENTE da função (a migration mais recente que a
 * redefine, achada por conteúdo, nunca por nome fixo) e confere que o filtro
 * de nota interna exige `eh_da_equipe(x)` — não só "não é o criador".
 */
function lerFuncaoSql(): string {
  const dir = path.resolve(process.cwd(), "supabase/migrations");
  const arquivo = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse()
    .find((f) =>
      readFileSync(path.join(dir, f), "utf8").includes(
        "CREATE OR REPLACE FUNCTION public.trg_demand_comment_notify",
      ),
    );
  if (!arquivo) throw new Error("Migration de trg_demand_comment_notify não encontrada");
  return readFileSync(path.join(dir, arquivo), "utf8");
}

describe("trg_demand_comment_notify — nota interna não vaza para solicitante", () => {
  const sql = lerFuncaoSql();
  const corpo = sql.slice(
    sql.indexOf("CREATE OR REPLACE FUNCTION public.trg_demand_comment_notify"),
  );

  it("o filtro de v_interno exige eh_da_equipe, não só 'diferente do criador'", () => {
    // A regra errada, que este teste existe para nunca deixar voltar.
    expect(corpo).not.toMatch(/NOT v_interno OR x IS DISTINCT FROM v_criador/);
    // A regra certa: só quem é da equipe recebe nota interna.
    expect(corpo).toMatch(/NOT v_interno OR \(public\.eh_da_equipe\(x\)/);
  });

  it("nota interna continua nunca indo para quem abriu a demanda", () => {
    expect(corpo).toMatch(/eh_da_equipe\(x\)\s+AND\s+x IS DISTINCT FROM v_criador/);
  });

  it("o ramo de atividades_comentarios (cartões) não ganhou um filtro de nota interna que não existe na tabela", () => {
    // atividades_comentarios não tem is_internal — não pode aparecer v_interno
    // depois do RETURN NEW que fecha o ramo de demand_comments.
    const inicioCartoes = corpo.indexOf("atividades_comentarios (cart");
    expect(inicioCartoes).toBeGreaterThan(0);
    expect(corpo.slice(inicioCartoes)).not.toMatch(/v_interno/);
  });
});
