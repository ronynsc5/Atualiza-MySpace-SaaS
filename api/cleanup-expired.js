export default async function handler(req, res) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Env vars ausentes.' });

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
    const profResp = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,current_period_end,subscription_status&current_period_end=lt.${encodeURIComponent(cutoff)}&subscription_status=in.(inactive,past_due,canceled)`, { headers });
    const profiles = await profResp.json().catch(() => []);
    if (!profResp.ok) return res.status(500).json({ error: 'Falha ao buscar perfis expirados.', details: profiles });

    let deleted = 0;
    for (const p of profiles) {
      const del = await fetch(`${supabaseUrl}/rest/v1/projects?user_id=eq.${p.id}`, { method:'DELETE', headers: { ...headers, Prefer:'return=minimal' } });
      if (del.ok) {
        deleted++;
        await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${p.id}`, { method:'PATCH', headers: { ...headers, Prefer:'return=minimal' }, body: JSON.stringify({ subscription_status: 'expired_data_deleted' }) });
      }
    }
    return res.status(200).json({ ok: true, expiredProfiles: profiles.length, usersPurged: deleted });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
