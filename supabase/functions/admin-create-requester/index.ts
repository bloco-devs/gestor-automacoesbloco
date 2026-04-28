import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase admin credentials unavailable" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, password, nome } = await req.json();
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Missing email or password" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const normalizedEmail = String(email).trim().toLowerCase();
  const displayName = nome || "Solicitante";

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;

  const existing = listed.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
  const { data: userData, error: userError } = existing
    ? await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { nome: displayName },
      })
    : await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { nome: displayName },
      });

  if (userError) throw userError;
  const user = userData.user;

  const { error: allowedError } = await admin
    .from("allowed_emails")
    .upsert({ email: normalizedEmail }, { onConflict: "email" });
  if (allowedError) throw allowedError;

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: user.id, nome: displayName, email: normalizedEmail }, { onConflict: "id" });
  if (profileError) throw profileError;

  return new Response(JSON.stringify({ ok: true, email: normalizedEmail, existed: Boolean(existing) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
