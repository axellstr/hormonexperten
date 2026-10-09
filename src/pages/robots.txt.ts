import type { APIRoute } from 'astro';
import { SITE_URL } from '../config';

// Every crawler is welcome: search engines and the AI answer engines (ChatGPT, Claude, Perplexity,
// Gemini...) alike, so the practice can be found and cited. Nothing is hidden: CSS, JS and images
// stay crawlable so pages render for Google as they do for patients. Pages that shouldn't be
// indexed say so with <meta name="robots" content="noindex"> instead, which crawlers can only
// see if they're allowed in.
export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${new URL('/sitemap.xml', SITE_URL).href}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
