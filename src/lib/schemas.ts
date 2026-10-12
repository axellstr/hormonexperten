import { z } from 'astro/zod';

/** Unconfirmed content: previewed in dev and work-in-progress builds only (see SHOW_UNCONFIRMED in config.ts). */
const needsCheck = { needs_check: z.boolean().default(false) };

const link = z.object({ label: z.string(), href: z.string() });

const contact = z.object({
  title: z.string(),
  body: z.string(),
  cta: link,
  /** Secondary link beside the CTA, e.g. to the full FAQ. */
  more: link.optional(),
  /** Photo above the heading; a placeholder shows until there is one. */
  image: z.string().optional(),
  image_alt: z.string().default(''),
});

/** File name in src/assets/images/ plus its alt text ("" when decorative). */
const image = { image: z.string(), image_alt: z.string() };

export const siteSchema = z.object({
  skip_link: z.string(),
  nav: z.object({
    label: z.string(),
    home: z.string(),
    items: z.array(link.extend({ submenu: z.literal('services').optional() })),
    menu: z.string(),
    close: z.string(),
    book: z.string(),
    /** The menu link to every service, after the first four. */
    all_services: z.string(),
    language: z.string(),
    /** Eyebrow above the social icons in the mobile menu. */
    socials: z.string(),
  }),
  services: z.array(
    z
      .object({
        /** Also the service page's URL slug: /{lang}/services/{id}. */
        id: z.string(),
        title: z.string(),
        summary: z.string(),
        /** Left out until there is a photo; a placeholder shows instead. */
        image: z.string().optional(),
        image_alt: z.string(),
        ...needsCheck,
      })
      .transform((service) => ({ ...service, href: `/services/${service.id}` })),
  ),
  footer: z.object({
    blurb: z.string(),
    social_label: z.string(),
    social: z.array(
      z.object({
        name: z.string(),
        icon: z.enum(['linkedin', 'instagram', 'whatsapp', 'facebook', 'jameda']),
        href: z.string(),
        ...needsCheck,
      }),
    ),
    columns: z.array(
      z.object({
        title: z.string(),
        items: z.array(z.object({ label: z.string(), href: z.string().optional(), ...needsCheck })),
      }),
    ),
    payments_label: z.string(),
    payments: z.array(
      z.object({
        name: z.string(),
        logo: z.enum(['visa', 'mastercard', 'sepa', 'klarna', 'diners']),
        ...needsCheck,
      }),
    ),
    copyright: z.string(),
  }),
});

