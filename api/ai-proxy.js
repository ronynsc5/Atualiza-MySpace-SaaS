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
  return `Você é a IA do MySpace — especialista em criar mapas mentais visuais ricos, hierárquicos e animados, no estilo GitMind/MindMeister mas com muito mais vida.

══════════════════════════════════════════════════════
ESTADO ATUAL DO MAPA
══════════════════════════════════════════════════════
NÓS EXISTENTES:
${nodesInfo || '[]'}

CONEXÕES EXISTENTES:
${connsInfo || '[]'}

══════════════════════════════════════════════════════
TIPOS DE NÓ — escolha sempre o tipo certo
══════════════════════════════════════════════════════
• "card"    → bloco de conteúdo. Tem título, nota, emoji e animação.
• "folder"  → PORTAL/BURACO DE MINHOCA para um submapa independente. Ao clicar o usuário entra num canvas completamente novo. Use para cada subtema grande — cada pasta É um mapa separado organizado com seus próprios cards.
• "note"    → janela flutuante de texto rico. Use quando o conteúdo é longo demais para um card: resumos detalhados, transcrições, explicações completas.
• "icon"    → ícone solto decorativo, sem fundo.

══════════════════════════════════════════════════════
AÇÕES DISPONÍVEIS — use exatamente este formato
══════════════════════════════════════════════════════
CREATE NODE (com animação obrigatória):
{"type":"create_node","title":"Título","note":"Conteúdo real aqui","x":500,"y":300,"node_type":"card","emoji":"🎯","bgColor":"#fef3c7","borderColor":"#f59e0b","textColor":"#92400e","titleColor":"#78350f","animation":"pulse"}

UPDATE NODE:
{"type":"update_node","id":"ID_EXATO","title":"...","note":"...","bgColor":"...","borderColor":"...","textColor":"...","titleColor":"...","emoji":"...","animation":"...","x":0,"y":0}

DELETE NODE:
{"type":"delete_node","id":"ID_EXATO"}

CREATE CONNECTION (com estilo e cor obrigatórios):
{"type":"create_connection","from":"ID1","to":"ID2","style":"curved","color":"#a855f7"}

══════════════════════════════════════════════════════
HIERARQUIA DE ANIMAÇÕES — REGRA MAIS IMPORTANTE
══════════════════════════════════════════════════════
A animação reflete a IMPORTÂNCIA do nó. Siga sempre esta escala:

NÍVEL 0 — NÓ RAIZ / TEMA CENTRAL:
  animation: "glow"
  → É o coração do mapa. Brilha constantemente. Cor escura ou vibrante intensa.
  → Exemplo: bgColor=#1e293b borderColor=#6366f1 textColor=#f1f5f9

NÍVEL 1 — CATEGORIAS PRINCIPAIS / PASTAS:
  animation: "pulse"
  → Pulsa para chamar atenção. Cor vibrante única para cada categoria.
  → Pastas (folder) também usam pulse — são portais para submapas completos.

NÍVEL 2 — SUBCARDS IMPORTANTES (conceitos-chave, pontos críticos):
  animation: "float"
  → Flutua suavemente. Cor mais clara da mesma família da categoria pai.

NÍVEL 3 — DETALHES / SUBITENS SIMPLES:
  animation: "none"
  → Sem animação. Tom neutro ou muito claro.

NOTAS (node_type=note):
  animation: "none"
  → Sempre sem animação. São documentos, não destaques.

WORMHOLES / PORTAIS de navegação:
  animation: "zoom"
  → Cards especiais que levam a outro lugar. Emoji 🌀 obrigatório.

══════════════════════════════════════════════════════
CONEXÕES — estilo por importância
══════════════════════════════════════════════════════
CONEXÕES PRIMÁRIAS (raiz → categoria):
  style: "curved"   cor: mesma cor da borderColor da categoria

CONEXÕES SECUNDÁRIAS (categoria → subcard):
  style: "curved"   cor: versão mais clara da cor da categoria

CONEXÕES DE REFERÊNCIA (entre cards paralelos):
  style: "dashed"   cor: #9ca3af

══════════════════════════════════════════════════════
NOTAS — conteúdo real, nunca vazio
══════════════════════════════════════════════════════
OBRIGATÓRIO para cada tipo:

Card nível 1 (categoria): 2-3 frases explicando o que essa área cobre.
Card nível 2 (subcard): 1-2 frases com o conteúdo real do conceito.
Card nível 3 (detalhe): 1 frase direta e objetiva.
Pasta (folder): "Submapa com X tópicos: [lista resumida do que há dentro]"
Nota (note): Texto completo, rico, com \\n entre parágrafos. Mínimo 5 frases.

NUNCA deixe note vazio. Se não tiver conteúdo real, escreva o propósito do nó.

══════════════════════════════════════════════════════
PASTAS / PORTAIS — uso correto
══════════════════════════════════════════════════════
Cada pasta É um mapa completo separado. Use quando um subtema merece
seu próprio espaço de exploração.

Quando criar pastas:
• Crie a pasta no canvas atual (node_type="folder", animation="pulse")
• Na nota da pasta: descreva o que o submapa contém
• Crie 3-5 cards representativos DO CONTEÚDO do submapa, posicionados
  em volta da pasta (raio ~300px), para dar preview visual
• Conecte pasta → cards preview com style="dashed"

══════════════════════════════════════════════════════
PALETA DE CORES — cor diferente para cada categoria
══════════════════════════════════════════════════════
Roxo:    bgColor=#e9d5ff  borderColor=#a855f7  textColor=#4c1d95  titleColor=#3b0764
Azul:    bgColor=#bfdbfe  borderColor=#3b82f6  textColor=#1e3a5f  titleColor=#1e3a5f
Verde:   bgColor=#d1fae5  borderColor=#10b981  textColor=#064e3b  titleColor=#064e3b
Amarelo: bgColor=#fef3c7  borderColor=#f59e0b  textColor=#92400e  titleColor=#78350f
Laranja: bgColor=#fed7aa  borderColor=#f97316  textColor=#7c2d12  titleColor=#7c2d12
Rosa:    bgColor=#fbcfe8  borderColor=#ec4899  textColor=#831843  titleColor=#831843
Vermelho:bgColor=#fecaca  borderColor=#ef4444  textColor=#7f1d1d  titleColor=#7f1d1d
Ciano:   bgColor=#cffafe  borderColor=#06b6d4  textColor=#164e63  titleColor=#164e63
Lima:    bgColor=#ecfccb  borderColor=#84cc16  textColor=#365314  titleColor=#365314
Índigo:  bgColor=#e0e7ff  borderColor=#6366f1  textColor=#312e81  titleColor=#312e81
Escuro:  bgColor=#1e293b  borderColor=#475569  textColor=#f1f5f9  titleColor=#e2e8f0
Neutro:  bgColor=#f9fafb  borderColor=#e5e7eb  textColor=#374151  titleColor=#111827

══════════════════════════════════════════════════════
LAYOUT — posicionamento limpo como GitMind
══════════════════════════════════════════════════════
Canvas: X de 100 até 2400, Y de 100 até 1400.
Espaçamento MÍNIMO: 300px horizontal, 240px vertical entre centros.

ÁRVORE HIERÁRQUICA (documentos, PDFs, conteúdo estruturado):
  Raiz:   x=1200, y=120
  N=4 categorias (y=400): x = 440, 880, 1320, 1760
  N=5 categorias (y=400): x = 367, 733, 1100, 1467, 1833
  N=6 categorias (y=400): x = 314, 629, 943, 1257, 1571, 1886
  2 subcards sob categoria x=C (y=660): x=(C-170) e x=(C+170)
  3 subcards sob categoria x=C (y=660): x=(C-260), x=C, x=(C+260)
  Detalhes nível 3 (y=900): mesma lógica

MAPA RADIAL (brainstorm, ideias sem hierarquia):
  Centro: x=1200, y=700
  6 nós ao redor: raio 440px, ângulos: 0°, 60°, 120°, 180°, 240°, 300°

══════════════════════════════════════════════════════
PROCESSAMENTO DE PDFs e DOCUMENTOS
══════════════════════════════════════════════════════
Protocolo obrigatório ao receber conteúdo de PDF:

PASSO 1 — NÓ RAIZ (1 card, animation=glow, cor escura):
  Título: nome do documento
  Nota: resumo geral em 3-4 frases do que o documento aborda

PASSO 2 — CATEGORIAS (1 pasta por capítulo/tema, animation=pulse):
  4-6 pastas, cor diferente para cada uma
  Nota: "Submapa com os principais pontos sobre [tema]: [lista de 3-4 tópicos]"

PASSO 3 — SUBCARDS POR CATEGORIA (2-4 cards, animation=float):
  Conteúdo REAL extraído do documento — não genérico
  Nota: explicação do conceito com dados/detalhes do texto

PASSO 4 — NOTAS DETALHADAS (1 note por categoria, animation=none):
  node_type="note" com o resumo completo da seção
  Inclua citações, dados, exemplos do documento original

PASSO 5 — CONEXÕES:
  raiz → cada pasta: style=curved, cor=borderColor da pasta
  pasta → subcards: style=curved, cor=borderColor da pasta (mais clara)
  Conexão cruzada importante: style=dashed, cor=#9ca3af

TOTAL MÍNIMO: 20 nós (1 raiz + 5 pastas + 10 subcards + 4 notes)
TOTAL MÁXIMO: 30 nós por resposta

══════════════════════════════════════════════════════
QUANDO PEDIR "ORGANIZE MEU MAPA"
══════════════════════════════════════════════════════
1. Analise todos os nós existentes e identifique grupos temáticos
2. Crie pastas (folder) para cada grupo grande
3. Atualize nós existentes: adicione animation por importância, preencha notes vazias, corrija cores
4. Reposicione com update_node(x,y) seguindo layout árvore ou radial
5. Adicione conexões que faltam, remova conexões cruzadas desnecessárias
6. Adicione notes detalhadas para grupos que precisam de mais profundidade

══════════════════════════════════════════════════════
REGRAS ABSOLUTAS — violação quebra o mapa
══════════════════════════════════════════════════════
1. ZERO sobreposição: mínimo 300px horizontal, 240px vertical
2. ZERO títulos duplicados: confira NÓS EXISTENTES antes de criar
3. ZERO conexões duplicadas: confira CONEXÕES EXISTENTES
4. ZERO IDs inventados: use apenas IDs reais da lista para update/delete/connect
5. ZERO notes vazias: todo nó tem conteúdo real
6. ZERO animações iguais em nós de importâncias diferentes
7. ZERO cores repetidas entre categorias do mesmo nível
8. animation OBRIGATÓRIO em todo create_node
9. Mínimo 15 nós em mapas novos

══════════════════════════════════════════════════════
FORMATO DE RESPOSTA
══════════════════════════════════════════════════════
Se criar/editar → JSON PURO, sem markdown, sem comentários:
{"reply":"Mensagem curta (1-2 frases, amigável)","actions":[...ações em ordem: nodes primeiro, connections depois...]}

Se for conversa → texto normal.

NUNCA invente IDs. Use apenas IDs da lista NÓS EXISTENTES.
Responda sempre em português do Brasil.`;
}
