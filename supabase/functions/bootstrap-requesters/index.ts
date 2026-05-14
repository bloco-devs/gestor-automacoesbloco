// Cria/atualiza contas de SOLICITANTE com senha forte aleatória.
// Garante registro em allowed_emails. Não atribui role admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAILS: { email: string; nome: string }[] = [
  { email: "atendimentoblocojp@gmail.com", nome: "Atendimento JP" },
  { email: "admblococonstrucoes@gmail.com", nome: "Administrativo" },
  { email: "planejamentoblococonstrucoes@gmail.com", nome: "Planejamento" },
  { email: "producaoblococonstrucoes@gmail.com", nome: "Produção" },
  { email: "rh@grupobloco.com.br", nome: "Recursos Humanos" },
  { email: "blocolegalizacao@gmail.com", nome: "Legalização" },
];

function strongPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%&*?";
  const all = upper + lower + nums + syms;
  const bytes = new Uint8Array(28);
  crypto.getRandomValues(bytes);
  const pick = (set: string, b: number) => set[b % set.length];
  let pwd = pick(upper, bytes[0]) + pick(lower, bytes[1]) + pick(nums, bytes[2]) + pick(syms, bytes[3]);
  for (let i = 4; i < bytes.length; i++) pwd += pick(all, bytes[i]);
  return pwd;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const results: { email: string; password: string; created: boolean }[] = [];

    for (const { email, nome } of EMAILS) {
      const password = strongPassword();
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      let userId: string;
      let created = false;
      if (existing) {
        userId = existing.id;
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { nome },
        });
        if (error) throw new Error(`${email}: ${error.message}`);
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nome },
        });
        if (error) throw new Error(`${email}: ${error.message}`);
        userId = data.user!.id;
        created = true;
      }

      await supabase.from("allowed_emails").upsert({ email }, { onConflict: "email" });
      await supabase.from("profiles").upsert({ id: userId, nome, email }, { onConflict: "id" });

      results.push({ email, password, created });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
