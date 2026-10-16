# SEO/GEO loop for Claude Code

## How to run it (for Alex)

1. Copy the whole `seo/` folder from the project files into your repo as `docs/seo/`, so you have `docs/seo/seo-geo-plan.md`, `docs/seo/snippets/…` and this file at `docs/seo/LOOP.md`.
2. Commit that, then start Claude Code in the repo and run:

   ```
   /loop Follow docs/seo/LOOP.md exactly. Do one pass, then stop.
   ```

   Leave out the interval so the loop sets its own pace and can end itself when everything is done. If you want a fixed rhythm, use `/loop 15m …` instead.
3. Follow progress in `docs/seo/PROGRESS.md`. Anything only you can do is collected in `docs/seo/NEEDS-ALEX.md`.
4. Each finished task is one commit on the branch `seo/launch-prep`. Nothing is pushed or deployed until you say so.

Everything below this line is the prompt Claude Code follows.

---

# Instructions for Claude Code: SEO/GEO launch prep, one pass per run

You are running inside `/loop`. **Every run is one pass:** read the state, do the next task, verify it, record it, stop. Don't rely on memory of earlier passes. The files below are the only state.

- **Plan (the why):** `docs/seo/seo-geo-plan.md`
- **Reference code:** `docs/seo/snippets/` (`SeoHead.astro`, `schema.ts`, `astro.config.mjs`, `vercel.json`, `robots.txt`, `llms.txt`, `indexnow.mjs`). These are starting points written before the repo existed. Adapt them to the real code; don't paste blindly.
- **State:** `docs/seo/PROGRESS.md` (task list and log) and `docs/seo/NEEDS-ALEX.md` (things only a human can do or decide).
- **Design and content rules:** the repo's `CLAUDE.md`. Follow it. Where it conflicts with this file, the hard rules below win.

## Hard rules (apply to every file, every language, every pass)

1. **Dr. Wilden's title** is exactly "Specialist in General Medicine with a focus on bioidentical hormone therapy". In other languages, use the wording already in the approved content; if there is none, add a `TODO:` and ask in `NEEDS-ALEX.md`. Never use any other specialist title for her: not in copy, alt text, meta tags, JSON-LD, `llms.txt`, comments or commit messages. Never set `medicalSpecialty` to `Endocrine`.
2. **Russian is a website translation only.** Never write or imply that consultations, care or support are offered in Russian. Don't list consultation languages anywhere, and never use `availableLanguage` in schema.
3. **No new medical copy.** Don't write or reword medical statements. Where a page needs text that doesn't exist yet, insert a clearly marked `TODO:` and add it to `NEEDS-ALEX.md`. You may write SEO metadata (titles, meta descriptions, alt text) that only restates approved copy. List every one you write in `NEEDS-ALEX.md` under "Review my drafts".
4. **German medical advertising law (HWG):** no promises of results, no superlatives about outcomes, no prescription medicine named as something to get, no invented numbers, ratings or testimonials. No `AggregateRating` or review markup about the practice itself.
5. **Translations:** don't machine-translate medical content. For DE/EL/RU metadata drafts, mark each one "needs native review" in `NEEDS-ALEX.md`.
6. **Unconfirmed facts stay out:** Rimkus® (certification unconfirmed), the second doctor (credentials unconfirmed), the placeholder phone number +49 30 23125 456, prices that aren't in the content. FAQ items with `needs_check: true` are never rendered or put in schema.
7. **Git and deploys:** work on the branch `seo/launch-prep` (create it from the default branch if missing). One commit per task, message `seo: <ID> <short title>`. Never push, merge, deploy, or change Vercel, DNS, Search Console or CMS production data. Those go to `NEEDS-ALEX.md`.
8. **Stay in scope:** only SEO/GEO work from the task list. Don't redesign components, change tokens, or refactor unrelated code. If a task needs that, mark it blocked and say why.

## The pass

