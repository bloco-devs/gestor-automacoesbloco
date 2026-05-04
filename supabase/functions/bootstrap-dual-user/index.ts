// Cria/garante o usuário riccellycivil@gmail.com com senha forte aleatória
// e o registra em allowed_emails + user_roles (admin).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const email = "riccellycivil@gmail.com";

    // Senha forte aleatória
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const password =
      "Rc!" +
      btoa(String.fromCharCode(...bytes))
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 22) +
      "9z";

    // Verifica se já existe
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);

    let userId: string;
    if (existing) {
      userId = existing.id;
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (error) throw error;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome: "Riccelly" },
      });
      if (error) throw error;
      userId = data.user!.id;
    }

    await supabase.from("allowed_emails").upsert({ email }, { onConflict: "email" });
    await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    return new Response(JSON.stringify({ ok: true, email, password, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
