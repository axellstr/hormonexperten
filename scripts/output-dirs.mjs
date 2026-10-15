// Where `astro build` leaves the public site. With server routes (the EmDash admin) Astro writes the
// prerendered pages to dist/client/, and the Vercel adapter copies them to .vercel/output/static/,
// the folder Vercel serves. A purely static build writes dist/.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

const vercel = dir('.vercel/output/static/');
const client = dir('dist/client/');

/** Every copy of the public site the build left behind. */
export const outputDirs = existsSync(client)
  ? [client, ...(existsSync(vercel) ? [vercel] : [])]
  : [dir('dist/')];

/**
 * Server code, which links to admin scripts and styles that no prerendered page names. The Vercel
 * adapter builds it into .vercel/output/_functions/; without the adapter it's dist/server/.
 */
export const serverDir = [dir('.vercel/output/_functions/'), dir('dist/server/')].find((path) =>
  existsSync(path),
);

/** The copy that is deployed. */
export const servedDir = outputDirs.at(-1);
