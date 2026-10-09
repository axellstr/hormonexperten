# Launch audit

Pre-launch check of the working tree on 9 Oct 2026, about 23:40, with all uncommitted changes included. Another session was still editing the header (`RollText`) while this was written. The SEO and redirect work lives in [`seo-geo-plan.md`](seo-geo-plan.md); this file refers to it and doesn't repeat it.

## Verdict

**Performance is ready. The site isn't, yet.** Every page scores 99–100 for Lighthouse mobile performance, with no layout shift and no jank. What stops the launch: the production build fails, every booking button points nowhere, the uncommitted changes ship the palette tester to visitors, the legal pages are drafts, and old URLs aren't redirected.

## What was measured

Lighthouse 12.8 in mobile mode (simulated slow 4G, 4× CPU slowdown), run against `dist/` served with brotli:

| Page | Perf | A11y | Best pract. | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/en/` | 100 | 96 | 100 | **92** | 1.7 s | 0 | 0 ms |
| `/de/` | 100 | 96 | 100 | 100 | 1.7 s | 0 | 0 ms |
| `/ru/` | 99 | 96 | 100 | 100 | 1.7 s | 0 | 0 ms |
| `/en/faq/` | 100 | 95 | 100 | 100 | 1.4 s | 0 | 0 ms |
| `/en/team/isabella-wilden/` | 100 | 95 | 100 | 100 | 1.5 s | 0 | 0 ms |
| `/de/services/menopause/` | 100 | 96 | 100 | 100 | 1.5 s | 0 | 0 ms |
| `/en/` (desktop) | 100 | 96 | 100 | **92** | 0.4 s | 0 | 0 ms |

- **Scrolling:** each page scrolled from top to bottom and back on a 390px phone with 4× CPU slowdown ran at 60 fps (95th-percentile frame 17 ms). The worst frame was one of 62 ms on `/en/`, and no layout shifted.
- **Layout:** all 44 pages at 360, 768, 1280 and 1440px, with no horizontal overflow, no console errors and no failed requests.
- **Weight:** home HTML is 24 KB compressed, CSS 12 KB, JS about 6 KB in total. The hero AVIF preload matches the `<picture>` srcset exactly, so it isn't downloaded twice.
- **Types and dependencies:** `astro check` reports 0 errors; `npm audit --omit=dev` reports 0 vulnerabilities.
- **Contrast:** the only failures are the white-on-coral buttons (accepted on 9 Oct) and the grey placeholders (which the build check blocks).

## Blockers: fix before going live

### 1. The production build fails

`npm run build` exits 1 because `scripts/check-content.mjs` finds **388 `TODO` markers and 12 grey placeholders** in `dist/`. On Vercel the production deploy will fail. That's the check doing its job, so the fix is the content, not the check. The main groups:

| What | Where | Pages hit |
|---|---|---|
| Booking URL `#TODO-booking-url`: every "Book Now", hero and closing CTA goes nowhere | `src/config.ts:26` | all 44 |
| Service card summaries ("TODO: short summary for …"), shown on the home cards | `src/content/site/en.json:35–71` | home, services |
| Service pages: intro, about heading and text, meta description | `src/content/services/*.json` | 16 service pages |
| Meta descriptions: services overview, team, FAQ | `services`, `team`, `faq` content | 12 |
| "Our Approach" body (placeholder text) | `src/content/home/en.json:55` | 4 home pages |
| 4 FAQ answers "TODO: approved answer" that are **not** `needs_check`, so they render: video-consultation, blood-tests, outside-germany, cancel | `src/content/faq/en.json:261–288` | FAQ pages |
| FAQ links to `#TODO-conventional-vs-bioidentical-page` and `#TODO-weight-management-page` | `src/content/faq/en.json:54,155` | 16 |
| How it Works step images (3 grey placeholders per page) | `home.how.steps[].image` | 4 home pages |
| Impressum and Datenschutz facts (entity, address, chamber, host, Pabau) plus the draft notice (`approved: false`) | `src/content/legal/*.json` | 12 legal pages |

### 2. Don't work around it with `CONTENT_CHECK=warn` in production

`CONTENT_CHECK=warn` does two things: it stops the build failing, **and** it turns on `SHOW_UNCONFIRMED` (`src/config.ts:38`), which publishes every `needs_check` item. In production that would put the following live:

- Hero trust line "35+ years of experience · 5,000+ patients treated" with 5 stars (unverified, and it contradicts the live site).
- Six copies of the same placeholder testimonial ("Woman, 52 · Thyroid · Verified patient").
- Trust logos named "TODO: partner 1–6".
- Dr. Tuszing's card and profile, the Rimkus® service and page, and the Metabolic Reset and Chronic Disease services (placeholder images).
- The mockup phone number, five social icons linking to `TODO`, and five payment logos.
- "Consultations in: German, English, Greek, Romanian" on the profiles (CLAUDE.md: no language list until the practice confirms it).

Keep `warn` on Preview only.

### 3. The palette tester ships to every visitor

