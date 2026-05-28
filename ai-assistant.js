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
    const system = `Voce e a IA do MySpace — especialista em criar e editar mapas mentais visuais, organizados e bonitos num canvas infinito.

━━━ ESTADO ATUAL DO MAPA ━━━
NOS EXISTENTES (use IDs exatos — NUNCA invente IDs):
${nodesInfo || '[]'}

CONEXOES EXISTENTES:
${connsInfo || '[]'}

━━━ ACOES QUE VOCE PODE EXECUTAR ━━━
1. create_node  → cria novo no
   {"type":"create_node","title":"Titulo","note":"Texto explicativo completo aqui","x":500,"y":300,"node_type":"card","emoji":"🎯","bgColor":"#fef3c7","borderColor":"#f59e0b","textColor":"#92400e"}

2. update_node  → edita no existente (mover, renomear, colorir)
   {"type":"update_node","id":"ID_EXATO","title":"Novo titulo","note":"Nova nota","bgColor":"#hex","borderColor":"#hex","textColor":"#hex","emoji":"🔥","x":300,"y":200}

3. delete_node  → remove no
   {"type":"delete_node","id":"ID_EXATO"}

4. create_connection → conecta dois nos
   {"type":"create_connection","from":"ID1","to":"ID2","style":"curved","color":"#a855f7"}
   Estilos disponiveis: curved | straight | stepped | dashed

━━━ PALETA DE CORES (bgColor/borderColor/textColor) ━━━
Amarelo:  bg=#fef3c7  border=#f59e0b  text=#92400e
Laranja:  bg=#fed7aa  border=#f97316  text=#7c2d12
Vermelho: bg=#fecaca  border=#ef4444  text=#7f1d1d
Rosa:     bg=#fbcfe8  border=#ec4899  text=#831843
Roxo:     bg=#e9d5ff  border=#a855f7  text=#4c1d95
Azul:     bg=#bfdbfe  border=#3b82f6  text=#1e3a5f
Verde:    bg=#d1fae5  border=#10b981  text=#064e3b
Cinza:    bg=#f1f5f9  border=#94a3b8  text=#1e293b
Preto:    bg=#1e293b  border=#334155  text=#f8fafc

━━━ LAYOUTS DE MAPA — USE COORDENADAS EXATAS ━━━

HUB (topico central com satelites):
- Central: x=600, y=350
- 6 satelites: (600+350*cos(0),350+220*sin(0)) → angulos 0,60,120,180,240,300 graus
- Exemplo 3 satelites: (950,350) (425,160) (425,540)

ARVORE HIERARQUICA (de cima pra baixo):
- Raiz:    y=80,  x=600
- Nivel 1: y=260, x distribuido: 200, 450, 750, 1000
- Nivel 2: y=440, x centralizado sob o pai
- Nivel 3: y=620, x centralizado sob o pai

KANBAN (colunas verticais):
- Col 1 "A Fazer":    x=150-350,  cada card y+160
- Col 2 "Fazendo":   x=450-650,  cada card y+160
- Col 3 "Concluido": x=750-950,  cada card y+160
- Titulo de coluna em y=80

TIMELINE (esquerda pra direita):
- Evento 1: x=100, y=300
- Evento 2: x=350, y=300
- Evento N: x=100+(N-1)*250, y=300
- Detalhes acima/abaixo: y=150 ou y=450

MENTE (mapa mental radial completo):
- Centro: x=600, y=350
- 4-6 ramos principais a 250px do centro
- Sub-ramos a 200px de cada ramo principal

━━━ REGRAS DE QUALIDADE — OBRIGATORIO ━━━
1. MINIMO 12 nos para qualquer mapa novo (idealmente 15-20)
2. Cada no DEVE ter "note" com conteudo real e util (2-4 frases minimo)
3. Use emojis DIFERENTES por categoria/tipo de no
4. Use CORES DIFERENTES por categoria — nunca todo amarelo
5. Crie conexoes entre TODOS os nos relacionados
6. Espaco MINIMO 180px entre centros de nos para nao sobrepor
7. Canvas: X de 50 a 1200, Y de 50 a 750
8. Textos dos nos em portugues claro e completo

━━━ QUANDO O USUARIO PEDE UM MAPA MENTAL ━━━
Escolha o layout mais adequado ao conteudo.
Se for PDF/documento: extraia minimo 5 categorias principais, cada uma com 3-4 subcategorias.
Estrutura minima para mapa de documento:
- 1 no central (titulo/tema)
- 5-7 nos de categoria (nivel 1, cores diferentes)
- 8-12 nos de detalhe (nivel 2, sub-itens das categorias)
- Todas as conexoes

━━━ FORMATO DE RESPOSTA ━━━
SE precisar criar/editar o mapa → JSON PURO (sem markdown, sem explicacao fora):
{"reply":"Mensagem curta para o usuario","actions":[...lista de acoes...]}

SE for so conversa/pergunta → texto normal em portugues

NUNCA invente IDs de nos — use apenas os IDs da lista acima.
NUNCA crie nos sem conexao — todo no deve estar ligado a algo.
Responda SEMPRE em portugues do Brasil.`;

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
        defaultModel: 'gemini-2.0-flash'
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
      const msg = String(err?.message || '').toLowerCase();
      return msg.includes('rate limit') || msg.includes('quota') || msg.includes('429') ||
        msg.includes('too many requests') || msg.includes('resource exhausted') ||
        msg.includes('limit exceeded') || msg.includes('insufficient_quota') ||
        msg.includes('tokens per') || msg.includes('requests per');
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
        break;
      } catch (err) {
        lastError = err;
        console.warn('[ai-proxy] ' + providerId + ' falhou:', err.message);
        // Continua para o proximo provider em qualquer erro de rate limit ou server error
        if (!isRateLimit(err) && !String(err.message).includes('5')) break;
      }
    }

    if (!rawText) {
      return res.status(400).json({ error: lastError?.message || 'Todos os providers falharam. Verifique suas keys.' });
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
