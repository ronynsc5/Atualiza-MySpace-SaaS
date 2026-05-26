export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const publicUrl = process.env.MYSPACE_PUBLIC_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    const price = Number(process.env.MYSPACE_PRICE || '29.90');

    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Configure SUPABASE_URL e SUPABASE_ANON_KEY na Vercel.');
    if (!mpAccessToken) throw new Error('Configure MERCADO_PAGO_ACCESS_TOKEN na Vercel.');
    if (!publicUrl) throw new Error('Configure MYSPACE_PUBLIC_URL na Vercel.');

    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Login obrigatório.' });

    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` }
    });
    const user = await userResp.json();
    if (!userResp.ok || !user.id) return res.status(401).json({ error: 'Sessão inválida.' });

    const preference = {
      items: [{
        title: process.env.MYSPACE_PLAN_NAME || 'MySpace Mensal',
        quantity: 1,
        unit_price: price,
        currency_id: 'BRL'
      }],
      payer: { email: user.email },
      external_reference: user.id,
      metadata: { user_id: user.id, plan: 'pro_monthly' },
      back_urls: {
        success: publicUrl,
        failure: publicUrl,
        pending: publicUrl
      },
      auto_return: 'approved',
      notification_url: `${publicUrl}/api/mercadopago-webhook`
    };

    const mpResp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });
    const mp = await mpResp.json();
    if (!mpResp.ok) return res.status(400).json({ error: mp.message || 'Erro Mercado Pago', details: mp });

    return res.status(200).json({ id: mp.id, init_point: mp.init_point, sandbox_init_point: mp.sandbox_init_point });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
