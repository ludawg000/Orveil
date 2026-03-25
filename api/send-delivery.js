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

  // Wallpaper patterns — CSS gradients (work in all email clients incl. Gmail; data URIs are blocked)
  const BASE_URL = 'https://orveil.vercel.app';
  const hexToRgb = hex => { const h = hex.replace('#', ''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; };
  const [ar, ag, ab] = hexToRgb(accentColor);
  const c = `${ar},${ag},${ab}`;
  const o = 0.3;
  const gradientPatterns = {
    linen:    `repeating-linear-gradient(0deg, rgba(${c},${o}) 0, rgba(${c},${o}) 0.5px, transparent 0.5px, transparent 10px)`,
    paper:    `repeating-linear-gradient(90deg, rgba(${c},${o*0.7}) 0, rgba(${c},${o*0.7}) 0.3px, transparent 0.3px, transparent 7px)`,
    geometric:`repeating-linear-gradient(45deg, rgba(${c},${o}) 0, rgba(${c},${o}) 0.5px, transparent 0.5px, transparent 22px)`,
    dots:     `radial-gradient(circle, rgba(${c},${o}) 1.5px, transparent 1.5px)`,
    marble:   `repeating-linear-gradient(55deg, rgba(${c},${o}) 0, rgba(${c},${o}) 0.8px, transparent 0.8px, transparent 34px)`
  };
  const gradientSizes = { dots: '20px 20px' };
  const patternBg = gradientPatterns[wallpaper] || '';
  const patternSize = gradientSizes[wallpaper] || 'auto';

  const headerContent = logoUrl
    ? `<img src="${logoUrl}" alt="Brand" style="max-height: 80px; max-width: 320px;">`
    : `<h1 style="font-family: ${fontFamily}, Georgia, serif; font-size: 2rem; font-weight: 400; letter-spacing: 0.02em; margin: 0; color: ${accentColor};">Orveil</h1>`;

  const footerContent = logoUrl
    ? `<img src="${logoUrl}" alt="Brand" style="max-height: 48px; max-width: 200px; opacity: 0.5;">`
    : `<span style="color: ${accentColor}; opacity: 0.4;">Delivered with Orveil</span>`;

  const bw = 28; // border frame width in px
  const borderCell = patternBg
    ? `background-color: ${bgColor}; background-image: ${patternBg}; background-repeat: repeat; background-size: ${patternSize}; font-size: 0; line-height: 0;`
    : `background-color: ${bgColor}; font-size: 0; line-height: 0;`;

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgColor};"><tr><td align="center" style="background-color: ${bgColor}; padding: 32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0">
      <tr><td colspan="3" height="${bw}" style="${borderCell}">&nbsp;</td></tr>
      <tr>
        <td width="${bw}" style="${borderCell}">&nbsp;</td>
        <td bgcolor="${bgColor}" style="background-color: ${bgColor}; font-family: '${fontFamily}', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: ${accentColor}; padding: 48px 32px;">
          <div style="text-align: center; margin-bottom: 40px;">
            ${headerContent}
          </div>
          <div style="border-top: 1px solid ${accentColor}20; padding-top: 32px; margin-bottom: 32px; text-align: center;">
            <h2 style="font-family: ${fontFamily}, Georgia, serif; font-size: 1.4rem; font-weight: 400; margin: 0 0 8px; color: ${accentColor}; text-align: center;">Your gallery is ready</h2>
            <p style="font-size: 0.85rem; color: ${accentColor}; opacity: 0.5; margin: 0 0 24px; text-align: center;">${projectName || 'Your Project'}</p>
            <p style="font-size: 0.95rem; line-height: 1.7; color: ${accentColor}; opacity: 0.85; margin: 0 0 32px; text-align: center;">${message}</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${galleryUrl}" style="display: inline-block; background: ${accentColor}; color: ${bgColor}; text-decoration: none; font-size: 0.8rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; padding: 16px 40px;">View Gallery</a>
            </div>
          </div>
          <div style="border-top: 1px solid ${accentColor}20; padding-top: 24px; text-align: center;">
            <p style="font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; margin: 0; color: ${accentColor}; opacity: 0.4;">Delivered with Orveil</p>
          </div>
        </td>
        <td width="${bw}" style="${borderCell}">&nbsp;</td>
      </tr>
      <tr><td colspan="3" height="${bw}" style="${borderCell}">&nbsp;</td></tr>
    </table>
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
