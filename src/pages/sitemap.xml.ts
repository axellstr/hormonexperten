import type { APIRoute } from 'astro';

// Replaces EmDash's sitemap, which lists CMS entries and has no URLs for this site's pages. This
// file is a placeholder: scripts/build-sitemap.mjs overwrites it after the build with the real list,
// read from the built pages so it can never disagree with their heads.
export const prerender = true;

export const GET: APIRoute = () =>
  new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n',
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
