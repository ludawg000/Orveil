export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Only allow Lucian's account
  const callerEmail = req.headers['x-admin-email'];
  if (callerEmail !== 'lucianegil04@gmail.com') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nconnthnchpmzzmbwuvv.supabase.co';
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'Service key not configured' });
  }

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const now = new Date();
    const fifteenMinAgo = new Date(now - 15 * 60 * 1000).toISOString();

    const [totalRes, activeRes, sessionRes] = await Promise.all([
      // Total signups
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id`, {
        headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0' }
      }),
      // Active in last 15 min
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&last_seen=gte.${fifteenMinAgo}`, {
        headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0' }
      }),
      // Avg session duration (minutes) — only profiles with both timestamps
      fetch(`${SUPABASE_URL}/rest/v1/profiles?select=session_start,last_seen&session_start=not.is.null&last_seen=not.is.null`, {
        headers
      })
    ]);

    const totalCount = parseInt(totalRes.headers.get('content-range')?.split('/')[1] || '0', 10);
    const activeCount = parseInt(activeRes.headers.get('content-range')?.split('/')[1] || '0', 10);

    let avgSessionMinutes = null;
    if (sessionRes.ok) {
      const sessions = await sessionRes.json();
      if (Array.isArray(sessions) && sessions.length > 0) {
        const durations = sessions
          .map(s => (new Date(s.last_seen) - new Date(s.session_start)) / 60000)
          .filter(d => d > 0 && d < 1440); // ignore negative or >24h outliers
        if (durations.length > 0) {
          avgSessionMinutes = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        }
      }
    }

    return res.status(200).json({
      totalUsers: totalCount,
      activeNow: activeCount,
      avgSessionMinutes
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
