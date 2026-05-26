/* MySpace v3.15 - IA Assistant BYOK
   O usuário informa a própria chave/API/modelo na interface. A chave fica no navegador e só é enviada para /api/ai-proxy quando usada. */
(function(){
  'use strict';
  const STORAGE_KEY = 'myspace-ai-settings';
  const LOG_KEY = 'myspace-ai-last-output';

  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function getSettings(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(_) { return {}; } }
  function setSettings(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s || {})); }
  function getSnapshot(){
    try { if (window.MySpace && typeof window.MySpace.snapshot === 'function') return window.MySpace.snapshot(); } catch(_) {}
    for (const k of ['myspace-v3','myspace-v2','mymind-v3','mymind-v2']) {
      try { const raw = localStorage.getItem(k); if (raw) return JSON.parse(raw); } catch(_) {}
    }
    return null;
  }
  function saveSnapshot(payload){
    if (!payload || typeof payload !== 'object') throw new Error('Payload inválido.');
    localStorage.setItem('myspace-v3', JSON.stringify(payload));
    localStorage.setItem('myspace-v2', JSON.stringify(payload));
    localStorage.setItem('mymind-v3', JSON.stringify(payload));
    localStorage.setItem('mymind-v2', JSON.stringify(payload));
  }
  function patchPayloadWithCorrections(payload, corrections){
    if (!payload || !Array.isArray(corrections)) return payload;
    const clone = JSON.parse(JSON.stringify(payload));
    const map = new Map(corrections.map(n => [String(n.id), n]));
    const patchNodes = (nodes) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        const corr = map.get(String(node.id));
        if (corr) {
          if (typeof corr.title === 'string') node.title = corr.title.slice(0, 200);
          if (typeof corr.note === 'string') node.note = corr.note.slice(0, 4000);
        }
        if (node.children) patchNodes(node.children);
      }
    };
    patchNodes(clone.nodes || clone.cards || []);
    return clone;
  }
  function inject(){
    const css = document.createElement('style');
    css.textContent = `
      #ms-ai-btn{position:fixed;right:14px;bottom:78px;z-index:2600;border:0;border-radius:999px;background:var(--accent,#1a1a18);color:var(--bg,#fff);padding:12px 16px;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,.18);cursor:pointer;display:flex;align-items:center;gap:8px;}
      #ms-ai-modal{position:fixed;inset:0;z-index:5200;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:18px;font-family:Inter,system-ui,sans-serif;}
      #ms-ai-modal.show{display:flex}.ms-ai-card{width:min(720px,100%);max-height:90vh;overflow:auto;background:var(--bg,#fff);color:var(--text,#1a1a18);border:1px solid var(--border,#ddd);border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.28);}
      .ms-ai-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border,#ddd)}.ms-ai-head strong{font-size:18px}.ms-ai-close{border:0;background:transparent;font-size:22px;color:var(--text2,#555);cursor:pointer}
      .ms-ai-body{padding:18px 20px}.ms-ai-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:720px){.ms-ai-grid{grid-template-columns:1fr}}
      .ms-ai-field label{display:block;font-size:12px;font-weight:800;color:var(--text3,#777);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em}.ms-ai-field input,.ms-ai-field select,.ms-ai-field textarea{width:100%;border:1px solid var(--border,#ddd);background:var(--bg2,#f7f7f7);color:var(--text,#111);border-radius:12px;padding:11px 12px;font-family:inherit;font-size:13px;outline:none}.ms-ai-field textarea{min-height:110px;resize:vertical}.ms-ai-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.ms-ai-primary,.ms-ai-secondary{border:0;border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer}.ms-ai-primary{background:var(--accent,#111);color:var(--bg,#fff)}.ms-ai-secondary{background:var(--bg2,#eee);color:var(--text,#111);border:1px solid var(--border,#ddd)}.ms-ai-msg{font-size:13px;margin-top:12px;color:var(--text2,#555);line-height:1.45}.ms-ai-output{white-space:pre-wrap;background:var(--bg2,#f7f7f7);border:1px solid var(--border,#ddd);border-radius:12px;padding:12px;margin-top:12px;max-height:220px;overflow:auto;font-size:13px;line-height:1.45}
    `;
    document.head.appendChild(css);
    const btn = document.createElement('button');
    btn.id = 'ms-ai-btn';
    btn.innerHTML = '✨ IA';
    document.body.appendChild(btn);
    const modal = document.createElement('div');
    modal.id = 'ms-ai-modal';
    const s = getSettings();
    modal.innerHTML = `
      <div class="ms-ai-card">
        <div class="ms-ai-head"><strong>IA do MySpace</strong><button class="ms-ai-close" id="ms-ai-close">×</button></div>
        <div class="ms-ai-body">
          <div class="ms-ai-grid">
            <div class="ms-ai-field"><label>Endpoint compatível</label><input id="ms-ai-endpoint" placeholder="https://api.openai.com/v1/chat/completions" value="${esc(s.endpoint || 'https://api.openai.com/v1/chat/completions')}"></div>
            <div class="ms-ai-field"><label>Modelo</label><input id="ms-ai-model" placeholder="gpt-4.1-mini" value="${esc(s.model || 'gpt-4.1-mini')}"></div>
            <div class="ms-ai-field" style="grid-column:1/-1"><label>API Key do usuário</label><input id="ms-ai-key" type="password" placeholder="Cole sua chave aqui" value="${esc(s.apiKey || '')}"></div>
            <div class="ms-ai-field" style="grid-column:1/-1"><label>Pedido para a IA</label><textarea id="ms-ai-prompt" placeholder="Ex: Corrija os textos dos cards, deixe mais claro e profissional, sem mudar o sentido."></textarea></div>
          </div>
          <div class="ms-ai-actions">
            <button class="ms-ai-primary" id="ms-ai-chat">Conversar / analisar</button>
            <button class="ms-ai-secondary" id="ms-ai-correct">Corrigir textos do projeto</button>
            <button class="ms-ai-secondary" id="ms-ai-apply">Aplicar última correção</button>
            <button class="ms-ai-secondary" id="ms-ai-save">Salvar config</button>
          </div>
          <div class="ms-ai-msg" id="ms-ai-msg">A chave não fica no código. Ela é guardada no navegador do usuário.</div>
          <div class="ms-ai-output" id="ms-ai-output"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  function readForm(){
    return { endpoint: $('ms-ai-endpoint').value.trim(), model: $('ms-ai-model').value.trim(), apiKey: $('ms-ai-key').value.trim() };
  }
  function msg(t){ const el=$('ms-ai-msg'); if(el) el.textContent=t; }
  function out(t){ const el=$('ms-ai-output'); if(el) el.textContent=t || ''; }
  async function callAI(task){
    const settings = readForm(); setSettings(settings);
    if (!settings.endpoint || !settings.model || !settings.apiKey) throw new Error('Preencha endpoint, modelo e API key.');
    const prompt = $('ms-ai-prompt').value.trim();
    const payload = getSnapshot();
    const res = await fetch('/api/ai-proxy', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...settings, task, prompt, payload }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Erro ao chamar IA.');
    localStorage.setItem(LOG_KEY, JSON.stringify(json));
    return json;
  }
  function wire(){
    $('ms-ai-btn').addEventListener('click', () => $('ms-ai-modal').classList.add('show'));
    $('ms-ai-close').addEventListener('click', () => $('ms-ai-modal').classList.remove('show'));
    $('ms-ai-save').addEventListener('click', () => { setSettings(readForm()); msg('Configuração salva neste navegador.'); });
    $('ms-ai-chat').addEventListener('click', async () => { try { msg('Consultando IA...'); const r = await callAI('chat'); out(r.text || JSON.stringify(r, null, 2)); msg('Resposta pronta.'); } catch(e){ msg(e.message); } });
    $('ms-ai-correct').addEventListener('click', async () => { try { msg('Gerando correções...'); const r = await callAI('correct_project_texts'); out(r.text || JSON.stringify(r, null, 2)); msg('Correções geradas. Clique em aplicar se o JSON estiver válido.'); } catch(e){ msg(e.message); } });
    $('ms-ai-apply').addEventListener('click', () => {
      try {
        const last = JSON.parse(localStorage.getItem(LOG_KEY) || '{}');
        const corrections = last.corrections || (last.json && last.json.corrections);
        if (!Array.isArray(corrections)) throw new Error('A última resposta não trouxe corrections[].');
        const patched = patchPayloadWithCorrections(getSnapshot(), corrections);
        saveSnapshot(patched);
        alert('Correções aplicadas. A página será recarregada.');
        location.reload();
      } catch(e){ msg(e.message); }
    });
  }
  document.addEventListener('DOMContentLoaded', () => { inject(); wire(); });
})();
