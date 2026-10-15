import type { z } from 'astro/zod';
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
} from '../schemas.ts';
import type { PlanOptions } from './plan.ts';

/**
 * The content model in EmDash (docs/emdash-plan.md). Each file in src/content/ is one EmDash
 * collection with one entry per language. Lists of things an editor works on one at a time (FAQ
 * questions, team members, service, condition and legal pages) are split off into a collection of
 * their own, one entry per item and language, with the item's `id` as the entry's slug.
 */

export interface Split {
  /** The list whose items become entries; `*` stands for every item of an enclosing list. */
  path: string[];
  collection: string;
  label: string;
  labelSingular: string;
  /** Field shown as the entry's title in the admin. */
  titleField: string;
  /** The page an item is shown on (see `ContentFile.urlPattern`); `{slug}` is the item's id. */
  urlPattern: string;
  /** For a list inside a list (FAQ questions in categories): the field naming the outer item. */
  parentField?: string;
  plan?: PlanOptions;
}

export interface ContentFile {
  /** Folder in src/content/. */
  name: string;
  schema: z.ZodType;
  collection: string;
  label: string;
  titleField: string;
  /**
   * The page these texts are shown on, without the language: the admin's "View" links. EmDash
   * adds /de/, /el/ or /ru/ itself but never /en/; vercel.json forwards those English addresses.
   */
  urlPattern: string;
  plan?: PlanOptions;
  splits: Split[];
}

/** Non-translatable field holding an entry's place in its list. */
export const POSITION_FIELD = 'position';

export const CONTENT_FILES: ContentFile[] = [
  {
    name: 'site',
    schema: siteSchema,
    collection: 'site',
    label: 'Menu, service cards and footer',
    titleField: 'footer__copyright',
    urlPattern: '/',
    splits: [],
  },
  {
    name: 'home',
    schema: homeSchema,
    collection: 'home',
    label: 'Home page',
    titleField: 'meta__title',
    urlPattern: '/',
    splits: [],
  },
  {
    name: 'faq',
    schema: faqSchema,
    collection: 'faq_page',
    label: 'FAQ page',
    titleField: 'meta__title',
    urlPattern: '/faq/',
    splits: [
      {
        path: ['categories', '*', 'items'],
        collection: 'faq_items',
        label: 'FAQ questions',
        labelSingular: 'FAQ question',
        titleField: 'question',
        urlPattern: '/faq/',
        parentField: 'category',
      },
    ],
  },
  {
    name: 'team',
    schema: teamSchema,
    collection: 'team_page',
    label: 'Team page',
    titleField: 'meta__title',
    urlPattern: '/team/',
    splits: [
      {
        path: ['members'],
        collection: 'team_members',
        label: 'Team members',
        labelSingular: 'Team member',
        titleField: 'name',
        urlPattern: '/team/{slug}/',
        plan: { rich: [{ path: ['profile', 'story', 'body'], rich: 'paragraphs' }] },
      },
    ],
  },
  {
    name: 'services',
    schema: servicesSchema,
    collection: 'services_page',
    label: 'Services overview',
    titleField: 'meta__title',
    urlPattern: '/services/',
    splits: [
      {
        path: ['pages'],
        collection: 'service_pages',
        label: 'Service pages',
        labelSingular: 'Service page',
        titleField: 'meta__title',
        urlPattern: '/services/{slug}/',
      },
    ],
  },
  {
    name: 'conditions',
    schema: conditionsSchema,
    collection: 'conditions_page',
    label: 'Conditions overview',
    titleField: 'meta__title',
    urlPattern: '/conditions/',
    splits: [
      {
        path: ['pages'],
        collection: 'condition_pages',
        label: 'Condition pages',
        labelSingular: 'Condition page',
        titleField: 'name',
        urlPattern: '/conditions/{slug}/',
      },
    ],
  },
  {
    name: 'approach',
    schema: approachSchema,
    collection: 'approach',
    label: 'Our approach page',
    titleField: 'meta__title',
    urlPattern: '/our-approach/',
    splits: [],
  },
  {
    name: 'contact',
    schema: contactSchema,
    collection: 'contact',
    label: 'Contact page',
    titleField: 'meta__title',
    urlPattern: '/contact/',
    splits: [],
  },
  {
    name: 'pricing',
    schema: pricingSchema,
    collection: 'pricing',
    label: 'Pricing page',
    titleField: 'meta__title',
    urlPattern: '/pricing/',
    splits: [],
  },
  {
    name: 'legal',
    schema: legalSchema,
    collection: 'legal_texts',
    label: 'Legal pages: shared labels',
    titleField: 'contents_label',
    urlPattern: '/impressum/',
    splits: [
      {
        path: ['pages'],
        collection: 'legal_pages',
        label: 'Legal pages',
        labelSingular: 'Legal page',
        titleField: 'title',
        urlPattern: '/{slug}/',
        plan: { rich: [{ path: ['sections', '*', 'body'], rich: 'legal' }] },
      },
    ],
  },
];

export function contentFile(name: string): ContentFile {
  const file = CONTENT_FILES.find((item) => item.name === name);
  if (!file) throw new Error(`No content file "${name}" in the CMS model`);
  return file;
}
