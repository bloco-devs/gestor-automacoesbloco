import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAILS_RAW = [
  "ailton.apd@gmail.com",
  "marianaporto827@gmail.com",
  "julianovicente.arquiteto@gmail.com",
  "eng.vitoriaoliveira@gmail.com",
  "kamilly.lourdes@gmail.com",
  "thaisalmedeiros@gmail.com",
  "lccarneiro2@gmail.com",
  "karollainemont@gmail.com",
  "pdutra60@gmail.com",
  "raystefanyhingrid@gmail.com",
  "matheussdn@live.com",
  "vitor.urtiga@gmail.com",
  "adrianocoattipt@gmail.com",
  "thaywanfelipe02@gmail.com",
  "rodrigosarmento777@gmail.com",
  "fabiopb78@gmail.com",
  "luispaulodelux@gmail.com",
  "lianaslacerda@gmail.com",
];

function genPassword(len = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?-_+=";
  const all = upper + lower + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = pwd.length; i < len; i++) pwd += pick(all);
  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0].replace(/[._\d]+/g, " ").trim();
  return local
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
    .join(" ") || email;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // 1) AuthN: caller must be logged in
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "missing bearer token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2) AuthZ: caller must be admin
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "forbidden: admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3) Bulk create
  const results: Array<{
    email: string;
    password?: string;
    nome?: string;
    status: "created" | "skipped_existing" | "error";
    error?: string;
  }> = [];

  const emails = Array.from(
    new Set(EMAILS_RAW.map((e) => e.trim().toLowerCase())),
  );

  for (const email of emails) {
    try {
      // Insert into allowed_emails (idempotent)
      await admin
        .from("allowed_emails")
        .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });

      const password = genPassword(16);
      const nome = nameFromEmail(email);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      });

      if (createErr) {
        const msg = createErr.message || "";
        if (
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("registered") ||
          msg.toLowerCase().includes("exists")
        ) {
          results.push({ email, status: "skipped_existing" });
          continue;
        }
        results.push({ email, status: "error", error: msg });
        continue;
      }

      // Ensure profile row (handle_new_user trigger should also do this)
      if (created?.user) {
        await admin
          .from("profiles")
          .upsert(
            { id: created.user.id, email, nome },
            { onConflict: "id", ignoreDuplicates: false },
          );
      }

      results.push({ email, password, nome, status: "created" });
    } catch (e) {
      results.push({
        email,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
