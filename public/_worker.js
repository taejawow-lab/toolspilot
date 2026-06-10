export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/newsletter') {
      if (request.method === 'OPTIONS') return json({ ok: true }, 204);
      if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
      let body = {};
      try { body = await request.json(); } catch (_) {}
      const email = String(body.email || '').trim().toLowerCase();
      const source = String(body.source || '/').slice(0, 200);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'invalid_email' }, 400);
      const enc = new TextEncoder();
      const digest = await crypto.subtle.digest('SHA-256', enc.encode(email));
      const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const record = { emailHash: hash, source, ua: request.headers.get('user-agent')?.slice(0, 180) || '', createdAt: new Date().toISOString() };
      if (env.TOOLSPILOT_NEWSLETTER_KV) {
        await env.TOOLSPILOT_NEWSLETTER_KV.put(`signup:${hash}`, JSON.stringify(record), { metadata: { source } });
      }
      return json({ ok: true, stored: Boolean(env.TOOLSPILOT_NEWSLETTER_KV), id: hash.slice(0, 12) }, 200);
    }
    return env.ASSETS.fetch(request);
  }
};
function json(data, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}
