import { waitUntil } from '@vercel/functions';
import { CONTENT_CHECK } from 'astro:env/server';
import { ContentSaveRejectedError, definePlugin } from 'emdash';
import type { PluginContentItem as ContentItem, PluginContext } from 'emdash';
import { LOCALES, type Locale } from '../../config';
import { parseContent, type Json } from '../content-parse.ts';
import { STRAIGHT_QUOTE, TEXT_RULES } from '../content-rules.ts';
import { decode, type Entry } from './codec.ts';
import { CONTENT_FILES, type ContentFile } from './model.ts';

/**
 * The site's own EmDash plugin (registered in astro.config.mjs; docs/emdash-plan.md).
 *
 * - Before an entry is published, it checks the entry for copy that must never go live
 *   (content-rules.ts) and that the page it belongs to still builds in every language, the same
 *   checks the build runs. A failing entry stays unpublished and the editor sees why.
 * - After anything is published, unpublished or deleted, it asks Vercel to rebuild the site
 *   (VERCEL_DEPLOY_HOOK_URL): the public pages are prebuilt from the published content.
 * - It keeps each page's texts to one entry per language.
 */

const PLUGIN_ID = 'hormonexperten';
const VERSION = '1.0.0';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  el: 'Greek',
  ru: 'Russian',
};

/** Fields never shown on the site: notes to the practice may hold anything. */
const UNRENDERED = new Set(['check_note', 'check_notes']);

/** Fields allowed a TODO: the legal draft notice carries one on purpose, so unapproved text can't launch. */
const TODO_ALLOWED = new Set(['draft_notice']);

/**
 * Before launch the site builds with CONTENT_CHECK=warn, which lets TODO markers through while
 * content is still missing (scripts/check-content.mjs); publishing follows the same rule. The
 * other rules always hold.
 */
const TODO_BLOCKS = CONTENT_CHECK !== 'warn';

/** Keys of rich text internals rather than text. */
const STRUCTURAL = new Set(['_type', '_key', '_version', 'style', 'listItem', 'marks', 'href']);

/** Keys inside a field's value (repeater rows of plain text, rich text) that aren't field names. */
const TRANSPARENT = new Set(['value', 'text', 'children', 'markDefs']);

function fileOf(collection: string): ContentFile | undefined {
  return CONTENT_FILES.find(
    (file) =>
      file.collection === collection ||
      file.splits.some((split) => split.collection === collection),
  );
}

/** Every piece of text in an entry, with the name of the field it sits in. */
function* texts(value: unknown, field = ''): Generator<{ field: string; text: string }> {
  if (typeof value === 'string') {
    yield { field, text: value };
  } else if (Array.isArray(value)) {
    for (const item of value) yield* texts(item, field);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (STRUCTURAL.has(key)) continue;
      // Flattened fields (`focus__check_note`) and repeater rows name the field last.
      const name = TRANSPARENT.has(key) ? field : (key.split('__').at(-1) ?? key);
      yield* texts(item, name);
    }
  }
}

/** The first rule the entry's text breaks, as a sentence for the editor. */
function brokenRule(data: Json): string | undefined {
  for (const { field, text } of texts(data)) {
    if (UNRENDERED.has(field)) continue;
    for (const rule of [...TEXT_RULES, STRAIGHT_QUOTE]) {
      if (rule.name.startsWith('TODO') && (!TODO_BLOCKS || TODO_ALLOWED.has(field))) continue;
      const match = rule.pattern.exec(text);
      if (!match) continue;
      const start = Math.max(0, match.index - 30);
      const excerpt = text.slice(start, match.index + match[0].length + 30);
      return `${rule.name}, in “${field.replaceAll('_', ' ')}”: …${excerpt}…`;
    }
  }
  return undefined;
}

