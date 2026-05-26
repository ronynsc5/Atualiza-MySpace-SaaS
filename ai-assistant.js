/* MySpace v4.0 - IA Assistant
   Chat limpo com IA. Configuração nas settings. A IA pode criar, editar e organizar o mapa. */
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
    try { if (window.MySpace && typeof window.MySpace.snapshot === 'function') return window.MySpace.snapshot(); } catch (_) { }
    for (const k of ['myspace-v3', 'myspace-v2']) {
      try { const r = localStorage.getItem(k); if (r) return JSON.parse(r); } catch (_) { }
    }
    return null;
  }

  function applyActions(actions) {
    if (!Array.isArray(actions)) return;

    // Pega o workspace atual
    const snap = window.MySpace && typeof window.MySpace.snapshot === 'function'
      ? window.MySpace.snapshot() : null;
    if (!snap) return;

    const currentLevel = snap.currentLevel || 'root';
    const workspace = snap.workspaces && snap.workspaces[currentLevel];
    if (!workspace) return;

    const nodes = workspace.nodes || [];
    const connections = workspace.connections || [];

    for (const action of actions) {
      if (action.type === 'create_node') {
        const id = 'ai_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        const x = action.x !== undefined ? action.x : (200 + Math.random() * 400);
        const y = action.y !== undefined ? action.y : (200 + Math.random() * 300);
        const newNode = {
          id, type: action.node_type || 'card',
          x, y, width: 200, height: 120,
          title: action.title || 'Novo nó',
          note: action.note || '',
          bgColor: action.color || '#ffffff',
          bgOpacity: 1, borderColor: '#e0e0dd', borderWidth: 1.5,
          textColor: '#1a1a18', textSize: 13, textBold: true,
          cornerRadius: 18, stylePreset: 'clean', opacity: 1,
          children: [], projectId: currentLevel,
          created: new Date().toISOString(), modified: new Date().toISOString()
        };
        nodes.push(newNode);
      } else if (action.type === 'update_node') {
        const node = nodes.find(n => String(n.id) === String(action.id));
        if (node) {
          if (action.title !== undefined) node.title = action.title;
          if (action.note !== undefined) node.note = action.note;
          if (action.color !== undefined) node.bgColor = action.color;
          if (action.x !== undefined) node.x = action.x;
          if (action.y !== undefined) node.y = action.y;
          node.modified = new Date().toISOString();
        }
      } else if (action.type === 'delete_node') {
        const idx = nodes.findIndex(n => String(n.id) === String(action.id));
        if (idx >= 0) nodes.splice(idx, 1);
        for (let i = connections.length - 1; i >= 0; i--) {
          if (String(connections[i].from) === String(action.id) || String(connections[i].to) === String(action.id)) {
            connections.splice(i, 1);
          }
        }
      } else if (action.type === 'create_connection') {
        connections.push({
          id: 'ac_' + Date.now(), from: action.from, to: action.to,
          style: action.style || 'curved', label: action.label || '',
          color: '#888', width: 1.5, arrow: 'end'
        });
      }
    }

    workspace.nodes = nodes;
    workspace.connections = connections;

    // Salva via commit + saveNow
    try {
      if (window.MySpace && typeof window.MySpace.commit === 'function') {
        window.MySpace.commit('ai-action');
      }
      if (window.MySpace && typeof window.MySpace.saveNow === 'function') {
        window.MySpace.saveNow().catch(() => {});
      }
      if (window.MySpace && typeof window.MySpace.redraw === 'function') {
        window.MySpace.redraw();
      }
      if (typeof draw === 'function') setTimeout(draw, 100);
    } catch(e) {
      console.warn('[AI] applyActions error:', e);
    }
  }

  function injectStyles() {
    const css = document.createElement('style');
    css.textContent = `
      #ms-ai-btn {
        position: fixed; right: 18px; bottom: 80px; z-index: 2600;
        width: 48px; height: 48px; border-radius: 50%; border: none;
        background: var(--accent); color: var(--bg);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; box-shadow: 0 4px 20px var(--shadow2);
        transition: transform 0.15s, box-shadow 0.15s; font-size: 22px;
      }
      #ms-ai-btn:hover { transform: scale(1.08); box-shadow: 0 8px 28px var(--shadow2); }

      #ms-ai-panel {
        position: fixed; right: 18px; bottom: 140px; z-index: 2599;
        width: 420px; height: 620px; border-radius: 18px;
        background: var(--bg); border: 1px solid var(--border);
        box-shadow: 0 12px 48px var(--shadow2);
        display: none; flex-direction: column;
        font-family: 'Inter', system-ui, sans-serif;
        overflow: hidden; cursor: default;
        resize: both;
      }
      #ms-ai-panel.show { display: flex; }

      .ms-ai-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; border-bottom: 1px solid var(--border);
        background: var(--bg2);
      }
      .ms-ai-header-left { display: flex; align-items: center; gap: 8px; }
      .ms-ai-header-left span { font-size: 15px; font-weight: 700; color: var(--text); }
      .ms-ai-header-left small { font-size: 11px; color: var(--text3); background: var(--bg3); padding: 2px 7px; border-radius: 999px; }
      .ms-ai-header-right { display: flex; gap: 6px; }
      .ms-ai-icon-btn { border: none; background: transparent; color: var(--text3); cursor: pointer; padding: 4px; border-radius: 7px; font-size: 16px; transition: background 0.1s; }
      .ms-ai-icon-btn:hover { background: var(--bg3); color: var(--text); }

      .ms-ai-messages {
        flex: 1; overflow-y: auto; padding: 14px 14px 8px;
        display: flex; flex-direction: column; gap: 10px;
        scrollbar-width: thin; scrollbar-color: var(--border) transparent;
      }
      .ms-ai-msg-row { display: flex; gap: 8px; }
      .ms-ai-msg-row.user { flex-direction: row-reverse; }
      .ms-ai-avatar {
        width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 700;
      }
      .ms-ai-avatar.ai { background: var(--accent); color: var(--bg); }
      .ms-ai-avatar.user { background: var(--bg3); color: var(--text); font-size: 12px; }
      .ms-ai-bubble {
        max-width: 82%; padding: 9px 12px; border-radius: 14px;
        font-size: 13px; line-height: 1.5; color: var(--text);
      }
      .ms-ai-bubble.ai { background: var(--bg2); border-bottom-left-radius: 4px; }
      .ms-ai-bubble.user { background: var(--accent); color: var(--bg); border-bottom-right-radius: 4px; }
      .ms-ai-bubble.error { background: #fee2e2; color: #dc2626; }
      .ms-ai-bubble.action { background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; font-size: 12px; }
      .ms-ai-action-tag { display: inline-block; background: var(--accent); color: var(--bg); border-radius: 5px; padding: 1px 6px; font-size: 11px; font-weight: 700; margin-right: 4px; }

      .ms-ai-typing { display: flex; gap: 4px; align-items: center; padding: 10px 12px; }
      .ms-ai-typing span { width: 6px; height: 6px; background: var(--text3); border-radius: 50%; animation: ms-bounce 1.2s infinite; }
      .ms-ai-typing span:nth-child(2) { animation-delay: 0.2s; }
      .ms-ai-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes ms-bounce { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)} }

      .ms-ai-footer { padding: 10px 12px; border-top: 1px solid var(--border); background: var(--bg); }
      .ms-ai-input-row { display: flex; gap: 8px; align-items: flex-end; }
      .ms-ai-input {
        flex: 1; border: 1px solid var(--border); background: var(--bg2);
        color: var(--text); border-radius: 12px; padding: 9px 12px;
        font-family: inherit; font-size: 13px; resize: none; outline: none;
        max-height: 100px; min-height: 38px; line-height: 1.4;
        transition: border-color 0.15s;
      }
      .ms-ai-input:focus { border-color: var(--accent); background: var(--bg); }
      .ms-ai-send {
        width: 36px; height: 36px; border-radius: 10px; border: none;
        background: var(--accent); color: var(--bg);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; flex-shrink: 0; font-size: 16px;
        transition: opacity 0.15s;
      }
      .ms-ai-send:disabled { opacity: 0.4; cursor: not-allowed; }

      .ms-ai-suggestions { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
      .ms-ai-suggestion {
        font-size: 11px; padding: 4px 10px; border-radius: 999px;
        border: 1px solid var(--border); background: var(--bg2);
        color: var(--text2); cursor: pointer; transition: all 0.1s;
      }
      .ms-ai-suggestion:hover { background: var(--bg3); color: var(--text); }

      .ms-ai-empty {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 8px; color: var(--text3); padding: 20px;
        text-align: center;
      }
      .ms-ai-empty-icon { font-size: 36px; }
      .ms-ai-empty h3 { font-size: 14px; font-weight: 700; color: var(--text2); margin: 0; }
      .ms-ai-empty p { font-size: 12px; margin: 0; line-height: 1.5; }

      /* Settings modal */
      #ms-ai-settings-modal {
        position: fixed; inset: 0; z-index: 5300;
        background: rgba(0,0,0,0.4); display: none;
        align-items: center; justify-content: center; padding: 20px;
      }
      #ms-ai-settings-modal.show { display: flex; }
      .ms-ai-settings-card {
        width: min(440px, 100%); background: var(--bg);
        border: 1px solid var(--border); border-radius: 18px;
        box-shadow: 0 20px 60px var(--shadow2);
        font-family: 'Inter', system-ui, sans-serif;
        overflow: hidden;
      }
      .ms-ai-settings-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; border-bottom: 1px solid var(--border);
        background: var(--bg2);
      }
      .ms-ai-settings-head strong { font-size: 16px; font-weight: 700; color: var(--text); }
      .ms-ai-settings-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
      .ms-ai-settings-field label {
        display: block; font-size: 11px; font-weight: 700;
        color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;
      }
      .ms-ai-settings-field input, .ms-ai-settings-field select {
        width: 100%; border: 1px solid var(--border); background: var(--bg2);
        color: var(--text); border-radius: 10px; padding: 10px 12px;
        font-family: inherit; font-size: 13px; outline: none; box-sizing: border-box;
      }
      .ms-ai-settings-field input:focus { border-color: var(--accent); }
      .ms-ai-settings-hint { font-size: 11px; color: var(--text3); margin-top: 4px; }
      .ms-ai-settings-hint a { color: var(--accent); text-decoration: none; }
      .ms-ai-settings-hint a:hover { text-decoration: underline; }
      .ms-ai-settings-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end; }
      .ms-ai-btn-primary { border: none; background: var(--accent); color: var(--bg); border-radius: 10px; padding: 10px 18px; font-weight: 700; font-size: 13px; cursor: pointer; }
      .ms-ai-btn-secondary { border: 1px solid var(--border); background: transparent; color: var(--text); border-radius: 10px; padding: 10px 18px; font-weight: 600; font-size: 13px; cursor: pointer; }

      .ms-ai-provider-list { display: flex; flex-direction: column; gap: 6px; }
      .ms-ai-provider { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg2); cursor: pointer; transition: background 0.1s; }
      .ms-ai-provider:hover { background: var(--bg3); }
      .ms-ai-provider.active { border-color: var(--accent); }
      .ms-ai-provider-name { font-size: 13px; font-weight: 600; color: var(--text); }
      .ms-ai-provider-link { font-size: 11px; color: var(--text3); }
    `;
    document.head.appendChild(css);
  }

  const PROVIDERS = [
    { id: 'groq', name: 'Groq (Grátis)', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', link: 'https://console.groq.com/keys' },
    { id: 'openai', name: 'OpenAI (ChatGPT)', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', link: 'https://platform.openai.com/api-keys' },
    { id: 'anthropic', name: 'Anthropic (Claude)', endpoint: 'https://api.anthropic.com/v1/messages', model: 'claude-3-haiku-20240307', link: 'https://console.anthropic.com/settings/api-keys' },
    { id: 'gemini', name: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash', link: 'https://aistudio.google.com/apikey' },
    { id: 'custom', name: 'Outro (OpenAI compatível)', endpoint: '', model: '', link: '' },
  ];

  function injectUI() {
    // Botão flutuante
    const btn = document.createElement('button');
    btn.id = 'ms-ai-btn';
    btn.innerHTML = '🤖';
    btn.title = 'Assistente IA';
    document.body.appendChild(btn);

    // Painel de chat
    const panel = document.createElement('div');
    panel.id = 'ms-ai-panel';
    panel.innerHTML = `
      <div class="ms-ai-header">
        <div class="ms-ai-header-left">
          <span>🤖 IA</span>
          <small id="ms-ai-provider-tag">não configurada</small>
        </div>
        <div class="ms-ai-header-right">
          <button class="ms-ai-icon-btn" id="ms-ai-clear-btn" title="Limpar conversa">🗑</button>
          <button class="ms-ai-icon-btn" id="ms-ai-settings-btn" title="Configurar IA">⚙️</button>
          <button class="ms-ai-icon-btn" id="ms-ai-close-btn" title="Fechar">✕</button>
        </div>
      </div>
      <div class="ms-ai-messages" id="ms-ai-messages">
        <div class="ms-ai-empty" id="ms-ai-empty">
          <div class="ms-ai-empty-icon">🤖</div>
          <h3>Assistente IA</h3>
          <p>Descreva uma ideia e eu crio o mapa.<br>Cole uma conversa e eu organizo.<br>Peça edições e eu aplico.</p>
        </div>
      </div>
      <div class="ms-ai-footer">
        <div class="ms-ai-suggestions" id="ms-ai-suggestions">
          <button class="ms-ai-suggestion">Organize meu mapa</button>
          <button class="ms-ai-suggestion">Crie um mapa sobre marketing</button>
          <button class="ms-ai-suggestion">Analise meu projeto</button>
        </div>
        <div class="ms-ai-input-row">
          <textarea class="ms-ai-input" id="ms-ai-input" placeholder="Digite sua mensagem..." rows="1"></textarea>
          <button class="ms-ai-send" id="ms-ai-send" title="Enviar">➤</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Modal de configurações
    const settingsModal = document.createElement('div');
    settingsModal.id = 'ms-ai-settings-modal';
    const s = getSettings();
    settingsModal.innerHTML = `
      <div class="ms-ai-settings-card">
        <div class="ms-ai-settings-head">
          <strong>⚙️ Configurar IA</strong>
          <button class="ms-ai-icon-btn" id="ms-ai-settings-close">✕</button>
        </div>
        <div class="ms-ai-settings-body">
          <div class="ms-ai-settings-field">
            <label>Provedor de IA</label>
            <div class="ms-ai-provider-list" id="ms-ai-provider-list">
              ${PROVIDERS.map(p => `
                <div class="ms-ai-provider ${s.providerId === p.id ? 'active' : ''}" data-id="${p.id}" data-endpoint="${p.endpoint}" data-model="${p.model}">
                  <span class="ms-ai-provider-name">${p.name}</span>
                  ${p.link ? `<a class="ms-ai-provider-link" href="${p.link}" target="_blank" onclick="event.stopPropagation()">Obter chave →</a>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          <div class="ms-ai-settings-field" id="ms-ai-custom-endpoint-field" style="${s.providerId === 'custom' ? '' : 'display:none'}">
            <label>Endpoint</label>
            <input id="ms-ai-endpoint" placeholder="https://api.openai.com/v1/chat/completions" value="${s.endpoint || ''}">
          </div>
          <div class="ms-ai-settings-field" id="ms-ai-custom-model-field" style="${s.providerId === 'custom' ? '' : 'display:none'}">
            <label>Modelo</label>
            <input id="ms-ai-model" placeholder="gpt-4o-mini" value="${s.model || ''}">
          </div>
          <div class="ms-ai-settings-field">
            <label>API Key</label>
            <input id="ms-ai-key" type="password" placeholder="Cole sua chave aqui" value="${s.apiKey || ''}">
            <div class="ms-ai-settings-hint">Sua chave fica salva só no seu navegador. Nunca é enviada para nossos servidores.</div>
          </div>
        </div>
        <div class="ms-ai-settings-footer">
          <button class="ms-ai-btn-secondary" id="ms-ai-settings-cancel">Cancelar</button>
          <button class="ms-ai-btn-primary" id="ms-ai-settings-save">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(settingsModal);
  }

  function updateProviderTag() {
    const s = getSettings();
    const tag = document.getElementById('ms-ai-provider-tag');
    if (!tag) return;
    const provider = PROVIDERS.find(p => p.id === s.providerId);
    tag.textContent = s.apiKey ? (provider ? provider.name.split('(')[0].trim() : 'Configurada') : 'não configurada';
  }

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
    row.innerHTML = `
      <div class="ms-ai-avatar ai">🤖</div>
      <div class="ms-ai-bubble ai"><div class="ms-ai-typing"><span></span><span></span><span></span></div></div>
    `;
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
    if (!s.apiKey) {
      addMessage('ai', '⚙️ Configure sua API key clicando no botão de configurações.', 'error');
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
          endpoint: s.endpoint,
          model: s.model,
          apiKey: s.apiKey,
          providerId: s.providerId,
          task: 'chat',
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
      chat.push({ role: 'assistant', content: reply });
      saveChat(chat);

      // Aplica ações se a IA retornou
      if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
        applyActions(data.actions);
        const count = data.actions.length;
        addMessage('ai', `✅ Apliquei ${count} ${count === 1 ? 'alteração' : 'alterações'} no seu mapa.`, 'action');
      }

    } catch (err) {
      removeTyping();
      addMessage('ai', '❌ Erro de conexão: ' + err.message, 'error');
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function wire() {
    const btn = document.getElementById('ms-ai-btn');
    const panel = document.getElementById('ms-ai-panel');
    const closeBtn = document.getElementById('ms-ai-close-btn');
    const clearBtn = document.getElementById('ms-ai-clear-btn');
    const settingsBtn = document.getElementById('ms-ai-settings-btn');
    const settingsModal = document.getElementById('ms-ai-settings-modal');
    const settingsClose = document.getElementById('ms-ai-settings-close');
    const settingsCancel = document.getElementById('ms-ai-settings-cancel');
    const settingsSave = document.getElementById('ms-ai-settings-save');
    const input = document.getElementById('ms-ai-input');
    const sendBtn = document.getElementById('ms-ai-send');
    const providerList = document.getElementById('ms-ai-provider-list');

    btn.addEventListener('click', () => panel.classList.toggle('show'));
    closeBtn.addEventListener('click', () => panel.classList.remove('show'));

    clearBtn.addEventListener('click', () => {
      saveChat([]);
      const msgs = document.getElementById('ms-ai-messages');
      msgs.innerHTML = `
        <div class="ms-ai-empty" id="ms-ai-empty">
          <div class="ms-ai-empty-icon">🤖</div>
          <h3>Assistente IA</h3>
          <p>Descreva uma ideia e eu crio o mapa.<br>Cole uma conversa e eu organizo.<br>Peça edições e eu aplico.</p>
        </div>
      `;
      document.getElementById('ms-ai-suggestions').style.display = 'flex';
    });

    settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));
    settingsClose.addEventListener('click', () => settingsModal.classList.remove('show'));
    settingsCancel.addEventListener('click', () => settingsModal.classList.remove('show'));

    // Selecionar provedor
    let selectedProvider = getSettings().providerId || null;
    providerList.addEventListener('click', (e) => {
      const item = e.target.closest('.ms-ai-provider');
      if (!item) return;
      providerList.querySelectorAll('.ms-ai-provider').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      selectedProvider = item.dataset.id;
      const isCustom = selectedProvider === 'custom';
      document.getElementById('ms-ai-custom-endpoint-field').style.display = isCustom ? '' : 'none';
      document.getElementById('ms-ai-custom-model-field').style.display = isCustom ? '' : 'none';
    });

    settingsSave.addEventListener('click', () => {
      const provider = PROVIDERS.find(p => p.id === selectedProvider);
      const s = {
        providerId: selectedProvider,
        endpoint: selectedProvider === 'custom' ? document.getElementById('ms-ai-endpoint').value.trim() : (provider?.endpoint || ''),
        model: selectedProvider === 'custom' ? document.getElementById('ms-ai-model').value.trim() : (provider?.model || ''),
        apiKey: document.getElementById('ms-ai-key').value.trim()
      };
      saveSettings(s);
      updateProviderTag();
      settingsModal.classList.remove('show');
    });

    // Sugestões rápidas
    document.getElementById('ms-ai-suggestions').addEventListener('click', (e) => {
      const btn = e.target.closest('.ms-ai-suggestion');
      if (!btn) return;
      input.value = btn.textContent;
      sendMessage(btn.textContent);
      input.value = '';
    });

    // Enviar mensagem
    sendBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      input.style.height = 'auto';
      sendMessage(text);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        input.style.height = 'auto';
        sendMessage(text);
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    updateProviderTag();

    // Drag functionality
    const header = panel.querySelector('.ms-ai-header');
    let dragging = false, ox = 0, oy = 0;
    header.style.cursor = 'grab';
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      ox = e.clientX - rect.left;
      oy = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - ox));
      const y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, e.clientY - oy));
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; header.style.cursor = 'grab'; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    injectUI();
    wire();
  });
})();
