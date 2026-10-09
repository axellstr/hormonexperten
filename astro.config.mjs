// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

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
  vite: {
    plugins: [tailwindcss()],
  },
});
