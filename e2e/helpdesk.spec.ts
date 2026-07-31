import { expect, test } from "@playwright/test";
import {
  aceitarConfirm,
  arrastarPara,
  cartaoPorTitulo,
  colunaPorTermos,
  entrarComo,
  observarErrosSupabase,
  temCredenciais,
} from "./support/fluxo";

/**
 * FLUXO DO HELPDESK — solicitante cria, dev resolve, dev apaga.
 *
 * É o fluxo que atravessa dois perfis e três telas. Se ele passa, o produto
 * cumpre a promessa central: pedir ajuda e ver o pedido andar até o fim.
 */
const TITULO = `E2E Helpdesk ${Date.now()}`;

test.describe("Helpdesk — solicitante → desenvolvedor", () => {
  test.skip(
    !temCredenciais("solicitante", "desenvolvedor"),
    "Defina E2E_SOLICITANTE_EMAIL/SENHA e E2E_DEV_EMAIL/SENHA para rodar o fluxo completo.",
  );

  test("demanda nasce no portal, aparece na Caixa de Entrada e é concluída/excluída", async ({
    page,
  }) => {
    const rede = observarErrosSupabase(page);

    // A — login do solicitante
    await entrarComo(page, "solicitante");

    // B — criar a demanda
    await page.goto("/portal/demandas");
    await page.getByRole("button", { name: /nova demanda/i }).first().click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await modal.getByLabel(/título/i).fill(TITULO);
    await modal.getByLabel(/descrição/i).fill("Demanda criada por teste automatizado E2E.");
    await modal.getByRole("button", { name: /enviar|criar|abrir demanda/i }).first().click();
    await expect(modal).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText(TITULO).first()).toBeVisible({ timeout: 30_000 });

    // C — troca de sessão para o time
    await entrarComo(page, "desenvolvedor");

    // D — Caixa de Entrada: a demanda está numa coluna de entrada
    await page.goto("/workspace/demandas");
    await page.getByText(/caixa de entrada/i).first().click();
    const cartao = cartaoPorTitulo(page, TITULO);
    await expect(cartao).toBeVisible({ timeout: 30_000 });
    const entrada = colunaPorTermos(page, ["backlog", "a fazer", "triagem", "nova"]);
    await expect(entrada).toContainText(TITULO);

    // E — mover para a coluna de conclusão
    const concluida = colunaPorTermos(page, ["conclu", "finaliz", "done"]);
    await arrastarPara(page, cartao, concluida);
    await expect(concluida).toContainText(TITULO, { timeout: 30_000 });

    // F — lixeira aparece, confirma e o cartão desaparece
    const cartaoConcluido = cartaoPorTitulo(page, TITULO);
    await cartaoConcluido.hover();
    const lixeira = cartaoConcluido.getByTestId("cartao-excluir");
    await expect(lixeira).toBeVisible();
    aceitarConfirm(page);
    await lixeira.click();
    await expect(page.getByTestId("card-demanda").filter({ hasText: TITULO })).toHaveCount(0, {
      timeout: 30_000,
    });

    expect(rede.falhas, `Falhas de rede no fluxo: ${rede.falhas.join(" | ")}`).toEqual([]);
  });
});
