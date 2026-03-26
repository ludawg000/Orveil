export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { style, projectName, customPrompt } = req.body || {};
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) return res.status(500).json({ error: 'Groq API key not configured' });

  const systemPrompts = {
    standard: `You are a professional photographer delivering a photo gallery to a client. Write a warm, friendly delivery message (2–3 sentences). Tone: genuine, casual, excited. No subject line, no greeting like "Hi" — just the body of the message.`,
    professional: `You are a professional photographer delivering a photo gallery to a client. Write a polished, refined delivery message (2–3 sentences). Tone: gracious, artful, personal. No subject line, no greeting — just the message body.`,
    toptier: `You are a luxury photography studio delivering a gallery to a discerning client. Write an elegant, cinematic delivery message (2–4 sentences). Tone: understated luxury — like a high fashion brand. Emotional but restrained. No subject line, no greeting — just the message body.`,
    custom: `You are a professional photographer delivering a photo gallery. The photographer has given you specific instructions for the tone and style of this message. Follow them precisely. No subject line, no greeting — just the message body. Keep it 2–4 sentences.`,
  };

  const userContent = style === 'custom'
    ? `Project: "${projectName}". Photographer's instructions: ${customPrompt}`
    : `Project: "${projectName}".`;

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
          { role: 'system', content: systemPrompts[style] || systemPrompts.standard },
          { role: 'user', content: userContent },
        ],
        max_tokens: 220,
        temperature: 0.85,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || 'Groq error' });
    const message = data.choices?.[0]?.message?.content?.trim() || '';
    return res.status(200).json({ message });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
