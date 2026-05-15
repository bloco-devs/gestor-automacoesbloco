import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL = "studiogomesfilho@gmail.com";
const NOME = "Studio Gomes Filho";
const PASSWORD = "lYc@R!^YB!fHieQZ";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  await admin.from("allowed_emails").upsert({ email: EMAIL }, { onConflict: "email", ignoreDuplicates: true });

  const { data: created, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { nome: NOME },
  });

  if (error) {
    return new Response(JSON.stringify({ status: "error", error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (created?.user) {
    await admin.from("profiles").upsert(
      { id: created.user.id, email: EMAIL, nome: NOME },
      { onConflict: "id", ignoreDuplicates: false },
    );
  }

  return new Response(JSON.stringify({ status: "created", email: EMAIL, password: PASSWORD, nome: NOME }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
