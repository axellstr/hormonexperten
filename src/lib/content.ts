import { z } from 'astro/zod';
import { DEFAULT_LOCALE, SHOW_UNCONFIRMED, type Locale } from '../config';
import {
  faqSchema,
  homeSchema,
  legalSchema,
  servicesSchema,
  siteSchema,
  teamSchema,
} from './schemas';

type Json = Record<string, unknown>;

const files = import.meta.glob<Json>('../content/*/*.json', { eager: true, import: 'default' });

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasId(value: unknown): value is Json & { id: string } {
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
      merged[key] = merge(base[key], value, path ? `${path}.${key}` : key);
    }
    return merged;
  }
  return override === undefined ? base : override;
}

const NBSP = ' ';
const NARROW_NBSP = ' ';

/** Keys that hold identifiers, paths or URLs rather than text to read. */
const VERBATIM_KEYS = new Set(['id', 'href', 'image', 'logo', 'icon', 'source', 'submenu']);

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
    // "48 hours", "35+ years", "17:00 Uhr": a number stays with the word it counts.
    .replace(/(\d[+%]?) (?=\p{L})/gu, `$1${NBSP}`)
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

function load<S extends z.ZodType>(collection: string, schema: S, lang: Locale): z.output<S> {
  const english = files[`../content/${collection}/en.json`];
  if (!english) throw new Error(`Missing src/content/${collection}/en.json`);
  const translated = files[`../content/${collection}/${lang}.json`] ?? {};
  const merged = merge(english, translated, `${collection}/${lang}`);
  const result = schema.safeParse(typesetAll(merged, lang));
  if (!result.success) {
    throw new Error(
      `Invalid content in src/content/${collection}/${lang}.json:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

export const getSite = (lang: Locale) => load('site', siteSchema, lang);
export const getHome = (lang: Locale) => load('home', homeSchema, lang);
export const getFaq = (lang: Locale) => load('faq', faqSchema, lang);
export const getTeam = (lang: Locale) => load('team', teamSchema, lang);
export const getServices = (lang: Locale) => load('services', servicesSchema, lang);
export const getLegal = (lang: Locale) => load('legal', legalSchema, lang);

/**
 * The language a team member's `role` or `profile` is written in: the locale when its own file
 * has it, otherwise English (the fallback). Pages mark fallback text with `lang` so screen
 * readers don't read English with a German, Greek or Russian voice.
 */
export function memberLang(lang: Locale, id: string, key: 'role' | 'profile'): Locale {
  const members = files[`../content/team/${lang}.json`]?.members;
  const translated =
    Array.isArray(members) &&
    members.some((member) => hasId(member) && member.id === id && key in member);
  return translated ? lang : DEFAULT_LOCALE;
}

/** The language a service page's body is written in: the locale when its file has one, else English. */
export function servicePageLang(lang: Locale, id: string): Locale {
  const pages = files[`../content/services/${lang}.json`]?.pages;
  const translated =
    Array.isArray(pages) && pages.some((page) => hasId(page) && page.id === id && 'about' in page);
  return translated ? lang : DEFAULT_LOCALE;
}

/** The language a legal page is written in: the locale when its file has it, else English. */
export function legalPageLang(lang: Locale, id: string): Locale {
  const pages = files[`../content/legal/${lang}.json`]?.pages;
  const translated =
    Array.isArray(pages) &&
    pages.some((page) => hasId(page) && page.id === id && 'sections' in page);
  return translated ? lang : DEFAULT_LOCALE;
}

type Checkable = { needs_check?: boolean };

export function isVisible(item: Checkable): boolean {
  return !item.needs_check || SHOW_UNCONFIRMED;
}

export function visible<T extends Checkable>(items: T[]): T[] {
  return items.filter(isVisible);
}
