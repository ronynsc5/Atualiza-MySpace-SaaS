/* MySpace v4.2 - IA Assistant Multi-Provider Carrossel */
(function () {
  'use strict';

  const SETTINGS_KEY = 'myspace-ai-settings';
  const CHAT_KEY = 'myspace-ai-chat';

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (_) { return {}; }
  }
  function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s || {})); }
  function getChat() {
    try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch (_) { return []; }
  }
  function saveChat(msgs) { localStorage.setItem(CHAT_KEY, JSON.stringify((msgs || []).slice(-50))); }

  function getSnapshot() {
    try {
      if (window.MySpace_getNodes) return { nodes: window.MySpace_getNodes() };
      if (window.MySpace && typeof window.MySpace.snapshot === 'function') return window.MySpace.snapshot();
    } catch (_) {}
    for (const k of ['myspace-v3', 'myspace-v2']) {
      try { const r = localStorage.getItem(k); if (r) return JSON.parse(r); } catch (_) {}
    }
    return null;
  }

  // ── TODOS OS PROVIDERS DISPONÍVEIS ────────────────────────────
  const PROVIDERS = [
    // ── GROQ (grátis, ultrarrápido) ──
    {
      id: 'groq',
      name: 'Groq',
      icon: '⚡',
      badge: 'GRÁTIS',
      badgeColor: '#22c55e',
      description: 'Ultrarrápido — Llama, Mixtral, Gemma',
      keyLink: 'https://console.groq.com/keys',
      keyPlaceholder: 'gsk_...',
      type: 'groq',
      models: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', default: true },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (rápido)' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
        { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
        { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B' },
      ]
    },
    // ── GOOGLE GEMINI (grátis) ──
    {
      id: 'gemini',
      name: 'Google Gemini',
      icon: '✨',
      badge: 'GRÁTIS',
      badgeColor: '#22c55e',
      description: 'Inteligente — Gemini 2.0/1.5',
      keyLink: 'https://aistudio.google.com/apikey',
      keyPlaceholder: 'AIza...',
      type: 'gemini',
      models: [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (grátis)', default: true },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      ]
    },
    // ── OPENROUTER (acesso a dezenas de modelos) ──
    {
      id: 'openrouter',
      name: 'OpenRouter',
      icon: '🔀',
      badge: 'GRÁTIS+PAGO',
      badgeColor: '#8b5cf6',
      description: 'Acesso a 100+ modelos — Llama, Mistral, DeepSeek...',
      keyLink: 'https://openrouter.ai/keys',
      keyPlaceholder: 'sk-or-...',
      type: 'openai',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      models: [
        { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (grátis)', default: true },
        { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3 (grátis)' },
        { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (grátis)' },
        { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B (grátis)' },
        { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
        { id: 'openai/gpt-4o', name: 'GPT-4o' },
        { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
        { id: 'x-ai/grok-3-mini-beta', name: 'Grok 3 Mini' },
        { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (grátis)' },
      ]
    },
    // ── OPENAI ──
    {
      id: 'openai',
      name: 'OpenAI',
      icon: '🤖',
      badge: 'PAGO',
      badgeColor: '#f59e0b',
      description: 'GPT-4o, GPT-4o-mini',
      keyLink: 'https://platform.openai.com/api-keys',
      keyPlaceholder: 'sk-...',
      type: 'openai',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', default: true },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (barato)' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      ]
    },
    // ── ANTHROPIC ──
    {
      id: 'anthropic',
      name: 'Anthropic',
      icon: '🧠',
      badge: 'PAGO',
      badgeColor: '#f59e0b',
      description: 'Claude — Análise profunda',
      keyLink: 'https://console.anthropic.com/settings/api-keys',
      keyPlaceholder: 'sk-ant-...',
      type: 'anthropic',
      models: [
        { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', default: true },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude Haiku (rápido)' },
        { id: 'claude-opus-4-5', name: 'Claude Opus 4.5' },
      ]
    },
    // ── DEEPSEEK ──
    {
      id: 'deepseek',
      name: 'DeepSeek',
      icon: '🔬',
      badge: 'BARATO',
      badgeColor: '#06b6d4',
      description: 'Muito capaz e barato — R1, V3',
      keyLink: 'https://platform.deepseek.com/api_keys',
      keyPlaceholder: 'sk-...',
      type: 'openai',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      models: [
        { id: 'deepseek-chat', name: 'DeepSeek V3', default: true },
        { id: 'deepseek-reasoner', name: 'DeepSeek R1 (raciocínio)' },
      ]
    },
    // ── MISTRAL ──
    {
      id: 'mistral',
      name: 'Mistral AI',
      icon: '🌬️',
      badge: 'PAGO',
      badgeColor: '#f59e0b',
      description: 'Mistral Large, Small, Nemo',
      keyLink: 'https://console.mistral.ai/api-keys',
      keyPlaceholder: '...',
      type: 'openai',
      endpoint: 'https://api.mistral.ai/v1/chat/completions',
      models: [
        { id: 'mistral-large-latest', name: 'Mistral Large', default: true },
        { id: 'mistral-small-latest', name: 'Mistral Small' },
        { id: 'open-mistral-nemo', name: 'Mistral Nemo' },
      ]
    },
    // ── COHERE ──
    {
      id: 'cohere',
      name: 'Cohere',
      icon: '🌐',
      badge: 'GRÁTIS+PAGO',
      badgeColor: '#8b5cf6',
      description: 'Command R+ — Multilingue',
      keyLink: 'https://dashboard.cohere.com/api-keys',
      keyPlaceholder: '...',
      type: 'cohere',
      models: [
        { id: 'command-r-plus', name: 'Command R+', default: true },
        { id: 'command-r', name: 'Command R' },
      ]
    },
    // ── OLLAMA (local) ──
    {
      id: 'ollama',
      name: 'Ollama (Local)',
      icon: '🦙',
      badge: '100% LOCAL',
      badgeColor: '#10b981',
      description: 'Llama, Mistral, Phi rodando no seu PC',
      keyLink: 'https://ollama.ai',
      keyPlaceholder: 'http://localhost:11434',
      type: 'ollama',
      models: [
        { id: 'llama3.2', name: 'Llama 3.2', default: true },
        { id: 'llama3.1', name: 'Llama 3.1' },
        { id: 'mistral', name: 'Mistral 7B' },
        { id: 'phi4', name: 'Phi 4 (Microsoft)' },
        { id: 'qwen2.5', name: 'Qwen 2.5' },
        { id: 'deepseek-r1', name: 'DeepSeek R1' },
        { id: 'gemma3', name: 'Gemma 3' },
      ]
    },
    // ── LM STUDIO (local) ──
    {
      id: 'lmstudio',
      name: 'LM Studio (Local)',
      icon: '🖥️',
      badge: '100% LOCAL',
      badgeColor: '#10b981',
      description: 'Qualquer modelo GGUF rodando localmente',
      keyLink: 'https://lmstudio.ai',
      keyPlaceholder: 'http://localhost:1234',
      type: 'ollama',
      models: [
        { id: 'local-model', name: 'Modelo carregado no LM Studio', default: true },
      ]
    },
    // ── CUSTOM (compatível com OpenAI) ──
    {
      id: 'custom',
      name: 'Personalizado',
      icon: '🔧',
      badge: 'CUSTOM',
      badgeColor: '#6b7280',
      description: 'Qualquer API compatível com OpenAI',
      keyLink: '',
      keyPlaceholder: 'sua-key-aqui',
      type: 'custom',
      models: [
        { id: 'custom-model', name: 'Modelo personalizado', default: true },
      ]
    },
  ];

  // ── APPLY ACTIONS ──────────────────────────────────────────────
  function applyActions(actions) {
    if (!Array.isArray(actions)) return;

    // ── Previne nós duplicados e posições sobrepostas ──
    const createdTitles = new Set();
    const usedPositions = []; // {x, y} já ocupados nesta execução

    function posConflicts(x, y) {
      return usedPositions.some(p => Math.abs(p.x - x) < 220 && Math.abs(p.y - y) < 140);
    }
    function findFreePos(x, y) {
      let nx = x, ny = y, tries = 0;
      while (posConflicts(nx, ny) && tries < 20) {
        nx += 250; if (nx > 2200) { nx = 100; ny += 180; }
        tries++;
      }
      return { x: nx, y: ny };
    }

    // Mapeia títulos existentes no canvas pra evitar duplicatas
    try {
      const snap = window.MySpace && typeof window.MySpace.snapshot === 'function'
        ? window.MySpace.snapshot() : null;
      if (snap && snap.nodes) {
        snap.nodes.forEach(n => { if (n.title) createdTitles.add(n.title.trim().toLowerCase()); });
        snap.nodes.forEach(n => { if (n.x !== undefined) usedPositions.push({x: n.x, y: n.y}); });
      }
    } catch(_) {}

    // Mapeia IDs criados nesta execução (título → id) para conexões usarem
    const createdIds = {};

    for (const action of actions) {
      try {
        if (action.type === 'create_node') {
          const titleKey = (action.title || '').trim().toLowerCase();
          if (createdTitles.has(titleKey)) continue; // skip duplicata
          createdTitles.add(titleKey);

          const rawX = action.x !== undefined ? action.x : (200 + Math.random() * 600);
          const rawY = action.y !== undefined ? action.y : (150 + Math.random() * 400);
          const {x, y} = findFreePos(rawX, rawY);
          usedPositions.push({x, y});

          const id = window.MySpace_addNode(action.title || 'Novo no', action.note || '', x, y, action.node_type || 'card');
          if (id) createdIds[action.title] = id;
        } else if (action.type === 'update_node') {
          const patch = {};
          if (action.title !== undefined) patch.title = action.title;
          if (action.note !== undefined) patch.note = action.note;
          if (action.bgColor !== undefined) patch.bgColor = action.bgColor;
          if (action.color !== undefined) patch.bgColor = action.color;
          if (action.borderColor !== undefined) patch.borderColor = action.borderColor;
          if (action.textColor !== undefined) patch.textColor = action.textColor;
          if (action.emoji !== undefined) patch.emoji = action.emoji;
          if (action.x !== undefined) patch.x = action.x;
          if (action.y !== undefined) patch.y = action.y;
          window.MySpace_updateNode(action.id, patch);
        } else if (action.type === 'delete_node') {
          window.MySpace_deleteNode(action.id);
        }
      } catch (e) { console.warn('[AI] action error:', action.type, e); }
    }
    // Pega conexões já existentes pra não duplicar
    const existingConns = new Set();
    try {
      const snap = window.MySpace && typeof window.MySpace.snapshot === 'function'
        ? window.MySpace.snapshot() : null;
      if (snap && snap.connections) {
        snap.connections.forEach(c => existingConns.add(c.from + '→' + c.to));
      }
    } catch(_) {}

    for (const action of actions) {
      try {
        if (action.type === 'create_connection') {
          if (!action.from || !action.to) continue;
          const key = action.from + '→' + action.to;
          const keyRev = action.to + '→' + action.from;
          if (existingConns.has(key) || existingConns.has(keyRev)) continue; // skip duplicata
          existingConns.add(key);
          window.MySpace_addConnection(action.from, action.to, action.style || 'curved', action.color || null);
        }
      } catch (e) { console.warn('[AI] connection error:', action, e); }
    }

    // Redesenha o canvas depois de tudo
    try { if (typeof draw === 'function') draw(); } catch(_) {}
    try { if (typeof triggerSave === 'function') triggerSave(); } catch(_) {}
  }

  // ── STYLES ────────────────────────────────────────────────────
  function injectStyles() {
    const css = document.createElement('style');
    css.textContent = `
      #ms-ai-btn {
        position:fixed;right:18px;bottom:80px;z-index:2600;
        width:48px;height:48px;border-radius:50%;border:none;
        background:var(--accent);color:var(--bg);
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;box-shadow:0 4px 20px var(--shadow2);
        transition:transform 0.15s;font-size:22px;
      }
      #ms-ai-btn:hover{transform:scale(1.08);}
      #ms-ai-panel {
        position:fixed;right:18px;bottom:140px;z-index:2599;
        width:420px;height:620px;border-radius:18px;
        background:var(--bg);border:1px solid var(--border);
        box-shadow:0 12px 48px var(--shadow2);
        display:none;flex-direction:column;
        font-family:'Inter',system-ui,sans-serif;
        overflow:hidden;resize:both;
      }
      #ms-ai-panel.show{display:flex;}
      .ms-ai-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);background:var(--bg2);}
      .ms-ai-header-left{display:flex;align-items:center;gap:8px;}
      .ms-ai-header-left span{font-size:15px;font-weight:700;color:var(--text);}
      .ms-ai-status-dot{width:8px;height:8px;border-radius:50%;background:#6b7280;flex-shrink:0;}
      .ms-ai-status-dot.active{background:#22c55e;}
      .ms-ai-status-label{font-size:11px;color:var(--text3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .ms-ai-header-right{display:flex;gap:6px;}
      .ms-ai-icon-btn{border:none;background:transparent;color:var(--text3);cursor:pointer;padding:4px;border-radius:7px;font-size:16px;transition:background 0.1s;}
      .ms-ai-icon-btn:hover{background:var(--bg3);color:var(--text);}
      .ms-ai-messages{flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;}
      .ms-ai-msg-row{display:flex;gap:8px;}
      .ms-ai-msg-row.user{flex-direction:row-reverse;}
      .ms-ai-avatar{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;}
      .ms-ai-avatar.ai{background:var(--accent);color:var(--bg);}
      .ms-ai-avatar.user{background:var(--bg3);color:var(--text);font-size:12px;}
      .ms-ai-bubble{max-width:82%;padding:9px 12px;border-radius:14px;font-size:13px;line-height:1.5;color:var(--text);}
      .ms-ai-bubble.ai{background:var(--bg2);border-bottom-left-radius:4px;}
      .ms-ai-bubble.user{background:var(--accent);color:var(--bg);border-bottom-right-radius:4px;}
      .ms-ai-bubble.error{background:#fee2e2;color:#dc2626;}
      .ms-ai-bubble.action{background:var(--bg3);border:1px solid var(--border);border-radius:10px;font-size:12px;}
      .ms-ai-typing{display:flex;gap:4px;align-items:center;padding:10px 12px;}
      .ms-ai-typing span{width:6px;height:6px;background:var(--text3);border-radius:50%;animation:ms-bounce 1.2s infinite;}
      .ms-ai-typing span:nth-child(2){animation-delay:0.2s;}
      .ms-ai-typing span:nth-child(3){animation-delay:0.4s;}
      @keyframes ms-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
      .ms-ai-footer{padding:10px 12px;border-top:1px solid var(--border);background:var(--bg);}
      .ms-ai-input-row{display:flex;gap:6px;align-items:flex-end;}
      .ms-ai-pdf-btn{flex-shrink:0;width:36px;height:36px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);color:var(--text2);cursor:pointer;font-size:11px;font-weight:700;transition:all 0.15s;display:flex;align-items:center;justify-content:center;}
      .ms-ai-pdf-btn:hover{background:var(--bg3);border-color:var(--accent);color:var(--accent);}
      .ms-ai-input{flex:1;border:1px solid var(--border);background:var(--bg2);color:var(--text);border-radius:12px;padding:9px 12px;font-family:inherit;font-size:13px;resize:none;outline:none;max-height:100px;min-height:38px;line-height:1.4;transition:border-color 0.15s;}
      .ms-ai-input:focus{border-color:var(--accent);background:var(--bg);}
      .ms-ai-send{width:36px;height:36px;border-radius:10px;border:none;background:var(--accent);color:var(--bg);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:16px;transition:opacity 0.15s;}
      .ms-ai-send:disabled{opacity:0.4;cursor:not-allowed;}
      .ms-ai-suggestions{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
      .ms-ai-suggestion{font-size:11px;padding:4px 10px;border-radius:999px;border:1px solid var(--border);background:var(--bg2);color:var(--text2);cursor:pointer;transition:all 0.1s;}
      .ms-ai-suggestion:hover{background:var(--bg3);color:var(--text);}
      .ms-ai-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--text3);padding:20px;text-align:center;}
      .ms-ai-empty-icon{font-size:36px;}
      .ms-ai-empty h3{font-size:14px;font-weight:700;color:var(--text2);margin:0;}
      .ms-ai-empty p{font-size:12px;margin:0;line-height:1.5;}

      /* SETTINGS MODAL */
      #ms-ai-settings-modal{position:fixed;inset:0;z-index:5300;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;padding:20px;}
      #ms-ai-settings-modal.show{display:flex;}
      .ms-ai-settings-card{width:min(560px,100%);background:var(--bg);border:1px solid var(--border);border-radius:18px;box-shadow:0 20px 60px var(--shadow2);font-family:'Inter',system-ui,sans-serif;overflow:hidden;max-height:90vh;height:90vh;display:flex;flex-direction:column;}
      .ms-ai-settings-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border);background:var(--bg2);flex-shrink:0;}
      .ms-ai-settings-head strong{font-size:16px;font-weight:700;color:var(--text);}
      .ms-ai-settings-body{padding:16px 20px;display:flex;flex-direction:column;gap:10px;overflow-y:scroll;overflow-x:hidden;flex:1;min-height:0;scrollbar-width:thin;scrollbar-color:var(--border2) transparent;}
      .ms-ai-settings-footer{padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0;}
      .ms-settings-note{font-size:11px;color:var(--text3);background:var(--bg3);border-radius:8px;padding:10px 12px;line-height:1.5;}
      .ms-ai-settings-body::-webkit-scrollbar{width:6px;}
      .ms-ai-settings-body::-webkit-scrollbar-track{background:transparent;}
      .ms-ai-settings-body::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
      .ms-settings-note strong{color:var(--text2);}

      /* Provider cards */
      .ms-provider-card{border:1px solid var(--border);border-radius:12px;background:var(--bg2);overflow:visible;transition:border-color 0.15s;}
      .ms-provider-card.has-key{border-color:#22c55e;}
      .ms-provider-header{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;user-select:none;}
      .ms-provider-header:hover{background:var(--bg3);}
      .ms-provider-icon{font-size:20px;flex-shrink:0;width:28px;text-align:center;}
      .ms-provider-info{flex:1;min-width:0;}
      .ms-provider-name{font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:5px;}
      .ms-provider-badge{font-size:9px;font-weight:700;padding:2px 5px;border-radius:4px;color:#fff;flex-shrink:0;}
      .ms-provider-desc{font-size:11px;color:var(--text3);margin-top:1px;}
      .ms-provider-status{font-size:11px;display:flex;align-items:center;gap:3px;flex-shrink:0;}
      .ms-provider-status.ok{color:#22c55e;}
      .ms-provider-status.empty{color:var(--text3);}
      .ms-provider-body{padding:0 14px 12px;display:none;border-top:1px solid var(--border);}
      .ms-provider-body.open{display:block;}
      .ms-provider-key-row{display:flex;gap:6px;align-items:center;margin-top:10px;}
      .ms-provider-key-input{flex:1;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:8px;padding:7px 10px;font-family:'Inter',monospace;font-size:12px;outline:none;}
      .ms-provider-key-input:focus{border-color:var(--accent);}
      .ms-provider-model-select{width:100%;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:8px;padding:7px 10px;font-family:inherit;font-size:12px;outline:none;margin-top:8px;cursor:pointer;}
      .ms-provider-test-btn{border:1px solid var(--border);background:var(--bg3);color:var(--text);border-radius:8px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit;transition:all 0.15s;}
      .ms-provider-test-btn:hover{background:var(--accent);color:var(--bg);border-color:var(--accent);}
      .ms-provider-test-btn:disabled{opacity:0.5;cursor:not-allowed;}
      .ms-provider-link{font-size:11px;color:var(--accent);text-decoration:none;margin-top:6px;display:inline-block;}
      .ms-provider-link:hover{text-decoration:underline;}
      .ms-provider-test-result{font-size:11px;margin-top:6px;padding:6px 10px;border-radius:6px;display:none;}
      .ms-provider-test-result.ok{background:#dcfce7;color:#166534;display:block;}
      .ms-provider-test-result.error{background:#fee2e2;color:#991b1b;display:block;}
      .ms-provider-ollama-note{font-size:11px;color:var(--text3);margin-top:6px;line-height:1.4;}

      .ms-ai-btn-primary{border:none;background:var(--accent);color:var(--bg);border-radius:10px;padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;}
      .ms-ai-btn-secondary{border:1px solid var(--border);background:transparent;color:var(--text);border-radius:10px;padding:10px 18px;font-weight:600;font-size:13px;cursor:pointer;font-family:inherit;}
    `;
    document.head.appendChild(css);
  }

  // ── UI ─────────────────────────────────────────────────────────
  function injectUI() {
    const btn = document.createElement('button');
    btn.id = 'ms-ai-btn';
    btn.innerHTML = '🤖';
    btn.title = 'Assistente IA';
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'ms-ai-panel';
    panel.innerHTML = `
      <div class="ms-ai-header">
        <div class="ms-ai-header-left">
          <span>🤖 IA</span>
          <div class="ms-ai-status-dot" id="ms-ai-status-dot"></div>
          <span class="ms-ai-status-label" id="ms-ai-status-label">sem configuracao</span>
        </div>
        <div class="ms-ai-header-right">
          <button class="ms-ai-icon-btn" id="ms-ai-clear-btn" title="Limpar conversa">🗑</button>
          <button class="ms-ai-icon-btn" id="ms-ai-settings-btn" title="Configurar IAs">⚙️</button>
          <button class="ms-ai-icon-btn" id="ms-ai-close-btn" title="Fechar">✕</button>
        </div>
      </div>
      <div class="ms-ai-messages" id="ms-ai-messages">
        <div class="ms-ai-empty" id="ms-ai-empty">
          <div class="ms-ai-empty-icon">🤖</div>
          <h3>Assistente IA</h3>
          <p>Descreva uma ideia e eu crio o mapa.<br>Envie um PDF e eu resumo em mapa mental.<br>Peça edições e eu aplico.</p>
        </div>
      </div>
      <div class="ms-ai-footer">
        <div class="ms-ai-suggestions" id="ms-ai-suggestions">
          <button class="ms-ai-suggestion">Organize meu mapa</button>
          <button class="ms-ai-suggestion">Mapa sobre marketing</button>
          <button class="ms-ai-suggestion">Analise meu projeto</button>
        </div>
        <div class="ms-ai-input-row">
          <button class="ms-ai-pdf-btn" id="ms-ai-pdf-btn" title="Enviar PDF">PDF</button>
          <input type="file" id="ms-ai-pdf-input" accept=".pdf" style="display:none">
          <textarea class="ms-ai-input" id="ms-ai-input" placeholder="Digite ou envie um PDF..." rows="1"></textarea>
          <button class="ms-ai-send" id="ms-ai-send" title="Enviar">➤</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    const settingsModal = document.createElement('div');
    settingsModal.id = 'ms-ai-settings-modal';
    settingsModal.innerHTML = `
      <div class="ms-ai-settings-card">
        <div class="ms-ai-settings-head">
          <strong>⚙️ Configurar IAs — Carrossel Automático</strong>
          <button class="ms-ai-icon-btn" id="ms-ai-settings-close">✕</button>
        </div>
        <div class="ms-ai-settings-body" id="ms-ai-providers-list"></div>
        <div class="ms-ai-settings-footer">
          <button class="ms-ai-btn-secondary" id="ms-ai-settings-cancel">Cancelar</button>
          <button class="ms-ai-btn-primary" id="ms-ai-settings-save">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(settingsModal);
  }

  function buildProviderCards() {
    const s = getSettings();
    const keys = s.keys || {};
    const selectedModels = s.models || {};
    const container = document.getElementById('ms-ai-providers-list');
    if (!container) return;

    const note = `<div class="ms-settings-note">
      <strong>Como funciona o carrossel:</strong> Configure as keys que quiser. A IA tenta cada provider em ordem — quando um atinge o limite ou falha, passa automaticamente pro proximo.<br>
      <strong>Recomendado:</strong> Groq + Gemini (ambos gratuitos) ja dao acesso a muitos modelos.<br>
      <strong>Ollama/LM Studio:</strong> Use se quiser rodar 100% local, sem enviar dados para internet.
    </div>`;

    const cards = PROVIDERS.map(p => {
      const hasKey = !!(keys[p.id]);
      const isOllama = p.type === 'ollama';
      const isCustom = p.type === 'custom';
      const currentModel = selectedModels[p.id] || p.models[0].id;

      const modelOptions = p.models.map(m =>
        `<option value="${m.id}" ${currentModel === m.id ? 'selected' : ''}>${m.name}</option>`
      ).join('');

      const keyLabel = isOllama ? 'URL do servidor (padrão: http://localhost:11434)' :
                       isCustom ? 'URL do endpoint (ex: http://minha-api.com/v1/chat/completions)' :
                       'API Key';
      const endpointField = (isCustom) ? `
        <div style="margin-top:8px;">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">Endpoint URL</div>
          <input class="ms-provider-key-input" type="text" id="ms-endpoint-${p.id}" placeholder="https://..." value="${(s.endpoints || {})[p.id] || ''}" style="font-family:monospace">
        </div>` : '';

      const ollamaNote = isOllama ? `
        <div class="ms-provider-ollama-note">
          Precisa ter o Ollama instalado em <a href="https://ollama.ai" target="_blank" class="ms-provider-link">ollama.ai</a> e o modelo baixado com <code>ollama pull ${p.models[0].id}</code>
        </div>` : '';

      return `
        <div class="ms-provider-card ${hasKey ? 'has-key' : ''}" id="ms-card-${p.id}">
          <div class="ms-provider-header" onclick="(function(){var b=document.getElementById('ms-body-${p.id}');b.classList.toggle('open');if(b.classList.contains('open')){setTimeout(function(){b.scrollIntoView({behavior:'smooth',block:'nearest'});},80);}})()">
            <div class="ms-provider-icon">${p.icon}</div>
            <div class="ms-provider-info">
              <div class="ms-provider-name">
                ${p.name}
                <span class="ms-provider-badge" style="background:${p.badgeColor}">${p.badge}</span>
              </div>
              <div class="ms-provider-desc">${p.description}</div>
            </div>
            <div class="ms-provider-status ${hasKey ? 'ok' : 'empty'}">
              ${hasKey ? '✅' : '○'}
            </div>
          </div>
          <div class="ms-provider-body" id="ms-body-${p.id}">
            <div style="font-size:11px;color:var(--text3);margin-top:10px;margin-bottom:4px;">${keyLabel}</div>
            <div class="ms-provider-key-row">
              <input class="ms-provider-key-input" type="password" id="ms-key-${p.id}"
                placeholder="${p.keyPlaceholder}"
                value="${keys[p.id] || ''}"
                autocomplete="new-password">
              <button class="ms-provider-test-btn" id="ms-test-${p.id}" onclick="window.msTestKey('${p.id}')">Testar</button>
            </div>
            ${endpointField}
            <div style="font-size:11px;color:var(--text3);margin-top:10px;margin-bottom:4px;">Modelo preferido</div>
            <select class="ms-provider-model-select" id="ms-model-${p.id}">${modelOptions}</select>
            ${ollamaNote}
            ${p.keyLink ? `<a class="ms-provider-link" href="${p.keyLink}" target="_blank">Obter key / instalar →</a>` : ''}
            <div id="ms-result-${p.id}" class="ms-provider-test-result"></div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = note + cards;
  }

  function updateStatus() {
    const s = getSettings();
    const keys = s.keys || {};
    const hasAny = PROVIDERS.some(p => keys[p.id]);
    const dot = document.getElementById('ms-ai-status-dot');
    const label = document.getElementById('ms-ai-status-label');
    if (!dot || !label) return;
    if (hasAny) {
      const active = PROVIDERS.filter(p => keys[p.id]).map(p => p.icon + p.name.split(' ')[0]).join(' · ');
      dot.classList.add('active');
      label.textContent = active;
    } else {
      dot.classList.remove('active');
      label.textContent = 'sem configuracao';
    }
  }

  // ── SEND ───────────────────────────────────────────────────────
  function addMessage(role, content, type) {
    const msgs = document.getElementById('ms-ai-messages');
    const empty = document.getElementById('ms-ai-empty');
    if (empty) empty.style.display = 'none';
    document.getElementById('ms-ai-suggestions').style.display = 'none';
    const row = document.createElement('div');
    row.className = `ms-ai-msg-row ${role}`;
    const avatar = document.createElement('div');
    avatar.className = `ms-ai-avatar ${role}`;
    avatar.textContent = role === 'ai' ? '🤖' : '👤';
    const bubble = document.createElement('div');
    bubble.className = `ms-ai-bubble ${type || role}`;
    bubble.textContent = content;
    row.appendChild(avatar);
    row.appendChild(bubble);
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
    return bubble;
  }

  function addTyping() {
    const msgs = document.getElementById('ms-ai-messages');
    const empty = document.getElementById('ms-ai-empty');
    if (empty) empty.style.display = 'none';
    const row = document.createElement('div');
    row.className = 'ms-ai-msg-row ai';
    row.id = 'ms-ai-typing';
    row.innerHTML = `<div class="ms-ai-avatar ai">🤖</div><div class="ms-ai-bubble ai"><div class="ms-ai-typing"><span></span><span></span><span></span></div></div>`;
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('ms-ai-typing');
    if (el) el.remove();
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    const s = getSettings();
    const keys = s.keys || {};
    const hasAny = PROVIDERS.some(p => keys[p.id]);
    if (!hasAny) {
      addMessage('ai', 'Configure pelo menos uma API key clicando em ⚙️.', 'error');
      return;
    }

    addMessage('user', text);
    addTyping();

    const input = document.getElementById('ms-ai-input');
    const sendBtn = document.getElementById('ms-ai-send');
    input.disabled = true;
    sendBtn.disabled = true;

    const snapshot = getSnapshot();
    const chat = getChat();
    chat.push({ role: 'user', content: text });

    try {
      const res = await fetch('/api/ai-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keys: s.keys || {},
          models: s.models || {},
          endpoints: s.endpoints || {},
          prompt: text,
          payload: snapshot,
          history: chat.slice(-10)
        })
      });

      const data = await res.json().catch(() => ({}));
      removeTyping();

      if (!res.ok) {
        addMessage('ai', '❌ ' + (data.error || 'Erro ao chamar a IA.'), 'error');
        return;
      }

      const reply = data.text || '';
      addMessage('ai', reply);

      if (data.provider) {
        const label = document.getElementById('ms-ai-status-label');
        if (label) label.textContent = data.provider;
      }

      chat.push({ role: 'assistant', content: reply });
      saveChat(chat);

      if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
        applyActions(data.actions);
        const count = data.actions.length;
        addMessage('ai', 'Apliquei ' + count + (count === 1 ? ' alteracao' : ' alteracoes') + ' no seu mapa.', 'action');
      }
    } catch (err) {
      removeTyping();
      addMessage('ai', '❌ Erro de conexao: ' + err.message, 'error');
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // ── WIRE ───────────────────────────────────────────────────────
  function wire() {
    const btn = document.getElementById('ms-ai-btn');
    const panel = document.getElementById('ms-ai-panel');

    btn.addEventListener('click', () => panel.classList.toggle('show'));
    document.getElementById('ms-ai-close-btn').addEventListener('click', () => panel.classList.remove('show'));

    document.getElementById('ms-ai-clear-btn').addEventListener('click', () => {
      saveChat([]);
      const msgs = document.getElementById('ms-ai-messages');
      msgs.innerHTML = `<div class="ms-ai-empty" id="ms-ai-empty"><div class="ms-ai-empty-icon">🤖</div><h3>Assistente IA</h3><p>Descreva uma ideia e eu crio o mapa.<br>Envie um PDF e eu resumo.<br>Peça edições e eu aplico.</p></div>`;
      document.getElementById('ms-ai-suggestions').style.display = 'flex';
    });

    document.getElementById('ms-ai-settings-btn').addEventListener('click', () => {
      buildProviderCards();
      document.getElementById('ms-ai-settings-modal').classList.add('show');
    });

    const closeModal = () => document.getElementById('ms-ai-settings-modal').classList.remove('show');
    document.getElementById('ms-ai-settings-close').addEventListener('click', closeModal);
    document.getElementById('ms-ai-settings-cancel').addEventListener('click', closeModal);

    document.getElementById('ms-ai-settings-save').addEventListener('click', () => {
      const s = getSettings();
      const keys = {};
      const models = {};
      const endpoints = {};
      for (const p of PROVIDERS) {
        const keyEl = document.getElementById('ms-key-' + p.id);
        const modelEl = document.getElementById('ms-model-' + p.id);
        const endpointEl = document.getElementById('ms-endpoint-' + p.id);
        if (keyEl && keyEl.value.trim()) keys[p.id] = keyEl.value.trim();
        if (modelEl) models[p.id] = modelEl.value;
        if (endpointEl && endpointEl.value.trim()) endpoints[p.id] = endpointEl.value.trim();
      }
      saveSettings({ keys, models, endpoints });
      updateStatus();
      closeModal();
    });

    // Test key
    window.msTestKey = async function(providerId) {
      const p = PROVIDERS.find(x => x.id === providerId);
      if (!p) return;
      const keyEl = document.getElementById('ms-key-' + p.id);
      const modelEl = document.getElementById('ms-model-' + p.id);
      const testBtn = document.getElementById('ms-test-' + p.id);
      const resultEl = document.getElementById('ms-result-' + p.id);
      const key = keyEl ? keyEl.value.trim() : '';
      const model = modelEl ? modelEl.value : p.models[0].id;

      if (!key && p.type !== 'ollama') { resultEl.className = 'ms-provider-test-result error'; resultEl.textContent = 'Cole a key antes de testar.'; return; }
      testBtn.disabled = true; testBtn.textContent = 'Testando...';
      resultEl.className = 'ms-provider-test-result'; resultEl.textContent = '';

      try {
        let ok = false, errMsg = '';
        if (p.type === 'gemini') {
          const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key;
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'OK' }] }], generationConfig: { maxOutputTokens: 3 } }) });
          const d = await r.json().catch(() => ({}));
          ok = r.ok && !!d.candidates;
          errMsg = (d.error && d.error.message) || 'Erro desconhecido';
        } else if (p.type === 'ollama') {
          const base = key || 'http://localhost:11434';
          const r = await fetch(base + '/api/tags');
          ok = r.ok;
          errMsg = 'Ollama nao esta rodando em ' + base;
        } else if (p.type === 'cohere') {
          const r = await fetch('https://api.cohere.com/v1/chat', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, message: 'OK', max_tokens: 3 }) });
          ok = r.ok;
          const d = await r.json().catch(() => ({}));
          errMsg = (d.message) || 'Erro desconhecido';
        } else if (p.type === 'anthropic') {
          const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 3, messages: [{ role: 'user', content: 'OK' }] }) });
          const d = await r.json().catch(() => ({}));
          ok = r.ok && !!d.content;
          errMsg = (d.error && d.error.message) || 'Erro desconhecido';
        } else {
          // openai-compat: groq, openai, openrouter, deepseek, mistral, custom
          const ENDPOINTS = {
            groq:       'https://api.groq.com/openai/v1/chat/completions',
            openai:     'https://api.openai.com/v1/chat/completions',
            openrouter: 'https://openrouter.ai/api/v1/chat/completions',
            deepseek:   'https://api.deepseek.com/v1/chat/completions',
            mistral:    'https://api.mistral.ai/v1/chat/completions',
          };
          const endpointEl = document.getElementById('ms-endpoint-' + p.id);
          const ep = (endpointEl && endpointEl.value.trim()) || ENDPOINTS[p.id] || p.endpoint || 'https://api.openai.com/v1/chat/completions';
          const r = await fetch(ep, { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'user', content: 'OK' }], max_tokens: 3 }) });
          const d = await r.json().catch(() => ({}));
          ok = r.ok && (!!d.choices || !!d.content);
          errMsg = (d.error && d.error.message) || 'Erro desconhecido';
        }
        resultEl.className = 'ms-provider-test-result ' + (ok ? 'ok' : 'error');
        resultEl.textContent = ok ? '✅ Conexao OK! Key valida.' : '❌ ' + errMsg;
        if (ok) {
          const card = document.getElementById('ms-card-' + p.id);
          if (card) card.classList.add('has-key');
          const st = card && card.querySelector('.ms-provider-status');
          if (st) { st.className = 'ms-provider-status ok'; st.textContent = '✅'; }
        }
      } catch (err) {
        resultEl.className = 'ms-provider-test-result error';
        resultEl.textContent = '❌ ' + err.message;
      } finally {
        testBtn.disabled = false; testBtn.textContent = 'Testar';
      }
    };

    // Suggestions
    document.getElementById('ms-ai-suggestions').addEventListener('click', (e) => {
      const b = e.target.closest('.ms-ai-suggestion');
      if (!b) return;
      sendMessage(b.textContent);
    });

    // Send
    const input = document.getElementById('ms-ai-input');
    const sendBtn = document.getElementById('ms-ai-send');
    sendBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = ''; input.style.height = 'auto';
      sendMessage(text);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = ''; input.style.height = 'auto';
        sendMessage(text);
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // PDF
    const pdfBtn = document.getElementById('ms-ai-pdf-btn');
    const pdfInput = document.getElementById('ms-ai-pdf-input');
    if (pdfBtn && pdfInput) {
      pdfBtn.addEventListener('click', () => pdfInput.click());
      pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        pdfInput.value = '';
        addMessage('ai', 'Lendo "' + file.name + '"... aguarde.', 'action');
        try {
          if (!window.pdfjsLib) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
              script.onload = resolve;
              script.onerror = () => reject(new Error('Falha ao carregar pdf.js'));
              document.head.appendChild(script);
            });
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
          const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
          let fullText = '';
          const maxPages = Math.min(pdf.numPages, 20);
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const tc = await page.getTextContent();
            fullText += tc.items.map(function(item) { return item.str; }).join(' ') + ' ';
          }
          if (!fullText.trim()) {
            addMessage('ai', 'PDF sem texto. Pode ser um PDF escaneado (so imagem).', 'error');
            return;
          }
          const truncated = fullText.length > 8000;
          const prompt = [
            'Analise este documento PDF "' + file.name + '" e crie um MAPA MENTAL COMPLETO e ORGANIZADO no canvas.',
            '',
            'INSTRUCOES OBRIGATORIAS:',
            '1. Identifique o tema central do documento',
            '2. Extraia 5-7 CATEGORIAS PRINCIPAIS (topicos, capitulos, areas-chave)',
            '3. Para cada categoria, identifique 2-4 SUBCATEGORIAS ou pontos importantes',
            '4. Crie pelo menos 15 nos no total',
            '5. Use o layout ARVORE HIERARQUICA ou MAPA RADIAL conforme o conteudo',
            '6. Cada no deve ter um resumo real do conteudo (nao deixe "note" vazio)',
            '7. Use cores diferentes para cada categoria principal',
            '8. Conecte todos os nos adequadamente',
            '',
            '=== CONTEUDO DO DOCUMENTO ===',
            fullText.slice(0, 8000) + (truncated ? '\n[documento truncado — resuma o que foi lido]' : ''),
          ].join('\n');
          addMessage('user', '[PDF] ' + file.name);
          await sendMessage(prompt);
        } catch (err) {
          addMessage('ai', 'Erro ao ler PDF: ' + err.message, 'error');
        }
      });
    }

    // Drag
    const header = panel.querySelector('.ms-ai-header');
    let dragging = false, ox = 0, oy = 0;
    header.style.cursor = 'grab';
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      ox = e.clientX - rect.left; oy = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      panel.style.left = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - ox)) + 'px';
      panel.style.top = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, e.clientY - oy)) + 'px';
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; header.style.cursor = 'grab'; });

    updateStatus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    injectUI();
    wire();
  });
})();
