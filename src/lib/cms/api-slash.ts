import { defineMiddleware } from 'astro:middleware';

/**
 * Runs before EmDash's own middleware (`middleware.outer` in astro.config.mjs). Vercel adds a
 * trailing slash to every path (vercel.json `trailingSlash`), the admin's API calls included, but
 * EmDash matches its API paths without one. With the slash, `/_emdash/api/auth/invite/` falls under
 * EmDash's public prefix for accepting invites, the session is skipped and inviting a user fails
 * with "Admin privileges required"; `/_emdash/api/auth/passkey/options/` stops being public. So the
 * slash comes off before EmDash sees the path.
 */
export const onRequest = defineMiddleware((context, next) => {
  const { pathname, search } = context.url;
  if (pathname.startsWith('/_emdash/api/') && pathname.endsWith('/')) {
    return next(`${pathname.replace(/\/+$/, '')}${search}`);
  }
  return next();
});
