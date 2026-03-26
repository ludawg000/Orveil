export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body || {};
  const FAL_API_KEY = process.env.FAL_API_KEY;
  if (!FAL_API_KEY) return res.status(500).json({ error: 'fal.ai key not configured' });
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  try {
    const resp = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: 'landscape_16_9',
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.message || 'fal.ai error' });

    const imageUrl = data.images?.[0]?.url;
    if (!imageUrl) return res.status(500).json({ error: 'No image returned' });

    return res.status(200).json({ url: imageUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
