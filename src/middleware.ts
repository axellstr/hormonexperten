import { createHash, timingSafeEqual } from 'node:crypto';
import { defineMiddleware } from 'astro:middleware';
import type { APIContext } from 'astro';

// Required by `i18n.routing: 'manual'` (astro.config.mjs). Pages route their own locale through
// src/pages/[lang]/, so they need nothing here; only the EmDash admin's setup is guarded.

/**
 * Until the first admin account exists, EmDash makes whoever finishes its setup wizard first the
 * admin, by passkey or by Google sign-in. On a deployed site that's anyone who finds the address,
 * so there the wizard's steps and Google sign-in need the setup key (EMDASH_SETUP_KEY) until setup
 * is complete: open /_emdash/admin/setup?setup_key=<key> once and the browser keeps it in a
 * cookie. Without the variable, setup stays locked. `astro dev` isn't guarded.
 */
const SETUP_KEY_PARAM = 'setup_key';
const SETUP_KEY_COOKIE = 'hx_setup_key';
const SETUP_PAGE = '/_emdash/admin/setup';

/** Requests that can make someone the first admin. The wizard reads its step from `status`. */
function createsFirstAdmin(pathname: string): boolean {
  // Vercel adds a trailing slash to every path (vercel.json `trailingSlash`).
  const path = pathname.replace(/\/+$/, '');
  if (path.startsWith('/_emdash/api/setup')) return path !== '/_emdash/api/setup/status';
  return path.startsWith('/_emdash/api/auth/oauth/');
}

const digest = (value: string) => createHash('sha256').update(value).digest();

function matches(value: string | undefined, key: string): boolean {
  return value !== undefined && timingSafeEqual(digest(value), digest(key));
}

/** Whether EmDash's setup has finished; the same check as EmDash's own setup middleware. */
async function setupComplete(context: APIContext): Promise<boolean> {
  const db = context.locals.emdash?.db;
  if (!db) return false;
  try {
    const row = await db
      .selectFrom('options')
      .select('value')
      .where('name', '=', 'emdash:setup_complete')
      .executeTakeFirst();
    const value: unknown = row ? JSON.parse(row.value) : undefined;
    return value === true || value === 'true';
  } catch {
    // No options table yet: a fresh database.
    return false;
  }
}

function locked(context: APIContext, reason: string): Response {
  // Google sign-in is a page visit; the wizard's steps are API calls from the admin.
  if (context.request.method === 'GET') {
    const query = new URLSearchParams({ error: 'setup_locked', message: reason });
    return context.redirect(`${SETUP_PAGE}?${query}`);
  }
  return Response.json(
    { success: false, error: { code: 'SETUP_LOCKED', message: reason } },
    { status: 403, headers: { 'Cache-Control': 'no-store' } },
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, searchParams } = context.url;
  if (import.meta.env.DEV || !pathname.startsWith('/_emdash/')) return next();

  const key = process.env.EMDASH_SETUP_KEY;
  const offered = searchParams.get(SETUP_KEY_PARAM);
  if (offered !== null && key && matches(offered, key)) {
    context.cookies.set(SETUP_KEY_COOKIE, offered, {
      path: '/_emdash/',
      httpOnly: true,
      secure: context.url.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 60 * 60,
    });
    // Drop the key from the address bar and history.
    searchParams.delete(SETUP_KEY_PARAM);
    return context.redirect(`${pathname}${searchParams.size ? `?${searchParams}` : ''}`);
  }

  if (!createsFirstAdmin(pathname) || (await setupComplete(context))) return next();
  if (!key) return locked(context, 'Setup is locked: EMDASH_SETUP_KEY is not set on the server.');
  if (!matches(context.cookies.get(SETUP_KEY_COOKIE)?.value, key)) {
    return locked(
      context,
      `Setup is locked. Open ${SETUP_PAGE}?${SETUP_KEY_PARAM}=… with the key from EMDASH_SETUP_KEY.`,
    );
  }
  return next();
});
