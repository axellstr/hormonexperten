# SEO and GEO plan

Audit of the Astro build against the live site (hormonexperten.de, Payload/Next.js), 9 Oct 2026. **SEO** is ranking in classic search (Google, Bing). **GEO** (generative engine optimisation) is being found, quoted and cited by AI answers: Google AI Overviews and AI Mode, ChatGPT search, Perplexity, Claude, Copilot.

Health is a "Your Money or Your Life" topic: search engines and AI systems weight expertise, authorship and trust signals more heavily than for other sites. Every content rule in `CLAUDE.md` (no unverified claims, HWG, never "endocrinologist") applies here too, including meta descriptions, structured data and `llms.txt`.

## 1. Current state

### Already good

- Static HTML, no JS by default, self-hosted fonts, AVIF hero preload, responsive images: Core Web Vitals should be strong.
- Every page: `<title>`, one `<h1>`, correct `<html lang>`, canonical, hreflang for all four locales plus `x-default` (`src/layouts/BaseLayout.astro`).
- Clean URLs (`/de/services/menopause/`), visible breadcrumbs, FAQ with real copy.
- Decorative images have `alt=""`; content images have alt text from content files.

### Gaps found (build audit of 61 pages)

| # | Gap | Where |
|---|---|---|
| 1 | **No redirects.** ~110 live URLs (pages, ~37 blog posts DE+EN, tag pages) would 404 at launch. CLAUDE.md requires 301s. | `src/redirects` doesn't exist; `vercel.json` has only `/` → `/en/` |
| 2 | **No blog.** The live blog is probably most of the organic traffic. | n/a |
| 3 | **German moved off the root.** Live: German at `/`. New: `/` → `/en/` (302). | `vercel.json`, `astro.config.mjs` (`defaultLocale: 'en'`) |
| 4 | **Ranking pages with no equivalent:** bioidentical hormones (live homepage H1), pricing (`/kosten`), treatment process, contact, downloads. Footer "Bioidentical Hormones" links to `/services`. | `src/content/site/*.json` |
| 5 | No `sitemap.xml`, no `robots.txt`, no 404 page. | `public/`, `src/pages/` |
| 6 | No Open Graph / Twitter tags, no share image. | `BaseLayout.astro` |
| 7 | No structured data (JSON-LD). | n/a |
| 8 | `TODO:` meta descriptions on services index, all 6 service pages, team, FAQ (blocked by the build check). | `src/content/{services,team,faq}/*.json` |
| 9 | Untranslated fallback pages (team profiles in DE/EL/RU, legal in EL/RU) carry hreflang as if translated: duplicate content. | `[member].astro`, `[legal].astro` |
| 10 | Broken footer links on every page: `/about-us`, `/contact`, `/partners`, `/terms`. | `src/content/site/*.json` footer |
| 11 | Titles, H1s and German slugs carry no search terms ("Hormone Therapy \| Hormonexperten", `/de/services/hormone-therapy`). | content files, routes |
| 12 | Dr. Wilden's profile meta description says "more than 35 years" (unverified; live site says 14 years). | `src/content/team/*.json` |

### What the live site has (reference)

Sitemaps: `https://hormonexperten.de/pages-sitemap.xml`, `/posts-sitemap.xml`, `/tags-sitemap.xml`. German at root, English under `/en/`.

Pages (DE → EN):

```
/                                   /en
/bioidentische-hormone              /en/bioidentical-hormones
/hormonersatztherapie               /en/hormone-therapy
/hormontherapie-nach-rimkus         /en/hormone-therapy-rimkus
/kosten                             /en/treatment-costs
/behandlungsablauf                  /en/treatment-process
/downloads                          /en/downloads
/kontakt                            /en/contact
/termin-buchen                      (booking wizard)
/ueber, /ueber/ueber                /en/ueber/about
/ueber/dr-isabella-wilden           /en/ueber/dr-isabella-wilden
/ueber/yvonne-tuszing               /en/ueber/yvonne-tuszing
/blog, /blog/page/2–6               /en/blog, /en/blog/page/2–6
/blog/{slug} (~37)                  /en/blog/{slug} (~37)
/tag/{slug} (6)                     /en/tag/{slug} (6)
/impressum                          /en/legal-notice
/datenschutz, /cookies, /agb        /en/terms
/inhaltsrichtlinien                 /en/content-guidelines
                                    /en/terms-of-use-for-telemedical-treatment
```

