import type { z } from 'astro/zod';

/**
 * How a content file's values are stored as EmDash fields, read off its Zod schema (schemas.ts).
 * Nested objects flatten into one field per value, named by their path (`hero.trust.title` is the
 * field `hero__trust__title`); lists become repeaters, or blocks when their items hold lists or
 * rich text of their own. EmDash can't nest deeper than that, so the content model splits off
 * anything deeper as its own collection (model.ts).
 */

type Schema = z.ZodType;

export type ScalarType = 'string' | 'number' | 'integer' | 'boolean' | 'select';

export interface Scalar {
  type: ScalarType;
  options?: string[];
}

/** Rich text kinds with their own codec (portable-text.ts). */
export type RichKind = 'paragraphs' | 'legal';

export type Plan =
  | { kind: 'scalar'; key: string; path: string[]; scalar: Scalar }
  /** A list of plain values (`Scalar`) or of objects (`Plan[]`, relative to the item). */
  | { kind: 'list'; key: string; path: string[]; of: Scalar | Plan[] }
  | { kind: 'rich'; key: string; path: string[]; rich: RichKind };

/** Paths with `*` for "every item of this list". */
export interface PathRule {
  path: string[];
}

export interface PlanOptions {
  /** Values stored as rich text instead of field by field. */
  rich?: (PathRule & { rich: RichKind })[];
  /** Values left out: lists split off into a collection of their own. */
  skip?: PathRule[];
}

/** Field and sub-field names EmDash reserves for itself. */
const RENAMES: Record<string, string> = { id: 'key' };

const SEPARATOR = '__';

export function keyOf(path: string[]): string {
  return path.map((segment) => RENAMES[segment] ?? segment).join(SEPARATOR);
}

function def(schema: Schema) {
  return (schema as unknown as { _zod: { def: Record<string, unknown> & { type: string } } })._zod
    .def;
}

/** The schema inside optional, default, nullable and transform wrappers. */
export function unwrap(schema: Schema): Schema {
  const d = def(schema);
  if (d.type === 'optional' || d.type === 'default' || d.type === 'nullable') {
    return unwrap(d.innerType as Schema);
  }
  if (d.type === 'pipe') return unwrap(d.in as Schema);
  return schema;
}

export function shapeOf(schema: Schema): Record<string, Schema> {
  const inner = unwrap(schema);
  const d = def(inner);
  if (d.type !== 'object') throw new Error(`Expected an object schema, got ${d.type}`);
  return d.shape as Record<string, Schema>;
}

/** The schema of a list's items: `itemSchema(faqSchema, ['categories', '*', 'items'])`. */
export function itemSchema(schema: Schema, path: string[]): Schema {
  let current = unwrap(schema);
  for (const segment of path) {
    const d = def(current);
    if (segment === '*') {
      if (d.type !== 'array') throw new Error(`"*" on a ${d.type}`);
      current = unwrap(d.element as Schema);
    } else {
      current = unwrap(shapeOf(current)[segment]);
    }
  }
  const d = def(current);
  if (d.type !== 'array') throw new Error(`${path.join('.')} isn't a list`);
  return unwrap(d.element as Schema);
}

function scalarOf(schema: Schema, path: string[]): Scalar {
  const d = def(unwrap(schema));
  switch (d.type) {
    case 'string':
      return { type: 'string' };
    case 'number': {
      const checks = (d.checks as { _zod: { def: { format?: string } } }[] | undefined) ?? [];
      const integer = checks.some((check) => check._zod.def.format === 'safeint');
      return { type: integer ? 'integer' : 'number' };
    }
    case 'boolean':
      return { type: 'boolean' };
    case 'enum':
      return { type: 'select', options: Object.values(d.entries as Record<string, string>) };
    case 'literal':
      return { type: 'select', options: (d.values as string[]).map(String) };
    default:
      throw new Error(`${path.join('.')}: no EmDash field for a ${d.type}`);
  }
}

/** Rules below `path` (a list), relative to one of its items. */
function within<T extends PathRule>(rules: T[] | undefined, path: string[]): T[] {
  const prefix = [...path, '*'];
  return (rules ?? [])
    .filter((rule) => prefix.every((segment, index) => rule.path[index] === segment))
    .map((rule) => ({ ...rule, path: rule.path.slice(prefix.length) }));
}

const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((segment, index) => segment === b[index]);

function planValue(schema: Schema, path: string[], options: PlanOptions): Plan[] {
  if (options.skip?.some((rule) => same(rule.path, path))) return [];
  const rich = options.rich?.find((rule) => same(rule.path, path));
  if (rich) return [{ kind: 'rich', key: keyOf(path), path, rich: rich.rich }];

  const inner = unwrap(schema);
  const d = def(inner);
  if (d.type === 'object') return planFields(inner, options, path);
  if (d.type === 'array') {
    const element = unwrap(d.element as Schema);
    const of =
      def(element).type === 'object'
        ? planFields(element, {
            rich: within(options.rich, path),
            skip: within(options.skip, path),
          })
        : scalarOf(element, path);
    return [{ kind: 'list', key: keyOf(path), path, of }];
  }
  return [{ kind: 'scalar', key: keyOf(path), path, scalar: scalarOf(inner, path) }];
}

/** The fields an object is stored in, in schema order. */
export function planFields(schema: Schema, options: PlanOptions = {}, path: string[] = []): Plan[] {
  return Object.entries(shapeOf(schema)).flatMap(([name, child]) =>
    planValue(child, [...path, name], options),
  );
}

/** Whether a list's items need EmDash blocks (they hold lists or rich text) or fit a repeater. */
export function isBlocks(plan: Plan & { kind: 'list' }): boolean {
  return Array.isArray(plan.of) && plan.of.some((child) => child.kind !== 'scalar');
}
