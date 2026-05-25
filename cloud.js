(function () {
  const STORAGE_KEY = 'mymind-v2';
  let client = null;

  function configured() {
    return window.MYMIND_SUPABASE_URL &&
      window.MYMIND_SUPABASE_ANON_KEY &&
      !String(window.MYMIND_SUPABASE_URL).includes('COLE_AQUI') &&
      !String(window.MYMIND_SUPABASE_ANON_KEY).includes('COLE_AQUI') &&
      window.supabase;
  }

  function getClient() {
    if (!configured()) return null;
    if (!client) client = window.supabase.createClient(window.MYMIND_SUPABASE_URL, window.MYMIND_SUPABASE_ANON_KEY);
    return client;
  }

  function addBtn(label, title, handler) {
    const group = document.querySelector('#topbar > div[style*="margin-left:auto"]');
    if (!group) return;
    const b = document.createElement('button');
    b.className = 'topbar-btn';
    b.title = title;
    b.textContent = label;
    b.onclick = handler;
    group.insertBefore(b, group.firstChild);
  }

  async function login() {
    const sb = getClient();
    if (!sb) return alert('Configure config.js com URL e anon key do Supabase.');
    const email = prompt('Seu email de login:');
    if (!email) return;
    const password = prompt('Sua senha:');
    if (!password) return;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return alert('Erro no login: ' + error.message);
    alert('Login feito.');
  }

  async function signup() {
    const sb = getClient();
    if (!sb) return alert('Configure config.js com URL e anon key do Supabase.');
    const email = prompt('Email para criar conta:');
    if (!email) return;
    const password = prompt('Senha, mínimo recomendado 8 caracteres:');
    if (!password) return;
    const { error } = await sb.auth.signUp({ email, password });
    if (error) return alert('Erro ao criar conta: ' + error.message);
    alert('Conta criada. Se o Supabase pedir confirmação de email, confirme antes de logar.');
  }

  async function logout() {
    const sb = getClient();
    if (!sb) return;
    await sb.auth.signOut();
    alert('Logout feito.');
  }

  async function cloudSave() {
    const sb = getClient();
    if (!sb) return alert('Configure config.js com URL e anon key do Supabase.');
    if (typeof window.doSave === 'function') window.doSave();
    const { data: auth } = await sb.auth.getUser();
    if (!auth || !auth.user) return alert('Faça login antes de salvar na nuvem.');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return alert('Nada salvo localmente ainda. Crie/edite algo primeiro.');
    const payload = JSON.parse(raw);
    const name = prompt('Nome do projeto na nuvem:', 'Meu MyMind') || 'Meu MyMind';
    const { error } = await sb.from('projects').upsert({
      user_id: auth.user.id,
      name,
      payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,name' });
    if (error) return alert('Erro ao salvar na nuvem: ' + error.message);
    alert('Projeto salvo na nuvem.');
  }

  async function cloudLoad() {
    const sb = getClient();
    if (!sb) return alert('Configure config.js com URL e anon key do Supabase.');
    const { data: auth } = await sb.auth.getUser();
    if (!auth || !auth.user) return alert('Faça login antes de carregar da nuvem.');
    const { data, error } = await sb.from('projects').select('name,payload,updated_at').order('updated_at', { ascending: false }).limit(10);
    if (error) return alert('Erro ao buscar projetos: ' + error.message);
    if (!data || !data.length) return alert('Nenhum projeto encontrado na nuvem.');
    const list = data.map((p, i) => `${i + 1}. ${p.name} - ${new Date(p.updated_at).toLocaleString('pt-BR')}`).join('\n');
    const chosen = Number(prompt('Escolha o número do projeto:\n\n' + list));
    if (!chosen || !data[chosen - 1]) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data[chosen - 1].payload));
    alert('Projeto carregado. A página será recarregada.');
    location.reload();
  }

  window.MyMindCloud = { login, signup, logout, cloudSave, cloudLoad };
  window.addEventListener('DOMContentLoaded', () => {
    addBtn('Cloud Load', 'Carregar do Supabase', cloudLoad);
    addBtn('Cloud Save', 'Salvar no Supabase', cloudSave);
    addBtn('Login', 'Login Supabase', login);
  });
})();
