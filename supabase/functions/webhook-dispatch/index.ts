import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string | null;
}

async function hmac(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supaUrl = Deno.env.get('SUPABASE_URL')!;
    const supaAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supaSrv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(supaUrl, supaAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const event = typeof body.event === 'string' ? body.event : '';
    const payload = body.payload ?? {};
    if (!event) {
      return new Response(JSON.stringify({ error: 'missing_event' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service-role para ler webhooks sem depender de RLS do chamador
    const admin = createClient(supaUrl, supaSrv);
    const { data: hooks, error } = await admin
      .from('webhooks')
      .select('id, name, url, events, active, secret')
      .eq('active', true);
    if (error) throw error;

    const matching = (hooks ?? []).filter((h: Webhook) => h.events?.includes(event));
    const results: Array<{ id: string; ok: boolean; status?: number; error?: string }> = [];

    await Promise.all(matching.map(async (h: Webhook) => {
      const bodyStr = JSON.stringify({ event, sent_at: new Date().toISOString(), data: payload });
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (h.secret) headers['X-Webhook-Signature'] = `sha256=${await hmac(h.secret, bodyStr)}`;
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 8000);
      try {
        const resp = await fetch(h.url, { method: 'POST', headers, body: bodyStr, signal: ctrl.signal });
        results.push({ id: h.id, ok: resp.status >= 200 && resp.status < 300, status: resp.status });
      } catch (e) {
        results.push({ id: h.id, ok: false, error: (e as Error).message });
      } finally {
        clearTimeout(to);
      }
    }));

    return new Response(JSON.stringify({ dispatched: results.length, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
