const https = require('https');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    res.status(500).json({ error: { message: 'ANTHROPIC_API_KEY não configurada no painel da Vercel.' } });
    return;
  }

  const body = JSON.stringify(req.body);
  const buf  = Buffer.from(body);

  return new Promise((resolve) => {
    const pr = https.request({
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': buf.length,
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
    }, (upstream) => {
      let data = '';
      upstream.on('data', c => data += c);
      upstream.on('end', () => {
        try { res.status(upstream.statusCode).json(JSON.parse(data)); }
        catch (_) { res.status(upstream.statusCode).send(data); }
        resolve();
      });
    });
    pr.on('error', (e) => { res.status(502).json({ error: { message: e.message } }); resolve(); });
    pr.write(buf);
    pr.end();
  });
}
