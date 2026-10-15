import { isDeepStrictEqual } from 'node:util';
import type { ContentFile, Split } from './model.ts';
import { POSITION_FIELD } from './model.ts';
import { isBlocks, itemSchema, planFields, type Plan } from './plan.ts';
import { richCodecs } from './portable-text.ts';

/**
 * Converts a content file (the JSON shape in src/content/, partial for translations) to EmDash
 * entries and back. Decoding gives the same JSON the files hold, so content.ts merges, typesets and
 * validates it exactly as before.
 */

type Json = Record<string, unknown>;

export interface Entry {
  slug: string;
  data: Json;
}

export interface Encoded {
  document: Json;
  /** Entries per split-off collection. */
  entities: Record<string, Entry[]>;
}

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function getPath(value: unknown, path: string[]): unknown {
  let current = value;
  for (const segment of path) current = isObject(current) ? current[segment] : undefined;
  return current;
}

function setPath(target: Json, path: string[], value: unknown) {
  let current = target;
  for (const segment of path.slice(0, -1)) {
    if (!isObject(current[segment])) current[segment] = {};
    current = current[segment] as Json;
  }
  current[path.at(-1)!] = value;
}

/** The block type a blocks field's items use. */
export const blockTypeOf = (collection: string, plan: Plan) => `${collection}__${plan.key}`;

export const documentPlan = (file: ContentFile): Plan[] =>
  planFields(file.schema, {
    ...file.plan,
    skip: file.splits.map((split) => ({ path: split.path })),
  });

export const entityPlan = (file: ContentFile, split: Split): Plan[] =>
  planFields(itemSchema(file.schema, split.path), { ...split.plan, skip: [{ path: ['id'] }] });

/** Called with every string stored, so the seed can pick a one-line or a multi-line field. */
export type Measure = (address: string, value: string) => void;

function encodeFields(
  plans: Plan[],
  value: unknown,
  blockType: (plan: Plan) => string | undefined,
  measure?: Measure,
  address = '',
): Json {
  const data: Json = {};
  for (const plan of plans) {
    const item = getPath(value, plan.path);
    if (item === undefined) continue;
    const at = `${address}${plan.key}`;
    if (plan.kind === 'scalar') {
      if (typeof item === 'string') measure?.(at, item);
      data[plan.key] = item;
    } else if (plan.kind === 'rich') {
      data[plan.key] = richCodecs[plan.rich].encode(item as never);
    } else if (Array.isArray(plan.of)) {
      const type = blockType(plan);
      const of = plan.of;
      data[plan.key] = (item as unknown[]).map((row) => ({
        ...(type ? { _type: type } : {}),
        ...encodeFields(of, row, () => undefined, measure, `${at}.`),
      }));
    } else {
      data[plan.key] = (item as unknown[]).map((row) => {
        if (typeof row === 'string') measure?.(`${at}.value`, row);
        return { value: row };
      });
    }
  }
  return data;
}

interface DecodeOptions {
  /** A translation: an empty list or rich text means "not translated", not "nothing". */
  translation: boolean;
  /** For a translation, the English entries it was made from (see `withoutCopies`). */
  english?: { document?: Json; entities: Record<string, Entry[]> };
}

/** A stored value without the keys EmDash gives list items and rich text blocks. */
function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== '_key' && key !== '_version')
        .map(([key, item]) => [key, comparable(item)]),
    );
  }
  return value;
}

/**
 * A translation made in the admin starts as a copy of the English entry. A field still identical
 * to English isn't translated: leave it out, so the page falls back to English and marks it as
 * English for screen readers, as it does for a field a translation file leaves out.
 */
function withoutCopies(plans: Plan[], data: Json, english: Json | undefined): Json {
  if (!english) return data;
  const result = { ...data };
  for (const plan of plans) {
    if (
      result[plan.key] !== undefined &&
      isDeepStrictEqual(comparable(result[plan.key]), comparable(english[plan.key]))
    ) {
      delete result[plan.key];
    }
  }
  return result;
}

function decodeFields(plans: Plan[], data: Json, options: DecodeOptions): Json {
  const result: Json = {};
  // EmDash stores an empty list for every unset blocks field. An empty list is only content when
  // the object it sits in has other values: an optional section never appears because of one.
  const empty: Plan[] = [];
  for (const plan of plans) {
    const raw = data[plan.key];
    if (raw === null || raw === undefined) continue;
    let value: unknown;
    if (plan.kind === 'scalar') {
      // Yes/no fields come back as 0 or 1 from some readers (the plugin's content API).
      value = plan.scalar.type === 'boolean' && (raw === 0 || raw === 1) ? raw === 1 : raw;
      // English decides what is confirmed: a translation can hide an item, never show one.
      if (options.translation && plan.path.at(-1) === 'needs_check' && value === false) continue;
    } else {
      if (!Array.isArray(raw)) continue;
      if (raw.length === 0) {
        if (!options.translation) empty.push(plan);
        continue;
      }
      if (plan.kind === 'rich') {
        value = richCodecs[plan.rich].decode(raw);
      } else if (Array.isArray(plan.of)) {
        const of = plan.of;
        value = raw.map((row) => (isObject(row) ? decodeFields(of, row, options) : {}));
      } else {
        value = raw.map((row) => (isObject(row) ? row.value : undefined));
      }
    }
    setPath(result, plan.path, value);
  }
  for (const plan of empty) {
    if (plan.path.length === 1 || isObject(getPath(result, plan.path.slice(0, -1)))) {
      setPath(result, plan.path, []);
    }
  }
  return result;
}

