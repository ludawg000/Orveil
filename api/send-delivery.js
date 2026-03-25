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
  const wallpaper = branding?.wallpaper || 'none';

  // Wallpaper patterns — hosted PNGs for email client compatibility
  const BASE_URL = 'https://orveil.vercel.app';
  const wpImages = {
    linen: `${BASE_URL}/patterns/linen.png`,
    paper: `${BASE_URL}/patterns/paper.png`,
    geometric: `${BASE_URL}/patterns/geometric.png`,
    dots: `${BASE_URL}/patterns/dots.png`,
    marble: `${BASE_URL}/patterns/marble.png`
  };
  const patternUrl = wpImages[wallpaper] || '';

  const headerContent = logoUrl
    ? `<img src="${logoUrl}" alt="Brand" style="max-height: 80px; max-width: 320px;">`
    : `<h1 style="font-family: ${fontFamily}, Georgia, serif; font-size: 2rem; font-weight: 400; letter-spacing: 0.02em; margin: 0; color: ${accentColor};">Orveil</h1>`;

  const footerContent = logoUrl
    ? `<img src="${logoUrl}" alt="Brand" style="max-height: 48px; max-width: 200px; opacity: 0.5;">`
    : `<span style="color: ${accentColor}; opacity: 0.4;">Delivered with Orveil</span>`;

  const bgStyle = patternUrl
    ? `background-color: ${bgColor}; background-image: url(${patternUrl}); background-repeat: repeat;`
    : `background-color: ${bgColor};`;

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgColor};"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="${bgStyle} font-family: '${fontFamily}', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: ${accentColor}; padding: 48px 40px;">
      <!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;"><v:fill type="tile" src="${patternUrl}" color="${bgColor}"/><v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0"><![endif]-->
      <div style="text-align: center; margin-bottom: 40px;">
        ${headerContent}
      </div>
      <div style="border-top: 1px solid ${accentColor}20; padding-top: 32px; margin-bottom: 32px;">
        <h2 style="font-family: ${fontFamily}, Georgia, serif; font-size: 1.4rem; font-weight: 400; margin: 0 0 8px; color: ${accentColor};">Your gallery is ready</h2>
        <p style="font-size: 0.85rem; color: ${accentColor}; opacity: 0.5; margin: 0 0 24px;">${projectName || 'Your Project'}</p>
        <p style="font-size: 0.95rem; line-height: 1.7; color: ${accentColor}; opacity: 0.85; margin: 0 0 32px;">${message}</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${galleryUrl}" style="display: inline-block; background: ${accentColor}; color: ${bgColor}; text-decoration: none; font-size: 0.8rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; padding: 16px 40px;">View Gallery</a>
        </div>
      </div>
      <div style="border-top: 1px solid ${accentColor}20; padding-top: 24px; text-align: center;">
        <p style="font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; margin: 0;">
          ${footerContent}
        </p>
      </div>
      <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
    </td></tr></table>
    </td></tr></table>
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
