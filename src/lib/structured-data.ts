import type { ImageMetadata } from 'astro';
import { getImage as optimize } from 'astro:assets';
import { BRAND, LOCALES, SITE_URL, type Locale } from '../config';
import { getImage } from './assets';
import { visible } from './content';
import { localizeHref } from './i18n';
import type { FaqItem, Profile, Site, TeamMember } from './schemas';

/**
 * schema.org JSON-LD for search engines and AI answer engines. Every value comes from content the
 * page already shows and that passed `visible()`: structured data never says more than the page
 * (Google's rule, and CLAUDE.md's: no unconfirmed claims, never "endocrinologist", no ratings).
 */

type Node = Record<string, unknown>;

export type Crumb = { label: string; href?: string };

export interface PageData {
  type?: 'WebPage' | 'FAQPage' | 'ProfilePage' | 'CollectionPage' | 'MedicalWebPage';
  /** The page's visible breadcrumb, as passed to <Breadcrumb>. */
  breadcrumb?: Crumb[];
  about?: Node;
  mainEntity?: Node | Node[];
}

const absolute = (path: string) => new URL(path, SITE_URL).href;

/** A page link as its canonical URL: pages are built as folders, so the URL ends in a slash. */
const pageUrl = (href: string) => absolute(href.endsWith('/') ? href : `${href}/`);

const ORGANIZATION_ID = absolute('/#organization');
const WEBSITE_ID = absolute('/#website');

export const organizationRef = { '@id': ORGANIZATION_ID };

/** One id per person across all languages, so every page describes the same entity. */
const personId = (id: string) => absolute(`/#person-${id}`);

/** A 1200px WebP of a content image, as an absolute URL. */
async function imageUrl(image: ImageMetadata) {
  const { src } = await optimize({
    src: image,
    width: Math.min(1200, image.width),
    format: 'webp',
  });
  return absolute(src);
}

function organization(site: Site): Node {
  const contacts = visible(site.footer.columns.flatMap((column) => column.items));
  const contact = (scheme: string) =>
    contacts.find((item) => item.href?.startsWith(scheme))?.href?.slice(scheme.length);
  const sameAs = visible(site.footer.social)
    .map((social) => social.href)
    .filter((href) => href.startsWith('https://'));

  return {
    '@type': 'MedicalOrganization',
    '@id': ORGANIZATION_ID,
    name: BRAND.wordmark.join(''),
    url: absolute('/'),
    logo: { '@type': 'ImageObject', url: absolute('/favicon.svg') },
    description: site.footer.blurb,
    email: contact('mailto:'),
    telephone: contact('tel:'),
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

function website(): Node {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absolute('/'),
    name: BRAND.wordmark.join(''),
    inLanguage: [...LOCALES],
    publisher: organizationRef,
  };
}

function breadcrumbList(items: Crumb[], url: string): Node {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href ? pageUrl(item.href) : url,
    })),
  };
}

/** The whole graph for one page: the practice, the site, and the page with what it is about. */
export function pageGraph(props: {
  site: Site;
  lang: Locale;
  url: string;
  title: string;
  description: string;
  data?: PageData;
}): string {
  const { site, lang, url, title, description, data = {} } = props;
  const page: Node = {
    '@type': data.type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: lang,
    isPartOf: { '@id': WEBSITE_ID },
    breadcrumb: data.breadcrumb && breadcrumbList(data.breadcrumb, url),
    about: data.about,
    mainEntity: data.mainEntity,
  };
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [organization(site), website(), page],
  };
  // "</script>" inside a string would end the tag early.
  return JSON.stringify(graph).replace(/</g, '\\u003c');
}

/** FAQ answers as plain text, paragraphs kept apart. Only for the one page that owns the FAQ. */
export function faqEntities(items: FaqItem[]): Node[] {
  return items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  }));
}

export function itemList(items: { name: string; href: string }[], lang: Locale): Node {
  return {
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: pageUrl(localizeHref(item.href, lang)),
    })),
  };
}

export async function service(
  props: { title: string; intro: string; image?: string },
  url: string,
): Promise<Node> {
  return {
    '@type': 'Service',
    name: props.title,
    description: props.intro,
    url,
    image: props.image ? await imageUrl(getImage(props.image)) : undefined,
    provider: organizationRef,
  };
}

export async function person(member: TeamMember, profile: Profile, url: string): Promise<Node> {
  const titles = profile.qualifications.groups.find((group) => group.id === 'titles');
  const credentials = visible(titles?.items ?? []).map((item) => ({
    '@type': 'EducationalOccupationalCredential',
    name: item.title,
  }));

  return {
    '@type': 'Person',
    '@id': personId(member.id),
    name: member.name,
    jobTitle: member.role,
    description: profile.bio[0],
    url,
    image: member.image ? await imageUrl(getImage(member.image)) : undefined,
    worksFor: organizationRef,
    hasCredential: credentials.length > 0 ? credentials : undefined,
  };
}
