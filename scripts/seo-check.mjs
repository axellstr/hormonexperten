// SEO checks on the built site (docs/seo/LOOP.md, T01). Runs after `astro build` over the deployed
// copy (output-dirs.mjs), or over the folder given as the first argument. Fails on metadata that
// breaks the content rules or hurts indexing; title and description lengths are warnings only.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import { servedDir } from './output-dirs.mjs';

const root = process.argv[2] ?? servedDir;
const ORIGIN = 'https://hormonexperten.de';
// As in src/config.ts, which can't be imported outside Astro.
const LOCALES = ['en', 'de', 'el', 'ru'];

/** Copy that must never appear, in any page, file, meta tag, JSON-LD or comment. */
const FORBIDDEN = [
  {
    // Catches the banned title and `medicalSpecialty: "Endocrine"` in every script.
    id: 'endocrin',
    name: '“endocrin…” (never Dr. Wilden’s title or specialty)',
    pattern: /endocrin|endokrin|ενδοκριν|эндокрин/iu,
  },
  {
    id: 'availableLanguage',
    name: 'availableLanguage (no consultation languages in schema)',
    pattern: /availableLanguage/i,
  },
  {
    id: 'AggregateRating',
    name: 'AggregateRating (no rating markup about the practice)',
    pattern: /AggregateRating/i,
  },
  { id: 'lorem', name: 'Lorem ipsum', pattern: /lorem ipsum/i },
  { id: 'phone', name: 'Placeholder phone number', pattern: /23125[\s\u00a0]*456/ },
  {
    // The language switcher's own label, “Русский”, doesn't match.
    id: 'russian-care',
    name: 'Russian-language care implied (Russian is a website translation only)',
    pattern:
      /in Russian|Russian-speaking|auf Russisch|russischsprachig|in russischer Sprache|στα ρωσικά|στη ρωσική|на русском|по-русски|русскоязычн/iu,
  },
];

/** Missing content: allowed only on pages that aren't indexed. */
const TODO = { id: 'todo', name: 'TODO: on an indexable page', pattern: /TODO:/ };

/**
 * Exceptions Alex has approved, for example a page that has to name the endocrine system itself:
 * { rule: 'endocrin', path: '/en/some-page/', text: 'the whole phrase around the match' }.
 * A match passes only inside that phrase (any case), so the rule still catches everything else.
 */
const ALLOWED = [];

function allowed(rule, path, text, match) {
  return ALLOWED.some(({ rule: id, path: page, text: phrase }) => {
    if (id !== rule || page !== path) return false;
    const around = text.slice(
      Math.max(0, match.index - phrase.length),
      match.index + phrase.length,
    );
    return around.toLowerCase().includes(phrase.toLowerCase());
  });
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

/** /en/faq/index.html → /en/faq/; other files keep their name. */
const urlPath = (file) =>
  `/${relative(root, file).split(sep).join('/')}`.replace(/(^|\/)index\.html$/, '$1');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const decode = (text) =>
  text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] !== '#') return ENTITIES[entity.toLowerCase()] ?? match;
    const hex = entity[1].toLowerCase() === 'x';
    return String.fromCodePoint(parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
  });

const attr = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1];
const tags = (html, name) => html.match(new RegExp(`<${name}\\s[^>]*>`, 'gi')) ?? [];

function parsePage(html) {
  const metas = tags(html, 'meta');
  const links = tags(html, 'link');
  const meta = (name) => metas.find((tag) => attr(tag, 'name') === name);
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  const description = meta('description');
  return {
    lang: /<html\s[^>]*\blang="([^"]*)"/.exec(html)?.[1],
    title: title === undefined ? undefined : decode(title).trim(),
    description: description === undefined ? undefined : decode(attr(description, 'content') ?? ''),
    noindex: /noindex/i.test(attr(meta('robots') ?? '', 'content') ?? ''),
    canonical: attr(links.find((tag) => attr(tag, 'rel') === 'canonical') ?? '', 'href'),
    alternates: links
      .filter((tag) => attr(tag, 'rel') === 'alternate' && attr(tag, 'hreflang'))
      .map((tag) => ({ code: attr(tag, 'hreflang'), url: attr(tag, 'href') })),
    h1: html.match(/<h1[\s>]/gi)?.length ?? 0,
    jsonLd: [
      ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
    ].map((match) => match[1]),
    hrefs: tags(html, 'a').flatMap((tag) => attr(tag, 'href') ?? []),
  };
}

const files = new Set();
const pages = new Map();
const texts = [];
for await (const file of walk(root)) {
  const path = urlPath(file);
  files.add(path);
  if (path.startsWith('/_astro/') || path.startsWith('/fonts/')) continue;
  if (file.endsWith('.html')) {
    const html = await readFile(file, 'utf8');
    pages.set(path, { path, html, ...parsePage(html) });
  } else if (/\.(txt|xml)$/.test(file)) {
    texts.push({ path, text: await readFile(file, 'utf8') });
  }
}

const problems = [];
const warnings = [];
const report = (path, name, detail) => problems.push({ path, name, detail });

