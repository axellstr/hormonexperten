# SEO progress
Branch: seo/launch-prep · Build: `npm run build` · Check: `npm run seo:check` (from T01)

## Repo facts
- **Astro 7.3.8**, Node 24, Tailwind v4. Output is static (no `output` set): every public page is prerendered. The only server routes are EmDash's admin and API (`/_emdash/…`) and `src/pages/api/cron/housekeeping.ts` (`prerender = false`).
- **Adapter:** `@astrojs/vercel`, region `fra1`. Prerendered pages go to `dist/client/`, and the adapter copies them to `.vercel/output/static/`, the folder Vercel serves. `scripts/output-dirs.mjs` exports `servedDir`: read the build from there, not from `dist/`.
- **Build command:** `npm run build` = `build-seed.ts` → `astro build` → `prune-assets.mjs` → `check-content.mjs`.
- **Baseline: `npm run build` fails on `main` before any SEO change.** `astro build` succeeds (121 HTML files); then `check-content.mjs` fails with 649 `TODO marker` problems, from `BOOKING_URL = '#TODO-booking-url'` (`src/config.ts`, on every page) and the draft legal texts (`/{lang}/impressum|datenschutz|terms|remote-treatment-terms/`). Production builds with `CONTENT_CHECK=warn` (`docs/emdash-setup.md`). **A pass counts as green when** `astro build` succeeds and `check-content.mjs` reports `TODO marker` problems only (no new problem types), plus `seo:check` once T01 exists. Asked in NEEDS-ALEX.
- **Routes and locales:** `src/pages/[lang]/…` with `getStaticPaths` over `LOCALES` (`src/config.ts`: `en` default, `de`, `el`, `ru`). `astro.config.mjs` has `i18n.routing: 'manual'` (Astro's own routing would 404 the EmDash admin). `src/pages/index.astro` redirects `/` → `/en/`; in the build it's a meta-refresh page with `noindex`, and `vercel.json` also sends `/` → `/en/` (302).
- **Pages per locale (30 × 4 = 120, plus the root redirect):** home, `our-approach/`, `services/` + 6 service pages, `conditions/` + 10 condition pages, `team/` + `team/isabella-wilden/` + `team/yvonne-tuszing/`, `faq/`, `contact/`, `pricing/`, `impressum/`, `datenschutz/`, `terms/`, `remote-treatment-terms/`.
- **Base layout:** `src/layouts/BaseLayout.astro`, props `lang`, `site`, `title`, `description`, `preloadImage?`. Path comes from `Astro.url.pathname`; `switchLocale()` (`src/lib/i18n.ts`) builds the alternates.
- **Trailing slashes:** `vercel.json` has `trailingSlash: true`; Astro has no `trailingSlash` setting. Internal links already end in `/` (`localizeHref()`). EmDash's API needs Vercel's slash taken off (`src/lib/cms/api-slash.ts`), so any `trailingSlash` change must leave `/_emdash/…` working.
- **Existing checks:** `scripts/check-content.mjs` and `src/lib/content-rules.ts` already fail on `TODO`, lorem ipsum, borrowed copy, `endocrinolog` in all four scripts and "Hormon Experten" (the CMS plugin applies the same rules when entries are published). The SEO check (T01) is a separate script that reuses `servedDir`.
- **Earlier SEO work:** branch `origin/seo-geo` (one commit, 9 Oct, not merged): post-build sitemap (`integrations/sitemap.mjs`), `src/lib/structured-data.ts` (practice, WebSite, FAQPage, MedicalWebPage, Person, breadcrumbs), a `noindex` layout prop, robots.txt and a CLAUDE.md SEO section. `main` has changed a lot since. Use it as reference code for T07–T12.
- **Plan and snippets:** `docs/seo/seo-geo-plan.md` and `docs/seo/snippets/` aren't in the repo (NEEDS-ALEX, setup). The plan is read from git (`git show main:docs/seo-geo-plan.md`, the 9 Oct audit).

## CMS
- **EmDash is live on production** (since 15 Oct 2026). `CONTENT_SOURCE=emdash` makes pages read published entries through `getEmDashCollection()` (`src/lib/content-source.ts`). Without it (local builds) pages read `src/content/{collection}/{lang}.json`, which is only the seed for a fresh database. **Edits to `src/content/` never reach production; metadata changes go to the admin, which is Alex's (hard rule 7).**
- **Content model:** Zod schemas in `src/lib/schemas.ts` generate the EmDash collections (`src/lib/cms/model.ts`, `.emdash/seed.json` is regenerated on every build). Read content only through `src/lib/content.ts`. A new field must pass `npm run cms:check` and be added to the live database by hand (admin → Content Types).
- **SEO fields already there:** `meta: { title, description }` on home, approach, services overview and each service page (`description` optional, falls back to the card summary), conditions overview, team overview and each profile, FAQ, contact, pricing and each legal page. **Condition pages have no `meta`:** the title is `${page.name} | Hormonexperten` and the description is `page.summary`. **No `last_reviewed` field anywhere** (T10).
- **Build time vs request time:** content is read during the build, and every public page is prerendered, so the sitemap and JSON-LD can be generated at build time. Publishing in the admin triggers a Vercel rebuild (deploy hook).
- **Fallbacks:** missing translations are merged from English. `memberLang`, `legalPageLang`, `conditionPageLang`, `servicePageLang` and `textLang` (`src/lib/content.ts`) tell a page which language a part is in, and the page marks English parts with `lang="en"`. Pages with English parts today: `de|el|ru` `our-approach/`, `services/hormone-therapy/`, `team/`, `team/isabella-wilden/`, `team/yvonne-tuszing/`; `el|ru` home, `impressum/`, `datenschutz/`, `terms/`, `remote-treatment-terms/`. Most are partial (one section in English); the `el`/`ru` legal pages are English throughout.
- `needs_check: true` items are hidden by `isVisible()`/`visible()` unless `SHOW_UNCONFIRMED` (dev or `CONTENT_CHECK=warn`).

## What's already there (build of 16 Oct, `CONTENT_CHECK` unset)
- **Title, description, canonical:** on all 120 locale pages. Canonical is the page's own absolute `https://hormonexperten.de/…/` URL with a trailing slash. Titles follow `{Topic} | Hormonexperten`.
- **Duplicates:** titles and descriptions repeat on the fallback pages (team profiles in all locales, legal pages in `el`/`ru`) and on three condition titles that are the same word in two languages (`Menopause`, `Perimenopause` in `de`/`en`; `PMS & PMDD` in `el`/`en`). 4 titles are over 60 characters; 38 descriptions fall outside 70–160.
- **Unverified claim in meta:** Dr. Wilden's profile description says “has worked as a physician for more than 35 years” (NEEDS-ALEX).
- **hreflang:** all four locales plus `x-default` (→ `/en/`) on every page, fallback pages included.
- **`<html lang>`** matches the route; **exactly one `<h1>`** on every locale page.
- **Open Graph / Twitter:** none. **JSON-LD:** none. **Robots meta:** only on the root redirect page.
- **Sitemap, `robots.txt`, `llms.txt`, 404 page:** none (`public/` has only `favicon.svg` and `fonts/`).
- **Visible breadcrumbs:** `src/components/ui/Breadcrumb.astro`, used in `ServiceHero`, `ConditionHero` and `ProfileHero`.
- **Internal links:** no broken site-relative links in the build. Footer links Impressum and Datenschutz on every page. Booking links are `#TODO-booking-url`.
- **Images:** all 2,812 `<img>` have `alt` (a bare `alt`, i.e. empty, on decorative card images), `width` and `height`; WebP from Astro's image pipeline, except two PNG partner logos (`daegfa`, `hormon-netzwerk`). Non-lazy: 1 per page on 40 pages (hero), 16 on each home page, 2 on each `our-approach/`.
- **Fonts and scripts:** Manrope self-hosted in `/public/fonts`, subsets split by `unicode-range`, the locale's subset preloaded. Only first-party script: Vercel Web Analytics, on Vercel builds only. `vercel.json` already caches `/_astro/` (immutable, 1 year) and `/fonts/` (30 days).

## Tasks
- [x] T00 Audit
- [x] T01 SEO check script: `scripts/seo-check.mjs` + `npm run seo:check`, reading `servedDir` (`scripts/output-dirs.mjs`). Skip the root redirect page (`noindex`). The legal drafts contain `TODO:` and will fail until they're `noindex` (T06) or filled; `#TODO-booking-url` has no colon and doesn't match `TODO:`. Hook it into `npm run build` after `check-content.mjs`.
- [ ] T02 Site config: `site` is already `https://hormonexperten.de` and the four locales are set; i18n stays `routing: 'manual'` (keep, it protects the admin). Left: `trailingSlash: 'always'`, checking that `/_emdash/…` and `/api/cron/housekeeping/` still work.
- [~] T03 Vercel config (noindex for vercel.app done 17 Oct; root redirect waits on Alex's decision, font cache left as is): `vercel.json` exists (trailing slash, `/` → `/en/` 302, legacy path redirects, cache and security headers, cron). Left: `noindex` header for `hormonexperten.vercel.app`, root redirect target (decision in NEEDS-ALEX), font cache could become immutable.
- [ ] T04 Head component: `BaseLayout.astro` already renders title, description, canonical and hreflang (4 + `x-default`). Left: move that into `src/components/SeoHead.astro`, add Open Graph/Twitter, `translated`, `noindex` and `schema` props.
- [ ] T05 Page metadata per locale: fields exist for every page except condition pages (`src/lib/schemas.ts`); duplicates and lengths as listed above. Production content is in EmDash, so changes are seed updates plus drafts in NEEDS-ALEX for Alex to enter in the admin. A new condition `meta` field also needs the live database (admin → Content Types).
- [ ] T06 Fallback pages: decide whole-page vs partial fallbacks (pages listed under CMS). The `*Lang()` helpers in `src/lib/content.ts` already know which parts fall back.
- [ ] T07 Sitemap: none yet. Static build, so build-time generation works (`@astrojs/sitemap`, or the post-build script on `origin/seo-geo`). Exclude `noindex`, fallback and admin routes.
- [ ] T08 robots.txt: none yet. Needs the AI crawler decision (NEEDS-ALEX).
- [ ] T09 Site graph: no JSON-LD yet. `src/lib/schema.ts`; compare `origin/seo-geo:src/lib/structured-data.ts`.
- [ ] T10 Medical pages: 6 service and 10 condition pages. No `last_reviewed` field exists: needs a schema field, `cms:check`, the live database field and dates from the practice.
- [ ] T11 FAQ: `/{lang}/faq/` renders `visible()` items from `src/content/faq/`; build the JSON-LD from the same list.
- [ ] T12 Breadcrumbs: mirror the visible `Breadcrumb.astro` on service, condition and profile pages; other pages below home get JSON-LD only.
- [ ] T13 Doctor page: exists as `/{lang}/team/isabella-wilden/` (keep that route rather than adding `/about/dr-wilden/`). Check its facts against the confirmed list; the meta description's “35 years” is unconfirmed.
- [ ] T14 Headings: one `<h1>` everywhere already; heading-level skips not checked yet.
- [ ] T15 Internal links: no broken links; footer legal links present everywhere. Left: service pages → pricing, FAQ and booking (booking URL is a TODO); FAQ answers → service pages; three-click reachability.
- [ ] T16 Scaffolds for missing pages: Pricing exists (`/{lang}/pricing/`). How it works is a section (home, our-approach, services), not a page; the service pages have a `ServiceComparison` section. Check the plan's launch list before scaffolding.
- [ ] T17 404 page: none. One `src/pages/404.astro` (Vercel serves a single `404.html`); localising it per locale needs a plan.
- [ ] T18 llms.txt: none yet.
- [ ] T19 Images: alt, width and height already on every `<img>`. Left: the 16 eager images on each home page and 2 on `our-approach/`, the two PNG logos, alt text per locale.
- [ ] T20 Performance: fonts and scripts already as required; Lighthouse not run yet.
- [ ] T21 IndexNow
- [ ] T22 Repo rules: compare the CLAUDE.md section on `origin/seo-geo`.
- [ ] T99 Final pass

## Log
- 2026-10-16 T00: audited the repo (Astro 7 static on Vercel, EmDash live on production, JSON seed locally); wrote PROGRESS.md and NEEDS-ALEX.md; moved `docs/seo-loop-prompt.md` to `docs/seo/LOOP.md`. Verified: `astro build` ok (121 pages); `check-content.mjs` fails with 649 TODO markers on `main` already (booking URL, legal drafts); scanned the build for titles, descriptions, canonicals, hreflang, h1, images and internal links.
- 2026-10-17 T01: `scripts/seo-check.mjs` + `npm run seo:check`, hooked into `npm run build` after `check-content.mjs`. Verified with `CONTENT_CHECK=warn npm run build`: runs over 121 pages and reports the known `TODO:` drafts plus 3 `endocrin` matches (Dr. Tuszing's thesis on endocrine disruptors in en/ru, the Russian PMOS condition name); the latter need an `ALLOWED` entry from Alex (NEEDS-ALEX).
- 2026-10-17 T03 (part): `vercel.json` sends `X-Robots-Tag: noindex, nofollow` for the host `hormonexperten.vercel.app` (a `has` host condition, so `hormonexperten.de` is unaffected). Verified: valid JSON, prettier clean, nothing else in the file changed. Root stays `/` → `/en/` (302) until the root-language decision.
