# Hormonexperten website: design rules

Marketing website for Hormonexperten, a private telemedicine practice (Dr. Isabella Wilden) offering online hormone consultations to patients across Europe. Static site, no patient data on the site: booking and payment happen in an external booking system (Pabau), reached through a link.

**Source of truth for the design is the Figma file** (Dr Wilden, landing page frame). This file sets the rules for turning that design into code. If Figma and this file disagree, ask; don't guess.

## Stack

- Astro (static output) with **Tailwind CSS v4**, set up with `npx astro add tailwind` (Vite plugin, CSS-first config, no `tailwind.config.js`). Install `prettier-plugin-tailwindcss` so class order stays consistent.
- No UI kit or component library (no daisyUI, shadcn, Flowbite). No client-side framework unless a component truly needs interactivity, and then the smallest island possible.
- Content lives in files (`src/content/`), never hard-coded in components. One file per locale.
- Languages: `en` (master), `de`, `el`, `ru`. Routes are `/{lang}/...`. Every page exists in all four; missing translations fall back to English content.
- Target: Lighthouse 95+ in every category on mobile. Ship no JavaScript by default.

## Design tokens

Define these once in the `@theme` block of `src/styles/global.css`. Tailwind turns each one into utilities (`--color-coral` gives `bg-coral`, `text-coral`, `border-coral`, and so on).

- **Use only theme tokens.** No arbitrary values such as `bg-[#EA8878]`, `p-[13px]` or `text-[17px]`. If the design seems to need a value the theme lacks, add it to `@theme` (after asking) rather than inlining it.
- Remove Tailwind's default colour palette (`--color-*: initial;` at the top of `@theme`) so only brand colours exist. Keep the default spacing scale, which is already 4px-based.

| Token | Value | Use |
|---|---|---|
| `--color-coral` | `#EA8878` | Primary buttons, accents, the logo mark |
| `--color-coral-tint` | `#FBE3DE` | Soft highlights, icon backgrounds |
| `--color-ink` | `#100420` | Headings and primary text |
| `--color-text-muted` | `#9B9B9B` (too light, see below) | Eyebrow labels ("How it Works", "Our Approach"), step numbers |
| `--color-surface` | `#FCF8F4` | Warm section panels, FAQ items, hero panel |
| `--color-bg` | `#FFFFFF` | Page background |
| `--color-placeholder` | `#EEEEEE` | Image placeholders only, never in production |
| `--color-footer` | `#1A1A20` | Footer background |
| `--color-on-dark` | `#FFFFFF` | Text on the footer |

Values were sampled from a PNG export; confirm them against the Figma styles before treating them as final.

- **Contrast:** white text on `#EA8878` is 2.5:1, which fails WCAG AA even for large text (needs 3:1). On 9 Oct 2026 the user chose white labels (`text-on-dark`) on the current coral for primary buttons, accepting the contrast failure; a darker coral (`#C84732`) was tried and rejected as too dark. Don't revert either without being asked. Use white on coral only for button labels, never for running text.
- The muted grey `#9B9B9B` is 2.8:1 on white and fails too. Darken it (about `#767676` reaches 4.5:1) for any text that has to be read.
- Radii: large panels and images about 24px, cards about 20px, buttons and FAQ items fully rounded or 16px. Read the exact values from Figma and set them as `--radius-panel`, `--radius-card` and `--radius-field` in `@theme` (giving `rounded-panel` and so on). Use `rounded-full` for pills.
- Spacing: Tailwind's default scale (`p-4` = 16px). Sections are separated by generous whitespace: `py-16` on mobile and `lg:py-28` or `lg:py-32` on desktop. Wrap this in a `Section` component rather than repeating it.

## Typography

