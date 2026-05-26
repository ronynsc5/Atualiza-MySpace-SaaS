export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { endpoint, model, apiKey, providerId, task, prompt, payload, history } = req.body || {};
    if (!endpoint || !model || !apiKey) return res.status(400).json({ error: 'Configure sua API key nas configurações da IA.' });

    const nodesInfo = payload ? JSON.stringify((payload.nodes || payload.cards || []).map(n => ({ id: n.id, title: n.title, type: n.type }))).slice(0, 8000) : '[]';

    const system = `Você é a IA do MySpace, um app de mapas mentais. Você pode conversar, analisar e MODIFICAR o mapa mental do usuário.

MAPA ATUAL (nós existentes):
${nodesInfo}

Quando o usuário pedir para criar, editar, organizar ou modificar o mapa, SEMPRE retorne um JSON no formato:
{
  "reply": "Mensagem para o usuário explicando o que foi feito",
  "actions": [
    {"type": "create_node", "title": "Título", "note": "Descrição", "x": 300, "y": 200, "node_type": "card"},
    {"type": "update_node", "id": "n1", "title": "Novo título"},
    {"type": "delete_node", "id": "n1"},
    {"type": "create_connection", "from": "id1", "to": "id2", "style": "curved"}
  ]
}

Tipos de nós válidos: "card", "note", "folder"
Para organizar, distribua os nós com x entre 100-1200 e y entre 100-700.

Se o usuário só estiver conversando sem pedir modificações, responda normalmente em texto.
Responda SEMPRE em português do Brasil.`;

    const userMsg = prompt || '';
    const msgs = [{ role: 'system', content: system }];
    if (Array.isArray(history)) {
      for (const h of history.slice(-8)) {
        if (h.role && h.content) msgs.push({ role: h.role === 'ai' ? 'assistant' : h.role, content: h.content });
      }
    }
    msgs.push({ role: 'user', content: userMsg });

    const isGemini = providerId === 'gemini' || (endpoint && endpoint.includes('generativelanguage'));
    let upstream, data, rawText;

    if (isGemini) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const geminiMsgs = msgs.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      upstream = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiMsgs, systemInstruction: { parts: [{ text: system }] }, generationConfig: { temperature: 0.3 } })
      });
      data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return res.status(400).json({ error: data.error?.message || 'Erro no Gemini.' });
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      upstream = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: msgs, temperature: 0.3 })
      });
      data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return res.status(400).json({ error: data.error?.message || 'Erro no provedor de IA.' });
      rawText = data.choices?.[0]?.message?.content || '';
    }

    // Tenta parsear JSON com actions
    let reply = rawText;
    let actions = null;
    try {
      const clean = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/g, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.reply) reply = parsed.reply;
      if (Array.isArray(parsed.actions)) actions = parsed.actions;
    } catch (_) { }

    return res.status(200).json({ text: reply, actions });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
