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

  const system = `You are a photography gallery art director. Your ONLY job is to translate the photographer's exact words into a matching visual design. Read the description carefully and extract specific signals:

- Warm words (golden, sunset, tuscany, sunflower, autumn, terracotta, blush) → warm palette: deep ambers, burnt siennas, warm creams
- Cool/moody words (rainy, storm, editorial, dark, shadow, blue, ocean, arctic) → cool palette: charcoals, steel blues, slate
- Romantic/soft words (wedding, floral, dreamy, ethereal, film) → soft palette: dusty rose, ivory, blush, mauve
- Nature/organic words (forest, green, earthy, botanical) → earthy palette: forest greens, warm browns, sage
- Luxury/fashion words (black, minimal, sleek, high fashion, editorial) → high contrast: near-black with bright white or gold
- Bright/airy words (beach, white, bright, summer, fresh) → light palette: warm whites, sand, soft coral

Return ONLY a JSON object:
- bg_color: hex — MUST match the mood described. Warm description = warm background. Dark description = dark background.
- accent_color: hex — must strongly contrast bg_color
- bg_gradient: CSS linear-gradient that deepens the bg_color (same hue, slightly lighter/darker). Always include.
- wallpaper: "none" | "linen" | "lace" | "geometric" | "dots" | "marble" — match the mood
- font: A Google Fonts font name chosen specifically for this mood. Pick from this curated list based on the described aesthetic:
  Fancy/classy/elegant/luxury/sophisticated/high-end/upscale/refined/professional/prestigious → "Great Vibes" or "Pinyon Script" or "Parisienne" or "Allura" or "Corinthia" or "Alex Brush" or "Petit Formal Script" (USE THESE for any fancy/classy/upscale words)
  Romantic/luxury wedding → "Cormorant Garamond" or "Playfair Display" or "IM Fell English" or "Gilda Display"
  Soft/dreamy/film → "Italiana" or "Jost" or "Lora" or "Marcellus"
  Dark/editorial/moody → "Josefin Sans" or "DM Serif Display" or "Bebas Neue" or "Unbounded"
  High fashion/minimal → "Bodoni Moda" or "Didact Gothic" or "Tenor Sans" or "Secular One"
  Nature/earthy/warm → "Crimson Pro" or "Libre Baskerville" or "Bitter" or "Zilla Slab"
  Modern/clean/airy → "Raleway" or "Nunito" or "DM Sans" or "Outfit"
  Vintage/nostalgic → "Playfair Display" or "Abril Fatface" or "Spectral" or "Arvo"
  Adventure/bold → "Oswald" or "Barlow Condensed" or "Exo 2" or "Michroma"
  Choose the one that best fits — never repeat the same font for different moods
- design_name: 2-3 words describing this specific design (not generic)
- image_prompt: cinematic AI image prompt matching the exact described mood — specific location, lighting, colors, no people

CRITICAL: Your output must directly reflect the photographer's words. If they say "golden tuscany wedding" the bg must be warm amber/terracotta, NOT grey or cool-toned. If they say "dark moody editorial" it must be dark, NOT beige.

Return ONLY valid JSON, no explanation.`;

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
        max_tokens: 350,
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