export const homeSchema = z.object({
  meta: z.object({ title: z.string(), description: z.string() }),
  hero: z.object({
    trust: z.object({
      items: z.array(z.string()),
      /** Filled with review_profile rating / max, e.g. "{rating} out of {max} stars on". */
      rating_label: z.string(),
      ...needsCheck,
    }),
    title: z.string(),
    subtitle: z.string(),
    cta: z.string(),
    features: z.array(
      z.object({ icon: z.enum(['medical', 'online', 'women-men']), label: z.string() }),
    ),
    gallery_label: z.string(),
    slide_label: z.string(),
    slides: z.array(z.object(image)).min(1),
  }),
  services: z.object({
    title: z.object({
      prefix: z.string(),
      emphasis: z.string(),
      second_line: z.string(),
    }),
    /** Labels for the row's arrow buttons. */
    previous: z.string(),
    next: z.string(),
  }),
  approach: z.object({
    eyebrow: z.string(),
    title: z.string(),
    body: z.string(),
    cta: link,
    ...image,
  }),
  trust: z.object({
    title: z.string(),
    logos: z.array(
      z.object({
        name: z.string(),
        logo: z.enum([
          'jameda',
          'provenexpert',
          'partner-1',
          'partner-2',
          'partner-3',
          'partner-4',
          'partner-5',
          'partner-6',
        ]),
        ...needsCheck,
      }),
    ),
  }),
  /**
   * Date-stamped snapshot of independent review ratings (aggregate for the hero trust line;
   * per-source cards above testimonials). Not fetched at runtime.
   */
  review_profile: z.object({
    name: z.string(),
    href: z.string(),
    logo: z.literal('provenexpert'),
    rating: z.number().positive().max(5),
    rating_max: z.number().int().positive(),
    reviews: z.number().int().nonnegative(),
    sources: z.number().int().positive(),
    descriptor: z.string(),
    /** ISO date the snapshot was checked (YYYY-MM-DD). */
    checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Localised display form of `checked`, e.g. "12 October 2026". */
    checked_display: z.string(),
    rating_label: z.string(),
    reviews_label: z.string(),
    /** Per-platform review count, e.g. "{count} reviews". */
    platform_reviews_label: z.string(),
    checked_label: z.string(),
    link_label: z.string(),
    platforms: z.array(
      z.object({
        name: z.string(),
        logo: z.enum(['jameda', 'provenexpert', 'google']),
        href: z.string(),
        rating: z.number().positive().max(5),
        reviews: z.number().int().nonnegative(),
        link_label: z.string(),
        ...needsCheck,
      }),
    ),
  }),
  how: z.object({
    eyebrow: z.string(),
    title: z.string(),
    intro: z.string(),
    cta: z.object({
      body: z.string(),
      label: z.string(),
    }),
    steps: z.array(
      z.object({
        title: z.string(),
        body: z.string(),
        image: z.string().optional(),
        image_alt: z.string().optional(),
      }),
    ),
    note: z.object({ title: z.string(), body: z.string() }),
  }),
  team: z.object({
    title: z.string(),
    members: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        image: z.string().optional(),
        image_alt: z.string().optional(),
        cta: link,
        ...needsCheck,
      }),
    ),
  }),
  testimonials: z.object({
    title: z.string(),
    rating_label: z.string(),
    prev_label: z.string(),
    next_label: z.string(),
    slide_label: z.string(),
    items: z.array(
      z.object({
        title: z.string(),
        body: z.string(),
        author: z.string(),
        source: z.string(),
        rating: z.number().int().min(1).max(5),
        ...needsCheck,
      }),
    ),
  }),
  faq: z.object({
    title: z.string(),
    contact,
  }),
  closing: z.object({ title: z.string(), body: z.string(), cta: z.string() }),
});

export const faqSchema = z.object({
  meta: z.object({ title: z.string(), description: z.string() }),
  title: z.string(),
  nav_label: z.string(),
  contact,
  categories: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      items: z.array(
        z.object({
          id: z.string(),
          question: z.string(),
          /** Paragraphs separated by a blank line. */
          answer: z.string(),
          /** Further reading shown below the answer. */
          link: link.optional(),
          /** Also shown in the landing page's FAQ section. */
          featured: z.boolean().default(false),
          ...needsCheck,
          /** What still has to be confirmed before `needs_check` can go. Never rendered. */
          check_note: z.string().optional(),
        }),
      ),
    }),
  ),
});

/** What still has to be confirmed before `needs_check` can go. Never rendered. */
const checkNote = { check_note: z.string().optional() };

/** One line of a CV list: a title, an optional second line and a year or period. */
const cvItem = z.object({
  title: z.string(),
  detail: z.string().optional(),
  date: z.string().optional(),
  ...needsCheck,
  ...checkNote,
});