/** The items of a split-off list, with the id of the item each sits in (`parent`). */
function itemsAt(
  value: unknown,
  path: string[],
  parent?: string,
): { item: Json; parent?: string }[] {
  const star = path.indexOf('*');
  if (star === -1) {
    const list = getPath(value, path);
    return Array.isArray(list) ? list.filter(isObject).map((item) => ({ item, parent })) : [];
  }
  const outer = getPath(value, path.slice(0, star));
  if (!Array.isArray(outer)) return [];
  return outer
    .filter(isObject)
    .flatMap((item) => itemsAt(item, path.slice(star + 1), String(item.id)));
}

/**
 * A content file's JSON as EmDash entry data. `positions` gives each split-off item its place in
 * the English list, which every translation shares.
 */
export function encode(
  file: ContentFile,
  value: Json,
  positions: Map<string, number>,
  measure?: Measure,
): Encoded {
  const blockType = (plan: Plan) =>
    plan.kind === 'list' && isBlocks(plan) ? blockTypeOf(file.collection, plan) : undefined;
  const document = encodeFields(
    documentPlan(file),
    value,
    blockType,
    measure,
    `${file.collection}.`,
  );
  const entities: Record<string, Entry[]> = {};
  for (const split of file.splits) {
    const plans = entityPlan(file, split);
    const entityBlockType = (plan: Plan) =>
      plan.kind === 'list' && isBlocks(plan) ? blockTypeOf(split.collection, plan) : undefined;
    entities[split.collection] = itemsAt(value, split.path).map(({ item, parent }) => {
      const slug = String(item.id);
      const position = positions.get(`${split.collection}/${slug}`);
      if (position === undefined)
        throw new Error(`${split.collection}: "${slug}" isn't in English`);
      return {
        slug,
        data: {
          ...encodeFields(plans, item, entityBlockType, measure, `${split.collection}.`),
          [POSITION_FIELD]: position,
          ...(split.parentField ? { [split.parentField]: parent } : {}),
        },
      };
    });
  }
  return { document, entities };
}

/** Each split-off English item's position: its index in the file's list. */
export function positionsOf(file: ContentFile, english: Json): Map<string, number> {
  const positions = new Map<string, number>();
  for (const split of file.splits) {
    itemsAt(english, split.path).forEach(({ item }, index) => {
      positions.set(`${split.collection}/${String(item.id)}`, index);
    });
  }
  return positions;
}

/**
 * EmDash entries back to the file's JSON. Without a document entry or any item, the language has
 * no content of its own and the result is undefined.
 */
export function decode(
  file: ContentFile,
  document: Json | undefined,
  entities: Record<string, Entry[]>,
  options: DecodeOptions,
): Json | undefined {
  const hasItems = file.splits.some((split) => (entities[split.collection] ?? []).length > 0);
  if (!document && !hasItems) return undefined;
  const english = options.translation ? options.english : undefined;
  const documentPlans = documentPlan(file);
  const result = document
    ? decodeFields(
        documentPlans,
        withoutCopies(documentPlans, document, english?.document),
        options,
      )
    : {};

  for (const split of file.splits) {
    const plans = entityPlan(file, split);
    const englishItems = new Map(
      (english?.entities[split.collection] ?? []).map((entry) => [entry.slug, entry.data]),
    );
    const entries = [...(entities[split.collection] ?? [])].sort(
      (a, b) => Number(a.data[POSITION_FIELD] ?? 0) - Number(b.data[POSITION_FIELD] ?? 0),
    );
    const items = entries.map((entry) => ({
      parent: split.parentField ? String(entry.data[split.parentField] ?? '') : undefined,
      item: {
        id: entry.slug,
        ...decodeFields(
          plans,
          withoutCopies(plans, entry.data, englishItems.get(entry.slug)),
          options,
        ),
      },
    }));

    const star = split.path.indexOf('*');
    if (star === -1) {
      if (items.length > 0 || !options.translation) {
        setPath(
          result,
          split.path,
          items.map(({ item }) => item),
        );
      }
      continue;
    }
    // A list inside a list: each item goes into the outer item its parent field names. A
    // translation may cover items whose outer item it doesn't translate; it gets one with just
    // the id, which falls back to English.
    const outerPath = split.path.slice(0, star);
    const innerPath = split.path.slice(star + 1);
    let outer = getPath(result, outerPath) as Json[] | undefined;
    if (!Array.isArray(outer)) {
      outer = [];
      if (items.length > 0 || !options.translation) setPath(result, outerPath, outer);
    }
    for (const { item, parent } of items) {
      let owner = outer.find((candidate) => String(candidate.id) === parent);
      if (!owner) {
        owner = { id: parent };
        outer.push(owner);
      }
      const list = getPath(owner, innerPath);
      if (Array.isArray(list)) list.push(item);
      else setPath(owner, innerPath, [item]);
    }
  }
  return result;
}
