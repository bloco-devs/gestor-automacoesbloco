/**
 * Telefone para WhatsApp, no formato que a Uazapi pede: DDI 55 + DDD + número,
 * só dígitos, sem "+". É o mesmo formato que a CHECK
 * `notif_pref_whatsapp_telefone_valido` exige no banco — a regex abaixo é a
 * dela, e se uma mudar a outra muda junto.
 *
 * A pessoa digita do jeito que sabe: "(11) 98765-4321", "11987654321",
 * "+55 11 98765 4321". Tudo isso vira "5511987654321".
 */
export const FORMATO_WHATSAPP = /^55[1-9]{2}[0-9]{8,9}$/;

/**
 * Decide pelo TAMANHO, não pelo começo.
 *
 * Olhar se começa com "55" não basta: 55 também é DDD (Santa Maria, RS). Um
 * número de 11 dígitos que começa com 55 é DDD 55 + celular, e não DDI + resto.
 * Com 10 ou 11 dígitos é número local e ganha o 55; com 12 ou 13 precisa já
 * trazer o 55.
 */
export function normalizarTelefoneBR(entrada: string | null | undefined): string | null {
  if (!entrada) return null;
  let d = entrada.replace(/\D/g, "");
  // Zero de discagem nacional ("011 98765-4321") não faz parte do número —
  // mas SÓ com 12 dígitos, onde não há outra leitura possível.
  //
  // Com 11 dígitos isto já foi aceito, e era perigoso: "(01) 98765-4321", um
  // DDD digitado errado, perdia o zero e virava "551987654321" — DDD 19 e um
  // número de 8 dígitos, válido, de outra pessoa em outra cidade. O aviso da
  // demanda iria parar no celular de um desconhecido. Recusar e pedir para
  // digitar de novo custa um segundo; adivinhar custa mandar dado de trabalho
  // para quem não devia.
  if (d.length === 12) d = d.replace(/^0(?=[1-9]{2})/, "");

  let completo: string | null = null;
  if (d.length === 10 || d.length === 11) completo = `55${d}`;
  else if ((d.length === 12 || d.length === 13) && d.startsWith("55")) completo = d;

  return completo && FORMATO_WHATSAPP.test(completo) ? completo : null;
}

/** "5511987654321" → "+55 (11) 98765-4321", para mostrar de volta a quem digitou. */
export function formatarTelefoneBR(normalizado: string | null | undefined): string {
  if (!normalizado || !FORMATO_WHATSAPP.test(normalizado)) return normalizado ?? "";
  const ddd = normalizado.slice(2, 4);
  const num = normalizado.slice(4);
  const meio = num.length === 9 ? 5 : 4;
  return `+55 (${ddd}) ${num.slice(0, meio)}-${num.slice(meio)}`;
}
