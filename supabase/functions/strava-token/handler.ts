/**
 * Strava token exchange. The only server code the app needs: it holds the
 * Strava client secret, which must never ship inside the app.
 *
 * POST { grant: "code", code }               -> exchanges a sign-in code
 * POST { grant: "refresh", refresh_token }   -> refreshes an expired access token
 * Responds with Strava's token JSON (access_token, refresh_token, expires_at, athlete).
 * Stores nothing and never logs tokens.
 *
 * Written against web-standard Request/Response so it runs on Supabase Edge
 * Functions (Deno) and in Jest unchanged.
 */
export type Env = { STRAVA_CLIENT_ID?: string; STRAVA_CLIENT_SECRET?: string };

const TOKEN_URL = 'https://www.strava.com/oauth/token';
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function handle(req: Request, env: Env, f: typeof fetch = fetch): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!env.STRAVA_CLIENT_ID || !env.STRAVA_CLIENT_SECRET) return json(500, { error: 'not_configured' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }

  const form = new URLSearchParams({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET });
  if (body.grant === 'code' && typeof body.code === 'string' && /^[\w-]{10,200}$/.test(body.code)) {
    form.set('grant_type', 'authorization_code');
    form.set('code', body.code);
  } else if (body.grant === 'refresh' && typeof body.refresh_token === 'string' && /^[\w-]{10,200}$/.test(body.refresh_token)) {
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', body.refresh_token);
  } else {
    return json(400, { error: 'bad_request' });
  }

  const res = await f(TOKEN_URL, { method: 'POST', body: form });
  if (!res.ok) return json(res.status === 400 || res.status === 401 ? 401 : 502, { error: 'strava_rejected' });
  const t = await res.json();
  // pass through only what the app uses
  return json(200, {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
    athlete: t.athlete ? { id: t.athlete.id, firstname: t.athlete.firstname, lastname: t.athlete.lastname } : undefined,
  });
}
