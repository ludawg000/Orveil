export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, projectName } = req.body || {};
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Groq API key not configured' });
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const system = `You are an expert photography gallery designer. Based on the photographer's description, return a gallery design as JSON.

Available values:
- bg_color: any hex color (dark tones for luxury/moody, light for airy/bright)
- accent_color: any hex color (must contrast well with bg_color — this is used for text)
- wallpaper: "none" | "linen" | "lace" | "geometric" | "dots" | "marble"
- layout: "masonry" | "grid" | "slideshow"
- font: a Google Fonts font name that matches the aesthetic (e.g. "Cormorant Garamond", "Josefin Sans", "Playfair Display", "Montserrat", "Lora", "DM Serif Display")

Rules:
- bg_color and accent_color must have strong contrast (light text on dark bg, or dark text on light bg)
- For moody/luxury: dark bg (#0a0a0a–#2a1a10), warm accent (#d4a574–#e8d5b0)
- For airy/bright: light bg (#fafafa–#f5f0eb), dark accent (#1a1a1a–#3a2a20)
- For colorful themes: match the palette to the described mood
- Return ONLY valid JSON, no explanation, no markdown code blocks.

Example output: {"bg_color":"#1a0e08","accent_color":"#d4a574","wallpaper":"lace","layout":"masonry","font":"Cormorant Garamond"}`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Project: "${projectName || 'Untitled'}". Description: ${prompt}` },
        ],
        max_tokens: 120,
        temperature: 0.7,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || 'Groq error' });

    let raw = data.choices?.[0]?.message?.content?.trim() || '{}';
    // Strip markdown code fences if model adds them
    raw = raw.replace(/```json?/g, '').replace(/```/g, '').trim();
    const design = JSON.parse(raw);
    return res.status(200).json({ design });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
