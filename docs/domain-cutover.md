# Domain cut-over: hormonexperten.de to the new site

How hormonexperten.de moves from the old site (Payload/Next.js, another Vercel project) to this
one, without losing its search rankings or breaking links in patients' emails. Prepared
16 Oct 2026. Do it once the blockers in [`launch-readiness.md`](launch-readiness.md) are cleared.

## The old site's URLs

The full list, crawled 16 Oct 2026, is in
[`migration/old-site-urls.txt`](migration/old-site-urls.txt). Each URL has its category,
language, status, robots tag, date and title.

**120 sitemap URLs:**

| Kind | Count |
|---|---|
| Pages | 28 (13 DE, 15 EN) |
| Blog index and pagination pages | 12 |
| Blog posts | 68 (35 DE, 33 EN; 34 topics, two of them German only) |
| Tag pages | 12 |

**Not in the sitemap:**

- **17 live pages**, plus 2 quiz redirects: `/agb`, `/datenschutz`, `/cookies`,
  `/en/privacy-policy`, `/en/cookies`, `/nutzungsbedingungen-fr-fernbehandlung`, `/ueber`,
  `/tag`, `/en/tag`, six `/termin-buchen|aendern|absagen` pages (DE and EN), and `/quiz/ergebnis`
  (DE and EN).
- **31 legacy URLs:** old WordPress slugs the old site redirects itself, and dead links still in
  its pages, including 68 `/undefined/blog/…` links.
- **9 PDFs** under `/api/documents/file/`: consent forms and the treatment contract.

Today, 117 of the 122 sitemap URLs return 404 on the new site.

## The redirect map (draft)

- [`migration/redirects-draft.json`](migration/redirects-draft.json) is a 159-rule
  replacement for the whole `redirects` array in `vercel.json`.
- [`migration/redirects-table.tsv`](migration/redirects-table.tsv) is the same map, with a note
  on each row.

The map was run through `@vercel/routing-utils` (the library Vercel uses) against all 181 old
paths. Every path lands on a page that returns 200 on the new site, except the 9 PDFs, which need
their files first.

**How it's built:**

- **76 rules are 301** (final). **82 are 302** (interim): blog, downloads, content guidelines and
  booking, until those decisions land. The last rule is the existing English forwarding,
  unchanged and still temporary.
- **Sources end in `/`.** With `trailingSlash: true`, Vercel's own 308 runs before any custom
  rule, so a source like `/kosten` would never match. Each old URL therefore takes two hops: the
  308, then the 301.
- **Query strings pass through** (checked on the live deployment), so tokens in booking links
  survive.

**Decisions built into the draft** (change the draft if a decision goes the other way):

- **Root.** `/` 301 → `/de/`, replacing today's temporary redirect to `/en/`:
  - The old root is German and carries the backlinks.
  - Don't detect the language from the browser: Googlebot sends no language header and would
    always get English.
  - `x-default` stays on `/en/`.
  - Side effect: the CMS's "View" link for the English home entry opens `/de/`.

  Browsers cache a 301 hard, so ship this rule only once the decision is final.
- **`/impressum` and `/datenschutz`.** EmDash never adds `/en/` to "View" links, so `vercel.json`
  forwards unprefixed paths to English, and these two are also the old German URLs. The draft
  takes them out of the English forwarding and sends both to `/de/…` with a 301, ahead of the
  forwarding rule.
  - The cost: in the admin, "View" on the English legal entries opens the German page. Editors can
    switch language from there.
  - If that matters, an extra rule can match `/:page(impressum|datenschutz)/` only when EmDash's
    session cookie is present and send it to `/en/:page/` (temporary). Crawlers have no cookie and
    still get German. Confirm the cookie name first. An editor whose browser has cached the German
    301 keeps getting it.
- **PDFs.** One rule sends `/api/documents/file/:file` to `/downloads/:file` (301). It works only
  once the 9 PDFs are in `public/downloads/` under the same names. They're patient documents, so
  this blocks launch. Ask whether the 2025 versions are current.
- **Booking pages.**
  - `/termin-buchen` goes to pricing (302) until the Pabau URL is final.
  - `/termin-aendern` and `/termin-absagen` go to `faq/#costs-booking`.

  Find out which system sends appointment emails, and whether their links point at these pages.
- **Pages with no new equivalent:**

  | Old page | Interim target | What it needs |
  |---|---|---|
  | `/downloads` | contact | A downloads page |
  | `/inhaltsrichtlinien` (content guidelines) | our-approach | A page of its own |
  | `/quiz/*` | conditions | Nothing; the quiz is gone |
  | Men's-health posts and tag | hormone-therapy | Nothing; no men's page exists |
  | `/tag/ankuendigungen` | home | Nothing; no topical equivalent |

**The blog** is the biggest open question:

- **A. Migrate it (recommended, even if the cut-over waits for it).**
  - Add an EmDash `posts` collection at `/{lang}/blog/{slug}/` and keep the old slugs.
  - English posts then need no redirect at all. German needs four rules, replacing the draft's 82
    interim ones:
    - `/blog/` → `/de/blog/`
    - `/blog/page/:n/` → `/de/blog/`
    - `/blog/:slug/` → `/de/blog/:slug/`
    - `/en/blog/page/:n/` → `/en/blog/`
  - Check every post against HWG first. Titles such as "Hashimoto erfolgreich behandeln" and
    "Hitzewallungen effektiv behandeln" promise results.
