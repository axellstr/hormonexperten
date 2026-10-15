// Converts every content file to EmDash entries and back, and reports anything that doesn't come
// back as it went in. Run: npm run cms:check
import { readdir, readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { decode, documentPlan, encode, entityPlan, positionsOf } from '../src/lib/cms/codec.ts';
import { isBlocks, type Plan } from '../src/lib/cms/plan.ts';
import { CONTENT_FILES } from '../src/lib/cms/model.ts';

const LOCALES = ['en', 'de', 'el', 'ru'];
const content = new URL('../src/content/', import.meta.url);

async function load(name: string, locale: string) {
  try {
    return JSON.parse(await readFile(new URL(`${name}/${locale}.json`, content), 'utf8'));
  } catch {
    return undefined;
  }
}

/** A legal line given as a list of one run renders as that run: the same thing written two ways. */
function canonical(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      key === 'lines' && Array.isArray(item) && item.length === 1
        ? canonical(item[0])
        : canonical(item),
    );
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [name, canonical(item, name)]),
    );
  }
  return value;
}

function differences(a: unknown, b: unknown, path = ''): string[] {
  if (isDeepStrictEqual(a, b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((key) =>
      differences((a as never)[key], (b as never)[key], `${path}/${key}`),
    );
  }
  return [`${path}: ${JSON.stringify(a)?.slice(0, 120)} → ${JSON.stringify(b)?.slice(0, 120)}`];
}

/** What EmDash hands back: unset blocks fields hold an empty list. */
function asStored(plans: Plan[], data: Record<string, unknown>) {
  const stored = JSON.parse(JSON.stringify(data));
  for (const plan of plans) {
    if (plan.kind === 'list' && isBlocks(plan) && stored[plan.key] === undefined)
      stored[plan.key] = [];
  }
  return stored;
}

let problems = 0;
const names = new Set(await readdir(content));
for (const file of CONTENT_FILES) names.delete(file.name);
if (names.size > 0) {
  console.error(`Not in the CMS model (src/lib/cms/model.ts): ${[...names].join(', ')}`);
  problems++;
}
for (const file of CONTENT_FILES) {
  const english = await load(file.name, 'en');
  const positions = positionsOf(file, english);
  for (const locale of LOCALES) {
    const value = await load(file.name, locale);
    if (!value) continue;
    const { document, entities } = encode(file, value, positions);
    const entries = Object.fromEntries(
      file.splits.map((split) => [
        split.collection,
        (entities[split.collection] ?? []).map((entry) => ({
          slug: entry.slug,
          data: asStored(entityPlan(file, split), entry.data),
        })),
      ]),
    );
    const back = decode(file, asStored(documentPlan(file), document), entries, {
      translation: locale !== 'en',
    });
    const found = differences(canonical(value), canonical(back));
    if (found.length > 0) {
      problems += found.length;
      console.log(`${file.name}/${locale}.json:\n  ${found.join('\n  ')}`);
    }
  }
}
console.log(problems ? `\n${problems} difference(s).` : 'Every file round-trips.');
process.exitCode = problems ? 1 : 0;
