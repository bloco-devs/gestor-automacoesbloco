import { expect, type Page, type Response } from "@playwright/test";

/**
 * Credenciais dos perfis usados nos fluxos E2E.
 *
 * Elas vivem em variáveis de ambiente porque o E2E roda contra um Supabase
 * real — não há mock. Sem elas o teste é *skipped*, nunca falso-verde.
 */
export const CONTAS = {
  solicitante: {
    email: process.env.E2E_SOLICITANTE_EMAIL ?? "",
    senha: process.env.E2E_SOLICITANTE_SENHA ?? "",
  },
  desenvolvedor: {
    email: process.env.E2E_DEV_EMAIL ?? "",
    senha: process.env.E2E_DEV_SENHA ?? "",
  },
} as const;

export type Perfil = keyof typeof CONTAS;

export function temCredenciais(...perfis: Perfil[]): boolean {
  return perfis.every((p) => !!CONTAS[p].email && !!CONTAS[p].senha);
}

/** Encerra a sessão atual sem depender de menus da UI. */
export async function limparSessao(page: Page): Promise<void> {
  await page.goto("/auth");
  await page.evaluate(() => {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith("sb-"))
      .forEach((k) => window.localStorage.removeItem(k));
  });
}

/** Login por formulário — o mesmo caminho que a pessoa real percorre. */
export async function entrarComo(page: Page, perfil: Perfil): Promise<void> {
  const { email, senha } = CONTAS[perfil];
  await limparSessao(page);
  await page.goto("/auth");
  await page.getByLabel("Email").first().fill(email);
  await page.getByLabel("Senha").first().fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 30_000 });
}

/**
 * Coletor de falhas de rede do Supabase.
 *
 * Qualquer 4xx/5xx em `/rest/v1` ou `/functions/v1` é anotado; os testes
 * afirmam ao final que a lista está vazia. É assim que "o auto-save não
 * retornou 400/500" se torna uma asserção e não uma impressão.
 */
export function observarErrosSupabase(page: Page): { falhas: string[] } {
  const falhas: string[] = [];
  page.on("response", (res: Response) => {
    const url = res.url();
    if (!/\/(rest|functions|storage)\/v1\//.test(url)) return;
    if (res.status() >= 400) falhas.push(`${res.status()} ${res.request().method()} ${url}`);
  });
  return { falhas };
}

/** Aceita o próximo `window.confirm`. */
export function aceitarConfirm(page: Page): void {
  page.once("dialog", (d) => void d.accept());
}

/** Localizador do cartão pelo título visível na capa. */
export function cartaoPorTitulo(page: Page, titulo: string) {
  return page.getByTestId("card-demanda").filter({ hasText: titulo }).first();
}

/** Coluna cujo rótulo casa com um dos termos (case/acento tolerante). */
export function colunaPorTermos(page: Page, termos: string[]) {
  const re = new RegExp(termos.join("|"), "i");
  return page.getByTestId("coluna").filter({ has: page.locator("h2") }).filter({ hasText: re }).first();
}

/** Arrasto real com pointer events — o `@dnd-kit` não reage a `dragTo`. */
export async function arrastarPara(page: Page, cartao: ReturnType<typeof cartaoPorTitulo>, destino: ReturnType<typeof colunaPorTermos>) {
  const de = await cartao.boundingBox();
  const para = await destino.boundingBox();
  if (!de || !para) throw new Error("Cartão ou coluna de destino sem geometria.");
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2);
  await page.mouse.down();
  await page.mouse.move(de.x + de.width / 2, de.y + de.height / 2 + 12, { steps: 5 });
  await page.mouse.move(para.x + para.width / 2, para.y + 140, { steps: 20 });
  await page.mouse.up();
}
