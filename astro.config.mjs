// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from './integrations/sitemap.mjs';

export default defineConfig({
  site: 'https://hormonexperten.de',
  i18n: {
    locales: ['en', 'de', 'el', 'ru'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
  env: {
    schema: {
      // `warn`: work-in-progress build (see scripts/check-content.mjs and SHOW_UNCONFIRMED).
      CONTENT_CHECK: envField.enum({
        context: 'server',
        access: 'public',
        values: ['warn'],
        optional: true,
      }),
    },
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
