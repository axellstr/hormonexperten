// Fails the build when placeholder or forbidden copy reaches the built site (CLAUDE.md, content rules).
// Runs after `astro build` over every HTML file in dist/.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

const rules = [
  { name: 'TODO marker (missing content)', pattern: /TODO/ },
  { name: 'Lorem ipsum', pattern: /lorem ipsum/i },
  { name: 'Placeholder "Title"', pattern: />\s*Title\s*</ },
  { name: 'Grey image placeholder', pattern: /data-placeholder/ },
  { name: 'Copy borrowed from another clinic', pattern: /Sheila de Liz|Hormone Online Clinic/i },
  {
    name: '"Endocrinologist": Dr. Wilden must never be called one',
    pattern: /endocrinolog|endokrinolog|ενδοκρινολόγ|эндокринолог/i,
  },
  { name: 'Brand written "Hormon Experten" (use Hormonexperten)', pattern: /Hormon Experten/i },
];

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

const problems = [];
for await (const file of htmlFiles(dist)) {
  const html = await readFile(file, 'utf8');
  for (const { name, pattern } of rules) {
    const global = new RegExp(pattern.source, `${pattern.flags}g`);
    for (const match of html.matchAll(global)) {
      const start = Math.max(0, match.index - 50);
      const excerpt = html.slice(start, match.index + match[0].length + 50).replace(/\s+/g, ' ');
      problems.push(`  ${relative(dist, file)}  ${name}\n    …${excerpt}…`);
    }
  }
}

// Typography (CLAUDE.md): typographic quotes and apostrophes only. Straight ones in content files
// are typing slips; each locale uses its own marks (“ ” en, „ “ de, « » el and ru).
const content = fileURLToPath(new URL('../src/content/', import.meta.url));
async function* jsonFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jsonFiles(path);
    else if (entry.name.endsWith('.json')) yield path;
  }
}
function* strings(value) {
  if (typeof value === 'string') yield value;
  else if (value && typeof value === 'object')
    for (const item of Object.values(value)) yield* strings(item);
}
for await (const file of jsonFiles(content)) {
  for (const text of strings(JSON.parse(await readFile(file, 'utf8')))) {
    const match = /["']/.exec(text);
    if (match) {
      const excerpt = text.slice(Math.max(0, match.index - 40), match.index + 40);
      problems.push(
        `  ${relative(content, file)}  Straight quote (use ’ “ ” „ « »)\n    …${excerpt}…`,
      );
    }
  }
}

// CONTENT_CHECK=warn reports problems without failing, for work-in-progress deployments
// (set it per environment in Vercel, e.g. Preview only). Unset, the build fails.
const warnOnly = process.env.CONTENT_CHECK === 'warn';

if (problems.length > 0) {
  const log = warnOnly ? console.warn : console.error;
  log(`\nContent check ${warnOnly ? 'warning' : 'failed'}: ${problems.length} problem(s)\n`);
  log(problems.join('\n'));
  if (warnOnly) {
    console.warn('\nCONTENT_CHECK=warn: not failing the build. Not for the launch deployment.\n');
  } else {
    console.error('\nFix the content in src/content/ (or the image) and rebuild.\n');
    process.exit(1);
  }
} else {
  console.log('Content check passed.');
}