1. **Read state.** Open `docs/seo/PROGRESS.md`. If it doesn't exist, the task is `T00`.
2. **Pick the task.** Take the first task with status `[ ]` (todo) or `[~]` (in progress) whose dependencies are done. Skip `[x]` done, `[!]` blocked and `[?]` waiting on Alex.
3. **Do it.** Keep the change small. If a task turns out bigger than one pass, split it into `T05a`, `T05b`… in `PROGRESS.md`, do the first part, and leave the rest `[ ]`.
4. **Verify.** Every pass must end green:
   - `npm run build` (or the repo's build command) succeeds;
   - `npm run seo:check` passes once `T01` exists (before that, run whichever checks apply by hand);
   - plus the task's own "Done when" checks.

   If verification fails, fix it in the same pass. If the same task fails verification in two passes, mark it `[!]` with the error and move on next pass.
5. **Record.** Update the task's status in `PROGRESS.md` and add one line to its log: date, task ID, what changed, how it was verified. Add anything for Alex to `NEEDS-ALEX.md`. Commit.
6. **Stop or end.** Stop the pass here; the next pass does the next task. **When no task is left with status `[ ]` or `[~]`**, do the final step (`T99`), print a short summary of what was done and what's waiting on Alex, and end the loop without scheduling another run.

## T00: audit (first pass only)

Read the repo and write `docs/seo/PROGRESS.md` with:

- **Repo facts:** Astro version and output mode (`static`, `server` or `hybrid`), adapter (Vercel?), how routes and locales are built (`/{lang}/…`?), where content lives, which pages exist per locale, the base layout file, and the build command.
- **CMS:** the site may use **EmDash** (an Astro CMS) or plain Markdown/JSON in `src/content/`. Find out which, from the code rather than assuming. If EmDash is used, find how its collections and fields are defined and where SEO fields (title, description, last reviewed) should live. Note whether content is available at build time or only at request time, because that decides how the sitemap and JSON-LD are generated.
- **What's already there:** existing meta tags, canonical, hreflang, sitemap, robots, JSON-LD, `llms.txt`, 404 page.
- **The task list** below, copied in with statuses. Mark tasks `[x]` if the audit shows they're already done correctly, and adjust paths in the tasks to the real ones.

Done when `PROGRESS.md` exists with repo facts and the task list, and is committed.

## Task list

Copy these into `PROGRESS.md`. "Done when" is the verification for that task.

### Foundation
- **T01 SEO check script.** Add `scripts/seo-check.mjs` and an `npm run seo:check` script. It reads the built output (`dist/`, or the prerendered pages for a server build) and fails with a clear list of problems on:
  - forbidden terms, case-insensitive: the stem `endocrin` in every script (`endocrin`, `endokrin`, `ενδοκριν`, `эндокрин`), which catches the banned title and `medicalSpecialty: "Endocrine"` in every language (if a page ever needs to mention the endocrine system itself, Alex adds an explicit allowlist entry), plus `availableLanguage`, `AggregateRating`, `lorem ipsum`, `TODO:` (allowed only on pages marked `noindex`) and `23125 456`;
  - phrases suggesting Russian-language care, for example `in Russian`, `auf Russisch`, `στα ρωσικά`, `на русском`, `русскоязычн`, `russischsprachig` (allow the language switcher's own label "Русский");
  - any indexable page missing a `<title>`, meta description, canonical, `<html lang>` matching its locale, or exactly one `<h1>`;
  - duplicate titles or descriptions across indexable pages;
  - titles over 60 characters or descriptions outside 70–160 (warning only);
  - JSON-LD that doesn't parse;
  - hreflang that isn't reciprocal, or hreflang/canonical URLs that aren't absolute `https://hormonexperten.de/…` with a trailing slash;
  - internal links pointing at pages that don't exist in the build.
  Run it after the build in CI or a `postbuild` step if the repo has one.
  Done when the script runs, and deliberately breaking one page (e.g. temporarily adding a forbidden term) makes it fail. Revert the break before committing.
- **T02 Site config.** In `astro.config.*`: `site: 'https://hormonexperten.de'`, `trailingSlash: 'always'`, i18n with `en`, `de`, `el`, `ru` and prefixed routes, following `snippets/astro.config.mjs`. Keep existing settings that conflict and note them in `PROGRESS.md`. Done when the build passes and URLs in `dist/` all end in `/`.
- **T03 Vercel config.** Merge `snippets/vercel.json` into the repo's `vercel.json`: `trailingSlash`, `/` → `/de/` (temporary redirect), a `noindex` header for the host `hormonexperten.vercel.app`, and long cache headers for fonts and `/_astro/`. Done when the JSON is valid and nothing already in the file was lost. Add to `NEEDS-ALEX.md`: in Vercel, redirect `www`, `.com` and `aerztin-regensburg.de` to `hormonexperten.de`, and check that Firewall bot protection doesn't block AI crawlers.
- **T04 Head component.** Add `SeoHead.astro` (from the snippet) and render it in the base layout, so every page passes `title`, `description`, `lang`, `path` and, optionally, `translated` and `schema`. Done when every built page has a title, description, canonical, hreflang for all four locales plus `x-default`, and Open Graph tags (`seo:check` passes).
- **T05 Page metadata per locale.** Give every page in every locale its own title and description, stored with the content (CMS fields or content files, not hard-coded in components). Where they don't exist, draft them from that page's approved copy (hard rules 3–5) and list them in `NEEDS-ALEX.md`. Split this by locale if it's big (`T05-en`, `T05-de`, …). Done when there are no missing or duplicate titles or descriptions.
- **T06 Fallback pages.** Pages shown in English because a translation is missing get `translated={false}`: canonical to the English page, `noindex`, no hreflang, and left out of the sitemap. Done when `seo:check` reports no indexable page whose text is the English fallback (compare body text with the `/en/` page).
- **T07 Sitemap.** Add `@astrojs/sitemap` with i18n, as in the snippet (or an endpoint if the build is server-rendered). Exclude `noindex` pages and the 404 page. Done when `sitemap-index.xml` lists every indexable page once, with `xhtml:link` alternates.
- **T08 robots.txt.** Add `public/robots.txt` from the snippet. Done when it's in `dist/` and names the sitemap.

### Structured data
- **T09 Site graph.** Add `src/lib/schema.ts` from the snippet and put `siteGraph` (WebSite, MedicalBusiness, Dr. Wilden as Person) on every page through `SeoHead`. Fill in only facts that are in the repo or the plan; leave the rest as `TODO` and list them in `NEEDS-ALEX.md` (address, phone, logo, photo, `sameAs` profiles, university name). Don't output a field whose value is still `TODO`; strip those before rendering. Done when the JSON-LD parses on every page, has no `TODO` values, and contains Dr. Wilden's exact title.
- **T10 Medical pages.** Add a "Medically reviewed by" byline component (name, title, last-reviewed date, link to her page) and `medicalWebPage()` JSON-LD on every service, condition and guide page. Take `lastReviewed` from content; if it's missing, ask in `NEEDS-ALEX.md` and leave the byline out. Done when each medical page has both, or is listed as waiting for a date.
- **T11 FAQ.** Add `faqPage()` JSON-LD on the FAQ page in each locale, built from the same data the page renders, skipping `needs_check` items. Done when the questions in the JSON-LD match the visible questions exactly.
- **T12 Breadcrumbs.** Add `BreadcrumbList` JSON-LD on pages below the home page (with a visible breadcrumb only if the design already has one). Done when it parses and the URLs match canonicals.

### Pages and content structure
- **T13 Doctor page.** Make sure `/{lang}/about/dr-wilden/` exists (adapt to the real route). Use only confirmed facts from the plan: title, Fachärztin für Allgemeinmedizin 2009, German licence 2007, MD Bucharest 1989, acupuncture qualification, memberships (Bayerische Landesärztekammer, DÄGfA, Hormonnetzwerk), private practice in Regensburg 2017–2025. Anything else is a `TODO`. Done when the page builds, links from the team section and bylines, and passes `seo:check` (or is `noindex` while TODOs remain).
- **T14 Headings.** One `<h1>` per page, no skipped levels. Where a section answers a question, make the heading the question and put the direct answer in the first sentence after it. Only restructure markup and headings; don't change medical text. Done when `seo:check` passes and the changed headings are listed in the log.
- **T15 Internal links.** Service pages link to pricing, the FAQ and booking. FAQ answers link to their matching service page where one exists. The footer links to Impressum and Datenschutz in every locale. Done when there are no broken internal links and every indexable page is reachable from the home page within three clicks.
- **T16 Scaffolds for missing pages.** For pages in the plan's launch list that don't exist yet (How it works, Pricing, Conventional vs. bioidentical hormone therapy), create the route with headings and `TODO:` content, `noindex` until filled. No medical copy. Done when they build and are listed in `NEEDS-ALEX.md` as "content needed".
- **T17 404 page.** A friendly 404 in each locale with links to the home page, the services and booking, and `noindex`. Done when `dist/404.html` exists (or the adapter's equivalent).

### GEO and performance
- **T18 llms.txt.** Add `public/llms.txt` from the snippet, with real URLs from the build. Keep its sentence that the website's languages don't indicate consultation languages. Done when every URL in it exists in the build and it passes the forbidden-terms check.
- **T19 Images.** Every content image has alt text from content in its locale (`alt=""` only if decorative), explicit width and height, AVIF/WebP via Astro's image components, `loading="lazy"` except the hero. Done when a scan of `dist/` finds no `<img>` without `alt`, `width` and `height`.
- **T20 Performance.** Self-hosted fonts subset to Latin, Greek and Cyrillic with `font-display: swap`; preload only the main font file; no third-party scripts before consent; no render-blocking requests from other origins. If Chrome is available, run Lighthouse on mobile against a local preview for `/de/` and one service page. Done when both score 95 or more in Performance, Accessibility, Best Practices and SEO, or the gaps are logged as their own tasks.
- **T21 IndexNow.** Add `scripts/indexnow.mjs` from the snippet and a `public/<key>.txt` placeholder note. Don't run it. Done when the script exists and running it is described in `NEEDS-ALEX.md` as a launch-day step.

### Wrap-up
- **T22 Repo rules.** Add the "SEO rules" block from the end of the plan to the repo's `CLAUDE.md`, updated with real paths and the `seo:check` command. Done when it's committed.
- **T99 Final pass.** Run the full build and `seo:check`, then rewrite `NEEDS-ALEX.md` as one clean list in this order: decisions, facts to supply, drafts to review, launch-day steps (Search Console domain property and sitemap, Bing Webmaster Tools, Vercel domain redirects, Vercel Firewall AI bots, IndexNow, Rich Results Test on the home, doctor and FAQ pages). Then end the loop.

## PROGRESS.md format

```markdown
# SEO progress
Branch: seo/launch-prep · Build: `npm run build` · Check: `npm run seo:check`

## Repo facts
- …

## Tasks
- [x] T00 Audit
- [~] T05 Page metadata per locale (en done, de next)
- [ ] T06 Fallback pages
- [!] T20 Performance: Lighthouse needs Chrome, not available here
- [?] T10 Medical pages: waiting for last-reviewed dates

## Log
- 2026-10-16 T00: audited repo, Astro 5 static on Vercel, content in EmDash. Verified: build ok.
```
