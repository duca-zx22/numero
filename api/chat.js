module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Método não permitido' } });
    return;
  }

  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) {
    res.status(500).json({ error: { message: 'Configure GROQ_API_KEY em: Vercel → Settings → Environment Variables' } });
    return;
  }

  try {
    const { system, messages, max_tokens } = req.body;

    const groqMessages = [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : (m.content[0]?.text || '')
      }))
    ];

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: max_tokens || 4096,
        temperature: 0.9,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: { message: data.error?.message || 'Erro da API Groq' } });
      return;
    }

    const text = data.choices?.[0]?.message?.content || '';
    res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (err) {
    res.status(502).json({ error: { message: 'Falha ao contatar Groq: ' + err.message } });
  }
};
