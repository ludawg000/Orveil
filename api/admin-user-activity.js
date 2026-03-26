export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-email');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (req.headers['x-admin-email'] !== 'lucianegil04@gmail.com') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nconnthnchpmzzmbwuvv.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Service key not configured' });

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const [projectsRes, profileRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/projects?user_id=eq.${userId}&select=id,name,file_count,created_at&order=created_at.desc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=storage_used,last_seen,session_start`, { headers })
    ]);

    const projects = projectsRes.ok ? await projectsRes.json() : [];
    const profiles = profileRes.ok ? await profileRes.json() : [];
    const profile = profiles[0] || {};

    return res.status(200).json({
      projects,
      storageUsed: profile.storage_used || 0,
      lastSeen: profile.last_seen || null,
      sessionStart: profile.session_start || null
    });
  } catch (err) {
    console.error('Admin user activity error:', err);
    return res.status(500).json({ error: 'Failed to fetch activity' });
  }
}
