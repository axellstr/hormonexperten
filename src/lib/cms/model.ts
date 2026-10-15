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
    splits: [],
  },
  {
    name: 'home',
    schema: homeSchema,
    collection: 'home',
    label: 'Home page',
    titleField: 'meta__title',
    splits: [],
  },
  {
    name: 'faq',
    schema: faqSchema,
    collection: 'faq_page',
    label: 'FAQ page',
    titleField: 'meta__title',
    splits: [
      {
        path: ['categories', '*', 'items'],
        collection: 'faq_items',
        label: 'FAQ questions',
        labelSingular: 'FAQ question',
        titleField: 'question',
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
    splits: [
      {
        path: ['members'],
        collection: 'team_members',
        label: 'Team members',
        labelSingular: 'Team member',
        titleField: 'name',
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
    splits: [
      {
        path: ['pages'],
        collection: 'service_pages',
        label: 'Service pages',
        labelSingular: 'Service page',
        titleField: 'meta__title',
      },
    ],
  },
  {
    name: 'conditions',
    schema: conditionsSchema,
    collection: 'conditions_page',
    label: 'Conditions overview',
    titleField: 'meta__title',
    splits: [
      {
        path: ['pages'],
        collection: 'condition_pages',
        label: 'Condition pages',
        labelSingular: 'Condition page',
        titleField: 'name',
      },
    ],
  },
  {
    name: 'approach',
    schema: approachSchema,
    collection: 'approach',
    label: 'Our approach page',
    titleField: 'meta__title',
    splits: [],
  },
  {
    name: 'contact',
    schema: contactSchema,
    collection: 'contact',
    label: 'Contact page',
    titleField: 'meta__title',
    splits: [],
  },
  {
    name: 'pricing',
    schema: pricingSchema,
    collection: 'pricing',
    label: 'Pricing page',
    titleField: 'meta__title',
    splits: [],
  },
  {
    name: 'legal',
    schema: legalSchema,
    collection: 'legal_texts',
    label: 'Legal pages: shared labels',
    titleField: 'contents_label',
    splits: [
      {
        path: ['pages'],
        collection: 'legal_pages',
        label: 'Legal pages',
        labelSingular: 'Legal page',
        titleField: 'title',
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
