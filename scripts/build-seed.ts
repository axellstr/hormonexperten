// Writes .emdash/seed.json, the content model and every entry for EmDash, from src/content/.
// EmDash applies the seed once, when a fresh database is set up (docs/emdash-plan.md).
// Run: npm run cms:seed
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { buildSeed } from '../src/lib/cms/seed.ts';

const LOCALES = ['en', 'de', 'el', 'ru'];
const content = new URL('../src/content/', import.meta.url);

const files: Record<string, Record<string, Record<string, unknown>>> = {};
for (const name of await readdir(content)) {
  for (const locale of LOCALES) {
    try {
      const text = await readFile(new URL(`${name}/${locale}.json`, content), 'utf8');
      (files[name] ??= {})[locale] = JSON.parse(text);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

const seed = buildSeed(files, LOCALES);
const target = new URL('../.emdash/seed.json', import.meta.url);
await mkdir(new URL('./', target), { recursive: true });
await writeFile(target, `${JSON.stringify(seed, null, 2)}\n`);
const entries = Object.values(seed.content as Record<string, unknown[]>).flat().length;
console.log(
  `Wrote .emdash/seed.json: ${(seed.collections as unknown[]).length} collections, ${entries} entries.`,
);
