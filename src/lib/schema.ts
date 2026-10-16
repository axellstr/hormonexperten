import { SITE_URL, type Locale } from '../config';
import { getTeam } from './content';
import type { Site } from './schemas';

/**
 * schema.org JSON-LD that every page carries: the practice, the website and Dr. Wilden. It says
 * only what the footer and her team card already show, and nothing that is flagged `needs_check`,
 * even in a work-in-progress build. Never add a medical specialty, a rating, an address, consultation
 * languages or the second doctor (docs/seo/LOOP.md, hard rules).
 */

type Node = Record<string, unknown>;

const absolute = (path: string) => new URL(path, SITE_URL).href;

const ORGANIZATION_ID = absolute('/#organization');
const WEBSITE_ID = absolute('/#website');
const WILDEN_ID = absolute('/#person-isabella-wilden');

/** Confirmed items only: unlike `visible()`, work-in-progress builds don't relax this. */
const confirmed = <T extends { needs_check?: boolean }>(items: T[]) =>
  items.filter((item) => !item.needs_check);

function organization(site: Site): Node {
  const contacts = confirmed(site.footer.columns.flatMap((column) => column.items));
  const contact = (scheme: string) =>
    contacts.find((item) => item.href?.startsWith(scheme))?.href?.slice(scheme.length);
  // Profiles only: a chat link (WhatsApp) isn't one.
  const sameAs = confirmed(site.footer.social)
    .map((social) => social.href)
    .filter((href) => href.startsWith('https://') && !href.startsWith('https://wa.me/'));

  return {
    '@type': 'MedicalBusiness',
    '@id': ORGANIZATION_ID,
    name: 'Hormonexperten',
    url: absolute('/'),
    logo: absolute('/favicon.svg'),
    email: contact('mailto:'),
    telephone: contact('tel:'),
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

async function wilden(lang: Locale): Promise<Node | undefined> {
  const { members } = await getTeam(lang);
  const member = members.find((item) => item.id === 'isabella-wilden');
  if (!member || member.needs_check) return undefined;
  return {
    '@type': 'Person',
    '@id': WILDEN_ID,
    name: member.name,
    jobTitle: member.role,
    url: absolute(`/${lang}/team/${member.id}/`),
    sameAs: member.linkedin?.startsWith('https://') ? [member.linkedin] : undefined,
    worksFor: { '@id': ORGANIZATION_ID },
  };
}

/** The graph every page carries, serialised for a `<script type="application/ld+json">`. */
export async function siteGraph(lang: Locale, site: Site): Promise<string> {
  const person = await wilden(lang);
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      organization(site),
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: absolute('/'),
        name: 'Hormonexperten',
        publisher: { '@id': ORGANIZATION_ID },
      },
      ...(person ? [person] : []),
    ],
  };
  // Undefined values drop out of JSON; "</script>" inside a string would end the tag early.
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}
