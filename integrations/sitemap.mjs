import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @typedef {{ url: string; alternates: { hreflang: string; href: string }[] }} Page */

/** @param {string} tag @param {string} name */
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** @param {string} value */
const escapeXml = (value) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Writes /sitemap.xml after the build, read from the built pages themselves so it can never
 * disagree with their heads: every page whose canonical URL is its own and that isn't noindex,
 * with its hreflang alternates in Google's sitemap format.
 *
 * No <lastmod>: a date that isn't the real date the content changed teaches crawlers to ignore it.
 *
 * @returns {import('astro').AstroIntegration}
 */
export default function sitemap() {
  /** @type {URL} */
  let site;

  return {
    name: 'hormonexperten:sitemap',
    hooks: {
      'astro:config:done': ({ config }) => {
        if (!config.site) throw new Error('sitemap: set `site` in astro.config.mjs');
        site = new URL(config.site);
      },
      'astro:build:done': async ({ dir, pages, logger }) => {
        const root = fileURLToPath(dir);
        /** @type {Page[]} */
        const found = [];

        for (const { pathname } of pages) {
          const html = await readFile(join(root, pathname, 'index.html'), 'utf-8').catch(() => '');
          const head = html.slice(0, html.indexOf('</head>'));
          const links = head.match(/<link\b[^>]*>/g) ?? [];
          const canonical = links.map(
            (tag) => attr(tag, 'rel') === 'canonical' && attr(tag, 'href'),
          );
          const url = new URL(pathname, site).href;

          if (!canonical.includes(url)) continue;
          if (/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/.test(head)) continue;

          const alternates = links
            .filter((tag) => attr(tag, 'rel') === 'alternate' && attr(tag, 'hreflang'))
            .map((tag) => ({
              hreflang: attr(tag, 'hreflang') ?? '',
              href: attr(tag, 'href') ?? '',
            }));
          found.push({ url, alternates });
        }

        // An alternate may only point at a page that is itself in the sitemap.
        const listed = new Set(found.map((page) => page.url));
        const entries = found
          .sort((a, b) => a.url.localeCompare(b.url))
          .map(({ url, alternates }) =>
            [
              `  <url>`,
              `    <loc>${escapeXml(url)}</loc>`,
              ...alternates
                .filter(({ href }) => listed.has(href))
                .map(
                  ({ hreflang, href }) =>
                    `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}"/>`,
                ),
              `  </url>`,
            ].join('\n'),
          );

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...entries,
          '</urlset>',
          '',
        ].join('\n');

        await writeFile(join(root, 'sitemap.xml'), xml);
        logger.info(`sitemap.xml: ${entries.length} URLs`);
      },
    },
  };
}
