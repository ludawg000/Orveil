export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, projectId, invitedBy } = req.body;

  if (!projectId || !invitedBy) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nconnthnchpmzzmbwuvv.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jb25udGhuY2hwbXp6bWJ3dXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzMzMTUsImV4cCI6MjA4OTcwOTMxNX0.xoJ4-atYnd5_mcB1gUr3XqBBlwYahWm8REytpHllmDo';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'Database service key not configured' });
  }

  try {
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/collaborators`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        project_id: projectId,
        email: (email || '').toLowerCase() || null,
        invited_by: invitedBy,
        status: 'pending'
      })
    });

    if (!insertResp.ok) {
      const err = await insertResp.json().catch(() => ({}));
      console.error('Collaborator insert failed:', err);
      if (err.code === '23505') {
        return res.status(409).json({ error: 'This person has already been invited' });
      }
      return res.status(insertResp.status).json({ error: err.message || 'Failed to create invite' });
    }

    const rows = await insertResp.json();
    const collab = Array.isArray(rows) ? rows[0] : rows;

    if (!collab || !collab.invite_token) {
      console.error('Missing invite_token:', collab);
      return res.status(500).json({ error: 'Invite token not generated — check collaborators table has invite_token column with DEFAULT gen_random_uuid()' });
    }

    const inviteUrl = `https://orveil.vercel.app?invite=${collab.invite_token}`;
    return res.status(200).json({ success: true, inviteUrl });
  } catch (err) {
    console.error('Create invite error:', err);
    return res.status(500).json({ error: 'Failed to create invite' });
  }
}