In the last commit the colour-palette picker was wrapped in `import.meta.env.DEV`. The uncommitted changes **removed that gate** in `src/components/sections/Header.astro:187` and `src/scripts/header.ts:33`. The built site now shows a "Colour palette" button with 9 themes in the header of all 44 pages. Its label is English only, and it writes `hormonexperten-palette` to localStorage, which goes against the privacy page's "nothing stored on your device". `src/layouts/BaseLayout.astro:50–51` also writes the palette as inline styles on `<html>`.

**Fix:** restore the `DEV` gate, or remove the tester and `src/config/palettes.ts` once the palette is final. If it's meant for the client to try themes, keep it on Preview deployments only.

### 4. Broken links on every page

Built pages link to routes that don't exist, in all four locales:

| Link | Source |
|---|---|
| `/about-us` (footer "About Us", and the "Learn More" button in Our Approach) | `site/en.json:165`, `home/en.json:58` |
| `/contact` | `site/en.json:173` |
| `/partners` | `site/en.json:177` |
| `/terms` | `site/en.json:190` |

Also inconsistent: the header's "About Us" goes to `/#approach`, while the footer's goes to `/about-us`.

### 5. Legal pages are drafts

The Impressum is missing the practice name, address, medical chamber and professional rules. A German medical website without a complete Impressum (§ 5 DDG) can draw a cease-and-desist letter (Abmahnung) on day one. This needs the practice's details and a lawyer or data protection adviser's sign-off (`approved: true`). Blocker 1 already covers it technically; it's listed separately because only the practice can unblock it.

### 6. Replacing hormonexperten.de will lose its old URLs

There is no `src/redirects`, no sitemap, no robots.txt and no 404 page, and `/` goes to English on a German domain. All of this is planned in `seo-geo-plan.md` §2–4. The point here is timing: if this build replaces the live site before the 301 map exists, about 110 indexed URLs (pages and roughly 37 blog posts in DE and EN) return 404.

## Should fix before launch

| # | Issue | Where | Fix |
|---|---|---|---|
| 7 | `interest-cohort=()` is an obsolete feature name. Chrome logs "Error with Permissions-Policy header: Unrecognized feature" on every page (reproduced with the exact header). | `vercel.json:24` | Remove it, or replace it with `browsing-topics=()`. |
| 8 | English home SEO is 92, below CLAUDE.md's 95 target. Lighthouse flags two "Learn More" links as non-descriptive. | Approach CTA; FAQ contact card's "Learn More" | Add an sr-only suffix, as `Team.astro` already does (`<span class="sr-only">: …</span>`), or use descriptive labels. |
| 9 | Internal links have no trailing slash (`/en/team`), but canonicals, hreflang and the language switcher do (`/en/team/`). Every nav link points at the non-canonical URL. | `localizeHref()` in `src/lib/i18n.ts` | Pick one form (trailing slash matches the build). Add the slash in `localizeHref` and set `"trailingSlash": true` in `vercel.json` so the other form redirects. |
| 10 | "More than 35 years" ships **ungated** in Dr. Wilden's profile lead and meta description (all locales), while the same claim on the home page is behind `needs_check`. The live site says 14 years. | `src/content/team/en.json` (profile `bio`, `meta`) | Confirm with the practice (`seo-geo-plan.md` gap 12). |
| 11 | On phones the home H1 is set in `text-title` (22px), smaller than every section H2 (28px). It also uses a breakpoint step, `md:text-display`, which the type rules forbid. | `src/components/sections/Hero.astro:81` (uncommitted change) | Use `text-display` (34px on phones) or confirm it's intended and add it to CLAUDE.md. |
| 12 | The "Important information" note is back to `max-w-none` (about 140 characters per line on desktop). The third type pass had fixed it with `max-w-prose`. | `src/components/ui/Note.astro:25` (new, uncommitted) | `max-w-prose`. |
| 13 | `data-reveal` and `data-text-reveal` were added to about 12 components, but no CSS or JS reads them. It's either a half-finished feature or leftover markup. | Hero, Approach, HowItWorks, Faq, Team, ClosingCta, Profile*, Service* | Finish the feature or remove the attributes before committing. |
| 14 | 11 files fail `prettier --check`, so class order has drifted from `prettier-plugin-tailwindcss`. | Approach, ClosingCta, LegalPage, ProfileHero/Milestones/Qualifications/Story, Services, Note, `legal/de.json`, `[legal].astro` | `npm run format` once the other session has finished. |
| 15 | Home titles are 64–79 characters, so they get cut off in search results. | `home/*.json` `meta.title` | Keep under about 60 (`seo-geo-plan.md` §6). |

## Performance hygiene (not urgent)

None of these show up in the scores; they are cleanup.

