import { z } from 'astro/zod';
import type { Locale } from '../config';

/**
 * Turns a content file's English and translated JSON into what pages render: the translation
 * merged over English, typeset, and checked against its schema. Used by content.ts when pages
 * load content, and by the CMS plugin to check an entry before it's published (cms/plugin.ts).
 */

export type Json = Record<string, unknown>;

export function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasId(value: unknown): value is Json & { id: string } {
  return isObject(value) && typeof value.id === 'string';
}

/**
 * Translated values win; anything a locale leaves out falls back to English. Arrays of items with
 * ids merge by id, in English order, so a translation can cover just some of them. Other arrays of
 * the same length merge item by item, so a translation only needs its text and keeps English hrefs,
 * images and `needs_check` flags. An array of a different length replaces the English one whole.
 */
function merge(base: unknown, override: unknown, path = ''): unknown {
  if (
    Array.isArray(base) &&
    Array.isArray(override) &&
    base.every(hasId) &&
    override.every(hasId)
  ) {
    const translated = new Map(override.map((item) => [item.id, item]));
    for (const id of translated.keys()) {
      if (!base.some((item) => item.id === id))
        throw new Error(`${path}: id "${id}" isn't in English`);
    }
    return base.map((item, index) => merge(item, translated.get(item.id), `${path}[${index}]`));
  }
  if (Array.isArray(base) && Array.isArray(override) && base.length === override.length) {
    return override.map((item, index) => {
      const english = base[index];
      if (isObject(english) && isObject(item) && 'id' in item && item.id !== english.id) {
        throw new Error(`${path}[${index}]: id "${item.id}" doesn't match English "${english.id}"`);
      }
      return merge(english, item, `${path}[${index}]`);
    });
  }
  if (isObject(base) && isObject(override)) {
    const merged: Json = { ...base };
    for (const [key, value] of Object.entries(override)) {
      // A translated legal section is its own text: its blocks don't line up with the English
      // ones (a list there may be lines here), so it replaces the English body whole.
      merged[key] =
        path.startsWith('legal/') && key === 'body'
          ? value
          : merge(base[key], value, path ? `${path}.${key}` : key);
    }
    return merged;
  }
  return override === undefined ? base : override;
}

const NBSP = ' ';
const NARROW_NBSP = ' ';

/** Keys that hold identifiers, paths or URLs rather than text to read. */
const VERBATIM_KEYS = new Set([
  'id',
  'href',
  'image',
  'logo',
  'icon',
  'source',
  'submenu',
  'condition',
  'service',
]);

/**
 * Non-breaking spaces where a line break would split what belongs together (CLAUDE.md,
 * Typography). Content files stay plain; this runs on every string as it loads.
 */
function typeset(text: string, lang: Locale): string {
  let result = text
    // "Dr. Wilden", "Prof. Rimkus": a title never ends a line.
    .replace(/\b(Dr|Prof|Nr|St|Mr|Mrs|Ms)\. /g, `$1.${NBSP}`)
    // "§ 5 DDG", "Art. 6 Abs. 1 lit. f DSGVO": a legal reference marker stays with its number
    // or letter, and a single-letter point stays with the act it belongs to.
    .replace(/(§|\bArt\.|\bAbs\.|\blit\.) (?=[\dA-Za-z])/g, `$1${NBSP}`)
    .replace(/(\blit\.\u00a0\p{L}) (?=\p{Lu}{2,})/gu, `$1${NBSP}`)
    // "z. B.", "d. h.", "т. е.": abbreviation pairs are one unit, set with a narrow space.
    .replace(/(^|[\s(])(\p{L})\. (\p{L})\./gu, `$1$2.${NARROW_NBSP}$3.`)
    // "48 hours", "35+ years", "17:00 Uhr", "20 €": a number stays with the word or currency it counts.
    .replace(/(\d[+%]?) (?=[\p{L}€])/gu, `$1${NBSP}`)
    // "+357 94 309399": a phone number never breaks across lines.
    .replace(/\+\d[\d ]*\d/g, (phone) => phone.replaceAll(' ', NBSP))
    // A numeric range stays whole: "9:00–17:00", "1997–2000".
    .replace(/(\d)–(?=\d)/g, '$1–\u2060')
    // A spaced dash never starts a line: "Wilden – mit", "Вильден — с".
    .replace(/ ([–—]) /g, `${NBSP}$1 `);
  // Russian convention: one- and two-letter words (в, с, и, на, по) don't hang at a line end.
  if (lang === 'ru') result = result.replace(/(?<=^|[\s«(])(\p{L}{1,2}) (?=\S)/gu, `$1${NBSP}`);
  return result;
}

function typesetAll(value: unknown, lang: Locale, key = ''): unknown {
  if (typeof value === 'string') return VERBATIM_KEYS.has(key) ? value : typeset(value, lang);
  if (Array.isArray(value)) return value.map((item) => typesetAll(item, lang, key));
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [name, typesetAll(item, lang, name)]),
    );
  }
  return value;
}

/**
 * The page content for one language: `translated` (partial, or undefined) over `english`. Throws
 * with a readable list of problems when the result doesn't match the schema.
 */
export function parseContent<S extends z.ZodType>(
  collection: string,
  schema: S,
  lang: Locale,
  english: Json,
  translated: Json | undefined,
): z.output<S> {
  // Each side is set by its own language's rules, so English that fills a gap in a translation
  // doesn't get Russian non-breaking spaces ("on EU prescription" as one unbreakable run).
  const merged = merge(
    typesetAll(english, 'en'),
    typesetAll(translated ?? {}, lang),
    `${collection}/${lang}`,
  );
  const result = schema.safeParse(merged);
  if (!result.success) {
    throw new Error(
      `Invalid content in src/content/${collection}/${lang}.json:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
