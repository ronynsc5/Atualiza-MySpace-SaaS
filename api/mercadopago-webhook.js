export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!supabaseUrl || !serviceKey || !mpAccessToken) return res.status(500).json({ error: 'Env vars ausentes.' });

    const paymentId = req.query?.['data.id'] || req.query?.id || req.body?.data?.id || req.body?.id;
    const topic = req.query?.type || req.query?.topic || req.body?.type || req.body?.topic;

    if (!paymentId || (topic && !String(topic).includes('payment'))) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const payResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpAccessToken}` }
    });
    const payment = await payResp.json();
    if (!payResp.ok) return res.status(200).json({ ok: false, reason: 'payment_lookup_failed' });

    const userId = payment.external_reference || payment.metadata?.user_id;
    if (!userId) return res.status(200).json({ ok: false, reason: 'missing_user_id' });

    const approved = payment.status === 'approved';
    const status = approved ? 'active' : (payment.status || 'inactive');
    const periodEnd = approved ? new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString() : null;

    const updateResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        subscription_status: status,
        mercado_pago_payment_id: String(payment.id || paymentId),
        mercado_pago_preference_id: payment.preference_id || null,
        current_period_end: periodEnd
      })
    });

    if (!updateResp.ok) return res.status(200).json({ ok: false, reason: 'profile_update_failed' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}