For typography this ruleset takes precedence over the Figma file (the user's decision, 9 Oct 2026): Figma shows intent, these rules set the values.

### Typeface

- **Manrope** (variable, 200–800), self-hosted in `/public/fonts` with Latin, Latin Extended, Greek and Cyrillic subsets split by `unicode-range`, `font-display: swap`, and the locale's main subset preloaded (`FONT_SUBSET` in `src/config.ts`). It replaces Figma's Figtree, Inter and Fenix, which lack Greek or Cyrillic. Never load fonts from Google's servers (GDPR). A metric-matched local fallback (`Manrope Fallback`: Arial scaled to Manrope) keeps the font swap from shifting the layout; re-measure it if the font changes.
- Manrope has **no italic** and no small caps. `font-synthesis: none` is set, so never use `italic`/`<em>` for emphasis; emphasise with weight or colour. No second typeface.
- OpenType: kerning, `liga` and `calt` are on globally. Use `tabular-nums` for anything that lines up or counts (dates, step numbers, years, prices, stats).

### Type roles

Every piece of text uses one role. Roles are tokens in `@theme`, fluid between 360px and 1728px viewports, and each token carries its size, line height, tracking **and weight**, so a role class needs no `font-*` class unless it is a listed exception. **Don't use raw `text-lg/xl/2xl` or breakpoint steps like `text-lg xl:text-xl 2xl:text-2xl` for content**; pick the role.

The scale is clinical, not editorial (the user's call, 9 Oct 2026: the earlier 60/46/24/20 scale read as a magazine). Reading text is the anchor at 16 → 18px; headings step up from it in moderate ratios; tracking stays close to Manrope's own. Medical content (FAQ answers, step text, notes) is set at least as comfortably as marketing copy, never smaller.

| Role | Utility | Size (360 → 1728) | Line height | Tracking | Weight | Use |
|---|---|---|---|---|---|---|
| Display | `text-display` | 34 → 52px | 1.1 | −0.02em | 600 | The page's one H1, big stats |
| H2 | `text-h2` | 28 → 38px | 1.2 | −0.015em | 600 | Section headings; mobile menu links (`font-medium`) |
| Title | `text-title` | 22 → 30px | 1.25 | −0.0125em | 600 | Side-card headings ("Still have questions?") |
| H3 | `text-h3` | 20 → 24px | 1.3 | −0.01em | 600 (`font-medium` for pull statements) | Sub-headings, step titles, team names in cards |
| H4 | `text-h4` | 18 → 20px | 1.4 | 0 | 600 (`font-medium` for FAQ questions) | Card titles, list titles, note titles |
| Eyebrow | `text-eyebrow` (`<Eyebrow>`) | 14px fixed | 1.4 | +0.08em | 600, `uppercase`, `text-text-muted` | Label above an H1/H2 (`mt-4` to the heading), footer column titles |
| Lead | `text-lead` | 18 → 20px | 1.55 | 0 | 400 | One- or two-sentence openers only: hero subline, section intros, CTA sublines, profile lead |
| Body | `text-body` | 16 → 18px | 1.65 | 0 | 400 | Running text, step text, FAQ answers, bios, roles, notes, footer blurb |
| UI | `text-base` | 16px | Tailwind | 0 | `font-medium`/`font-semibold` | Buttons, nav, chips; body copy inside narrow cards (≤ 320px) |
| Small | `text-sm` | 14px | Tailwind | 0 | regular/medium | Meta: trust line, captions, dates, breadcrumbs, review author, copyright |

- **Lead is for openers, not paragraphs.** A paragraph of three or more lines, or anything a patient reads to understand care, is `text-body`. At 1440px the lead (≈19.6px) sits clearly below H3 (≈23px); don't close that gap.
- **14px is the floor** for anything a person reads (the audience is mostly 40+). `text-xs` is only for the logo lockup and tooltips.
- **Weights:** 600 for headings (set by the role token), 500 for interactive labels and emphasis inside text, 400 for reading text. No 700/800, no 200/300 except the logo wordmark.
- **Colour:** headings and labels `text-ink`; lead and body `text-ink/80` (Figma's #454545); meta `text-ink/80` or `text-text-muted`; secondary detail under a title `text-ink/70`. On the footer: `text-on-dark` for titles, `text-on-dark/70` for text. Never text lighter than these (contrast).
- **Hierarchy:** each step down must be visibly smaller or quieter: display > H2 > title > H3 > lead, and the eyebrow is a label, never a second heading. One H1 per page; heading levels follow the outline even when the visual role differs (an FAQ question is an `h3` styled `text-h4`).
- A new size is a new role in `@theme` and needs the user's OK, as for colours.

### Measure and spacing

- Running text is 45–75 characters per line: give paragraphs `max-w-prose` (65ch) unless their column is already narrower. Headings sit in `max-w-3xl` or a grid column.
- Rhythm: eyebrow → H2 `mt-3`/`mt-4`; H2 → lead `mt-5`/`mt-6`; lead → CTA `mt-8`/`mt-10`; paragraph to paragraph `space-y-4` (body) or `space-y-6` (long-form).

### Line breaking (set in `global.css`, don't override)

- Headings have `text-wrap: balance`; paragraphs, list items and captions `text-wrap: pretty`. Don't add `text-balance`/`text-pretty` per element, except `text-balance` on short centred labels that aren't headings.
- German, Greek and Russian get `hyphens: auto` (body: words of 7+ letters; headings: only 14+ letters, so short words wrap whole). English is never auto-hyphenated. Headings also carry `overflow-wrap: anywhere` as a last resort, so no word can overflow at 360px.
- Buttons are `hyphens-none` and `text-balance`: labels wrap whole words onto balanced lines.
- `uppercase` only for the eyebrow role (short labels), which carries its own +0.08em tracking. `lang` must be right so Greek uppercase drops its accents.

### Punctuation and spacing in content

- Typographic marks only; the build check fails on straight `'` and `"` in `src/content/`. English: ’ “ ” and a spaced en dash ( – ). German: „ “ and a spaced en dash. Russian and Greek: « » ; Russian uses a spaced em dash ( — ). Ranges use an unspaced en dash (9:00–17:00, 1997–2000). Ellipsis is …, not three dots.
- Content files stay plain; `typeset()` in `src/lib/content.ts` adds non-breaking spaces as text loads: after Dr./Prof., inside "z. B."-style abbreviations (narrow), between a number and the word it counts, before a spaced dash, and (Russian) after one- and two-letter words. Don't type `&nbsp;` into content; extend `typeset()` instead.
- Sentence case for headings in new copy. Several mockup headings are Title Case ("Hormone Health Care that Takes Women Seriously"); keep whatever the approved copy says, but don't invent Title Case.

### Checking type

Before calling a page done, check it at 360px in Russian and German (longest words) as well as English: no overflow, no hyphenated short words in headings, no single-word last lines in headings, buttons wrapping cleanly.

## Layout

- Content width 1440px including gutters (`--container-content`, giving `max-w-content`), centred, with a 16px gutter on mobile and 24px from tablet up. Put this in one `Container` component (`mx-auto max-w-content px-4 md:px-6`), not repeated per section.
- Warm panels (`bg-surface`) sit inside the content width with large rounded corners, on a white page. Don't make them full-bleed.
- Mobile first. Every section must work at 360px wide with no horizontal scroll. Two-column sections stack (image first, then text); four-card rows become a horizontal scroll-snap row or a 2×2 grid.
- German, Greek and Russian text runs 20–35% longer than English. Layouts must not depend on English line lengths: no fixed heights on text containers, buttons wrap or grow, nav collapses to a menu early enough that German labels fit.

## Landing page sections (in order)

1. **Header:** logo (mark + HORMONEXPERTEN wordmark, no "Dr. Wilden" line), nav (About Us, Services ▾, Our Team, Contact), language switcher (globe + code), "Book Now" button. Sticky on scroll, mobile menu below 1024px.
2. **Hero:** warm panel. Trust line, H1, subline, primary CTA, three small icon features, image carousel on the right.
3. **Services:** H2 and four image cards (Menopause & Perimenopause, Hormone Therapy, Hormone Therapy by Rimkus®, Hormone Check-Up) with title and short text over a gradient at the bottom. Each card links to its service page.
4. **Trust logos:** heading and logo marquee. If it animates, it must respect `prefers-reduced-motion` and pause on hover.
5. **Our Approach:** warm panel, image left, eyebrow, H2, paragraph, secondary CTA.
6. **How it Works:** eyebrow, H2, intro, three numbered steps alternating text/image in a warm panel, then an "Important information" note.
7. **Team:** H2 and two doctor cards (photo, name, title line, "Learn More").
8. **Testimonials:** two rows of review cards (stars, quote title, text, name/age/condition, source).
9. **FAQ:** accordion on the left (5–6 questions), "Still have questions?" contact card on the right, stacking on mobile. Use `<details>`/`<summary>`, which needs no JavaScript.
10. **Closing CTA:** warm panel with line-art illustration, H2, subline, CTA.
11. **Footer:** dark, with a wave top edge. Logo and blurb, social icons, Contact, Services, Company and Legal columns, copyright, payment method icons.

Build each section as its own component in `src/components/sections/`, with shared primitives (`Container`, `Section`, `Button`, `Eyebrow`, `Panel`, `Card`, `Accordion`) in `src/components/ui/`.

## Tailwind conventions

- Styling lives in utility classes in the markup. When the same set of classes repeats, make an Astro component; don't reach for `@apply`. `@apply` is only for things you can't put on an element, such as styling rendered Markdown (use `@tailwindcss/typography` with a brand-tuned `prose` for that).
- Variants (button primary/secondary, card sizes) are a small props-to-classes map inside the component. Use `class:list` to merge classes; no `clsx`/`cva` unless that map gets unwieldy.
- Mobile first: unprefixed classes are the mobile style, then `md:`, `lg:`, `xl:`. Don't use `max-*` breakpoints unless there is no other way.
- Use logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) instead of left/right ones, so a future right-to-left language needs no rewrite.
- Use `motion-safe:` for every transition or animation, and `focus-visible:` for focus styles.
- No inline `style=""` except for values that come from data (e.g. an image's aspect ratio).

## Components

- **Buttons:** primary (coral fill), secondary (outline or tint). All are pill-shaped with a visible focus ring. A booking CTA is a normal link to the booking URL from `src/config.ts` and opens in the same tab. Focus ring: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`.
- **Images:** use Astro's `<Image>`/`<Picture>` with AVIF/WebP, explicit width and height, and `loading="lazy"` except the hero. Every image needs meaningful alt text from the content file (or `alt=""` if decorative).
- **Icons:** inline SVG, `currentColor`, 1.5px stroke to match the line icons in the mockup. No icon font.
- **Carousel (hero):** the first slide is static; the rest swipe/scroll-snap. No autoplay. Dots are buttons with labels.
- **Accessibility:** semantic landmarks, one H1 per page, logical heading order, keyboard-reachable everything, a visible focus style (2px ink outline with offset), and `lang` on `<html>` matching the route.

## Content rules (these are hard rules)

- **Never call Dr. Wilden an endocrinologist** anywhere: copy, alt text, meta, schema.org or comments. Her title is "Specialist in General Medicine with a focus on bioidentical hormone therapy".
- **Russian is a website translation only.** Never state or imply that consultations, care or support are offered in Russian (or any language list) until the practice confirms consultation languages.
- **No placeholder or borrowed copy in production.** The mockup's "Our Approach" text describes a different clinic and doctor and must be replaced. Lorem ipsum, "Title" and grey placeholders must fail the build (add a check).
- **Claims must be verifiable.** "35+ years of experience", "5,000+ patients treated", star ratings, testimonials and partner logos only go live once the practice confirms them with a source. Testimonials must be real and attributed to their platform (e.g. Jameda). German medical advertising law (HWG) applies, so no promises of results.
- **Rimkus®:** use the name and the ® mark only once the practice confirms the certification is current.
- **Payment icons:** show only the methods the booking system actually accepts.
- **Second doctor (Dr. Yvonne Tuszing):** credentials are unconfirmed. Keep her card behind a content flag until they are.
- Brand name is written **Hormonexperten** in running text (not "Hormon Experten"). Use British English spelling in the English master (personalised, specialised, gynaecologist), as in the FAQ.
- FAQ answers come from `src/content/faq/{lang}.json`. Items with `needs_check: true` are not rendered.

## Privacy and third parties

- No third-party scripts, iframes, fonts or embeds that load before consent. That includes YouTube, maps, review widgets and the Pabau widget script; use plain links instead.
- Analytics is self-hosted Matomo in cookieless mode. Nothing else.
- Every page links Impressum, Datenschutz and Cookie Settings in the footer. Legal pages exist in German at minimum.
- Old site URLs are kept in `src/redirects` and must 301 to their new pages.

## Working agreements

- Before building a section, list which Figma frames it comes from and any token it needs that doesn't exist yet.
- Don't add new colours, font sizes or shadows. If the design seems to need one, ask.
- Don't write new marketing or medical copy. Use content files; if text is missing, insert a clearly marked `TODO:` that the build check will catch.
- Check every page at 360px, 768px, 1280px and 1440px, and in German (longest strings) before calling it done.

## Open questions (resolve before launch)

- Final booking URL (Pabau) and whether "Book Now" goes straight to booking or to a pricing page first.
- Which trust logos and testimonials are real and approved.
- Services list: the footer adds "Metabolic Reset" and "Chronic Disease", which aren't in the card row. Are they real services?
