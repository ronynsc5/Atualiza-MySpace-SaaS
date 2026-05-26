export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { endpoint, model, apiKey, task, prompt, payload } = req.body || {};
    if (!endpoint || !model || !apiKey) return res.status(400).json({ error: 'Endpoint, modelo e API key são obrigatórios.' });
    const url = new URL(endpoint);
    if (!['https:'].includes(url.protocol)) return res.status(400).json({ error: 'Use endpoint HTTPS.' });

    const system = task === 'correct_project_texts'
      ? 'Você é a IA do MySpace. Corrija e melhore textos de cards de mapa mental sem alterar o sentido. Responda somente JSON válido no formato {"corrections":[{"id":"...","title":"...","note":"..."}],"summary":"..."}. Use apenas ids existentes.'
      : 'Você é a IA assistente do MySpace. Ajude o usuário a organizar mapas mentais, textos, cards, pastas e ideias. Responda em português do Brasil.';

    const compactPayload = payload ? JSON.stringify(payload).slice(0, 70000) : '';
    const userMsg = task === 'correct_project_texts'
      ? `Pedido do usuário: ${prompt || 'Corrija os textos do projeto.'}\n\nProjeto JSON:\n${compactPayload}`
      : `${prompt || 'Analise meu projeto e sugira melhorias.'}\n\nContexto do projeto JSON:\n${compactPayload}`;

    const isGemini = endpoint.includes('generativelanguage.googleapis.com');
    let upstream, data, text;

    if (isGemini) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      upstream = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: system + '\n\n' + userMsg }] }],
          generationConfig: { temperature: 0.2 }
        })
      });
      data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return res.status(400).json({ error: data.error?.message || 'Erro no Gemini.', details: data });
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
    } else {
      upstream = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }], temperature: 0.2 })
      });
      data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return res.status(400).json({ error: data.error?.message || 'Erro no provedor de IA.', details: data });
      text = data.choices?.[0]?.message?.content || data.output_text || JSON.stringify(data);
    }

    let parsed = null;
    try { parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/, '')); } catch(_) {}
    return res.status(200).json({ text, json: parsed, corrections: parsed?.corrections || null });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
