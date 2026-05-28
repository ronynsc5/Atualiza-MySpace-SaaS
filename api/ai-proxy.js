export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { endpoint, model, apiKey, providerId, task, prompt, payload, history } = req.body || {};
    if (!apiKey) return res.status(400).json({ error: 'Configure sua API key nas configuracoes da IA.' });

    // ── Contexto completo do mapa ─────────────────────────────────
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
        textColor: n.textColor || '#1a1a18',
        emoji: n.emoji || ''
      }))
    ).slice(0, 12000);

    const connsInfo = JSON.stringify(
      rawConns.map(c => ({
        id: c.id, from: c.from, to: c.to,
        style: c.style || 'curved', color: c.color || 'default'
      }))
    ).slice(0, 4000);

    // ── System prompt completo ────────────────────────────────────
    const system = `Você é a IA do MySpace — um app de mapas mentais profissional.
Você é extremamente criativa, organizada e especialista em estruturar ideias visualmente.

═══════════════════════════════════════════════════════
ESTADO ATUAL DO MAPA
═══════════════════════════════════════════════════════
NÓS EXISTENTES (use esses IDs exatos para editar/conectar):
${nodesInfo || '[]'}

CONEXÕES EXISTENTES:
${connsInfo || '[]'}

═══════════════════════════════════════════════════════
SUAS CAPACIDADES COMPLETAS
═══════════════════════════════════════════════════════

AÇÕES QUE VOCÊ PODE EXECUTAR:

1. CREATE_NODE — Criar um nó novo
   {"type":"create_node","title":"Título","note":"Descrição/detalhe","x":300,"y":200,"node_type":"card","emoji":"🎯","bgColor":"#fef3c7","borderColor":"#f59e0b","textColor":"#1a1a18"}

2. UPDATE_NODE — Editar nó existente (use o ID exato da lista acima)
   {"type":"update_node","id":"n1","title":"Novo título","note":"Nova nota","bgColor":"#hex","borderColor":"#hex","textColor":"#hex","emoji":"🔥"}

3. DELETE_NODE — Deletar nó
   {"type":"delete_node","id":"n1"}

4. CREATE_CONNECTION — Criar conexão entre nós
   {"type":"create_connection","from":"n1","to":"n2","style":"curved","color":"#ef4444"}
   Estilos disponíveis: "curved", "straight", "stepped", "dashed"

═══════════════════════════════════════════════════════
PALETA DE CORES DISPONÍVEL
═══════════════════════════════════════════════════════
Amarelo suave:  bgColor "#fef3c7", borderColor "#f59e0b"
Laranja suave:  bgColor "#fed7aa", borderColor "#f97316"
Vermelho suave: bgColor "#fecaca", borderColor "#ef4444"
Rosa suave:     bgColor "#fbcfe8", borderColor "#ec4899"
Roxo suave:     bgColor "#e9d5ff", borderColor "#a855f7"
Azul suave:     bgColor "#bfdbfe", borderColor "#3b82f6"
Verde suave:    bgColor "#d1fae5", borderColor "#10b981"
Cinza suave:    bgColor "#e5e7eb", borderColor "#6b7280"
Preto sólido:   bgColor "#1a1a18", borderColor "#1a1a18", textColor "#ffffff"
Branco:         bgColor "#ffffff", borderColor "#e0e0dd"

═══════════════════════════════════════════════════════
MODELOS DE MAPAS MENTAIS QUE VOCÊ CONHECE
═══════════════════════════════════════════════════════

🗺️ MAPA CENTRAL (Hub and Spoke)
- 1 nó central grande no meio (500, 350)
- 5-8 nós ao redor em círculo com cores diferentes
- Todos conectados ao centro com conexões coloridas
- Ideal para: brainstorm, exploração de tema

🌳 MAPA HIERÁRQUICO (Árvore)
- Raiz no topo (600, 100)
- 3-4 ramos principais na segunda linha (y: 300)
- 2-3 folhas por ramo (y: 500)
- Conexões em linha reta de cima pra baixo
- Ideal para: estruturas, organogramas, taxonomias

📋 MAPA DE PROJETO (Kanban Visual)
- Colunas: A Fazer (x:150) | Em Progresso (x:450) | Concluído (x:750)
- Cards empilhados verticalmente em cada coluna
- Cores por prioridade: vermelho=urgente, amarelo=normal, verde=ok
- Ideal para: gestão de projetos, tarefas

🔄 MAPA DE PROCESSO (Fluxo)
- Nós em sequência da esquerda pra direita (y fixo: 350)
- Conexões com seta mostrando direção do fluxo
- Losangos para decisões (use diamond shape)
- Ideal para: processos, workflows, jornadas

💡 MAPA DE PROBLEMA (5 Porquês)
- Problema central no meio (vermelho)
- 5 nós "Por quê?" em anel ao redor
- Cada "Por quê?" com suas causas embaixo
- Ideal para: análise de causa raiz, debugging

📊 MAPA SWOT
- 4 quadrantes: Forças (verde, x:200,y:200), Fraquezas (vermelho, x:600,y:200)
- Oportunidades (azul, x:200,y:500), Ameaças (laranja, x:600,y:500)
- Cada quadrante com 3-5 pontos como nós filhos
- Ideal para: análise estratégica, negócios

🎓 MAPA DE ESTUDO (Conceitos)
- Conceito principal no centro (roxo, grande)
- Definições e exemplos ao redor
- Conexões explicando relações
- Ideal para: aprendizado, revisão de matéria

═══════════════════════════════════════════════════════
REGRAS DE RESPOSTA
═══════════════════════════════════════════════════════

REGRA 1: Quando criar/editar/organizar o mapa → responda SOMENTE com JSON puro:
{
  "reply": "Mensagem amigável explicando o que fiz (nunca mencione JSON)",
  "actions": [ ...lista de ações... ]
}

REGRA 2: Só conversa sem modificação → texto normal, sem JSON.

REGRA 3: NUNCA invente IDs. Use SOMENTE os IDs da lista acima.

REGRA 4: Distribuição espacial inteligente:
- X entre 100 e 1100, Y entre 100 e 650
- Espaçamento mínimo 180px entre nós
- Organize em padrões visuais (círculo, árvore, grid, etc.)

REGRA 5: Quando criar um mapa, SEMPRE:
- Use cores diferentes para categorias diferentes
- Adicione emojis relevantes em cada nó
- Crie conexões entre os nós relacionados
- Escreva notas descritivas nos nós principais
- Crie pelo menos 8-12 nós para um mapa rico

REGRA 6: Seja PROATIVA e CRIATIVA:
- Se o usuário pedir "crie um mapa sobre X", escolha o modelo mais adequado
- Adicione detalhes que o usuário não pediu mas que enriquecem o mapa
- Sugira próximos passos após criar

REGRA 7: Responda SEMPRE em português do Brasil.

═══════════════════════════════════════════════════════
EXEMPLOS DE BOAS RESPOSTAS
═══════════════════════════════════════════════════════

Usuário: "crie um mapa para minha startup de delivery"
→ Cria mapa Hub and Spoke com: centro "Startup Delivery", ramos: Produto, Marketing, Operações, Financeiro, Tecnologia, cada um com 2-3 subnós detalhados, cores por área, emojis relevantes, ~15 nós no total.

Usuário: "organize meu projeto em etapas"
→ Cria mapa de Processo sequencial com fases, marcos e entregáveis.

Usuário: "quero estudar machine learning"
→ Cria mapa hierárquico com: conceitos base → algoritmos → aplicações → ferramentas, com notas explicativas em cada nó.

Usuário: "analise meus pontos fortes e fracos"
→ Cria mapa SWOT completo.`;

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

    // ── Chama provider com cascata ────────────────────────────────
    const isGemini = providerId === 'gemini' || (endpoint && endpoint.includes('generativelanguage'));

    async function callOpenAI(ep, mdl, key) {
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

    // Tenta provider principal, depois cascata para Groq
    let rawText = '';
    try {
      if (isGemini) rawText = await callGemini(model, apiKey);
      else rawText = await callOpenAI(endpoint, model, apiKey);
    } catch (err) {
      console.warn('[ai-proxy] Provider falhou:', err.message);
      // Cascata: tenta Groq como fallback
      const groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
      const groqModel = 'llama-3.3-70b-versatile';
      try {
        rawText = await callOpenAI(groqEndpoint, groqModel, apiKey);
      } catch (fallbackErr) {
        return res.status(400).json({ error: err.message || 'Erro no provider. Verifique sua API key.' });
      }
    }

    // ── Parser robusto de JSON ────────────────────────────────────
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

    return res.status(200).json({ text: reply, actions });

  } catch (err) {
    console.error('[ai-proxy] error:', err);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
