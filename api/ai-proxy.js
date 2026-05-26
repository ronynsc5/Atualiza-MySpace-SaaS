export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { endpoint, model, apiKey, providerId, task, prompt, payload, history } = req.body || {};
    if (!apiKey) return res.status(400).json({ error: 'Configure sua API key nas configuracoes da IA.' });
    const rawNodes = payload ? (payload.nodes || payload.cards || []) : [];
    const rawConns = payload ? (payload.connections || []) : [];
    const nodesInfo = JSON.stringify(rawNodes.map(n => ({ id: n.id, title: n.title || '', note: n.note || '', type: n.type || 'card', x: Math.round(n.x || 0), y: Math.round(n.y || 0), bgColor: n.bgColor || 'none', borderColor: n.borderColor || 'none', textColor: n.textColor || '#1a1a18' }))).slice(0, 10000);
    const connsInfo = JSON.stringify(rawConns.map(c => ({ id: c.id, from: c.from, to: c.to, style: c.style || 'curved', color: c.color || 'default' }))).slice(0, 4000);
    const system = `Voce e o assistente de IA do MySpace, um app de mapas mentais avancado.
Voce tem acesso COMPLETO ao mapa do usuario e pode criar, editar, deletar e conectar qualquer elemento.

NOS EXISTENTES:
${nodesInfo}

CONEXOES EXISTENTES:
${connsInfo}

REGRAS:
1. Modificacao no mapa: responda SOMENTE com JSON puro (sem markdown):
{"reply":"Mensagem amigavel","actions":[...]}
2. So conversa: responda em texto normal, sem JSON.
3. NUNCA invente IDs. Use SOMENTE os IDs da lista acima.
4. Nos: X entre 100-1200, Y entre 100-700, espaco minimo 200px.
5. Tipos de no: "card", "note", "folder"
6. Estilos de conexao: "curved", "straight", "stepped", "dashed"
7. Sempre que criar nos, crie tambem as conexoes entre eles.
8. Se pedirem um mapa sobre X, crie pelo menos 6-8 nos bem conectados.
9. Responda SEMPRE em portugues do Brasil.

ACOES DISPONIVEIS:
{"type":"create_node","title":"Titulo","note":"Descricao","x":300,"y":200,"node_type":"card"}
{"type":"update_node","id":"ID_EXATO","title":"Novo titulo","note":"Nova nota","color":"#hex"}
{"type":"delete_node","id":"ID_EXATO"}
{"type":"create_connection","from":"ID_1","to":"ID_2","style":"curved","color":"#hex"}`;
    const msgs = [{ role: 'system', content: system }];
    if (Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        if (h.role && h.content) msgs.push({ role: h.role === 'ai' ? 'assistant' : h.role, content: String(h.content).slice(0, 3000) });
      }
    }
    msgs.push({ role: 'user', content: String(prompt || '').slice(0, 4000) });
    const isGemini = providerId === 'gemini' || (endpoint && endpoint.includes('generativelanguage'));
    async function callOpenAI(ep, mdl, key) {
      const r = await fetch(ep, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: mdl, messages: msgs, temperature: 0.4, max_tokens: 4096 }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || `HTTP ${r.status}`);
      return d.choices?.[0]?.message?.content || '';
    }
    async function callGemini(mdl, key) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${key}`;
      const gMsgs = msgs.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: gMsgs, systemInstruction: { parts: [{ text: system }] }, generationConfig: { temperature: 0.4, maxOutputTokens: 4096 } }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || `HTTP ${r.status}`);
      return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    let rawText = '';
    try {
      if (isGemini) rawText = await callGemini(model, apiKey);
      else rawText = await callOpenAI(endpoint, model, apiKey);
    } catch (err) {
      if (providerId !== 'groq') {
        try { rawText = await callOpenAI('https://api.groq.com/openai/v1/chat/completions', 'llama-3.3-70b-versatile', apiKey); } catch (_) {}
      }
      if (!rawText) return res.status(400).json({ error: err.message || 'Erro no provider. Verifique sua API key.' });
    }
    let reply = rawText.trim();
    let actions = null;
    try {
      let clean = rawText.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
      if (!clean.startsWith('{')) { const s = rawText.indexOf('{'), e = rawText.lastIndexOf('}'); if (s !== -1 && e > s) clean = rawText.slice(s, e + 1).trim(); }
      if (clean.startsWith('{')) { const p = JSON.parse(clean); if (p.reply) reply = String(p.reply); if (Array.isArray(p.actions) && p.actions.length > 0) actions = p.actions; }
    } catch (_) {}
    return res.status(200).json({ text: reply, actions });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
