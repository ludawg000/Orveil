export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, projectId, projectName, invitedBy, accessToken } = req.body;

  if (!email || !projectId || !invitedBy || !accessToken) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nconnthnchpmzzmbwuvv.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jb25udGhuY2hwbXp6bWJ3dXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzMzMTUsImV4cCI6MjA4OTcwOTMxNX0.xoJ4-atYnd5_mcB1gUr3XqBBlwYahWm8REytpHllmDo';

  if (!RESEND_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    // Create collaborator record in Supabase
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/collaborators`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        project_id: projectId,
        email: email.toLowerCase(),
        invited_by: invitedBy,
        status: 'pending'
      })
    });

    if (!insertResp.ok) {
      const err = await insertResp.json().catch(() => ({}));
      // Duplicate invite check
      if (err.code === '23505') {
        return res.status(409).json({ error: 'This person has already been invited' });
      }
      return res.status(insertResp.status).json({ error: err.message || 'Failed to create invite' });
    }

    const [collab] = await insertResp.json();
    const inviteUrl = `https://orveil.vercel.app?invite=${collab.invite_token}`;

    // Send invite email
    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Orveil <onboarding@resend.dev>',
        to: [email],
        subject: `You've been invited to collaborate — ${projectName || 'Orveil Project'}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fafafa; padding: 3rem 2.5rem;">
            <div style="text-align: center; margin-bottom: 2.5rem;">
              <h1 style="font-family: Georgia, serif; font-size: 2rem; font-weight: 400; letter-spacing: 0.02em; margin: 0; color: #fafafa;">Orveil</h1>
            </div>
            <div style="border-top: 1px solid rgba(250,250,250,0.12); padding-top: 2rem; margin-bottom: 2rem;">
              <h2 style="font-family: Georgia, serif; font-size: 1.4rem; font-weight: 400; margin: 0 0 0.5rem; color: #fafafa;">You've been invited to collaborate</h2>
              <p style="font-size: 0.85rem; color: #fafafa; opacity: 0.5; margin: 0 0 1.5rem;">${projectName || 'A Project'}</p>
              <p style="font-size: 0.95rem; line-height: 1.7; color: #fafafa; opacity: 0.85; margin: 0 0 2rem;">
                You've been invited to collaborate on a project in Orveil. Create an account or sign in to get started.
              </p>
              <div style="text-align: center; margin: 2rem 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: #fafafa; color: #0a0a0a; text-decoration: none; font-size: 0.8rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; padding: 1rem 2.5rem;">Accept Invite</a>
              </div>
            </div>
            <div style="border-top: 1px solid rgba(250,250,250,0.12); padding-top: 1.5rem; text-align: center;">
              <p style="font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; margin: 0; color: #fafafa; opacity: 0.4;">Delivered with Orveil</p>
            </div>
          </div>
        `,
      }),
    });

    const emailData = await emailResp.json();

    if (!emailResp.ok) {
      return res.status(emailResp.status).json({ error: emailData.message || 'Failed to send invite email' });
    }

    return res.status(200).json({ success: true, id: collab.id });
  } catch (err) {
    console.error('Invite error:', err);
    return res.status(500).json({ error: 'Failed to send invite' });
  }
}
