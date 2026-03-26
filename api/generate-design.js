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

  const system = `You are a world-class photography gallery art director. Create a bold, intentional, visually distinctive gallery design based on the photographer's description. Every design should feel like it was crafted by a creative director — not generic.

Return ONLY a JSON object with these fields:

- bg_color: hex color for background. Be bold — deep charcoals, rich creams, dusty mauves, forest greens, navy, terracotta, etc. Never plain white or black.
- accent_color: hex color for text/buttons. Must strongly contrast bg_color. Often a warm gold, ivory, blush, sage, or off-white on dark, or a deep moody tone on light.
- bg_gradient: optional CSS linear-gradient string for background (adds depth). Example: "linear-gradient(135deg, #1a0e08 0%, #2d1a0e 100%)". Use for most designs.
- wallpaper: "none" | "linen" | "lace" | "geometric" | "dots" | "marble"
- layout: "masonry" | "grid" | "slideshow"
- font: Google Fonts name matching the aesthetic. Examples: "Cormorant Garamond" (romantic/luxury), "Josefin Sans" (modern/clean), "DM Serif Display" (editorial), "Italiana" (fashion), "Libre Baskerville" (classic), "Raleway" (minimal modern), "Bodoni Moda" (high fashion), "Crimson Pro" (warm editorial)
- design_name: a 2-3 word name for this design theme (e.g. "Tuscan Warmth", "Arctic Editorial", "Midnight Romance")

Rules:
- bg_color and accent_color must have STRONG contrast
- bg_gradient should complement bg_color (slightly lighter or darker variation, same hue family)
- Match every element to the described mood — a sunflower wedding should feel golden and warm, not grey
- Be specific and committed to a palette — no generic beige on white
- Return ONLY valid JSON, no explanation

Example for "moody rainy day editorial":
{"bg_color":"#1c1f2b","accent_color":"#c8cdd8","bg_gradient":"linear-gradient(160deg,#1c1f2b 0%,#252836 100%)","wallpaper":"geometric","layout":"masonry","font":"Josefin Sans","design_name":"Storm Editorial"}`;

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
          { role: 'user', content: `Project: "${projectName || 'Untitled'}". Aesthetic description: ${prompt}` },
        ],
        max_tokens: 200,
        temperature: 0.9,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || 'Groq error' });

    let raw = data.choices?.[0]?.message?.content?.trim() || '{}';
    raw = raw.replace(/```json?/g, '').replace(/```/g, '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'No JSON in response' });
    const design = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ design });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
