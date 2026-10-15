import type { APIRoute } from 'astro';
import { runScheduledTasks } from 'emdash/middleware';
import { purgeSessions } from '../../../lib/session-driver';

// Hourly, from Vercel Cron (vercel.json): EmDash's maintenance (expired sign-in links, abandoned
// uploads; it runs on the hour) and old admin sessions. On a server that keeps running EmDash would
// do this itself; Vercel's functions don't. It also keeps the free Supabase database from pausing.
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  await runScheduledTasks();
  const sessions = process.env.PGHOST ? await purgeSessions() : 0;
  return Response.json({ ok: true, expiredSessions: sessions });
};