/** Each forbidden rule once per file, with the first match and how often it occurs. */
function scan(path, text, rules) {
  for (const { id, name, pattern } of rules) {
    const matches = [...text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))].filter(
      (match) => !allowed(id, path, text, match),
    );
    if (matches.length === 0) continue;
    const { index } = matches[0];
    const excerpt = text
      .slice(Math.max(0, index - 50), index + matches[0][0].length + 50)
      .replace(/\s+/g, ' ');
    report(path, `${name}${matches.length > 1 ? ` (${matches.length}×)` : ''}`, `…${excerpt}…`);
  }
}

/** The page an absolute or site-relative URL points to, or why it can't be one. */
function target(url) {
  const path = decodeURI(url.startsWith(ORIGIN) ? url.slice(ORIGIN.length) || '/' : url).replace(
    /[?#].*$/,
    '',
  );
  if (files.has(path)) return { path };
  if (files.has(`${path}/`)) return { path, problem: 'no trailing slash (points at a redirect)' };
  return { path, problem: 'not in the build' };
}

/** Canonical and hreflang URLs: absolute, on the production origin, ending in a slash. */
function checkAbsolute(page, label, url) {
  if (!url) return;
  if (!url.startsWith(`${ORIGIN}/`) || !url.endsWith('/')) {
    report(page.path, `${label} not an absolute ${ORIGIN}/…/ URL`, url);
    return;
  }
  const { problem } = target(url);
  if (problem) report(page.path, `${label} ${problem}`, url);
}

const indexable = [...pages.values()].filter((page) => !page.noindex);

for (const page of pages.values()) {
  scan(page.path, page.html, page.noindex ? FORBIDDEN : [...FORBIDDEN, TODO]);

  for (const json of page.jsonLd) {
    try {
      JSON.parse(json);
    } catch (error) {
      report(page.path, 'JSON-LD doesn’t parse', error.message);
    }
  }

  for (const href of page.hrefs) {
    if (!href.startsWith(`${ORIGIN}/`) && !(href.startsWith('/') && !href.startsWith('//')))
      continue;
    const { path, problem } = target(href);
    // Server routes (the CMS admin and the cron job) aren't in the static build.
    if (problem && !/^\/(_emdash|api)\//.test(path)) report(page.path, `Link ${problem}`, href);
  }
}

for (const page of indexable) {
  const locale = page.path.split('/')[1];
  if (!LOCALES.includes(locale)) report(page.path, 'Indexable page outside /{lang}/');
  if (!page.title) report(page.path, 'No <title>');
  if (!page.description) report(page.path, 'No meta description');
  if (!page.canonical) report(page.path, 'No canonical');
  if (page.lang !== locale)
    report(page.path, `<html lang="${page.lang ?? ''}"> doesn’t match the route`);
  if (page.h1 !== 1) report(page.path, `${page.h1} <h1> elements (needs exactly one)`);
  checkAbsolute(page, 'Canonical', page.canonical);

  const self = `${ORIGIN}${page.path}`;
  for (const { code, url } of page.alternates) {
    checkAbsolute(page, `hreflang="${code}"`, url);
    if (code === 'x-default' || url === self) continue;
    const other = pages.get(target(url).path);
    if (!other) continue;
    if (other.lang !== code)
      report(page.path, `hreflang="${code}" points at a page in “${other.lang}”`, url);
    // x-default doesn't count: it points at the English page from every locale.
    if (!other.alternates.some((back) => back.code === page.lang && back.url === self)) {
      report(page.path, `hreflang="${code}" not reciprocal (that page doesn’t link back)`, url);
    }
  }

  if (page.title && [...page.title].length > 60) {
    warnings.push(
      `  ${page.path}  title ${[...page.title].length} characters (max 60)\n    ${page.title}`,
    );
  }
  const length = page.description ? [...page.description].length : 0;
  if (page.description && (length < 70 || length > 160)) {
    warnings.push(
      `  ${page.path}  description ${length} characters (70–160)\n    ${page.description}`,
    );
  }
}

for (const field of ['title', 'description']) {
  const seen = new Map();
  for (const page of indexable) {
    if (page[field]) seen.set(page[field], [...(seen.get(page[field]) ?? []), page.path]);
  }
  for (const [value, paths] of seen) {
    if (paths.length > 1) report(paths[0], `Duplicate ${field} on ${paths.join(', ')}`, value);
  }
}

for (const { path, text } of texts) scan(path, text, [...FORBIDDEN, TODO]);

if (warnings.length > 0) {
  console.warn(`\nSEO check: ${warnings.length} warning(s), not failing\n`);
  console.warn(warnings.join('\n'));
}

// CONTENT_CHECK=warn reports problems without failing, as in check-content.mjs: for
// work-in-progress deployments only. Unset, the build fails.
const warnOnly = process.env.CONTENT_CHECK === 'warn';

if (problems.length > 0) {
  const log = warnOnly ? console.warn : console.error;
  problems.sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name));
  log(`\nSEO check ${warnOnly ? 'warning' : 'failed'}: ${problems.length} problem(s)\n`);
  log(
    problems
      .map(({ path, name, detail }) => `  ${path}  ${name}${detail ? `\n    ${detail}` : ''}`)
      .join('\n'),
  );
  if (warnOnly) {
    console.warn('\nCONTENT_CHECK=warn: not failing the build. Not for the launch deployment.\n');
  } else {
    console.error(`\n${pages.size} pages checked in ${relative(process.cwd(), root) || '.'}.\n`);
    process.exit(1);
  }
} else {
  console.log(`SEO check passed (${pages.size} pages, ${indexable.length} indexable).`);
}