- **Unused image fallbacks: 4.9 MB of the 6.2 MB in `dist/_astro`.** `<Picture formats={['avif','webp']}>` without `fallbackFormat` makes Astro also emit PNG/JPG versions of every size (dr-wilden alone: 1.4 + 1.1 + 0.7 + 0.4 MB), which no current browser downloads. The hero already uses `formats={['avif']} fallbackFormat="webp"`; use that in the other 11 `Picture` calls, ideally through one shared wrapper.
- **Source photos are too small for sharp phones.** The service images are 536px wide (shown up to about 312 CSS px on a 3× phone, which needs about 940px), and `hero-2.png` is 683px wide (shown at 560 CSS px on desktop, which needs 1120px on retina). Ask for larger originals; the AVIFs will stay small.
- **Same photo three times on the home page:** `dr-wilden.png` is used in the hero, Our Approach and the Team card. That's a content question rather than a performance one.
- **Scripts for empty sections still ship.** When trust logos and testimonials are all `needs_check`, the sections render nothing, but `logo-cycler` and `grab-scroll` are still inlined into every home page. It's small; the fix is to render the section only when it has items, or to accept it.
- **Forced reflow on load (40–50 ms on a throttled CPU):** `header.offsetHeight`, read synchronously to build the IntersectionObserver `rootMargin` (`src/scripts/header.ts:419`). Use the known header height (`h-18`/`h-20` plus padding), or read it inside `requestAnimationFrame`.
- **Profile image `sizes` is too wide on phones** (it says 90vw; the image displays at about 80vw, so Lighthouse estimates 12 KB extra). `ProfileHero.astro:52`.
- **The stacking deck animates `top`** (`stack-card` and `stack-head` transitions in `global.css`), which runs on the main thread rather than the compositor. It only runs when the header shows or hides inside How it Works, and measured smooth, so leave it unless it janks on real low-end Android.
- **Tailwind also scans `CLAUDE.md` and `docs/`**, so it generates the forbidden example classes (`bg-[#EA8878]`, `p-[13px]`, `text-[17px]`, `text-lg`, `xl:text-xl` and 5 more). Add `@source not "../../CLAUDE.md"; @source not "../../docs";` after the import in `global.css`.
- `src/pages/index.astro` is never used: the i18n `redirectToDefaultLocale` route wins and the build warns `Could not render '' from route '/'`. Delete it; `vercel.json` handles `/`.
- The footer year is fixed at build time (`Footer.astro:87`). Rebuild in January or it shows the old year.

## Fix before testimonials go live

`src/scripts/grab-scroll.ts:114` re-centres both testimonial rows on **every** `resize` event. Phones fire `resize` when the browser toolbar collapses during a page scroll, so a visitor who swiped a row would see it jump back to the middle. Touch swipes don't set `userMoved` either. Fix: ignore height-only resizes (compare `innerWidth`) and don't re-centre after any user scroll. This comes from reading the code; it isn't reproduced, because testimonials are hidden in production. The cards also use `bg-placeholder` avatar circles (`Testimonials.astro:69`), which CLAUDE.md doesn't allow in production and which the build check doesn't catch (it looks only for `data-placeholder`).

## In-flight work (other session)

`RollText.astro` splits the Book Now label into one inline-grid per letter (three spans per letter). Two side effects worth knowing before it's committed:

- Kerning and ligatures stop working between letters.
- The link's text content becomes the label three times ("Book Now", plus two aria-hidden copies). Screen readers are fine, but crawlers and Lighthouse's link-text audit read the anchor text as "Book NowBBooookk NNooww".

## Documentation drift (CLAUDE.md)

- The mobile menu is used below **1440px** (`--breakpoint-header-desktop`); CLAUDE.md says below 1024px. Laptops at 1280 and 1366px get the hamburger menu. If 1440 is deliberate (German labels), update CLAUDE.md; once the palette button is gone, check whether 1280 fits.
- The token table still lists `--color-text-muted` as `#9B9B9B`; the theme uses `#707070`.
- Section 6 (How it Works) still describes the Figma alternating rows rather than the stacking deck.
- The footer has a rounded top, not the "wave top edge" CLAUDE.md describes.
- `home.team` duplicates the `team` collection, so two sources of truth for names and roles.

## Decisions needed (practice or user)

- [ ] Booking URL, and whether "Book Now" goes to booking or to pricing first.
- [ ] Root language: `/` → `/de/` or `/en/` (`seo-geo-plan.md` §2).
- [ ] Destinations for About Us, Contact, Partners and Terms: build the pages, or point the links elsewhere.
- [ ] Impressum and privacy details, and legal sign-off.
- [ ] Palette: final choice, and whether the tester stays on Preview.
- [ ] "35 years" on the profile.
- [ ] How it Works images, or a step-card design without images.

## Deploy checklist (Vercel)

- [ ] Production: `CONTENT_CHECK` **unset**. Preview: `warn`, if wanted.
- [ ] Domain: apex `hormonexperten.de` as primary with `www` redirecting to it, to match `site` in `astro.config.mjs` and the canonicals.
- [ ] After the first deploy, check the response headers (HSTS, the cache rule for `/fonts/` and `/_astro/`, Permissions-Policy without console errors).
- [ ] 301 map in place before the DNS switch (`seo-geo-plan.md` §3).
- [ ] Rerun Lighthouse on the production URL; real compression and HTTP/2 should match or beat the numbers above.
