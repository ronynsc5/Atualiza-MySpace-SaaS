export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { keys = {}, models = {}, endpoints = {}, prompt, payload, history } = req.body || {};

    const hasAny = Object.keys(keys).some(k => keys[k]);
    if (!hasAny) return res.status(400).json({ error: 'Configure pelo menos uma API key nas configuracoes da IA.' });

    // ── Contexto do mapa ─────────────────────────────────────────
    const rawNodes = payload ? (payload.nodes || payload.cards || []) : [];
    const rawConns = payload ? (payload.connections || []) : [];

    const nodesInfo = JSON.stringify(rawNodes.map(n => ({
      id: n.id, title: n.title || '', note: n.note || '', type: n.type || 'card',
      x: Math.round(n.x || 0), y: Math.round(n.y || 0),
      bgColor: n.bgColor || 'none', borderColor: n.borderColor || 'none',
      textColor: n.textColor || '#1a1a18', emoji: n.emoji || ''
    }))).slice(0, 12000);

    const connsInfo = JSON.stringify(rawConns.map(c => ({
      id: c.id, from: c.from, to: c.to, style: c.style || 'curved', color: c.color || 'default'
    }))).slice(0, 4000);

    // ── System prompt ─────────────────────────────────────────────
    const system = `Voce e a IA do MySpace. Responda SEMPRE em JSON puro, sem texto fora do JSON.

Nos atuais: ${nodesInfo}
Conexoes: ${connsInfo}

CRIAR MAPA — responda com:
{"reply":"msg","map":{"layout":"LAYOUT","nodes":[
  {"id":"c","title":"Centro","note":"descricao completa","emoji":"🎯","color":"azul"},
  {"id":"a","title":"Topico","note":"descricao","emoji":"📌","color":"verde","parent":"c"},
  {"id":"a1","title":"Detalhe","note":"descricao","emoji":"⭐","color":"verde","parent":"a"},
  {"id":"f1","title":"Pasta","note":"descricao","emoji":"📁","color":"amarelo","parent":"c","type":"folder"},
  {"id":"n1","title":"Nota","note":"conteudo da nota","emoji":"📝","color":"cinza","parent":"c","type":"note"}
]}}

LAYOUTS: radial(circular) | tree-right(hierarquia→) | tree-down(hierarquia↓) | timeline(linha do tempo) | kanban(colunas) | swot(4 quadrantes)
TIPOS: card(padrão) | folder(pasta amarela) | note(post-it verde)
CORES: azul | verde | amarelo | laranja | vermelho | rosa | roxo | cinza | escuro

EDITAR NOS EXISTENTES:
{"reply":"msg","actions":[
  {"type":"update_node","id":"ID_REAL","title":"...","note":"...","emoji":"...","bgColor":"#hex","borderColor":"#hex","textColor":"#hex"},
  {"type":"delete_node","id":"ID_REAL"},
  {"type":"create_connection","from":"ID1","to":"ID2","style":"curved","color":"#hex"}
]}

SEM ACAO: {"reply":"sua resposta em portugues"}

REGRAS OBRIGATORIAS:
- JSON puro sempre, zero texto fora do JSON
- Minimo 10 nos para mapas novos
- TODO no deve ter "note" com conteudo real e util
- Cores DIFERENTES por categoria — nunca todos iguais
- TODO no deve ter "parent" — nenhum no fica solto sem conexao
- NUNCA use IDs que nao existam em "Nos atuais"
- Portugues do Brasil
- Voce TEM PODER de criar e editar o canvas — EXECUTE, nao descreva`

    // ── Monta msgs ────────────────────────────────────────────────
    const msgs = [{ role: 'system', content: system }];
    if (Array.isArray(history)) {
      for (const h of history.slice(-12)) {
        if (h.role && h.content) msgs.push({ role: h.role === 'ai' ? 'assistant' : h.role, content: String(h.content).slice(0, 4000) });
      }
    }
    msgs.push({ role: 'user', content: String(prompt || '').slice(0, 5000) });

    // ── Carrossel de providers ─────────────────────────────────────
    // Ordem de tentativa: Groq → Gemini → OpenRouter → OpenAI → Anthropic → DeepSeek → Mistral → Cohere → Ollama → LMStudio → Custom

    const CAROUSEL_ORDER = ['groq', 'gemini', 'openrouter', 'openai', 'anthropic', 'deepseek', 'mistral', 'cohere', 'ollama', 'lmstudio', 'custom'];

    const PROVIDER_CONFIG = {
      groq: {
        type: 'openai',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        defaultModel: 'llama-3.3-70b-versatile'
      },
      gemini: {
        type: 'gemini',
        defaultModel: 'gemini-2.5-flash'
      },
      openrouter: {
        type: 'openai',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
        extraHeaders: {
          'HTTP-Referer': 'https://myspace-saas.vercel.app',
          'X-Title': 'MySpace Mind Map'
        }
      },
      openai: {
        type: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        defaultModel: 'gpt-4o'
      },
      anthropic: {
        type: 'anthropic',
        defaultModel: 'claude-sonnet-4-5'
      },
      deepseek: {
        type: 'openai',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        defaultModel: 'deepseek-chat'
      },
      mistral: {
        type: 'openai',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        defaultModel: 'mistral-large-latest'
      },
      cohere: {
        type: 'cohere',
        defaultModel: 'command-r-plus'
      },
      ollama: {
        type: 'ollama',
        defaultModel: 'llama3.2'
      },
      lmstudio: {
        type: 'ollama',
        defaultModel: 'local-model',
        defaultEndpoint: 'http://localhost:1234'
      },
      custom: {
        type: 'openai',
        defaultModel: 'custom-model'
      }
    };

    function isRateLimit(err) {
      const msg = String(err?.message || err?.error || '').toLowerCase();
      return (
        msg.includes('rate limit') ||
        msg.includes('quota') ||
        msg.includes('429') ||
        msg.includes('too many requests') ||
        msg.includes('resource exhausted') ||
        msg.includes('limit exceeded') ||
        msg.includes('insufficient_quota') ||
        msg.includes('tokens per') ||
        msg.includes('requests per') ||
        msg.includes('retry') ||
        msg.includes('free_tier') ||
        msg.includes('billing') ||
        msg.includes('overloaded') ||
        msg.includes('capacity') ||
        msg.includes('please retry')
      );
    }
    function isServerError(err) {
      const msg = String(err?.message || '').toLowerCase();
      const code = String(err?.status || err?.code || '');
      return msg.includes('500') || msg.includes('502') || msg.includes('503') ||
        msg.includes('504') || code.startsWith('5') || msg.includes('server error') ||
        msg.includes('internal error') || msg.includes('service unavailable');
    }

    async function callOpenAI(endpoint, model, key, extraHeaders = {}) {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify({ model, messages: msgs, temperature: 0.5, max_tokens: 8192 })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || 'HTTP ' + r.status);
      return d.choices?.[0]?.message?.content || '';
    }

    async function callGemini(model, key) {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key;
      const gMsgs = msgs.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
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
      if (!r.ok) throw new Error(d.error?.message || 'HTTP ' + r.status);
      return d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    async function callAnthropic(model, key) {
      const anthropicMsgs = msgs.filter(m => m.role !== 'system');
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          system: system,
          messages: anthropicMsgs
        })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error?.message || 'HTTP ' + r.status);
      return d.content?.[0]?.text || '';
    }

    async function callCohere(model, key) {
      const chatHistory = msgs.filter(m => m.role !== 'system' && m.role !== 'user').map(m => ({
        role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: m.content
      }));
      const lastUser = msgs.filter(m => m.role === 'user').pop();
      const r = await fetch('https://api.cohere.com/v1/chat', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, preamble: system,
          message: lastUser?.content || prompt,
          chat_history: chatHistory,
          max_tokens: 4096
        })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'HTTP ' + r.status);
      return d.text || '';
    }

    async function callOllama(model, baseUrl) {
      const url = (baseUrl || 'http://localhost:11434') + '/api/chat';
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: msgs, stream: false })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'HTTP ' + r.status);
      return d.message?.content || '';
    }

    // ── Executa carrossel ─────────────────────────────────────────
    let rawText = '';
    let usedProvider = '';
    let lastError = null;

    for (const providerId of CAROUSEL_ORDER) {
      const key = keys[providerId];
      if (!key && providerId !== 'ollama' && providerId !== 'lmstudio') continue;

      const cfg = PROVIDER_CONFIG[providerId];
      if (!cfg) continue;

      const model = (models[providerId]) || cfg.defaultModel;

      try {
        if (cfg.type === 'gemini') {
          rawText = await callGemini(model, key);
        } else if (cfg.type === 'anthropic') {
          rawText = await callAnthropic(model, key);
        } else if (cfg.type === 'cohere') {
          rawText = await callCohere(model, key);
        } else if (cfg.type === 'ollama') {
          const baseUrl = key || endpoints[providerId] || cfg.defaultEndpoint || 'http://localhost:11434';
          rawText = await callOllama(model, baseUrl);
        } else {
          // openai-compat
          const endpoint = endpoints[providerId] || cfg.endpoint || 'https://api.openai.com/v1/chat/completions';
          rawText = await callOpenAI(endpoint, model, key, cfg.extraHeaders || {});
        }
        usedProvider = providerId + ' / ' + model;
        lastError = null;
        break; // sucesso — sai do loop
      } catch (err) {
        lastError = err;
        console.warn('[ai-proxy] ' + providerId + ' falhou:', err.message);
        // Continua para o próximo provider se for rate limit, quota ou erro de servidor
        // Para (break) apenas em erros de autenticação ou configuração inválida
        const shouldContinue = isRateLimit(err) || isServerError(err);
        const isAuthError = String(err.message || '').toLowerCase().match(/invalid.*key|unauthorized|api key|auth|403|401/);
        if (!shouldContinue && !isAuthError) break; // erro desconhecido — para
        // rate limit / quota / server error → continua pro próximo provider
        console.warn('[ai-proxy] tentando próximo provider...');
      }
    }

    if (!rawText) {
      const errMsg = lastError?.message || 'Erro desconhecido';
      const hint = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate')
        ? 'Quota/rate limit em todos os providers ativos. Tente adicionar outra API key ou aguarde.'
        : 'Todos os providers falharam. Verifique suas API keys nas configurações.';
      return res.status(400).json({ error: hint + ' | Último erro: ' + errMsg.slice(0, 120) });
    }

    // ── Parser robusto ────────────────────────────────────────────
    let reply = rawText.trim();
    let actions = null;
    let mapData = null;

    try {
      // 1. Remove markdown code fences
      let clean = rawText.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/m, '').trim();

      // 2. Se tem texto antes do JSON, encontra o primeiro { válido
      if (!clean.startsWith('{')) {
        // Tenta encontrar JSON em qualquer lugar do texto
        const matches = clean.match(/\{[\s\S]*\}/);
        if (matches) clean = matches[0];
      }

      // 3. Tenta parsear
      if (clean.startsWith('{')) {
        const parsed = JSON.parse(clean);
        if (parsed.reply) reply = String(parsed.reply);
        if (Array.isArray(parsed.actions) && parsed.actions.length > 0) actions = parsed.actions;
        if (parsed.map && parsed.map.nodes) mapData = parsed.map;
      }
    } catch (_) {
      // 4. Fallback: tenta extrair JSON mesmo com erros de formatação
      try {
        const s = rawText.indexOf('{"reply"');
        if (s !== -1) {
          const e = rawText.lastIndexOf('}') + 1;
          const parsed = JSON.parse(rawText.slice(s, e));
          if (parsed.reply) reply = String(parsed.reply);
          if (Array.isArray(parsed.actions) && parsed.actions.length > 0) actions = parsed.actions;
          if (parsed.map && parsed.map.nodes) mapData = parsed.map;
        }
      } catch (_2) {}
    }

    // 5. Garante que o reply nunca mostre JSON cru pro usuário
    if (reply.trimStart().startsWith('{') || reply.includes('"actions":[')) {
      try {
        const parsed = JSON.parse(reply);
        if (parsed.reply) reply = String(parsed.reply);
        if (!actions && Array.isArray(parsed.actions)) actions = parsed.actions;
      } catch(_) {
        reply = 'Mapa atualizado!';
      }
    }

    return res.status(200).json({ text: reply, actions, map: mapData || undefined, provider: usedProvider });

  } catch (err) {
    console.error('[ai-proxy] error:', err);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
