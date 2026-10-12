import type { Locale } from '../config';
import { getConditions, getServices, getSite, isVisible } from './content';
import { localizeHref } from './i18n';
import type { ConditionLink } from './schemas';

export interface ResolvedLink {
  label: string;
  /** Missing when the target has no page yet; only previewed, never built (see `needs_check`). */
  href?: string;
}

/**
 * A condition's link to another condition or a service, or null when it shouldn't show: the link
 * itself is unconfirmed, or its target page isn't built. Unknown ids fail the build.
 */
export function resolveLink(link: ConditionLink, lang: Locale): ResolvedLink | null {
  if (!isVisible(link)) return null;
  if (link.condition) {
    const page = getConditions(lang).pages.find((item) => item.id === link.condition);
    if (!page)
      throw new Error(`Condition link “${link.label}” names unknown page "${link.condition}"`);
    return isVisible(page)
      ? { label: link.label, href: localizeHref(`/conditions/${page.id}`, lang) }
      : null;
  }
  if (link.service) {
    const service = getSite(lang).services.find((item) => item.id === link.service);
    const page = getServices(lang).pages.find((item) => item.id === link.service);
    if (!service || !page)
      throw new Error(`Condition link “${link.label}” names unknown service "${link.service}"`);
    return isVisible(service) && isVisible(page)
      ? { label: link.label, href: localizeHref(service.href, lang) }
      : null;
  }
  return { label: link.label };
}

export function resolveLinks(links: ConditionLink[], lang: Locale): ResolvedLink[] {
  return links.flatMap((link) => resolveLink(link, lang) ?? []);
}
