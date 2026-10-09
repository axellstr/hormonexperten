import type { Locale } from '../config';

/** Prefix a site-relative href with the locale. External, mailto, tel and #fragment links pass through. */
export function localizeHref(href: string, lang: Locale): string {
  return href.startsWith('/') ? `/${lang}${href}` : href;
}

/** The current page's path in another locale: /en/foo/ → /de/foo/. */
export function switchLocale(pathname: string, lang: Locale): string {
  const [, , ...rest] = pathname.split('/');
  return `/${lang}/${rest.join('/')}`;
}

/** Fill `{name}` slots in a content string. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) =>
    key in values ? String(values[key]) : slot,
  );
}
