export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-email');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (req.headers['x-admin-email'] !== 'lucianegil04@gmail.com') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nconnthnchpmzzmbwuvv.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SERVICE_KEY) return res.status(500).json({ error: 'Service key not configured' });

  try {
    // Fetch all users from Supabase Auth Admin API (up to 1000)
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ error: err.message || 'Failed to fetch users' });
    }

    const data = await resp.json();
    const users = (data.users || []).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at
    }));

    // Sort newest first
    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
