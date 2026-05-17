// server-only
let cachedToken: { access_token: string; expires_at: number } | null = null;

export async function getCdekToken() {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }
  const r = await fetch('https://api.cdek.ru/v2/oauth/token?parameters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.CDEK_CLIENT_ID,
      client_secret: process.env.CDEK_CLIENT_SECRET,
    }),
  });
  if (!r.ok) throw new Error('CDEK auth failed');
  const j = await r.json();
  cachedToken = {
    access_token: j.access_token,
    expires_at: Date.now() + (j.expires_in * 1000 || 3600_000),
  };
  return cachedToken.access_token;
}
