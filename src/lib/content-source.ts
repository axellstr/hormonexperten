import { CONTENT_SOURCE } from 'astro:env/server';
import { getEmDashCollection } from 'emdash';
import type { Locale } from '../config';
import { decode, type Entry } from './cms/codec.ts';
import { contentFile } from './cms/model.ts';

export type Json = Record<string, unknown>;

const files = import.meta.glob<Json>('../content/*/*.json', { eager: true, import: 'default' });

/**
 * The raw content of one collection in one language, or undefined when that language has none.
 * The one place that knows where content is stored: the JSON files in src/content/, or EmDash
 * when CONTENT_SOURCE=emdash (docs/emdash-plan.md). Everything else reads content through
 * content.ts.
 */
export async function readContent(collection: string, lang: Locale): Promise<Json | undefined> {
  if (CONTENT_SOURCE === 'emdash') return readFromEmDash(collection, lang);
  return files[`../content/${collection}/${lang}.json`];
}

/** Published entries of one EmDash collection in one language. */
async function entriesOf(collection: string, lang: Locale): Promise<Entry[]> {
  const { entries, error } = await getEmDashCollection(collection, {
    locale: lang,
    status: 'published',
  });
  if (error) throw new Error(`EmDash: can't read "${collection}" (${lang})`, { cause: error });
  return entries.map((entry) => {
    const data = entry.data as Json;
    return { slug: typeof data.slug === 'string' ? data.slug : entry.id, data };
  });
}

// A build reads every page's content many times; read each collection once per language. The dev
// server reads afresh, so edits in the admin show on reload.
const cache = new Map<string, Promise<Json | undefined>>();

function readFromEmDash(name: string, lang: Locale): Promise<Json | undefined> {
  const key = `${name}/${lang}`;
  const cached = cache.get(key);
  if (cached && !import.meta.env.DEV) return cached;
  const result = (async () => {
    const file = contentFile(name);
    const [documents, ...lists] = await Promise.all([
      entriesOf(file.collection, lang),
      ...file.splits.map((split) => entriesOf(split.collection, lang)),
    ]);
    const entities = Object.fromEntries(
      file.splits.map((split, index) => [split.collection, lists[index]]),
    );
    return decode(file, documents[0]?.data, entities, { translation: lang !== 'en' });
  })();
  cache.set(key, result);
  return result;
}
