module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Método não permitido' } });
    return;
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    res.status(500).json({ error: { message: 'Configure GEMINI_API_KEY em: Vercel → Settings → Environment Variables' } });
    return;
  }

  try {
    const { system, messages, max_tokens } = req.body;

    const geminiBody = {
      ...(system && { system_instruction: { parts: [{ text: system }] } }),
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : (m.content[0]?.text || '') }]
      })),
      generationConfig: {
        maxOutputTokens: max_tokens || 4096,
        temperature: 0.9,
      }
    };

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: { message: data.error?.message || 'Erro da API Gemini' } });
      return;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (err) {
    res.status(502).json({ error: { message: 'Falha ao contatar Gemini: ' + err.message } });
  }
};
