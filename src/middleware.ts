import { defineMiddleware } from 'astro:middleware';

// Required by `i18n.routing: 'manual'` (astro.config.mjs). Pages route their own locale through
// src/pages/[lang]/, so there is nothing to do here.
export const onRequest = defineMiddleware((_context, next) => next());
