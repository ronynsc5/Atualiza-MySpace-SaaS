export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { keys = {}, models = {}, endpoints = {}, prompt, payload, history } = req.body || {};

    const hasAny = Object.keys(keys).some(k => keys[k]);
    if (!hasAny) return res.status(400).json({ error: 'Configure pelo menos uma API key nas configurações da IA.' });

    // ── Contexto do mapa ─────────────────────────────────────────
    const rawNodes = payload ? (payload.nodes || payload.cards || []) : [];
    const rawConns = payload ? (payload.connections || []) : [];

    const nodesInfo = JSON.stringify(rawNodes.map(n => ({
      id: n.id,
      title: n.title || '',
      note: (n.note || '').slice(0, 200), // trunca notas longas no contexto
      type: n.type || 'card',
      x: Math.round(n.x || 0),
      y: Math.round(n.y || 0),
      bgColor: n.bgColor || 'none',
      borderColor: n.borderColor || 'none',
      textColor: n.textColor || '#1a1a18',
      emoji: n.emoji || ''
    }))).slice(0, 14000);

    const connsInfo = JSON.stringify(rawConns.map(c => ({
      id: c.id,
      from: c.from,
      to: c.to,
      style: c.style || 'curved',
      color: c.color || 'default'
    }))).slice(0, 5000);

    // ── System prompt ─────────────────────────────────────────────
    const system = buildSystemPrompt(nodesInfo, connsInfo);

    // ── Monta msgs ────────────────────────────────────────────────
    const msgs = [{ role: 'system', content: system }];
    if (Array.isArray(history)) {
      for (const h of history.slice(-12)) {
        if (h.role && h.content) {
          msgs.push({
            role: h.role === 'ai' ? 'assistant' : h.role,
            content: String(h.content).slice(0, 6000)
          });
        }
      }
    }
    msgs.push({ role: 'user', content: String(prompt || '').slice(0, 8000) });

    // ── Carrossel de providers ─────────────────────────────────────
    const CAROUSEL_ORDER = ['groq', 'gemini', 'openrouter', 'openai', 'anthropic', 'deepseek', 'mistral', 'cohere', 'ollama', 'lmstudio', 'custom'];

    const PROVIDER_CONFIG = {
      groq: { type: 'openai', endpoint: 'https://api.groq.com/openai/v1/chat/completions', defaultModel: 'llama-3.3-70b-versatile' },
      gemini: { type: 'gemini', defaultModel: 'gemini-2.0-flash' },
      openrouter: {
        type: 'openai',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
        extraHeaders: { 'HTTP-Referer': 'https://myspace-saas.vercel.app', 'X-Title': 'MySpace Mind Map' }
      },
      openai: { type: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-4o' },
      anthropic: { type: 'anthropic', defaultModel: 'claude-sonnet-4-5' },
      deepseek: { type: 'openai', endpoint: 'https://api.deepseek.com/v1/chat/completions', defaultModel: 'deepseek-chat' },
      mistral: { type: 'openai', endpoint: 'https://api.mistral.ai/v1/chat/completions', defaultModel: 'mistral-large-latest' },
      cohere: { type: 'cohere', defaultModel: 'command-r-plus' },
      ollama: { type: 'ollama', defaultModel: 'llama3.2' },
      lmstudio: { type: 'ollama', defaultModel: 'local-model', defaultEndpoint: 'http://localhost:1234' },
      custom: { type: 'openai', defaultModel: 'custom-model' }
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
        body: JSON.stringify({ model, messages: msgs, temperature: 0.4, max_tokens: 8192 })
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
          generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
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
        body: JSON.stringify({ model, max_tokens: 8192, system, messages: anthropicMsgs })
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
        body: JSON.stringify({ model, preamble: system, message: lastUser?.content || prompt, chat_history: chatHistory, max_tokens: 4096 })
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
          const endpoint = endpoints[providerId] || cfg.endpoint || 'https://api.openai.com/v1/chat/completions';
          rawText = await callOpenAI(endpoint, model, key, cfg.extraHeaders || {});
        }
        usedProvider = providerId + ' / ' + model;
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        console.warn('[ai-proxy] ' + providerId + ' falhou:', err.message);
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

// ══════════════════════════════════════════════════════════════════
// SYSTEM PROMPT — separado para fácil manutenção
// ══════════════════════════════════════════════════════════════════
function buildSystemPrompt(nodesInfo, connsInfo) {
  return `Você é a IA do MySpace — um assistente especialista em organizar e construir mapas mentais visuais, ricos e inteligentes.

══════════════════════════════════════════════════════
ESTADO ATUAL DO MAPA
══════════════════════════════════════════════════════
NÓS EXISTENTES:
${nodesInfo || '[]'}

CONEXÕES EXISTENTES:
${connsInfo || '[]'}

══════════════════════════════════════════════════════
TIPOS DE NÓ — use o tipo certo para cada situação
══════════════════════════════════════════════════════
• "card"    → bloco de conteúdo principal. Tem título, nota e ícone.
• "folder"  → PORTAL para um submapa independente. Ao clicar, o usuário entra num canvas novo. Use para subtemas grandes, capítulos, projetos dentro de projetos. É um "buraco de minhoca" — não é só uma pasta visual, é uma porta para outro mapa completo.
• "note"    → abre uma janela flutuante de texto rico ao clicar. Use para anotações longas, resumos detalhados, transcrições, texto corrido.
• "icon"    → ícone solto sem fundo, sem borda. Use para decoração visual e marcadores.

══════════════════════════════════════════════════════
AÇÕES DISPONÍVEIS
══════════════════════════════════════════════════════
Cada ação retorna um objeto JSON. Liste todas as ações em ordem: primeiro crie os nós, depois as conexões.

CREATE NODE:
{"type":"create_node","title":"Título","note":"Texto rico da nota — use \\n para quebras de linha","x":500,"y":300,"node_type":"card","emoji":"🎯","bgColor":"#fef3c7","borderColor":"#f59e0b","textColor":"#92400e","titleColor":"#92400e"}

UPDATE NODE:
{"type":"update_node","id":"ID_EXATO","title":"...","note":"...","bgColor":"...","borderColor":"...","textColor":"...","titleColor":"...","emoji":"...","x":0,"y":0}

DELETE NODE:
{"type":"delete_node","id":"ID_EXATO"}

CREATE CONNECTION:
{"type":"create_connection","from":"ID1","to":"ID2","style":"curved","color":"#a855f7"}

══════════════════════════════════════════════════════
NOTAS — use de verdade, não deixe vazio
══════════════════════════════════════════════════════
O campo "note" é valioso. Use assim:
• Cards: escreva um resumo real do conteúdo — mínimo 1 frase, ideal 2–4 frases
• Notas (node_type=note): escreva o conteúdo completo — pode ser longo, com \\n para parágrafos
• Pastas (node_type=folder): descreva o que o submapa contém
• Não deixe note vazio NUNCA

══════════════════════════════════════════════════════
PASTAS / PORTAIS — como usar corretamente
══════════════════════════════════════════════════════
Pastas são portais para submapas. Use-as para:
• Capítulos de um documento
• Subtemas grandes de um mapa mental
• Projetos dentro de projetos

Quando o usuário pedir para "criar submapas" ou "usar pastas":
• Crie a pasta no canvas atual com node_type="folder"
• Crie os cards filhos no mesmo canvas, posicionados próximos à pasta
• Conecte pasta → cards filhos

══════════════════════════════════════════════════════
WORMHOLES — links entre elementos
══════════════════════════════════════════════════════
Para criar um card que navega para outra parte do mapa, use node_type="card" com emoji 🌀 e na nota escreva o destino:
• #NomeDoProjeto → navega para outro projeto
• @NomeDoCard    → pula para um card pelo título
• !NomeDaPasta  → abre uma pasta

══════════════════════════════════════════════════════
PALETA DE CORES — use variação para diferenciar categorias
══════════════════════════════════════════════════════
Amarelo:    bgColor=#fef3c7  borderColor=#f59e0b  textColor=#92400e  titleColor=#78350f
Laranja:    bgColor=#fed7aa  borderColor=#f97316  textColor=#7c2d12  titleColor=#7c2d12
Vermelho:   bgColor=#fecaca  borderColor=#ef4444  textColor=#7f1d1d  titleColor=#7f1d1d
Rosa:       bgColor=#fbcfe8  borderColor=#ec4899  textColor=#831843  titleColor=#831843
Roxo:       bgColor=#e9d5ff  borderColor=#a855f7  textColor=#4c1d95  titleColor=#4c1d95
Índigo:     bgColor=#e0e7ff  borderColor=#6366f1  textColor=#312e81  titleColor=#312e81
Azul:       bgColor=#bfdbfe  borderColor=#3b82f6  textColor=#1e3a5f  titleColor=#1e3a5f
Ciano:      bgColor=#cffafe  borderColor=#06b6d4  textColor=#164e63  titleColor=#164e63
Verde:      bgColor=#d1fae5  borderColor=#10b981  textColor=#064e3b  titleColor=#064e3b
Lima:       bgColor=#ecfccb  borderColor=#84cc16  textColor=#365314  titleColor=#365314
Cinza:      bgColor=#e5e7eb  borderColor=#9ca3af  textColor=#111827  titleColor=#111827
Escuro:     bgColor=#1e293b  borderColor=#475569  textColor=#f1f5f9  titleColor=#e2e8f0
Sem fundo:  bgColor=none     borderColor=none     textColor=#1a1a18  titleColor=#1a1a18

══════════════════════════════════════════════════════
ESTILOS VISUAIS — destaque conteúdo importante
══════════════════════════════════════════════════════
• Cores vibrantes para categorias principais, tons neutros para subitens
• Emoji relevante ao conteúdo real — não genérico
• Cor diferente para cada categoria — nunca todos iguais
• Card central/raiz: cor escura ou vibrante, tamanho maior (posicione no centro)

══════════════════════════════════════════════════════
LAYOUT — posicionamento inteligente
══════════════════════════════════════════════════════
Canvas: X de 100 até 2400, Y de 100 até 1400.
Espaçamento MÍNIMO entre centros de nós: 280px horizontal, 220px vertical.

ÁRVORE HIERÁRQUICA (use para documentos, PDFs, estruturas):
  Raiz: x=1200, y=120
  N=4 categorias nível 1 (y=380): x = 440, 880, 1320, 1760
  N=5 categorias nível 1 (y=380): x = 367, 733, 1100, 1467, 1833
  N=6 categorias nível 1 (y=380): x = 314, 629, 943, 1257, 1571, 1886
  Subcategorias nível 2 (y=640), 2 filhos sob categoria em x=C:
    filhos em x=(C-160) e x=(C+160)

MAPA RADIAL (brainstorm, temas sem hierarquia):
  Centro: x=1200, y=700
  Nós ao redor em círculo com raio 420px

══════════════════════════════════════════════════════
PROCESSAMENTO DE PDFs e DOCUMENTOS
══════════════════════════════════════════════════════
Ao receber conteúdo de PDF/documento:

1. TEMA CENTRAL → 1 card raiz com resumo real em 2-3 frases na nota
2. CATEGORIAS → 4-6 pastas (node_type=folder), uma por capítulo/tema
   • Nota da pasta: o que o leitor encontrará dentro
   • Cor diferente para cada pasta
3. PONTOS-CHAVE → 2-4 cards por categoria com conteúdo real na nota
4. NOTAS LONGAS → crie nós node_type=note com resumos detalhados
5. TOTAL: mínimo 15 nós, máximo 30 por resposta
6. CONEXÕES: raiz→categoria, categoria→subcards. Cor = cor da categoria

══════════════════════════════════════════════════════
QUANDO O USUÁRIO PEDIR "ORGANIZE MEU MAPA"
══════════════════════════════════════════════════════
1. Leia todos os nós existentes
2. Identifique temas/grupos naturais
3. Crie pastas para agrupar temas grandes
4. Reposicione nós existentes com update_node (x, y)
5. Adicione notas onde estão vazias
6. Conecte nós que fazem sentido estarem ligados
7. Aplique cores para diferenciar grupos

══════════════════════════════════════════════════════
REGRAS ABSOLUTAS
══════════════════════════════════════════════════════
1. ZERO sobreposição: mínimo 280px horizontal, 220px vertical entre nós
2. ZERO títulos duplicados: confira NÓS EXISTENTES antes de criar
3. ZERO conexões duplicadas: confira CONEXÕES EXISTENTES
4. ZERO IDs inventados: use apenas IDs reais para update/delete/connect
5. note NUNCA vazio — todo nó precisa de conteúdo real
6. Cores DIFERENTES por categoria
7. Mínimo 12 nós em mapas novos

══════════════════════════════════════════════════════
FORMATO DE RESPOSTA
══════════════════════════════════════════════════════
Se criar/editar mapa → JSON PURO sem markdown:
{"reply":"Mensagem curta para o usuário (1-2 frases, amigável e direta)","actions":[...lista de ações em ordem...]}

Se for conversa → texto normal em português do Brasil.

NUNCA invente IDs. Use apenas IDs da lista NÓS EXISTENTES.
Responda em português do Brasil.`;
}