const profileSchema = z.object({
  meta: z.object({ title: z.string(), description: z.string() }),
  eyebrow: z.string(),
  name: z.string(),
  titles: z.array(z.string()).min(1),
  /** Paragraphs; the first is set larger as the lead. */
  bio: z.array(z.string()).min(1),
  /** Booking button label. */
  cta: z.string(),
  /** Mission statement and values, shown right after the header. */
  mission: z
    .object({
      eyebrow: z.string(),
      title: z.string(),
      body: z.string(),
      values: z
        .array(
          z.object({
            icon: z.enum(['sprout', 'message-circle', 'book-open', 'sliders']),
            title: z.string(),
            body: z.string(),
          }),
        )
        .default([]),
    })
    .optional(),
  facts: z.object({
    title: z.string(),
    items: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
  milestones: z.object({
    title: z.string(),
    items: z.array(z.object({ date: z.string(), items: z.array(z.string()).min(1) })),
  }),
  qualifications: z.object({
    title: z.string(),
    groups: z.array(
      z.object({
        id: z.string(),
        icon: z.enum(['stethoscope', 'microscope', 'award', 'users', 'graduation-cap']),
        title: z.string(),
        items: z.array(cvItem),
      }),
    ),
    /** Short lists shown as chips under the cards. */
    tags: z.array(
      z.object({
        id: z.string(),
        icon: z.enum(['map-pin', 'languages']),
        title: z.string(),
        items: z.array(z.string()),
        ...needsCheck,
        ...checkNote,
      }),
    ),
  }),
  /** The doctor's story in her own voice. */
  story: z.object({
    title: z.string(),
    /** Set large beside the story. */
    statement: z.string().optional(),
    /** Paragraphs, with optional subheadings between them. */
    body: z.array(z.union([z.string(), z.object({ heading: z.string() })])),
    /** Last line of the story, set apart. */
    closing: z.string().optional(),
    signature: z.string(),
  }),
  /** Closing panel with the booking button. Without it the button ends the story. */
  closing_cta: z.object({ title: z.string() }).optional(),
  ...needsCheck,
  ...checkNote,
  /** Open questions about the profile as a whole. Never rendered. */
  check_notes: z.array(z.string()).default([]),
});

export const teamSchema = z.object({
  meta: z.object({ title: z.string(), description: z.string() }),
  eyebrow: z.string(),
  title: z.string(),
  breadcrumb_label: z.string(),
  learn_more: z.string(),
  members: z.array(
    z.object({
      /** Also the profile's URL slug: /{lang}/team/{id}. */
      id: z.string(),
      name: z.string(),
      role: z.string(),
      image: z.string().optional(),
      image_alt: z.string().optional(),
      /** Members without one get a card but no profile page. */
      profile: profileSchema.optional(),
      ...needsCheck,
      ...checkNote,
    }),
  ),
});

/** The services overview and one page per service; a service's title and image live in `site`. */
export const servicesSchema = z.object({
  meta: z.object({ title: z.string(), description: z.string() }),
  /** Overview eyebrow and the breadcrumb's first step. */
  eyebrow: z.string(),
  title: z.string(),
  intro: z.string(),
  breadcrumb_label: z.string(),
  learn_more: z.string(),
  /** Booking button label. */
  cta: z.string(),
  others_title: z.string(),
  pages: z.array(
    z.object({
      /** Matches a service in `site.services`. */
      id: z.string(),
      meta: z.object({ title: z.string(), description: z.string() }),
      /** One- or two-sentence opener under the H1. */
      intro: z.string(),
      about: z.object({ title: z.string(), body: z.array(z.string()).min(1) }),
      /** Short items shown as chips beside the about text, e.g. symptoms. */
      focus: z
        .object({
          title: z.string(),
          items: z.array(z.string()).min(1),
          ...needsCheck,
          ...checkNote,
        })
        .optional(),
      /** Ids of FAQ items to show on the page, in order. */
      faq: z.array(z.string()).default([]),
      ...needsCheck,
      ...checkNote,
    }),
  ),
});

/** The Our approach page. Team members, steps and the closing panel come from their own collections. */
export const approachSchema = z.object({
  meta: z.object({ title: z.string(), description: z.string() }),
  hero: z.object({
    eyebrow: z.string(),
    title: z.string(),
    /** One-sentence opener under the H1. */
    lead: z.string(),
    /** The paragraph that follows the lead. */
    body: z.string(),
    /** Booking button label. */
    cta: z.string(),
    /** Two photos set side by side, the second one lower; a placeholder stands in for a missing one. */
    images: z
      .array(z.object({ image: z.string().optional(), image_alt: z.string().default('') }))
      .length(2),
    facts: z.object({
      /** Heading for screen readers only. */
      title: z.string(),
      items: z.array(
        z.object({ value: z.string(), label: z.string(), ...needsCheck, ...checkNote }),
      ),
    }),
    ...checkNote,
  }),
  /** The principles of the approach, one icon card each. */
  pillars: z.object({
    title: z.string(),
    items: z
      .array(
        z.object({
          icon: z.enum(['clock', 'connected', 'layers', 'sunrise']),
          title: z.string(),
          body: z.string(),
        }),
      )
      .min(1),
  }),
  /** A quote from the founder beside a round portrait; name and role come from the team. */
  founder: z.object({
    /** A team member's id. */
    member: z.string(),
    quote: z.string(),
    /** A square head-and-shoulders crop; shown in a circle. */
    image: z.string(),
    image_alt: z.string().default(''),
    /** Label of the link to the member's profile. */
    link: z.string(),
    ...needsCheck,
    ...checkNote,
  }),
  /** The team row; its heading and members come from the team collection. */
  team: z.object({ more: z.string() }),
});

/** A link to a condition page or a service page by id; without either it has no page yet. */
const conditionLink = z.object({
  label: z.string(),
  condition: z.string().optional(),
  service: z.string().optional(),
  ...needsCheck,
  ...checkNote,
});

/** The conditions overview and one page per condition. */
export const conditionsSchema = z.object({
  meta: z.object({ title: z.string(), description: z.string() }),
  /** Overview eyebrow and the breadcrumb's first step. */
  eyebrow: z.string(),
  title: z.string(),
  intro: z.string(),
  /** Booking button label, at the top and bottom of every page. */
  cta: z.string(),
  breadcrumb_label: z.string(),
  /** Label of the jump links to the groups in the overview hero. */
  groups_label: z.string(),
  learn_more: z.string(),
  /** Line under the cards: the list isn't complete. */
  more: z.string(),
  /** Strip on the overview for patients already seeing a gynaecologist. */
  co_care: z.object({
    title: z.string(),
    body: z.string(),
    /** Square photo beside the text; a placeholder shows until there is one. */
    image: z.string().optional(),
    image_alt: z.string().default(''),
  }),
  familiar_title: z.string(),
  approach_title: z.string(),
  related_title: z.string(),
  groups: z.array(
    z.object({
      /** Also the anchor on the overview: /{lang}/conditions#{id}. */
      id: z.string(),
      title: z.string(),
      /** Page ids, in order. */
      items: z.array(z.string()).min(1),
    }),
  ),
  pages: z.array(
    z.object({
      /** Also the URL slug: /{lang}/conditions/{id}. */
      id: z.string(),
      /** Short name for the breadcrumb, the page title and links. */
      name: z.string(),
      /** Card heading on the overview, when it differs from the name. */
      card_title: z.string().optional(),
      /** Card text on the overview, also the meta description. */
      summary: z.string(),
      title: z.string(),
      /** Lead under the H1. */
      intro: z.string(),
      /** A list of the conditions the page covers, before the symptoms. */
      list: z
        .object({
          title: z.string(),
          items: z.array(
            z.object({
              title: z.string(),
              body: z.string().optional(),
              link: conditionLink.optional(),
            }),
          ),
        })
        .optional(),
      /** What patients tend to say, in their words. */
      familiar: z.array(z.string()).min(1),
      approach: z.string(),
      /** A sentence appended to the approach that can be gated on its own. */
      approach_more: z.object({ text: z.string(), ...needsCheck, ...checkNote }).optional(),
      /** Safety line in small print under the approach. */
      safety: z.string().optional(),
      related: z.array(conditionLink).default([]),
      ...needsCheck,
      ...checkNote,
    }),
  ),
});

/** The Contact page. */
export const contactSchema = z.object({
  meta: z.object({ title: z.string(), description: z.string() }),
  hero: z.object({
    eyebrow: z.string(),
    title: z.string(),
    intro: z.string(),
    /** Booking button label. */
    cta: z.string(),
  }),
  channels: z.object({
    /** Heading for screen readers only. */
    title: z.string(),
    items: z.array(
      z.object({
        id: z.string(),
        icon: z.enum(['mail', 'phone']),
        label: z.string(),
        /** The address or number itself, shown large. */
        value: z.string(),
        href: z.string(),
        /** A line under the value, e.g. when to expect a reply. */
        detail: z.string().optional(),
        ...needsCheck,
        ...checkNote,
      }),
    ),
    /** Heading over the social links (taken from the footer's). */
    social: z.string(),
  }),
  /** Questions people tend to ask before writing, picked from the FAQ by id. */
  faq: z.object({
    title: z.string(),
    more: link,
    items: z.array(z.string()).min(1),
  }),
  details: z.object({
    title: z.string(),
    hours: z.object({
      title: z.string(),
      rows: z.array(z.object({ days: z.string(), time: z.string(), ...needsCheck, ...checkNote })),
      note: z.string().optional(),
    }),
    practice: z.object({
      title: z.string(),
      /** Address lines, kept together. */
      lines: z.array(z.string()).min(1),
      link,
    }),
    privacy: z.object({ title: z.string(), body: z.string(), link }),
  }),
});

/** A run of text in a legal page: plain, or a link (e-mail, phone, web, another page). */
const legalText = z.union([z.string(), link]);

/**
 * One block of a legal section: a paragraph (string), lines kept together like an address
 * (`lines`), or a bulleted list (`list`).
 */
const legalBlock = z.union([
  z.string(),
  z.object({ lines: z.array(z.array(legalText).or(legalText)).min(1) }),
  z.object({ list: z.array(z.string()).min(1) }),
]);

/** Impressum, privacy policy and cookie settings: required in German, English for the rest. */
export const legalSchema = z.object({
  updated_label: z.string(),
  contents_label: z.string(),
  /** Shown on every page whose `approved` is false; must contain TODO so the build fails. */
  draft_notice: z.string(),
  pages: z.array(
    z.object({
      /** Also the URL slug: /{lang}/{id}. */
      id: z.enum(['impressum', 'datenschutz', 'cookie-settings']),
      meta: z.object({ title: z.string(), description: z.string() }),
      title: z.string(),
      /** ISO date of the last change to the text. */
      updated: z.iso.date(),
      intro: z.string().optional(),
      /** Set once a lawyer or the practice's data protection adviser has signed the text off. */
      approved: z.boolean().default(false),
      sections: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          body: z.array(legalBlock).min(1),
          ...needsCheck,
          ...checkNote,
        }),
      ),
    }),
  ),
});

export type Site = z.infer<typeof siteSchema>;
export type Home = z.infer<typeof homeSchema>;
export type Faq = z.infer<typeof faqSchema>;
export type FaqItem = Faq['categories'][number]['items'][number];
export type Team = z.infer<typeof teamSchema>;
export type Services = z.infer<typeof servicesSchema>;
export type Service = Site['services'][number];
export type ServicePage = Services['pages'][number];
export type TeamMember = Team['members'][number];
export type Profile = NonNullable<TeamMember['profile']>;
export type ApproachPage = z.infer<typeof approachSchema>;
export type Conditions = z.infer<typeof conditionsSchema>;
export type ConditionPage = Conditions['pages'][number];
export type ConditionLink = z.infer<typeof conditionLink>;
export type Contact = z.infer<typeof contactSchema>;
export type Legal = z.infer<typeof legalSchema>;
export type LegalPage = Legal['pages'][number];
export type LegalBlock = LegalPage['sections'][number]['body'][number];
