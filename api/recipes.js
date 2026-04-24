export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const response = await fetch('https://api.ilmu.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk-8590c38c5b109737b57a0e9d8ed3ac4bdaf4765e8f47df21',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
