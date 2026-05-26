export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { endpoint, model, apiKey, providerId, task, prompt, payload, history } = req.body || {};
    if (!endpoint || !model || !apiKey)
      return res.status(400).json({ error: 'Configure sua API key nas configurações da IA.' });

    // ── Contexto rico: nós + conexões + cores ─────────────────────
    const rawNodes = payload ? (payload.nodes || payload.cards || []) : [];
    const rawConns = payload ? (payload.connections || []) : [];

    const nodesInfo = JSON.stringify(
      rawNodes.map(n => ({
        id: n.id,
        title: n.title || '',
        note: n.note || '',
        type: n.type || 'card',
        x: Math.round(n.x || 0),
        y: Math.round(n.y || 0),
        bgColor: n.bgColor || 'none',
        borderColor: n.borderColor || 'none',
        textColor: n.textColor || '#1a1a18'
      }))
    ).slice(0, 10000);

    const connsInfo = JSON.stringify(
      rawConns.map(c => ({
        id: c.id,
        from: c.from,
        to: c.to,
        style: c.style || 'curved',
        color: c.color || 'default'
      }))
    ).slice(0, 4000);

    // ── System prompt ─────────────────────────────────────────────
    const system = `Você é o assistente de IA do MySpace, um app de mapas mentais avançado.
Você tem acesso COMPLETO ao mapa do usuário e pode criar, editar, deletar e conectar qualquer elemento.

═══════════════════════════════════════
ESTADO ATUAL DO MAPA
═══════════════════════════════════════
NÓS EXISTENTES:
${nodesInfo}

CONEXÕES EXISTENTES:
${connsInfo}

═══════════════════════════════════════
SUAS CAPACIDADES
═══════════════════════════════════════
Você pode executar estas ações no mapa:

1. create_node   — Criar novo nó
2. update_node   — Editar nó existente (use os IDs acima)
3. delete_node   — Deletar nó existente
4. create_connection — Criar conexão entre nós

═══════════════════════════════════════
FORMATO DE RESPOSTA
═══════════════════════════════════════
REGRA 1: Quando o usuário pedir qualquer modificação no mapa → responda SOMENTE com JSON puro (sem markdown, sem texto antes ou depois):
{
  "reply": "Mensagem amigável explicando o que foi feito (nunca mencione JSON)",
  "actions": [
    { "type": "create_node", "title": "Título", "note": "Descrição opcional", "x": 300, "y": 200, "node_type": "card" },
    { "type": "update_node", "id": "ID_EXATO_DO_NÓ", "title": "Novo título", "note": "Nova nota", "color": "#hex" },
    { "type": "delete_node", "id": "ID_EXATO_DO_NÓ" },
    { "type": "create_connection", "from": "ID_NÓ_1", "to": "ID_NÓ_2", "style": "curved", "color": "#hex" }
  ]
}

REGRA 2: Quando for só conversa sem modificação → responda em texto normal, sem JSON.

REGRA 3: NUNCA invente IDs. Use SOMENTE os IDs exatos que aparecem na lista de nós acima.

REGRA 4: Distribua os nós de forma organizada:
- X entre 100 e 1200
- Y entre 100 e 700
- Espaçamento mínimo de 200px entre nós

REGRA 5: Para conexões com cor, use hex válido como "#ef4444", "#3b82f6", "#22c55e", etc.

REGRA 6: Tipos de nó disponíveis: "card", "note", "folder"

REGRA 7: Estilos de conexão disponíveis: "curved", "straight", "stepped", "dashed"

═══════════════════════════════════════
EXEMPLOS DE BOAS RESPOSTAS
═══════════════════════════════════════
Usuário: "crie um mapa de marketing digital"
Resposta correta:
{"reply":"Criei um mapa completo de Marketing Digital com os principais tópicos e suas conexões!","actions":[{"type":"create_node","title":"Marketing Digital","note":"Hub central","x":600,"y":350,"node_type":"card"},{"type":"create_node","title":"SEO","note":"Otimização para buscadores","x":300,"y":200,"node_type":"card"},{"type":"create_node","title":"Redes Sociais","note":"Instagram, LinkedIn, TikTok","x":900,"y":200,"node_type":"card"},{"type":"create_node","title":"Email Marketing","note":"Newsletters e automações","x":300,"y":500,"node_type":"card"},{"type":"create_node","title":"Tráfego Pago","note":"Google Ads, Meta Ads","x":900,"y":500,"node_type":"card"},{"type":"create_connection","from":"n1","to":"n2","style":"curved","color":"#3b82f6"},{"type":"create_connection","from":"n1","to":"n3","style":"curved","color":"#22c55e"},{"type":"create_connection","from":"n1","to":"n4","style":"curved","color":"#f59e0b"},{"type":"create_connection","from":"n1","to":"n5","style":"curved","color":"#ef4444"}]}

Usuário: "pinte todos os cards de azul"
Resposta correta (usando IDs reais do mapa atual):
{"reply":"Pintei todos os cards de azul!","actions":[{"type":"update_node","id":"n1","color":"#bfdbfe"},{"type":"update_node","id":"n2","color":"#bfdbfe"}]}

Usuário: "organize o mapa em árvore com o nó principal no centro"
Resposta correta: reorganiza as posições X/Y de todos os nós para formar uma árvore centrada.

═══════════════════════════════════════
PERSONALIDADE
═══════════════════════════════════════
- Seja proativo: se o usuário pedir "um mapa sobre X", crie pelo menos 5-8 nós bem conectados
- Seja criativo com cores e organização visual
- Sempre que criar nós, crie também as conexões entre eles
- Responda SEMPRE em português do Brasil
- Se não tiver certeza do que o usuário quer, pergunte de forma objetiva`;

    // ── Monta mensagens ───────────────────────────────────────────
    const msgs = [{ role: 'system', content: system }];

    if (Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        if (h.role && h.content) {
          msgs.push({ role: h.role === 'ai' ? 'assistant' : h.role, content: String(h.content).slice(0, 3000) });
        }
      }
    }
    msgs.push({ role: 'user', content: String(prompt || '').slice(0, 4000) });

    // ── Chama o provider ──────────────────────────────────────────
    const isGemini = providerId === 'gemini' || (endpoint && endpoint.includes('generativelanguage'));
    let rawText = '';

    if (isGemini) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const geminiMsgs = msgs
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const upstream = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMsgs,
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
        })
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return res.status(400).json({ error: data.error?.message || 'Erro no Gemini.' });
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: msgs,
          temperature: 0.4,
          max_tokens: 4096
        })
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return res.status(400).json({ error: data.error?.message || 'Erro no provedor de IA.' });
      rawText = data.choices?.[0]?.message?.content || '';
    }

    // ── Parser robusto de JSON ────────────────────────────────────
    let reply = rawText.trim();
    let actions = null;

    try {
      // Remove markdown se houver
      let clean = rawText
        .replace(/^```(?:json)?\s*/im, '')
        .replace(/```\s*$/m, '')
        .trim();

      // Busca o primeiro { até o último }
      if (!clean.startsWith('{')) {
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start !== -1 && end > start) clean = rawText.slice(start, end + 1).trim();
      }

      if (clean.startsWith('{')) {
        const parsed = JSON.parse(clean);
        if (parsed.reply) reply = String(parsed.reply);
        if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
          actions = parsed.actions;
        }
      }
    } catch (_) {
      // Resposta de conversa normal — mantém reply = rawText
    }

    return res.status(200).json({ text: reply, actions });

  } catch (err) {
    console.error('[ai-proxy] error:', err);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
