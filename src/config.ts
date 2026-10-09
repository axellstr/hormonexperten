import { CONTENT_CHECK } from 'astro:env/server';

export const LOCALES = ['en', 'de', 'el', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** Endonyms for the language switcher. Russian is a website translation only (CLAUDE.md). */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  el: 'Ελληνικά',
  ru: 'Русский',
};

/** Font subset each locale needs first; preloaded in the layout. */
export const FONT_SUBSET: Record<Locale, string> = {
  en: 'latin',
  de: 'latin',
  el: 'greek',
  ru: 'cyrillic',
};

export const SITE_URL = 'https://hormonexperten.de';

// TODO: final Pabau booking URL, and whether "Book Now" goes straight to booking or to pricing.
export const BOOKING_URL = '#TODO-booking-url';

/** Logo wordmark, rendered as text next to the mark. */
export const BRAND = {
  wordmark: ['Hormon', 'experten'],
} as const;

/**
 * Content marked `needs_check: true` (unconfirmed claims, testimonials, logos, payment
 * methods...) is shown in `astro dev` and in work-in-progress builds (CONTENT_CHECK=warn, see
 * scripts/check-content.mjs), and left out of every other build.
 */
export const SHOW_UNCONFIRMED = import.meta.env.DEV || CONTENT_CHECK === 'warn';
