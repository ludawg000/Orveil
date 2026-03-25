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

  // Wallpaper patterns — SVG data URIs colored with accent color (same approach as gallery)
  const BASE_URL = 'https://orveil.vercel.app';
  const hexToRgb = hex => { const h = hex.replace('#', ''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; };
  const [ar, ag, ab] = hexToRgb(accentColor);
  const c = `${ar},${ag},${ab}`;
  const o = 0.15;
  const enc = s => encodeURIComponent(s);
  const svgPatterns = {
    linen:    `url("data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><line x1='0' y1='0' x2='8' y2='0' stroke='rgba(${c},${o})' stroke-width='0.5'/><line x1='0' y1='4' x2='8' y2='4' stroke='rgba(${c},${o*0.7})' stroke-width='0.5'/><line x1='0' y1='0' x2='0' y2='8' stroke='rgba(${c},${o})' stroke-width='0.5'/><line x1='4' y1='0' x2='4' y2='8' stroke='rgba(${c},${o*0.7})' stroke-width='0.5'/></svg>`)}")`,
    paper:    `url("data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100' height='100' filter='url(%23n)' opacity='${o*1.2}'/></svg>`)}")`,
    geometric:`url("data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M20 0L40 20L20 40L0 20Z' fill='none' stroke='rgba(${c},${o*1.5})' stroke-width='0.6'/><path d='M20 8L32 20L20 32L8 20Z' fill='none' stroke='rgba(${c},${o})' stroke-width='0.4'/></svg>`)}")`,
    dots:     `url("data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='1.5' fill='rgba(${c},${o*2})'/></svg>`)}")`,
    marble:   `url("data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='m'><feTurbulence type='turbulence' baseFrequency='0.015' numOctaves='3' seed='2'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23m)' opacity='${o*1.8}'/></svg>`)}"`)`
  };
  const wpSizes = { linen: '8px 8px', paper: '100px 100px', geometric: '40px 40px', dots: '24px 24px', marble: '200px 200px' };
  const patternDataUri = svgPatterns[wallpaper] || '';
  const patternSize = wpSizes[wallpaper] || 'auto';
  // PNG fallback for Outlook VML only
  const patternUrl = wallpaper !== 'none' ? `${BASE_URL}/patterns/${wallpaper}.png` : '';

  const headerContent = logoUrl
    ? `<img src="${logoUrl}" alt="Brand" style="max-height: 80px; max-width: 320px;">`
    : `<h1 style="font-family: ${fontFamily}, Georgia, serif; font-size: 2rem; font-weight: 400; letter-spacing: 0.02em; margin: 0; color: ${accentColor};">Orveil</h1>`;

  const footerContent = logoUrl
    ? `<img src="${logoUrl}" alt="Brand" style="max-height: 48px; max-width: 200px; opacity: 0.5;">`
    : `<span style="color: ${accentColor}; opacity: 0.4;">Delivered with Orveil</span>`;

  const bgStyle = patternDataUri
    ? `background-color: ${bgColor}; background-image: ${patternDataUri}; background-repeat: repeat; background-size: ${patternSize};`
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
