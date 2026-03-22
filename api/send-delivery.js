export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, projectName, message, galleryUrl, branding } = req.body;

  if (!email || !galleryUrl || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  // Branding with fallbacks
  const bgColor = branding?.bgColor || '#0a0a0a';
  const accentColor = branding?.accentColor || '#fafafa';
  const fontFamily = branding?.fontFamily || 'Georgia, serif';
  const logoUrl = branding?.logoUrl;

  const headerContent = logoUrl
    ? `<img src="${logoUrl}" alt="Brand" style="max-height: 48px; max-width: 200px;">`
    : `<h1 style="font-family: ${fontFamily}, Georgia, serif; font-size: 2rem; font-weight: 400; letter-spacing: 0.02em; margin: 0; color: ${accentColor};">Orveil</h1>`;

  const footerContent = logoUrl
    ? `<img src="${logoUrl}" alt="Brand" style="max-height: 28px; max-width: 120px; opacity: 0.5;">`
    : `<span style="color: ${accentColor}; opacity: 0.4;">Delivered with Orveil</span>`;

  const html = `
    <div style="font-family: '${fontFamily}', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: ${bgColor}; color: ${accentColor}; padding: 3rem 2.5rem;">
      <div style="text-align: center; margin-bottom: 2.5rem;">
        ${headerContent}
      </div>
      <div style="border-top: 1px solid ${accentColor}20; padding-top: 2rem; margin-bottom: 2rem;">
        <h2 style="font-family: ${fontFamily}, Georgia, serif; font-size: 1.4rem; font-weight: 400; margin: 0 0 0.5rem; color: ${accentColor};">Your gallery is ready</h2>
        <p style="font-size: 0.85rem; color: ${accentColor}; opacity: 0.5; margin: 0 0 1.5rem;">${projectName || 'Your Project'}</p>
        <p style="font-size: 0.95rem; line-height: 1.7; color: ${accentColor}; opacity: 0.85; margin: 0 0 2rem;">${message}</p>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${galleryUrl}" style="display: inline-block; background: ${accentColor}; color: ${bgColor}; text-decoration: none; font-size: 0.8rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; padding: 1rem 2.5rem;">View Gallery</a>
        </div>
      </div>
      <div style="border-top: 1px solid ${accentColor}20; padding-top: 1.5rem; text-align: center;">
        <p style="font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; margin: 0;">
          ${footerContent}
        </p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Orveil <onboarding@resend.dev>',
        to: [email],
        subject: `Your gallery is ready — ${projectName || 'View Now'}`,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Failed to send email' });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