Trust assets on the live site: ProvenExpert 4.89/5 (213 reviews), Jameda "Top 7 Ärzte Deutschland 2025" (press: presse.jameda.de), QS24 interviews, full CV on the profile page. Live phone: +49 1512 2682 778.

## 2. Decisions needed

- [ ] **Root language.** Recommended: `/` 301 → `/de/`, `x-default` → German, since existing rankings and patients are German.
- [ ] **German slugs** (`/de/leistungen/wechseljahre`)? Better for search, but changes the `/{lang}/...` same-path rule in CLAUDE.md.
- [ ] **Migrate the blog?** Strongly recommended.
- [ ] **AI crawlers:** allow training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot) or only search/answer crawlers (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot)? See section 5.
- [ ] Get **Google Search Console** access for the current property from the practice (export queries and top pages before launch).

## 3. Phase 0: before launch (protect existing rankings)

- [ ] Export Search Console data: top pages, top queries, backlinks (Links report). This decides which pages must be kept and what wording ranks.
- [ ] Build the 301 map from the live sitemaps (`src/redirects` → `vercel.json` redirects). Every old URL goes to its closest new page, never all to the homepage.
- [ ] Migrate the blog as an Astro content collection (`src/content/blog/{lang}/*.md`), keeping titles, dates and authors; redirect old slugs.
- [ ] Build the missing pages: bioidentical hormones, pricing, treatment process, contact, downloads (or redirect deliberately).
- [ ] Fix broken footer links.
- [ ] Resolve `TODO:` meta descriptions (approved copy only).
- [ ] After launch: submit the new sitemap, use the Change of Address tool only if the domain changes (it doesn't), watch Search Console coverage and 404s daily for two weeks.

## 4. Phase 1: technical SEO

- [ ] `@astrojs/sitemap` with the `i18n` option (hreflang in the sitemap), excluding `needs_check` and untranslated fallback pages.
- [ ] `public/robots.txt` with the sitemap URL and the AI crawler policy (section 5).
- [ ] `src/pages/404.astro`, localised, with links to services and contact.
- [ ] Open Graph and Twitter tags in `BaseLayout.astro`: `og:title`, `og:description`, `og:url`, `og:image` (1200×630, one per locale), `og:locale` + `og:locale:alternate`, `og:site_name`.
- [ ] JSON-LD (one `@graph` per page, built from content files):
  - `Organization` / `MedicalBusiness` (name Hormonexperten, url, logo, email, phone, address from the Impressum, `sameAs`: Jameda, ProvenExpert, social profiles once confirmed).
  - `Physician` / `Person` for Dr. Wilden: title "Specialist in General Medicine with a focus on bioidentical hormone therapy", `medicalSpecialty` not set to endocrinology, `alumniOf`, `hasCredential` from the verified CV.
  - `WebSite`, `WebPage` / `MedicalWebPage` with `inLanguage`, `lastReviewed`, `reviewedBy`.
  - `BreadcrumbList` from the existing breadcrumb.
  - `FAQPage` on FAQ pages (Google shows FAQ rich results only for authoritative health/government sites, but AI systems read it either way).
  - `Article` / `BlogPosting` with `author`, `datePublished`, `dateModified` for the blog.
  - **No** `AggregateRating` for the practice itself (self-serving reviews are ignored by Google and risky under HWG).
- [ ] Untranslated pages: translate, or canonical to the English page and drop them from hreflang and the sitemap until translated.
- [ ] Extend `scripts/check-content.mjs`: fail on missing/duplicate titles, descriptions outside ~70–160 characters, broken internal links, pages without JSON-LD.
- [ ] Lighthouse 95+ on mobile for every template (already a CLAUDE.md target).

## 5. GEO: being cited by AI answers

AI answers pick sources that state facts plainly, show who wrote them and why they are qualified, and agree with what other sources say about the same entity. Most of that is good SEO done thoroughly; the specifics:

**Crawl access**
- [ ] Decide the robots.txt policy. Search/answer bots (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Bingbot, Googlebot) must be allowed or the site can't be cited. Training bots (GPTBot, ClaudeBot, Google-Extended, CCBot) are a separate choice for the practice.
- [ ] Everything important is in the static HTML (it is: no JS-rendered content). Keep it that way; AI crawlers mostly don't run JavaScript.
- [ ] Optional: `/llms.txt` (and per-locale versions) listing the key pages with one-line summaries: who the practice is, services, pricing, how booking works, the doctor's credentials. Cheap; adoption by AI systems is still limited, so don't rely on it.

**Content shape**
- [ ] Answer first: each service, condition and blog page opens with a 2–3 sentence plain answer (what it is, who it is for, how it works here, what it costs), then the detail. These are the passages AI answers quote.
- [ ] Question-shaped headings that match how people ask ("What are bioidentical hormones?", "How much does an online hormone consultation cost?", "Can I get hormone therapy online in Germany?").
- [ ] Concrete, checkable facts in text, not only in images: prices, durations (60-minute video consultation), process steps, who pays (self-pay; private insurance may reimburse in part), where patients can be treated.
- [ ] Definitions and comparisons AI systems like to cite: bioidentical vs synthetic hormones, HRT vs Rimkus®, what the check-up measures. HWG still applies: no promises of results, no disease claims.
- [ ] Cite sources (guidelines, studies) in medical articles; link them.
- [ ] Visible author box, "medically reviewed by", and last-updated date on every medical page and article.

**Entity consistency** (AI systems cross-check)
- [ ] Same name, title, address, phone and email everywhere: site, Impressum, JSON-LD, Jameda, ProvenExpert, Google Business Profile, social profiles. Fix the phone number first (live vs mockup).
- [ ] One consistent description of Dr. Wilden's title and experience across all profiles. Resolve the conflicting live claims (5,000+ vs 30,000 patients; 35+ vs 14 years) before any of them appear anywhere.
- [ ] Brand written "Hormonexperten" everywhere.
- [ ] `sameAs` links in JSON-LD to every verified profile.

**Off-site mentions**
- [ ] Keep Jameda and ProvenExpert profiles current and linking to the new URLs; reviews there are what AI answers repeat about the practice.
- [ ] Interviews and press (QS24, Jameda press) linked from the site and pointing back.
- [ ] Google Business Profile, if the practice address qualifies.

**Measure**
- [ ] Matomo: segment referrers from `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`, `gemini.google.com`, `claude.ai`.
- [ ] Monthly spot check: ask ChatGPT, Perplexity, Google AI Mode and Claude the target questions (DE and EN) and note whether Hormonexperten is cited and what they say.

## 6. Phase 2: content

- [ ] Keyword-informed titles, H1s and descriptions from the Search Console export (copy approved by the practice). Title pattern: `{Topic, with search term} | Hormonexperten`, under ~60 characters.
- [ ] Topic hub: bioidentical hormones page as the hub, linking to services, conditions, pricing and related articles; each article links back to the hub and one service.
- [ ] Condition pages matching services the practice already sells (from `/kosten`): perimenopause, thyroid, PCOS and endometriosis, after pregnancy, men's hormones / andropause.
- [ ] Pricing page in all locales (strong commercial-intent page, and a fact AI answers look for).
- [ ] Verified CV on Dr. Wilden's profile (dates, qualifications, memberships) as the anchor for authorship.
- [ ] Remember the hard rules: Russian is a website translation only (no "consultations in Russian"); Rimkus® only once the certification is confirmed current (live CV lists 2012–2018); no unverified stats.

## 7. Phase 3: off-site and monitoring

- [ ] Search Console and Bing Webmaster Tools, verified by DNS (no script).
- [ ] Matomo goals: clicks on the booking link, email and phone links.
- [ ] Update every external profile and backlink you control to the new URLs.
- [ ] Monthly: Search Console coverage, queries, CTR by page; GEO spot check (section 5).
