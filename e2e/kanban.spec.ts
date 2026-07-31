import { expect, test } from "@playwright/test";
import {
  cartaoPorTitulo,
  colunaPorTermos,
  entrarComo,
  observarErrosSupabase,
  temCredenciais,
} from "./support/fluxo";

/**
 * FLUXO DE QUADRO — criar quadro, criar cartão, etiquetar, concluir na capa.
 *
 * Diferente do Helpdesk, aqui a demanda é criada pelo próprio time: o quadro
 * é território de projeto, sem SLA nem código de rastreio.
 */
const QUADRO = `E2E Quadro ${Date.now()}`;
const CARTAO = `E2E Cartão ${Date.now()}`;
const ETIQUETA = `E2E etiqueta`;

test.describe("Kanban de projeto", () => {
  test.skip(
    !temCredenciais("desenvolvedor"),
    "Defina E2E_DEV_EMAIL/E2E_DEV_SENHA para rodar o fluxo de quadros.",
  );

  test("cria quadro, cartão, etiqueta com auto-save íntegro e conclui pela capa", async ({
    page,
  }) => {
    const rede = observarErrosSupabase(page);
    await entrarComo(page, "desenvolvedor");

    // A — criar o quadro
    await page.goto("/workspace/demandas");
    await page.getByTestId("abrir-criar-quadro").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Nome do quadro").fill(QUADRO);
    await dialog.getByRole("button", { name: /^Usar a cor/ }).nth(2).click();
    await dialog.getByTestId("criar-quadro-salvar").click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    // B — entrar no quadro (a criação já navega; se não, abrimos pelo nome)
    if (!/\/workspace\/demandas\/[0-9a-f-]{36}/.test(page.url())) {
      await page.getByText(QUADRO).first().click();
    }
    await expect(page.getByTestId("coluna").first()).toBeVisible({ timeout: 30_000 });

    const aFazer = colunaPorTermos(page, ["a fazer", "backlog", "todo"]);
    await aFazer.getByTestId("compor-cartao-abrir").click();
    await aFazer.getByTestId("compor-cartao-titulo").fill(CARTAO);
    await aFazer.getByTestId("compor-cartao-salvar").click();
    const cartao = cartaoPorTitulo(page, CARTAO);
    await expect(cartao).toBeVisible({ timeout: 30_000 });

    // C — abrir o modal de detalhes
    await cartao.click();
    const modal = page.getByTestId("card-detail-modal");
    await expect(modal).toBeVisible({ timeout: 30_000 });

    // D — etiquetar e fechar; nenhum 4xx/5xx no auto-save
    await modal.getByTestId("botao-etiquetas").click();
    const popover = page.getByTestId("popover-etiquetas");
    await expect(popover).toBeVisible();
    const existentes = popover.getByTestId("etiqueta-item");
    if ((await existentes.count()) > 0) {
      await existentes.first().click();
    } else {
      await popover.getByTestId("etiqueta-nome").fill(ETIQUETA);
      await popover.getByTestId("etiqueta-criar").click();
    }
    await page.keyboard.press("Escape"); // fecha o popover
    await page.keyboard.press("Escape"); // fecha o modal (dispara o auto-save)
    await expect(modal).toBeHidden({ timeout: 30_000 });
    expect(
      rede.falhas,
      `Auto-save das etiquetas falhou: ${rede.falhas.join(" | ")}`,
    ).toEqual([]);

    // E — concluir pela capa: hover revela a bolinha, o clique move o cartão
    const capa = cartaoPorTitulo(page, CARTAO);
    await capa.hover();
    const bolinha = capa.getByTestId("cartao-concluir");
    await expect(bolinha).toBeVisible();
    await expect(bolinha).toHaveAttribute("data-concluida", "false");
    await bolinha.click();

    const concluida = colunaPorTermos(page, ["conclu", "finaliz", "done"]);
    await expect(concluida).toContainText(CARTAO, { timeout: 30_000 });
    const concluido = cartaoPorTitulo(page, CARTAO);
    await expect(concluido).toHaveAttribute("data-concluida", "true");
    await expect(concluido.getByTestId("cartao-concluir")).toHaveAttribute(
      "data-concluida",
      "true",
    );
    await expect(concluido.locator(".text-success").first()).toBeVisible();

    expect(rede.falhas, `Falhas de rede no fluxo: ${rede.falhas.join(" | ")}`).toEqual([]);
  });
});
