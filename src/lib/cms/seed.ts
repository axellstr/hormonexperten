import { blockTypeOf, documentPlan, encode, entityPlan, positionsOf } from './codec.ts';
import { CONTENT_FILES, POSITION_FIELD, type ContentFile, type Split } from './model.ts';
import { isBlocks, type Plan, type Scalar } from './plan.ts';

/**
 * The EmDash seed (.emdash/seed.json): the content model and every entry, built from the files in
 * src/content/ by scripts/build-seed.ts. EmDash applies it once, when a fresh database is set up.
 */

type Json = Record<string, unknown>;

/** Field names whose text runs to sentences: edited in a multi-line box. */
const LONG_TEXT = new Set([
  'answer',
  'approach',
  'bio',
  'blurb',
  'body',
  'consent',
  'description',
  'detail',
  'intro',
  'lead',
  'note',
  'quote',
  'safety',
  'statement',
  'subtitle',
  'summary',
  'text',
]);

const humanize = (segment: string) =>
  segment === 'id' ? 'ID' : segment.charAt(0).toUpperCase() + segment.slice(1).replaceAll('_', ' ');

const labelOf = (plan: Plan) => plan.path.map(humanize).join(' › ');

interface Context {
  collection: string;
  /** Addresses of string fields that hold multi-line or long text. */
  long: Set<string>;
  blockTypes: Json[];
}

function scalarField(scalar: Scalar, address: string, slug: string, context: Context) {
  if (scalar.type !== 'string') return { type: scalar.type };
  const name = slug.split('__').at(-1) ?? slug;
  return { type: context.long.has(address) || LONG_TEXT.has(name) ? 'text' : 'string' };
}

function repeaterField(plan: Plan & { kind: 'list' }, address: string, context: Context): Json {
  const subFields = Array.isArray(plan.of)
    ? plan.of.map((child) => {
        if (child.kind !== 'scalar') throw new Error(`${address}: too deeply nested for EmDash`);
        return {
          slug: child.key,
          label: labelOf(child),
          ...scalarField(child.scalar, `${address}.${child.key}`, child.key, context),
          ...(child.scalar.options ? { options: child.scalar.options } : {}),
        };
      })
    : [
        {
          slug: 'value',
          label: 'Text',
          ...scalarField(plan.of, `${address}.value`, plan.key, context),
          ...(plan.of.options ? { options: plan.of.options } : {}),
        },
      ];
  return { type: 'repeater', validation: { subFields } };
}

function fieldOf(plan: Plan, address: string, context: Context, inBlock = false): Json {
  const base = { slug: plan.key, label: labelOf(plan) };
  if (plan.kind === 'scalar') {
    return {
      ...base,
      ...scalarField(plan.scalar, address, plan.key, context),
      ...(plan.scalar.options ? { validation: { options: plan.scalar.options } } : {}),
    };
  }
  if (plan.kind === 'rich') return { ...base, type: 'portableText' };
  if (!isBlocks(plan)) return { ...base, ...repeaterField(plan, address, context) };
  if (inBlock) throw new Error(`${address}: blocks can't hold blocks in EmDash`);

  const slug = blockTypeOf(context.collection, plan);
  context.blockTypes.push({
    slug,
    label: labelOf(plan),
    currentVersion: 1,
    versions: [
      {
        version: 1,
        fields: (plan.of as Plan[]).map((child) =>
          fieldOf(child, `${address}.${child.key}`, context, true),
        ),
      },
    ],
  });
  return { ...base, type: 'blocks', validation: { allowedTypes: [slug] } };
}

function collectionOf(
  slug: string,
  label: string,
  labelSingular: string,
  titleField: string,
  plans: Plan[],
  context: Omit<Context, 'collection'>,
  extra: { fields?: Json[]; group?: string; sortOrder: number; listColumns?: string[] },
): Json {
  const withCollection = { ...context, collection: slug };
  return {
    slug,
    label,
    labelSingular,
    supports: ['drafts', 'revisions'],
    titleField,
    sortOrder: extra.sortOrder,
    ...(extra.group ? { group: extra.group } : {}),
    admin: {
      ...(extra.listColumns ? { listColumns: extra.listColumns } : {}),
      // A page's texts are one entry per language: nothing to create from the dashboard.
      ...(extra.group ? { quickCreate: false } : {}),
    },
    fields: [
      ...plans.map((plan) => fieldOf(plan, `${slug}.${plan.key}`, withCollection)),
      ...(extra.fields ?? []),
    ],
  };
}

function splitFields(split: Split): Json[] {
  return [
    {
      slug: POSITION_FIELD,
      label: 'Order (lower comes first)',
      type: 'integer',
      translatable: false,
      indexed: true,
    },
    ...(split.parentField
      ? [{ slug: split.parentField, label: 'Category ID', type: 'string', translatable: false }]
      : []),
  ];
}

/** `files[name][locale]`: the parsed JSON of src/content/{name}/{locale}.json. */
export function buildSeed(files: Record<string, Record<string, Json>>, locales: string[]): Json {
  const long = new Set<string>();
  const measure = (address: string, value: string) => {
    if (value.length > 80 || value.includes('\n')) long.add(address);
  };

  // Entries first: encoding measures the text, which picks the field types below.
  const content: Record<string, Json[]> = {};
  const add = (collection: string, entry: Json) => (content[collection] ??= []).push(entry);
  for (const file of CONTENT_FILES) {
    const english = files[file.name]?.en;
    if (!english) throw new Error(`Missing src/content/${file.name}/en.json`);
    const positions = positionsOf(file, english);
    for (const locale of locales) {
      const value = files[file.name]?.[locale];
      if (!value) continue;
      const { document, entities } = encode(file, value, positions, measure);
      const translation = locale !== 'en';
      if (!translation || Object.keys(document).length > 0) {
        add(file.collection, entryOf(file.collection, file.name, locale, document));
      }
      for (const [collection, entries] of Object.entries(entities)) {
        for (const entry of entries)
          add(collection, entryOf(collection, entry.slug, locale, entry.data));
      }
    }
  }

  const blockTypes: Json[] = [];
  const context = { long, blockTypes };
  const collections: Json[] = [];
  CONTENT_FILES.forEach((file: ContentFile, index) => {
    collections.push(
      collectionOf(
        file.collection,
        file.label,
        file.label,
        file.titleField,
        documentPlan(file),
        context,
        {
          group: 'Page texts',
          sortOrder: 100 + index,
        },
      ),
    );
    file.splits.forEach((split, splitIndex) => {
      collections.push(
        collectionOf(
          split.collection,
          split.label,
          split.labelSingular,
          split.titleField,
          entityPlan(file, split),
          context,
          {
            fields: splitFields(split),
            sortOrder: 10 + index * 10 + splitIndex,
            listColumns: [POSITION_FIELD, ...(split.parentField ? [split.parentField] : [])],
          },
        ),
      );
    });
  });

  return {
    $schema: 'https://emdashcms.com/seed.schema.json',
    version: '1',
    defaultLocale: 'en',
    meta: {
      name: 'Hormonexperten',
      description: 'Site content, generated from src/content/ by scripts/build-seed.ts.',
    },
    settings: { title: 'Hormonexperten' },
    blockTypes,
    collections,
    content,
  };
}

function entryOf(collection: string, slug: string, locale: string, data: Json): Json {
  return {
    id: `${collection}:${slug}:${locale}`,
    slug,
    locale,
    status: 'published',
    ...(locale === 'en' ? {} : { translationOf: `${collection}:${slug}:en` }),
    data,
  };
}
