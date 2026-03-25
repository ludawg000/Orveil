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
  const o = 0.11;
  const enc = s => encodeURIComponent(s);
  const svgPatterns = {
    linen:    `url('data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><line x1='0' y1='0' x2='12' y2='0' stroke='rgba(${c},${o})' stroke-width='0.4'/><line x1='0' y1='6' x2='12' y2='6' stroke='rgba(${c},${o*0.5})' stroke-width='0.3'/><line x1='0' y1='0' x2='0' y2='12' stroke='rgba(${c},${o})' stroke-width='0.4'/><line x1='6' y1='0' x2='6' y2='12' stroke='rgba(${c},${o*0.5})' stroke-width='0.3'/></svg>`)}')`,
    paper:    `url('data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='${o*1.4}'/></svg>`)}')`,
    geometric:`url('data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><path d='M24 2L46 24L24 46L2 24Z' fill='none' stroke='rgba(${c},${o*1.4})' stroke-width='0.5'/><path d='M24 12L36 24L24 36L12 24Z' fill='none' stroke='rgba(${c},${o*0.8})' stroke-width='0.4'/></svg>`)}')`,
    dots:     `url('data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><circle cx='16' cy='16' r='1' fill='rgba(${c},${o*1.6})'/></svg>`)}')`,
    marble:   `url('data:image/svg+xml,${enc(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='m'><feTurbulence type='turbulence' baseFrequency='0.012' numOctaves='4' seed='5'/><feColorMatrix type='saturate' values='0'/></filter><rect width='300' height='300' filter='url(%23m)' opacity='${o*2}'/></svg>`)}')`,
  };
  const wpSizes = { linen: '12px 12px', paper: '120px 120px', geometric: '48px 48px', dots: '32px 32px', marble: '300px 300px' };
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
