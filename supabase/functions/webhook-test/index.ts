import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Auth: require valid JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const supaUrl = Deno.env.get('SUPABASE_URL')!;
    const supaAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
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
    const url = typeof body.url === 'string' ? body.url : '';
    const secret = typeof body.secret === 'string' ? body.secret : '';
    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({ error: 'invalid_url' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = {
      event: 'webhook.test',
      test: true,
      sent_at: new Date().toISOString(),
      data: { message: 'Este é um disparo de teste do Gestor de Automações.' },
    };
    const bodyStr = JSON.stringify(payload);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) {
      // HMAC-SHA256 signature
      const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(bodyStr));
      const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
      headers['X-Webhook-Signature'] = `sha256=${hex}`;
    }

    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    let status = 0;
    let text = '';
    try {
      const resp = await fetch(url, { method: 'POST', headers, body: bodyStr, signal: ctrl.signal });
      status = resp.status;
      text = await resp.text().catch(() => '');
    } catch (e) {
      clearTimeout(to);
      return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    clearTimeout(to);
    return new Response(JSON.stringify({ ok: status >= 200 && status < 300, status, response: text.slice(0, 512) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
