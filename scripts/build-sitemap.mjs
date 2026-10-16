// Writes /sitemap.xml after the build, read from the built pages themselves so it can never
// disagree with their heads (docs/seo/LOOP.md, T07): every page whose canonical is its own URL and
// that isn't noindex, with its hreflang alternates in Google's sitemap format. No <lastmod>: a date
// that isn't the real date the content changed teaches crawlers to ignore it.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import { outputDirs } from './output-dirs.mjs';

const ORIGIN = 'https://hormonexperten.de';

const attr = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1];
const escapeXml = (value) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '_astro' && entry.name !== 'fonts') yield* walk(path);
    } else if (entry.name === 'index.html') yield path;
  }
}

async function entries(root) {
  const found = [];
  for await (const file of walk(root)) {
    const path = `/${relative(root, file).split(sep).join('/')}`.replace(/index\.html$/, '');
    const html = await readFile(file, 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    const links = head.match(/<link\s[^>]*>/gi) ?? [];
    const url = `${ORIGIN}${path}`;
    const canonical = links.find((tag) => attr(tag, 'rel') === 'canonical');
    if (!canonical || attr(canonical, 'href') !== url) continue;
    if (/<meta\s[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(head)) continue;
    const alternates = links
      .filter((tag) => attr(tag, 'rel') === 'alternate' && attr(tag, 'hreflang'))
      .map((tag) => ({ hreflang: attr(tag, 'hreflang'), href: attr(tag, 'href') }));
    found.push({ url, alternates });
  }
  return found;
}

for (const root of outputDirs) {
  const found = await entries(root);
  // An alternate may only point at a page that is itself in the sitemap.
  const listed = new Set(found.map((page) => page.url));
  const urls = found
    .sort((a, b) => a.url.localeCompare(b.url))
    .map(({ url, alternates }) =>
      [
        '  <url>',
        `    <loc>${escapeXml(url)}</loc>`,
        ...alternates
          .filter(({ href }) => listed.has(href))
          .map(
            ({ hreflang, href }) =>
              `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}"/>`,
          ),
        '  </url>',
      ].join('\n'),
    );
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
  await writeFile(join(root, 'sitemap.xml'), xml);
  console.log(`sitemap.xml: ${urls.length} URLs in ${relative(process.cwd(), root) || '.'}`);
}
