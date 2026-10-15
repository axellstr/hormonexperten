// @ts-check
import { fileURLToPath } from 'node:url';
import { defineConfig, envField, sessionDrivers } from 'astro/config';

import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import emdash, { local, s3 } from 'emdash/astro';
import { postgres, sqlite } from 'emdash/db';

// The CMS (docs/emdash-plan.md). On Vercel the content lives in Supabase: Postgres reached through
// the PG* variables and Storage through the S3_* ones. Both are read when the server runs, never
// written into the build. Without them (local work) EmDash uses a SQLite file and a folder in
// .emdash/. Public pages stay prerendered; only the admin and its API run on the server.
const postgresConfigured = Boolean(process.env.PGHOST);
const storageConfigured = Boolean(process.env.S3_ENDPOINT);

export default defineConfig({
  site: 'https://hormonexperten.de',
  adapter: vercel(),
  i18n: {
    locales: ['en', 'de', 'el', 'ru'],
    defaultLocale: 'en',
    // Pages route themselves through src/pages/[lang]/. Astro's own locale routing would also
    // claim EmDash's admin at /_emdash/admin and answer it with a 404.
    routing: 'manual',
  },
  // Editors' admin logins. Postgres in production, so they live in the same EU database.
  session: {
    driver: postgresConfigured
      ? { entrypoint: new URL('./src/lib/session-driver.ts', import.meta.url).href }
      : sessionDrivers.fs({ base: '.emdash/sessions' }),
  },
  integrations: [
    react(),
    emdash({
      database: postgresConfigured
        ? postgres({ pool: { max: 3, connectionTimeoutMillis: 10_000 } })
        : sqlite({ url: 'file:./.emdash/data.db' }),
      storage: storageConfigured
        ? s3()
        : local({ directory: './.emdash/uploads', baseUrl: '/_emdash/api/media/file' }),
      // The public origin comes from EMDASH_SITE_URL on Vercel; locally EmDash uses localhost.
      admin: { siteName: 'Hormonexperten', locales: ['en', 'de'] },
      // The site's own plugin: checks entries before they're published and has Vercel rebuild the
      // site afterwards (src/lib/cms/plugin.ts).
      plugins: [
        {
          id: 'hormonexperten',
          version: '1.0.0',
          format: 'native',
          entrypoint: fileURLToPath(new URL('./src/lib/cms/plugin.ts', import.meta.url)),
          options: {},
        },
      ],
      // No editor pill on the public pages: they stay identical for everyone and script-free.
      toolbar: false,
      mcp: false,
    }),
  ],
  env: {
    schema: {
      // Where pages read their content: the JSON files in src/content/ (default) or EmDash.
      CONTENT_SOURCE: envField.enum({
        context: 'server',
        access: 'public',
        values: ['json', 'emdash'],
        default: 'json',
      }),
      // `warn`: work-in-progress build (see scripts/check-content.mjs and SHOW_UNCONFIRMED).
      CONTENT_CHECK: envField.enum({
        context: 'server',
        access: 'public',
        values: ['warn'],
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Keep /*! licence notices in minified scripts (the glass helix is a port of MIT code).
    build: { rolldownOptions: { output: { comments: { legal: true } } } },
  },
});
