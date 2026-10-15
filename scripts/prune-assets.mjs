// Removes files from _astro/ that nothing in the build links to. Runs after `astro build`, on every
// copy of the public site (see output-dirs.mjs).
// src/lib/assets.ts imports every image so content files can name them, and Astro copies each
// imported file into the build. It deletes an original only once it has resized it, so a photo
// whose section is hidden (`needs_check`, e.g. an unconfirmed team member) ships at full size
// (5 MB, 6240px), unlinked but publicly downloadable. SVG icons inlined into the HTML are copied
// too. Nothing links to either.
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { outputDirs, serverDir } from './output-dirs.mjs';

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

async function prune(dist) {
  const assets = join(dist, '_astro');

  // Every file that can link to another: pages, styles, scripts, data and SVG, plus the server
  // code that renders the admin.
  const texts = new Map();
  for (const dir of [dist, serverDir ?? []].flat()) {
    for await (const file of files(dir)) {
      if (/\.(html|css|m?js|json|xml|txt|svg|webmanifest)$/.test(file)) {
        texts.set(file, await readFile(file, 'utf8'));
      }
    }
  }

  // A file is kept if any other file names it. Repeat, since a removed file may have been the only
  // one naming another.
  const removed = [];
  let changed;
  do {
    changed = false;
    for (const name of await readdir(assets)) {
      const path = join(assets, name);
      const linked = [...texts].some(([file, text]) => file !== path && text.includes(name));
      if (linked) continue;
      removed.push({ path, size: (await stat(path)).size });
      texts.delete(path);
      await rm(path);
      changed = true;
    }
  } while (changed);

  const total = removed.reduce((sum, file) => sum + file.size, 0);
  console.log(
    `Pruned ${removed.length} unlinked file(s) from ${relative(dist, assets)}/ (${(total / 1e6).toFixed(1)} MB).`,
  );
}

for (const dist of outputDirs) await prune(dist);
