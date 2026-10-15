import { defineLiveCollection } from 'astro:content';
import { emdashLoader } from 'emdash/runtime';

// Connects EmDash to Astro's content layer; pages read it through src/lib/content-source.ts.
export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
