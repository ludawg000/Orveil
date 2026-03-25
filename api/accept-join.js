export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { projectId, userId, email } = req.body;

  if (!projectId || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nconnthnchpmzzmbwuvv.supabase.co';
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jb25udGhuY2hwbXp6bWJ3dXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzMzMTUsImV4cCI6MjA4OTcwOTMxNX0.xoJ4-atYnd5_mcB1gUr3XqBBlwYahWm8REytpHllmDo';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'Database service key not configured' });
  }

  try {
    // Check if project exists and get owner
    const projResp = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}&select=id,user_id`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const projects = await projResp.json();
    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const projectOwner = projects[0].user_id;

    // Check if already a collaborator
    const existResp = await fetch(`${SUPABASE_URL}/rest/v1/collaborators?project_id=eq.${projectId}&user_id=eq.${userId}&select=id`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
    });
    const existing = await existResp.json();
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(200).json({ success: true, message: 'Already a collaborator' });
    }

    // Insert collaborator using service role (bypasses RLS)
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
        user_id: userId,
        email: email || 'joined@link',
        invited_by: projectOwner,
        status: 'accepted'
      })
    });

    if (!insertResp.ok) {
      const err = await insertResp.json().catch(() => ({}));
      console.error('Join insert failed:', err);
      return res.status(insertResp.status).json({ error: err.message || 'Failed to join project' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Accept join error:', err);
    return res.status(500).json({ error: 'Failed to join project' });
  }
}
