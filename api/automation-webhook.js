// Webhook genérico para WhatsApp/IA/automações criarem cards no MySpace.
// Conecte seu provedor de WhatsApp (Meta, Z-API, Evolution API, Twilio etc.) para enviar POST aqui.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const secret = process.env.AUTOMATION_WEBHOOK_SECRET;
    if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Env vars ausentes.' });

    const { user_email, command, text, title } = req.body || {};
    if (!user_email) return res.status(400).json({ error: 'Informe user_email.' });
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

    const userResp = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,email&email=eq.${encodeURIComponent(user_email)}&limit=1`, { headers });
    const users = await userResp.json().catch(() => []);
    if (!userResp.ok || !users[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const userId = users[0].id;

    const projResp = await fetch(`${supabaseUrl}/rest/v1/projects?select=id,payload&user_id=eq.${userId}&name=eq.${encodeURIComponent('Meu Espaço')}&limit=1`, { headers });
    const projects = await projResp.json().catch(() => []);
    let project = projects[0];
    let payload = project?.payload || { nodes: [], connections: [], view: { x: 0, y: 0, scale: 1 } };
    if (!Array.isArray(payload.nodes)) payload.nodes = [];

    const nextId = `wa_${Date.now()}`;
    const cleanTitle = String(title || command || 'Novo card via WhatsApp').slice(0, 120);
    const cleanText = String(text || '').slice(0, 2000);
    payload.nodes.push({ id: nextId, type: 'card', title: cleanTitle, note: cleanText, x: 80 + payload.nodes.length * 24, y: 80 + payload.nodes.length * 18, w: 200, h: 120, bgColor: '#ffffff', borderColor: '#e0e0dd' });

    if (project?.id) {
      const upd = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${project.id}`, { method:'PATCH', headers: { ...headers, Prefer:'return=representation' }, body: JSON.stringify({ payload }) });
      if (!upd.ok) return res.status(500).json({ error: 'Falha ao atualizar projeto.' });
    } else {
      const ins = await fetch(`${supabaseUrl}/rest/v1/projects`, { method:'POST', headers: { ...headers, Prefer:'return=representation' }, body: JSON.stringify({ user_id: userId, name: 'Meu Espaço', payload }) });
      if (!ins.ok) return res.status(500).json({ error: 'Falha ao criar projeto.' });
    }
    return res.status(200).json({ ok: true, created_node_id: nextId });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
