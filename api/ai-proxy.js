export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { endpoint, model, apiKey, providerId, prompt, payload, history } = req.body || {};
    if (!apiKey) return res.status(400).json({ error: 'Configure sua API key nas configuracoes da IA.' });

    // ── Contexto completo do mapa ─────────────────────────────────
    const rawNodes = payload ? (payload.nodes || payload.cards || []) : [];
    const rawConns = payload ? (payload.connections || []) : [];

    const nodesInfo = JSON.stringify(
      rawNodes.map(n => ({
        id: n.id, title: n.title || '', note: n.note || '',
        type: n.type || 'card', x: Math.round(n.x || 0), y: Math.round(n.y || 0),
        bgColor: n.bgColor || 'none', borderColor: n.borderColor || 'none',
        textColor: n.textColor || '#1a1a18', emoji: n.emoji || ''
      }))
    ).slice(0, 12000);

    const connsInfo = JSON.stringify(
      rawConns.map(c => ({ id: c.id, from: c.from, to: c.to, style: c.style || 'curved', color: c.color || 'default' }))
    ).slice(0, 4000);

    // ── System prompt completo ────────────────────────────────────
    const system = `Você é a IA do MySpace — app de mapas mentais profissional.
Você é extremamente criativa, organizada e especialista em estruturar ideias visualmente.

═══════════════════════════════════════════════════════
ESTADO ATUAL DO MAPA
═══════════════════════════════════════════════════════
NÓS EXISTENTES:
${nodesInfo || '[]'}

CONEXÕES EXISTENTES:
${connsInfo || '[]'}

═══════════════════════════════════════════════════════
SUAS CAPACIDADES COMPLETAS
═══════════════════════════════════════════════════════

AÇÕES DISPONÍVEIS:

1. CREATE_NODE
{"type":"create_node","title":"Título","note":"Descrição","x":300,"y":200,"node_type":"card","emoji":"🎯","bgColor":"#fef3c7","borderColor":"#f59e0b","textColor":"#1a1a18"}

2. UPDATE_NODE (use o ID exato da lista acima)
{"type":"update_node","id":"n1","title":"Novo título","note":"Nova nota","bgColor":"#hex","borderColor":"#hex","textColor":"#hex","emoji":"🔥","x":300,"y":200}
IMPORTANTE: update_node também aceita "x" e "y" para MOVER o nó de posição!

3. DELETE_NODE
{"type":"delete_node","id":"n1"}

4. CREATE_CONNECTION
{"type":"create_connection","from":"n1","to":"n2","style":"curved","color":"#ef4444"}
Estilos: "curved", "straight", "stepped", "dashed"

═══════════════════════════════════════════════════════
PALETA DE CORES
═══════════════════════════════════════════════════════
Amarelo:  bgColor "#fef3c7", borderColor "#f59e0b"
Laranja:  bgColor "#fed7aa", borderColor "#f97316"
Vermelho: bgColor "#fecaca", borderColor "#ef4444"
Rosa:     bgColor "#fbcfe8", borderColor "#ec4899"
Roxo:     bgColor "#e9d5ff", borderColor "#a855f7"
Azul:     bgColor "#bfdbfe", borderColor "#3b82f6"
Verde:    bgColor "#d1fae5", borderColor "#10b981"
Cinza:    bgColor "#e5e7eb", borderColor "#6b7280"
Preto:    bgColor "#1a1a18", borderColor "#1a1a18", textColor "#ffffff"

═══════════════════════════════════════════════════════
MODELOS DE MAPAS MENTAIS
═══════════════════════════════════════════════════════

🗺️ HUB (Central): 1 nó central + 6-8 ramos ao redor em círculo. Ideal para brainstorm.
🌳 ÁRVORE: Raiz no topo, ramos na segunda linha, folhas na terceira. Ideal para hierarquias.
📋 KANBAN: Colunas A Fazer | Em Progresso | Concluído. Ideal para projetos.
🔄 FLUXO: Nós em sequência esquerda→direita. Ideal para processos.
📊 SWOT: 4 quadrantes Forças/Fraquezas/Oportunidades/Ameaças. Ideal para análise.
🎓 ESTUDO: Conceito central + definições + exemplos + aplicações. Ideal para aprendizado.
💡 5 PORQUÊS: Problema central + 5 níveis de causas. Ideal para análise de problemas.

═══════════════════════════════════════════════════════
REGRAS
═══════════════════════════════════════════════════════
1. Modificação → responda SOMENTE JSON puro (sem markdown):
{"reply":"Mensagem amigável","actions":[...]}
2. Só conversa → texto normal, sem JSON.
3. NUNCA invente IDs. Use SOMENTE os da lista acima.
4. X entre 100-1100, Y entre 100-650, espaçamento mínimo 180px.
5. Sempre use cores diferentes por categoria, emojis nos nós, notas descritivas.
6. Crie no mínimo 8-12 nós para um mapa rico.
7. Sempre crie conexões entre nós relacionados.
8. Responda SEMPRE em português do Brasil.

REGRA CRÍTICA — ORGANIZAR/REORGANIZAR:
Quando o usuário pedir para "organizar", "reorganizar", "distribuir", "espaçar" ou "arrumar" o mapa:
- NUNCA crie nós novos (create_node)
- Use APENAS update_node com os IDs existentes acima, mudando somente x e y
- Mova TODOS os nós existentes para novas posições organizadas
- Exemplo de reorganização em árvore:
  {"type":"update_node","id":"n1","x":600,"y":100}
  {"type":"update_node","id":"n2","x":300,"y":300}
  {"type":"update_node","id":"n3","x":600,"y":300}
  {"type":"update_node","id":"n4","x":900,"y":300}`;

    // ── Monta mensagens ───────────────────────────────────────────
    const msgs = [{ role: 'system', content: system }];
    if (Array.isArray(history)) {
      for (const h of history.slice(-12)) {
        if (h.role && h.content) {
          msgs.push({ role: h.role === 'ai' ? 'assistant' : h.role, content: String(h.content).slice(0, 4000) });
        }
      }
    }
    msgs.push({ role: 'user', content: String(prompt || '').slice(0, 5000) });

    // ── SISTEMA DE ROTATIVIDADE ───────────────────────────────────
    // Quando um modelo/provider atinge o limite, o sistema tenta o próximo
    // automaticamente até encontrar um que funcione.
    // A ordem prioriza velocidade e qualidade.

    function buildProviderList(providerId, endpoint, model, apiKey) {
      const isGemini = providerId === 'gemini' || (endpoint && endpoint.includes('generativelanguage'));
      const isGroq = providerId === 'groq' || (endpoint && endpoint.includes('groq'));
      const isOpenAI = providerId === 'openai' || (endpoint && endpoint.includes('openai'));
      const isAnthropic = providerId === 'anthropic' || (endpoint && endpoint.includes('anthropic'));

      const providers = [];

      // 1. Provider configurado pelo usuário (sempre primeiro)
      if (isGemini) {
        providers.push({ type: 'gemini', model, apiKey, label: model });
      } else if (isAnthropic) {
        // Anthropic tem endpoint diferente, skip cascata por ora
        providers.push({ type: 'openai-compat', endpoint, model, apiKey, label: model });
      } else {
        providers.push({ type: 'openai-compat', endpoint, model, apiKey, label: model });
      }

      // 2. Rotatividade Groq — modelos gratuitos em ordem de capacidade
      if (!isGroq || model !== 'llama-3.3-70b-versatile') {
        providers.push({
          type: 'openai-compat',
          endpoint: 'https://api.groq.com/openai/v1/chat/completions',
          model: 'llama-3.3-70b-versatile',
          apiKey,
          label: 'Groq llama-3.3-70b'
        });
      }
      providers.push({
        type: 'openai-compat',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.1-8b-instant',
        apiKey,
        label: 'Groq llama-3.1-8b'
      });
      providers.push({
        type: 'openai-compat',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'gemma2-9b-it',
        apiKey,
        label: 'Groq gemma2-9b'
      });
      providers.push({
        type: 'openai-compat',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'mixtral-8x7b-32768',
        apiKey,
        label: 'Groq mixtral-8x7b'
      });

      // 3. Rotatividade Gemini — se tiver key do Gemini
      if (!isGemini) {
        providers.push({
          type: 'gemini',
          model: 'gemini-2.0-flash',
          apiKey,
          label: 'Gemini 2.0 Flash'
        });
        providers.push({
          type: 'gemini',
          model: 'gemini-1.5-flash',
          apiKey,
          label: 'Gemini 1.5 Flash'
        });
      } else {
        // Usuário usa Gemini: rotaciona entre modelos Gemini
        providers.push({ type: 'gemini', model: 'gemini-2.0-flash', apiKey, label: 'Gemini 2.0 Flash' });
        providers.push({ type: 'gemini', model: 'gemini-1.5-flash', apiKey, label: 'Gemini 1.5 Flash' });
        providers.push({ type: 'gemini', model: 'gemini-1.5-pro', apiKey, label: 'Gemini 1.5 Pro' });
      }

      // Remove duplicatas mantendo a ordem
      const seen = new Set();
      return providers.filter(p => {
        const key = `${p.type}-${p.model}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    async function callOpenAICompat(ep, mdl, key) {
      const r = await fetch(ep, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: mdl, messages: msgs, temperature: 0.5, max_tokens: 8192 })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || `HTTP ${r.status}`);
      return d.choices?.[0]?.message?.content || '';
    }

    async function callGemini(mdl, key) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${key}`;
      const gMsgs = msgs.filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: gMsgs,
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: { temperature: 0.5, maxOutputTokens: 8192 }
        })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || `HTTP ${r.status}`);
      return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    function isRateLimitError(err) {
      const msg = String(err?.message || '').toLowerCase();
      return (
        msg.includes('rate limit') ||
        msg.includes('quota') ||
        msg.includes('429') ||
        msg.includes('too many requests') ||
        msg.includes('resource exhausted') ||
        msg.includes('limit exceeded') ||
        msg.includes('insufficient_quota')
      );
    }

    // ── Executa com rotatividade ──────────────────────────────────
    const providers = buildProviderList(providerId, endpoint, model, apiKey);
    let rawText = '';
    let usedProvider = 'unknown';
    let lastError = null;

    for (const provider of providers) {
      try {
        if (provider.type === 'gemini') {
          rawText = await callGemini(provider.model, provider.apiKey);
        } else {
          rawText = await callOpenAICompat(provider.endpoint, provider.model, provider.apiKey);
        }
        usedProvider = provider.label;
        lastError = null;
        break; // Sucesso! Para o loop.
      } catch (err) {
        lastError = err;
        const isRateLimit = isRateLimitError(err);
        console.warn(`[ai-proxy] ${provider.label} falhou (${isRateLimit ? 'rate limit' : 'erro'}):`, err.message);

        // Só continua rotatividade se for rate limit ou quota
        // Erros de autenticação (401) não adianta tentar outro
        if (!isRateLimit && !String(err.message).includes('50')) {
          break;
        }
      }
    }

    if (!rawText) {
      return res.status(400).json({
        error: lastError?.message || 'Todos os providers falharam. Verifique sua API key.'
      });
    }

    // ── Parser robusto ────────────────────────────────────────────
    let reply = rawText.trim();
    let actions = null;

    try {
      let clean = rawText.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();
      if (!clean.startsWith('{')) {
        const s = rawText.indexOf('{'), e = rawText.lastIndexOf('}');
        if (s !== -1 && e > s) clean = rawText.slice(s, e + 1).trim();
      }
      if (clean.startsWith('{')) {
        const parsed = JSON.parse(clean);
        if (parsed.reply) reply = String(parsed.reply);
        if (Array.isArray(parsed.actions) && parsed.actions.length > 0) actions = parsed.actions;
      }
    } catch (_) {}

    return res.status(200).json({ text: reply, actions, provider: usedProvider });

  } catch (err) {
    console.error('[ai-proxy] error:', err);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
