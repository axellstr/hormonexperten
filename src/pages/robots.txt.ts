import type { APIRoute } from 'astro';
import { SITE_URL } from '../config';

// Replaces EmDash's robots.txt, which would point the sitemap at whatever host answers. Every
// crawler is welcome, search engines and AI answer engines alike, so the practice can be found and
// cited; CSS, scripts and images stay crawlable so pages render as patients see them. Hide a page
// with noindex, never with Disallow: a crawler that is kept out can't see the noindex. Only the
// admin and its API (not part of the public site) are off limits. Whether to turn away AI training
// crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot) is the practice's call (docs/seo/NEEDS-ALEX.md).
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /_emdash/',
      '',
      `Sitemap: ${new URL('/sitemap.xml', SITE_URL).href}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