- **B. Keep the old app on a subdomain** for the blog, and 302 there.
- **C. Send each post to the closest page.** This is what the draft does now. Google treats most
  of these as soft 404s, so the long-tail rankings are lost.

**Merging it:** the draft replaces the `redirects` array, and SEO loop task T03 edits the same
array (root redirect, noindex header). Merge the map after T03, or hand it to the loop, so the two
don't overwrite each other.

Keep the migration map in `vercel.json`. EmDash's own redirect manager skips paths with a file
extension (the PDFs), but it's handy after launch for one-off fixes without a deploy.

## Worth keeping from the old site

- **Ranking titles,** for their keywords, not their claims:
  - "Bioidentische Hormone – Wirkung & mehr"
  - "Bioidentische Hormonersatztherapie"
  - "Kosten für eine Videosprechstunde"
  - "Behandlungsablauf der Videosprechstunde"

  The old meta descriptions make HWG-risky promises; don't copy them.
- **The bioidentical hub.** The old page had about 1,800 words; the new service page has about
  1,000.
- **Structured data:** the old site has a local business with a Cyprus address, Regensburg map
  coordinates, "20.000 Fälle" and about 40 directory listings. Carry none of it over:
  - Under CLAUDE.md, the address appears only in the Impressum and Datenschutz.
  - The claim is unconfirmed.

  The practice should decide which location its directory listings show.
- **Trust signals:** ProvenExpert (4.88/5 from 212 ratings, as text, no widget), Jameda "Top 7
  Ärzte 2025", QS24 interviews, two YouTube videos. Use them as plain links, and only once
  confirmed.
- **Contact details:** phone +49 1512 2682 778 and info@hormonexperten.de match on both sites.
  Opening hours and the Jameda URL differ (see [`launch-readiness.md`](launch-readiness.md)).

## DNS today (16 Oct 2026)

| Record | Value |
|---|---|
| Nameservers | Strato (`docks20.rzone.de`, `shades14.rzone.de`) |
| Apex A | `76.76.21.21` (Vercel) |
| www | CNAME `cname.vercel-dns.com` |
| MX | `5 smtpin.rzone.de` (Strato mail) |
| TXT | Google site verification, Ahrefs, Brevo |
| DKIM | `brevo1/brevo2._domainkey` |
| DMARC | `p=none` |
| SPF, CAA | none |

Both sites run on Vercel and DNS already points at Vercel, so the cut-over moves the domain from
one Vercel project to the other and changes no DNS. Email isn't affected as long as the
nameservers stay at Strato: don't move them to Vercel DNS. Adding an SPF record is worth doing,
as a separate change.

## Runbook

### Before

1. **Search Console.** Get access to the existing property, and export the top pages, queries and
   backlinks. Add any old URL that's missing to the map.
2. **Decisions.** Settle the blog, the PDFs and booking. Find out what appointment emails link to.
3. **Merge to `main`:** the redirects, the sitemap, robots.txt, the 404 page, the root change and
   the noindex header for vercel.app. Test the map against the preview deployment with curl.
4. **Admins.** Make sure every admin can sign in with Google. Passkeys made on vercel.app won't
   work on the new domain.
5. **Google Cloud** (the "Hormonexperten admin" OAuth client):
   - add the redirect URI `https://hormonexperten.de/_emdash/api/auth/oauth/google/callback`
   - add `hormonexperten.de` as an authorised domain on the consent screen
6. **Vercel team.** Check which team owns the old project. If it isn't this project's team,
   prepare the `_vercel` TXT verification record at Strato in advance.
7. **Old sitemaps.** Keep copies of them in `public/` for 4–8 weeks, so Google finds the old URLs
   and their redirects quickly.

### Cut-over (pick a quiet hour)

1. In the old project, remove `hormonexperten.de` and `www.hormonexperten.de`. Don't delete the
   project.
2. In this project, add both domains, with `www` redirecting to the apex. If Vercel's dashboard
   shows a different DNS target, accept it.
3. Set `EMDASH_SITE_URL=https://hormonexperten.de` (Production), check the site URL in the
   EmDash admin settings, and redeploy.
4. Test with curl:
   - about 20 old URLs, including `/`, `/impressum`, `/kosten`, a blog post and a PDF
   - `/robots.txt` and `/sitemap.xml`
   - an unknown URL, which should get the 404 page
   - admin sign-in with Google
   - one publish, which should trigger the deploy hook
5. In Search Console, submit `/sitemap.xml` and leave the old sitemaps submitted. Import the
   property into Bing Webmaster Tools.

### Two weeks after

- **Daily:**
  - Search Console coverage (404s, soft 404s)
  - Vercel logs filtered to 404
  - EmDash's 404 log

  Fix what turns up with rules.
- Update the links on Jameda, ProvenExpert, the Google Business Profile and Instagram.
- Turn the 302s into 301s as the decisions land.

### Rollback

Keep the old project deployed and untouched for at least four weeks. To roll back:

1. Remove the domains from this project.
2. Add them back to the old project. That's quick within one team; across teams, the TXT record
   has to be verified again.
3. Set `EMDASH_SITE_URL` back to `https://hormonexperten.vercel.app`, and redeploy.

No DNS change is needed in either direction.