async function publishedEntries(
  ctx: PluginContext,
  collection: string,
  locale: string,
): Promise<ContentItem[]> {
  const items: ContentItem[] = [];
  let cursor: string | undefined;
  do {
    const page = await ctx.content!.list(collection, {
      where: { locale, status: 'published' },
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...page.items);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return items;
}

/**
 * A content file in one language as it will be once `candidate` is published: the published
 * entries, with the candidate in place of its published version.
 */
async function contentAfterPublish(
  ctx: PluginContext,
  file: ContentFile,
  locale: string,
  candidate: { collection: string; item: ContentItem },
): Promise<Json | undefined> {
  const read = async (collection: string, lang = locale): Promise<Entry[]> => {
    const items = await publishedEntries(ctx, collection, lang);
    if (candidate.collection === collection && candidate.item.locale === lang) {
      const index = items.findIndex((item) => item.id === candidate.item.id);
      if (index === -1) items.push(candidate.item);
      else items[index] = candidate.item;
    }
    return items.map((item) => ({ slug: item.slug ?? item.id, data: item.data }));
  };
  const entriesIn = async (lang: string) => {
    const [documents, ...lists] = await Promise.all([
      read(file.collection, lang),
      ...file.splits.map((split) => read(split.collection, lang)),
    ]);
    const entities = Object.fromEntries(
      file.splits.map((split, index) => [split.collection, lists[index]]),
    );
    return { document: documents[0]?.data, entities };
  };
  const own = await entriesIn(locale);
  if (locale === 'en') return decode(file, own.document, own.entities, { translation: false });
  const english = await entriesIn('en');
  return decode(file, own.document, own.entities, { translation: true, english });
}

/** What the editor calls the collection an entry is in, for messages: "FAQ questions". */
function labelOf(file: ContentFile, collection: string): string {
  const split = file.splits.find((item) => item.collection === collection);
  return (split?.label ?? file.label).toLowerCase().replace(/^faq/, 'FAQ');
}

/** Why the page would no longer build, in a few lines, or undefined when it builds. */
async function pageProblem(
  ctx: PluginContext,
  file: ContentFile,
  candidate: { collection: string; item: ContentItem },
): Promise<string | undefined> {
  const locale = candidate.item.locale ?? 'en';
  // An English change can break a translation (an item it translates is gone), so English checks
  // every language; a translation checks itself.
  const locales = locale === 'en' ? LOCALES : [locale as Locale];
  const english = await contentAfterPublish(ctx, file, 'en', candidate);
  if (!english) return `The English ${labelOf(file, candidate.collection)} have no content.`;
  for (const lang of locales) {
    const translated =
      lang === 'en' ? undefined : await contentAfterPublish(ctx, file, lang, candidate);
    try {
      parseContent(file.name, file.schema, lang, english, translated);
    } catch (error) {
      const detail = (error instanceof Error ? error.message : String(error))
        .split('\n')
        .slice(1, 4)
        .join(' ');
      return `The ${LANGUAGE_NAMES[lang] ?? lang} ${labelOf(file, candidate.collection)} would no longer build: ${detail}`;
    }
  }
  return undefined;
}

/** Asks Vercel to rebuild the site from the published content. */
function rebuild(ctx: PluginContext, why: string) {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    ctx.log.info(`Not rebuilding after ${why}: VERCEL_DEPLOY_HOOK_URL is not set.`);
    return;
  }
  const request = fetch(hook, { method: 'POST' })
    .then((response) => {
      if (response.ok) ctx.log.info(`Rebuilding the site after ${why}.`);
      else ctx.log.error(`The deploy hook answered ${response.status} after ${why}.`);
    })
    .catch((error: unknown) => ctx.log.error(`The deploy hook failed after ${why}.`, error));
  // Vercel freezes a function once it has answered; keep it alive until the hook is called.
  waitUntil(request);
}

const truncate = (text: string) => (text.length > 480 ? `${text.slice(0, 479)}…` : text);

export function createPlugin() {
  return definePlugin({
    id: PLUGIN_ID,
    version: VERSION,
    capabilities: ['content:read', 'content:write', 'hooks.content-policy:register'],
    hooks: {
      'content:beforeSave': async (event, ctx) => {
        // A page's texts are one entry per language; another one would never show.
        const file = CONTENT_FILES.find((item) => item.collection === event.collection);
        if (!file || !event.isNew || event.translationOf) return;
        const existing = await ctx.content!.list(event.collection, {
          limit: 1,
          where: { locale: event.locale ?? 'en' },
        });
        if (existing.items.length > 0) {
          throw new ContentSaveRejectedError(
            `The ${file.label.toLowerCase()} already has an entry in this language. Edit it, or add a translation from it.`,
          );
        }
      },
      'content:beforePublish': {
        timeout: 15_000,
        handler: async (event, ctx) => {
          const item = event.content as unknown as ContentItem;
          const file = fileOf(event.collection);
          if (!file) return;
          const broken = brokenRule(item.data ?? {});
          if (broken) return { cancel: true, reason: truncate(`Not published. ${broken}`) };
          const problem = await pageProblem(ctx, file, { collection: event.collection, item });
          if (problem) return { cancel: true, reason: truncate(`Not published. ${problem}`) };
        },
      },
      'content:afterPublish': async (event, ctx) => {
        rebuild(ctx, `publishing ${event.collection}`);
      },
      'content:afterUnpublish': async (event, ctx) => {
        rebuild(ctx, `unpublishing ${event.collection}`);
      },
      'content:afterDelete': async (event, ctx) => {
        rebuild(ctx, `deleting from ${event.collection}`);
      },
      'content:afterRestore': async (event, ctx) => {
        rebuild(ctx, `restoring ${event.collection}`);
      },
    },
  });
}
