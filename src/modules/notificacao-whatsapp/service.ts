import { supabase } from "@/integrations/supabase/client";
import { normalizarTelefoneBR } from "./telefone";

// As colunas são novas e `src/integrations/supabase/types.ts` é gerado pelo
// Lovable — até ele rodar de novo, o cliente não as conhece. O `as never` é o
// mesmo escape de src/modules/notificacao-email/service.ts.

export interface PreferenciaWhatsapp {
  whatsapp_ativo: boolean;
  whatsapp_telefone: string | null;
  whatsapp_consentido_em: string | null;
}

/**
 * OPT-IN: quem nunca marcou a caixinha não recebe nada.
 *
 * É o contrário do email, e de propósito. Email vai para a conta corporativa;
 * WhatsApp vai para um número, muitas vezes pessoal, e só com o aceite da
 * própria pessoa — que fica gravado com data.
 */
export const WHATSAPP_PADRAO: PreferenciaWhatsapp = {
  whatsapp_ativo: false,
  whatsapp_telefone: null,
  whatsapp_consentido_em: null,
};

async function usuarioAtual(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");
  return uid;
}

export async function getWhatsapp(): Promise<PreferenciaWhatsapp> {
  const uid = await usuarioAtual();
  const { data, error } = await supabase
    .from("notificacao_preferencias" as never)
    .select("whatsapp_ativo, whatsapp_telefone, whatsapp_consentido_em")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PreferenciaWhatsapp | null) ?? WHATSAPP_PADRAO;
}

/**
 * Liga ou desliga os avisos por WhatsApp.
 *
 * Upsert só com as colunas do WhatsApp: se a linha ainda não existe, as de
 * email nascem com o padrão do banco (tudo ligado), que é o mesmo padrão de
 * quem nunca abriu Preferências. Nada do email muda por causa disto.
 *
 * Desligar retira o aceite (`consentido_em` volta a nulo) e mantém o número,
 * só para a pessoa não ter que digitar de novo se religar.
 */
export async function salvarWhatsapp(entrada: { ativo: boolean; telefone?: string | null }): Promise<void> {
  const uid = await usuarioAtual();

  let patch: Record<string, unknown>;
  if (entrada.ativo) {
    const telefone = normalizarTelefoneBR(entrada.telefone);
    if (!telefone) throw new Error("Telefone inválido. Use DDD + número, ex.: (11) 98765-4321.");
    const atual = await getWhatsapp();
    patch = {
      whatsapp_ativo: true,
      whatsapp_telefone: telefone,
      // O aceite é daquele número. Trocou o número, é um aceite novo.
      whatsapp_consentido_em:
        atual.whatsapp_ativo && atual.whatsapp_telefone === telefone && atual.whatsapp_consentido_em
          ? atual.whatsapp_consentido_em
          : new Date().toISOString(),
    };
  } else {
    patch = { whatsapp_ativo: false, whatsapp_consentido_em: null };
  }

  const { error } = await supabase
    .from("notificacao_preferencias" as never)
    .upsert({ user_id: uid, ...patch } as never, { onConflict: "user_id" });
  if (error) throw error;
}
