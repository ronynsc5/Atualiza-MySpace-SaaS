/* MySpace v3.14 - Auth + Cloud + Paywall
   Login/cadastro com Supabase, projetos por usuário e checkout via Mercado Pago na Vercel. */
(function(){
  'use strict';

  const cfg = window.MYSPACE_APP || {};
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_KEY = window.MYSPACE_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;
  const REQUIRE_PAYMENT = cfg.requirePayment !== false;
  const PROJECT_NAME = 'Meu Espaço';

  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_KEY.includes('COLE_')) {
    console.warn('[MySpace Auth] Configure SUPABASE_URL e MYSPACE_SUPABASE_ANON_KEY no config.js');
  }

  const sb = window.supabase && SUPABASE_URL && SUPABASE_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'myspace-auth-v1'
        }
      })
    : null;

  window.MySpaceAuth = { client: sb, user: null, profile: null, isUnlocked: false };
  window.MyMindAuth = window.MySpaceAuth;

  function $(id){ return document.getElementById(id); }
  function escapeHtml(str){
    return String(str || '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function setMsg(text, type='info'){
    const el = $('mm-auth-msg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'mm-auth-msg ' + type;
  }
  function setBusy(isBusy){
    document.querySelectorAll('[data-mm-busy]').forEach(btn => btn.disabled = !!isBusy);
  }
  function activeProfile(profile){
    if (!REQUIRE_PAYMENT) return true;
    if (!profile) return false;
    const end = profile.current_period_end ? new Date(profile.current_period_end).getTime() : 0;
    const paidStatus = ['active','trialing'].includes(profile.subscription_status);
    return paidStatus && end > Date.now();
  }
  function getSnapshot(){
    try {
      if (window.MySpace && typeof window.MySpace.snapshot === 'function') return window.MySpace.snapshot();
    } catch(_) {}
    try {
      const raw = localStorage.getItem('myspace-v2') || localStorage.getItem('myspace-v3');
      return raw ? JSON.parse(raw) : null;
    } catch(_) { return null; }
  }
  function applySnapshot(payload){
    if (!payload || typeof payload !== 'object') throw new Error('Projeto inválido');
    localStorage.setItem('myspace-v2', JSON.stringify(payload));
    localStorage.setItem('myspace-v3', JSON.stringify(payload));
    location.reload();
  }

  function injectUi(){
    const css = document.createElement('style');
    css.textContent = `
      #mm-auth-wall{position:fixed;inset:0;z-index:5000;background:linear-gradient(135deg,#f8f8f7,#ececea);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,sans-serif;color:#1a1a18;}
      #mm-auth-wall.mm-hidden{display:none!important;}
      .mm-auth-card{width:min(440px,100%);background:#fff;border:1px solid #deded9;border-radius:20px;box-shadow:0 24px 80px rgba(26,26,24,.18);padding:28px;}
      .mm-auth-brand{display:flex;align-items:center;gap:10px;margin-bottom:18px;font-weight:800;font-size:18px;letter-spacing:-.03em;}
      .mm-auth-logo{width:32px;height:32px;border-radius:10px;background:#1a1a18;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;}
      .mm-auth-title{font-size:26px;font-weight:800;letter-spacing:-.04em;margin:0 0 8px;}
      .mm-auth-sub{font-size:14px;color:#666;margin:0 0 22px;line-height:1.45;}
      .mm-auth-tabs{display:flex;background:#f0f0ee;border-radius:12px;padding:4px;margin-bottom:16px;}
      .mm-auth-tabs button{flex:1;border:0;background:transparent;border-radius:9px;padding:10px;font-weight:700;cursor:pointer;color:#666;}
      .mm-auth-tabs button.on{background:#fff;color:#1a1a18;box-shadow:0 1px 5px rgba(0,0,0,.08);}
      .mm-field{margin-bottom:12px;}
      .mm-field label{display:block;font-size:12px;font-weight:700;color:#555;margin-bottom:6px;}
      .mm-field input{width:100%;border:1px solid #d7d7d3;background:#fafaf9;border-radius:12px;padding:12px 14px;font-size:14px;outline:none;}
      .mm-field input:focus{border-color:#1a1a18;background:#fff;}
      .mm-primary{width:100%;border:0;background:#1a1a18;color:#fff;border-radius:12px;padding:13px 16px;font-weight:800;cursor:pointer;margin-top:8px;}
      .mm-primary:disabled{opacity:.6;cursor:not-allowed;}
      .mm-secondary{width:100%;border:1px solid #d7d7d3;background:#fff;color:#1a1a18;border-radius:12px;padding:12px 16px;font-weight:700;cursor:pointer;margin-top:10px;}
      .mm-auth-msg{min-height:20px;font-size:13px;margin-top:12px;line-height:1.4;}
      .mm-auth-msg.error{color:#dc2626}.mm-auth-msg.success{color:#16a34a}.mm-auth-msg.info{color:#666}
      .mm-paybox{display:none;border:1px solid #deded9;background:#fafaf9;border-radius:16px;padding:18px;margin-top:16px;}
      .mm-paybox.show{display:block;}
      .mm-price{font-size:28px;font-weight:900;letter-spacing:-.04em;margin:4px 0;}
      .mm-features{font-size:13px;color:#555;line-height:1.7;margin:12px 0 0;padding-left:18px;}
      #mm-userbar{position:fixed;right:14px;top:58px;z-index:2500;display:none;gap:6px;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:6px;box-shadow:var(--card-shadow);}
      #mm-userbar.show{display:flex;}
      #mm-userbar button{border:0;background:var(--bg2);color:var(--text);border-radius:9px;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer;}
      #mm-userbar button:hover{background:var(--bg3);}#mm-user-email{font-size:12px;color:var(--text2);padding:0 8px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    `;
    document.head.appendChild(css);

    const wall = document.createElement('div');
    wall.id = 'mm-auth-wall';
    wall.innerHTML = `
      <div class="mm-auth-card">
        <div class="mm-auth-brand"><div class="mm-auth-logo">M</div><span>${escapeHtml(cfg.name || 'MySpace')}</span></div>
        <h1 class="mm-auth-title">Entre no seu mapa mental</h1>
        <p class="mm-auth-sub">Cada usuário acessa somente os próprios projetos. Seus mapas ficam salvos na nuvem com Supabase.</p>
        <div class="mm-auth-tabs">
          <button id="mm-tab-login" class="on" type="button">Entrar</button>
          <button id="mm-tab-register" type="button">Criar conta</button>
        </div>
        <form id="mm-auth-form">
          <div class="mm-field"><label>E-mail</label><input id="mm-email" type="email" autocomplete="email" required placeholder="voce@email.com"></div>
          <div class="mm-field"><label>Senha</label><input id="mm-password" type="password" autocomplete="current-password" required minlength="6" placeholder="Mínimo 6 caracteres"></div>
          <button class="mm-primary" id="mm-submit" data-mm-busy type="submit">Entrar</button>
        </form>
        <div id="mm-paybox" class="mm-paybox">
          <strong>Acesso Pro necessário</strong>
          <div class="mm-price">${escapeHtml(cfg.priceLabel || 'R$ 29,90/mês')}</div>
          <button class="mm-primary" id="mm-pay-btn" data-mm-busy type="button">Pagar com Mercado Pago</button>
          <ul class="mm-features"><li>Mapas mentais privados</li><li>Salvamento em nuvem</li><li>Acesso em qualquer dispositivo</li><li>Renovação mensal: R$ 29,90</li></ul>
        </div>
        <div id="mm-auth-msg" class="mm-auth-msg info"></div>
      </div>`;
    document.body.appendChild(wall);

    const bar = document.createElement('div');
    bar.id = 'mm-userbar';
    bar.innerHTML = `
      <span id="mm-user-email"></span>
      <button id="mm-cloud-save" type="button">Salvar nuvem</button>
      <button id="mm-cloud-load" type="button">Carregar</button>
      <button id="mm-logout" type="button">Sair</button>`;
    document.body.appendChild(bar);
  }

  async function ensureProfile(user){
    if (!sb || !user) return null;
    let { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) console.warn('[MySpace Auth] profile select', error);
    if (!data) {
      const ins = { id: user.id, email: user.email, subscription_status: 'inactive' };
      const res = await sb.from('profiles').upsert(ins, { onConflict: 'id' }).select('*').single();
      data = res.data || ins;
    }
    window.MySpaceAuth.profile = data;
    return data;
  }

  async function refreshAccess(){
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    window.MySpaceAuth.user = session && session.user;
    if (!session || !session.user) return showLogin();
    const profile = await ensureProfile(session.user);
    const unlocked = activeProfile(profile);
    window.MySpaceAuth.isUnlocked = unlocked;
    if (unlocked) showApp(session.user); else showPaywall(session.user, profile);
  }

  function showLogin(){
    $('mm-auth-wall')?.classList.remove('mm-hidden');
    $('mm-paybox')?.classList.remove('show');
    $('mm-userbar')?.classList.remove('show');
    setMsg('Entre ou crie uma conta para acessar.', 'info');
  }
  function showPaywall(user){
    $('mm-auth-wall')?.classList.remove('mm-hidden');
    $('mm-paybox')?.classList.add('show');
    $('mm-userbar')?.classList.remove('show');
    setMsg(`Logado como ${user.email}. Falta ativar o plano.`, 'info');
  }
  function showApp(user){
    $('mm-auth-wall')?.classList.add('mm-hidden');
    $('mm-userbar')?.classList.add('show');
    const email = $('mm-user-email'); if (email) email.textContent = user.email || '';
  }

  async function cloudSave(){
    if (!sb) return alert('Supabase não configurado.');
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return refreshAccess();
    const payload = getSnapshot();
    if (!payload) return alert('Nenhum projeto para salvar.');
    const row = { user_id: session.user.id, name: PROJECT_NAME, payload };
    const { error } = await sb.from('projects').upsert(row, { onConflict: 'user_id,name' });
    if (error) return alert('Erro ao salvar na nuvem: ' + error.message);
    alert('Projeto salvo na nuvem.');
  }
  async function cloudLoad(){
    if (!sb) return alert('Supabase não configurado.');
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return refreshAccess();
    const { data, error } = await sb.from('projects').select('payload,updated_at').eq('user_id', session.user.id).eq('name', PROJECT_NAME).maybeSingle();
    if (error) return alert('Erro ao carregar: ' + error.message);
    if (!data) return alert('Nenhum projeto salvo na nuvem ainda.');
    if (confirm('Carregar projeto da nuvem? O estado local atual será substituído.')) applySnapshot(data.payload);
  }
  async function startPayment(){
    if (!sb) return alert('Supabase não configurado.');
    setBusy(true); setMsg('Criando checkout seguro...', 'info');
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error('Faça login primeiro.');
      const res = await fetch('/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: 'pro_monthly' })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Não foi possível criar pagamento.');
      location.href = json.init_point || json.sandbox_init_point;
    } catch(err) {
      setMsg(err.message, 'error');
    } finally { setBusy(false); }
  }

  function wire(){
    let mode = 'login';
    const tabLogin = $('mm-tab-login'), tabRegister = $('mm-tab-register'), submit = $('mm-submit');
    function setMode(next){
      mode = next;
      tabLogin.classList.toggle('on', mode === 'login');
      tabRegister.classList.toggle('on', mode === 'register');
      submit.textContent = mode === 'login' ? 'Entrar' : 'Criar conta';
      setMsg('', 'info');
    }
    tabLogin.addEventListener('click', () => setMode('login'));
    tabRegister.addEventListener('click', () => setMode('register'));
    $('mm-auth-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!sb) return setMsg('Supabase não configurado no config.js.', 'error');
      setBusy(true); setMsg('Verificando...', 'info');
      const email = $('mm-email').value.trim();
      const password = $('mm-password').value;
      try {
        const result = mode === 'login'
          ? await sb.auth.signInWithPassword({ email, password })
          : await sb.auth.signUp({ email, password });
        if (result.error) throw result.error;
        if (mode === 'register') setMsg('Conta criada. Se o Supabase pedir confirmação, confirme pelo e-mail.', 'success');
        await refreshAccess();
      } catch(err) { setMsg(err.message || 'Erro de autenticação.', 'error'); }
      finally { setBusy(false); }
    });
    $('mm-pay-btn').addEventListener('click', startPayment);
    $('mm-cloud-save').addEventListener('click', cloudSave);
    $('mm-cloud-load').addEventListener('click', cloudLoad);
    $('mm-logout').addEventListener('click', async () => { if (sb) await sb.auth.signOut(); showLogin(); });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    injectUi(); wire();
    if (!sb) return showLogin();
    sb.auth.onAuthStateChange(() => refreshAccess());
    await refreshAccess();
  });
})();
