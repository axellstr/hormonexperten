import type { z } from 'astro/zod';
import { DEFAULT_LOCALE, SHOW_UNCONFIRMED, type Locale } from '../config';
import { hasId, isObject, parseContent } from './content-parse';
import { readContent } from './content-source';
import {
  approachSchema,
  conditionsSchema,
  contactSchema,
  faqSchema,
  homeSchema,
  legalSchema,
  pricingSchema,
  servicesSchema,
  siteSchema,
  teamSchema,
} from './schemas';

async function load<S extends z.ZodType>(
  collection: string,
  schema: S,
  lang: Locale,
): Promise<z.output<S>> {
  const english = await readContent(collection, 'en');
  if (!english) throw new Error(`Missing src/content/${collection}/en.json`);
  return parseContent(collection, schema, lang, english, await readContent(collection, lang));
}

export const getSite = (lang: Locale) => load('site', siteSchema, lang);
export const getHome = (lang: Locale) => load('home', homeSchema, lang);
export const getFaq = (lang: Locale) => load('faq', faqSchema, lang);
export const getTeam = (lang: Locale) => load('team', teamSchema, lang);
export const getServices = (lang: Locale) => load('services', servicesSchema, lang);
export const getLegal = (lang: Locale) => load('legal', legalSchema, lang);
export const getApproach = (lang: Locale) => load('approach', approachSchema, lang);
export const getContact = (lang: Locale) => load('contact', contactSchema, lang);
export const getConditions = (lang: Locale) => load('conditions', conditionsSchema, lang);
export const getPricing = (lang: Locale) => load('pricing', pricingSchema, lang);

/**
 * The language a team member's `role` or `profile` is written in: the locale when its own file
 * has it, otherwise English (the fallback). Pages mark fallback text with `lang` so screen
 * readers don't read English with a German, Greek or Russian voice.
 */
export async function memberLang(
  lang: Locale,
  id: string,
  key: 'role' | 'profile',
): Promise<Locale> {
  const members = (await readContent('team', lang))?.members;
  const translated =
    Array.isArray(members) &&
    members.some((member) => hasId(member) && member.id === id && key in member);
  return translated ? lang : DEFAULT_LOCALE;
}

/**
 * The language a part of a service page is written in (its about text by default): the locale
 * when its file has that part, else English.
 */
export async function servicePageLang(
  lang: Locale,
  id: string,
  key: 'about' | 'comparison' = 'about',
): Promise<Locale> {
  const pages = (await readContent('services', lang))?.pages;
  const translated =
    Array.isArray(pages) && pages.some((page) => hasId(page) && page.id === id && key in page);
  return translated ? lang : DEFAULT_LOCALE;
}

/** The language a condition page's body is written in: the locale when its file has one, else English. */
export async function conditionPageLang(lang: Locale, id: string): Promise<Locale> {
  const pages = (await readContent('conditions', lang))?.pages;
  const translated =
    Array.isArray(pages) && pages.some((page) => hasId(page) && page.id === id && 'intro' in page);
  return translated ? lang : DEFAULT_LOCALE;
}

/** The language a legal page is written in: the locale when its file has it, else English. */
export async function legalPageLang(lang: Locale, id: string): Promise<Locale> {
  const pages = (await readContent('legal', lang))?.pages;
  const translated =
    Array.isArray(pages) &&
    pages.some((page) => hasId(page) && page.id === id && 'sections' in page);
  return translated ? lang : DEFAULT_LOCALE;
}

/**
 * The language a value in a content file is written in: the locale when its own file has it,
 * otherwise English (the fallback). `path` leads to the value, e.g. ['story', 'founder', 'quote'].
 */
export async function textLang(collection: string, lang: Locale, path: string[]): Promise<Locale> {
  let value: unknown = await readContent(collection, lang);
  for (const key of path) value = isObject(value) ? value[key] : undefined;
  return value === undefined ? DEFAULT_LOCALE : lang;
}

type Checkable = { needs_check?: boolean };

export function isVisible(item: Checkable): boolean {
  return !item.needs_check || SHOW_UNCONFIRMED;
}

export function visible<T extends Checkable>(items: T[]): T[] {
  return items.filter(isVisible);
}
