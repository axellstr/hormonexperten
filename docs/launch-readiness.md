# Launch readiness

Where the relaunch stands on 16 Oct 2026, and everything left before hormonexperten.de moves to
the new site. This is the working list: tick items here as they're done.

The findings come from:

- a strict build of `main` (`69888af`, `CONTENT_CHECK` unset)
- a crawl of all 120 live pages on https://hormonexperten.vercel.app (30 per language)
- a read of the code, and a status check of every item in the earlier audits (now in
  [`archive/`](archive/))
- the old site's sitemaps and DNS

The domain move itself is in [`domain-cutover.md`](domain-cutover.md). Sitemap, robots.txt,
Open Graph, JSON-LD and the 404 page are being built by the SEO loop on branch `seo/launch-prep`
([`seo/PROGRESS.md`](seo/PROGRESS.md), its questions in [`seo/NEEDS-ALEX.md`](seo/NEEDS-ALEX.md);
both are on that branch until it's merged).
This file points to those tasks rather than repeating them.

## Verdict

**The site is built and works.** All 120 pages return 200, and there are no broken internal links
apart from one placeholder. Every hard content rule passes on the live pages. Nothing on a public
page sets a cookie or loads from a third party.

**It isn't ready for the domain.** Four of the five reasons need the practice more than code:

1. No booking button works.
2. The contact form throws messages away.
3. The legal pages are visible drafts.
4. Production builds in work-in-progress mode (`CONTENT_CHECK=warn`). That puts unconfirmed claims
   on vercel.app, and search engines can index it.
5. 117 of the old site's 122 sitemap URLs would return 404 on the new site.

## What already passes

- **Hard content rules, on all 120 live pages:**
  - "Endocrinologist" appears in no language.
  - Nothing implies consultations in Russian.
  - Consultation languages are only English, German, Greek and Romanian.
  - "Hormon Experten" appears nowhere.
  - Rimkus never carries the ®.
  - Payment icons are exactly Visa, Mastercard, Diners Club, SEPA and Klarna.
  - There is no lorem ipsum and no grey placeholder.
- **Privacy:**
  - No public page sets a cookie or uses browser storage.
  - No third-party scripts, fonts, iframes or images.
  - Vercel Web Analytics is first-party and starts only once a page is actually shown.
- **Structure:**
  - One H1 per page, and `lang` matches the route.
  - Every image has alt text, and no heading level is skipped.
  - Canonicals and hreflang are consistent.
- **Headers:**
  - HSTS (with preload), `nosniff`, `X-Frame-Options: DENY`, Referrer-Policy and
    Permissions-Policy.
  - `/_astro/` files are cached for a year (immutable), fonts for 30 days.
- **Checks:**
  - `astro check` reports 0 errors and 0 warnings.
  - In a strict build, none of the seed's `needs_check` strings reach a page (0 leaks).
  - `npm audit` reports 3 "high" issues, all in `path-to-regexp`, which only the Vercel adapter's
    build tools use. Don't run `npm audit fix --force`: it downgrades the adapter.

## Launch blockers

| # | Blocker | Evidence | Unblocked by |
|---|---|---|---|
| B1 | **No booking link works** | `BOOKING_URL = '#TODO-booking-url'` (`src/config.ts:26`): 516 links on all 120 pages, including 7 on pricing. It's 516 of the strict build's 649 problems. | The practice: the Pabau URL, and whether Book goes straight to booking or to pricing first. Then tech: the URL lives in code, not in the CMS. |
| B2 | **The contact form loses every message** | `<form method="post">` with no action or script (`src/components/sections/ContactHero.astro:151`). Submitting returns 405. The consent line and privacy note on the page are visible TODOs. | You decide: launch without the form, or build it (see [Contact form](#contact-form)). |
| B3 | **The legal pages are drafts** | About 133 TODOs on screen, plus the draft notice on every legal page. The en/el/ru Impressum and Datenschutz are stubs. AGB § 3 lists Starter/Comfort/Premium at €380/490/590, while pricing has Basic €380 and Intensive €499. The remote-treatment terms are dated 15 Nov 2025 and still name Whereby. | The practice supplies the facts, then a lawyer or data protection adviser signs off. Then `approved` is set in the admin. See [Lawyer](#lawyer-or-data-protection-adviser). |
| B4 | **Production shows unconfirmed content** | `CONTENT_CHECK=warn` on Production turns on `SHOW_UNCONFIRMED` (`src/config.ts:38`), so every `needs_check` item is live. While it's on, the CMS's "only confirmers may switch Needs check off" gate protects nothing. | The practice confirms or drops each item ([list below](#b4-what-is-unconfirmed-and-live-today)). Then you remove the variable, and the strict build fails until B1, B3 and every TODO in the admin are fixed. |
| B5 | **Old URLs would 404** | 117 of 122 old sitemap URLs (`/kosten`, `/kontakt`, `/bioidentische-hormone`, all 68 blog posts). `/impressum` reaches the English stub through 3 hops, the last a temporary 307. | Decisions on the blog, the PDFs and the root language. Then tech: the map is drafted ([`domain-cutover.md`](domain-cutover.md)). |
| B6 | **No sitemap, robots.txt or 404 page of our own** (done 17 Oct) | Now built: `sitemap.xml` (120 URLs, from the built pages), `robots.txt` and an English `404.html`. Still to do: the draft legal pages are in the sitemap until they're `noindex` or filled (T06), and the live database needs the `not_found` field for the 404 text. | Done, apart from those two. |
| B7 | **vercel.app is indexable today** | robots.txt allows everything and no page sends noindex, while draft legal pages and unconfirmed claims are live. | Done 17 Oct (T03): `vercel.json` sends `X-Robots-Tag: noindex, nofollow` for `hormonexperten.vercel.app`. Check the header after the first deploy. |

**Fix today in the admin** (both are live now):

- [ ] The English hero subline starts "**The Yvonne** Private online consultations with
      Dr. Wilden…" (`/en/` only). Home page → English → Hero.
- [ ] The Facebook icon links to `TODO`: 244 links, each ending in a 404. Site texts → footer →
      social: add the real URL or delete the row. It's flagged, so it disappears once `warn` goes,
      but it's live until then.

### B4: what is unconfirmed and live today

Each item needs one of two things. Either the practice confirms it with a source, and a confirmer
(`CONTENT_CONFIRMERS`) switches Needs check off. Or it's removed.

**Flagged** (these disappear once `warn` is off):

- [ ] Hero trust line on all four home pages: "35+ years of experience · 5,000+ patients treated",
      with the ProvenExpert rating.
- [ ] FAQ answers waiting for Dr. Wilden: testosterone after menopause, heavy periods, cancer risk,
      risk conditions (family breast cancer, thrombosis, migraine), osteoporosis.
- [ ] Our Approach facts: "100% online care, no waiting room" and "4 EU countries where
      Dr. Wilden is licensed to practise".
- [ ] "Consultations in" on both profiles. The languages were confirmed on 14 Oct, so these flags
      can probably go.
- [ ] Related chips on condition pages that link nowhere: "Female hormones", "Premium Hormone
      Package", "Thyroid therapy". They need the pages first.
- [ ] Service pages: "What your therapy is based on" (hormone therapy), "What we look at"
      (weight), and the comparison cell "or the Rimkus method on request".

**Not flagged** (these stay live with `warn` off; each needs a decision):

- [ ] **Dr. Wilden's profile:** "more than 35 years" in the lead and meta description (all
      locales), "accompanied thousands of women", and her Hormone Expert certification dated 2017
      in one place and 2018 in another. The profile was approved on 9 Oct, but its check notes
      still ask for a source for each (`src/content/team/en.json`, profile `check_notes`). The old
      site said 30 years in one place and 14 in another.
- [ ] **Dr. Tuszing:** commit `9db1a88` unflagged her card and profile. CLAUDE.md still says her
      credentials are unconfirmed, so confirm or re-flag, and update CLAUDE.md to match. Her
      profile gives two start years: "2023 Joins Hormonexperten" and "since 2026". Because she
      treats patients on the site, the Impressum needs her professional details as well.
- [ ] **Partner logos** (`home.trust`, not flagged since `4fb503d`): Jameda, ProvenExpert, Hormon
      Netzwerk, DÄGfA, Allvital, Biogena, Mitocare, Labor Rosler. For each, the practice should say
      what the relationship is and give written permission to use the logo. Supplier logos beside
      "medications delivered to your home" are a professional-law question (lawyer list).
- [ ] **Review counts** 17 / 168 / 19. Jameda's 168 matches the platform. ProvenExpert's own data
      says 12 reviews and 212 ratings. Add an "as of" date.

## Decisions needed

| Decision | Options and recommendation | Blocks |
|---|---|---|
| Booking flow | The Pabau URL; Book → booking directly, or → pricing first | B1 |
| Contact form at launch | **Recommended:** hide it and keep email, phone, WhatsApp and booking. The alternative is to build it to the requirements below | B2 |
| Root language | **Recommended:** `/` 301 → `/de/` (the old root is German and has the backlinks), with `x-default` staying on `/en/`. CLAUDE.md names English the master; that rule is about content and stays | B5, SEO T03 |
| Blog (68 posts) | **Recommended:** migrate it as an EmDash collection at `/{lang}/blog/{slug}/`, after an HWG check of each post. Alternatives: keep the old app on a subdomain, or redirect posts to the closest page (long-tail rankings lost) | B5 |
| Patient PDFs (9 consent forms and contracts) | Put the current versions in `public/downloads/` under the old names, or redirect elsewhere. Ask whether the 2025 versions are still current | B5 |
| AI crawlers | Allow training crawlers, or only search and answer crawlers | SEO T08 |
| Dr. Tuszing | Confirmed, or behind a flag again | B4, Impressum |
| `seo-geo-plan.md` | It's deleted in your working tree but not on `main`. The SEO loop expects it under `docs/seo/` | SEO loop |
| Design items from the 11 Oct review | F14–F18 and F20 (below), unchanged since | none, but worth settling |

## Checklist by owner

### Practice

- [ ] The Pabau booking URL (B1).
- [ ] Every item in the [B4 list](#b4-what-is-unconfirmed-and-live-today): confirm with a source,
      or remove.
- [ ] Impressum facts:
  - the director names of Endoone Limited (Dr. Tuszing's profile says "Co-owner and CEO")
  - the company registration number
  - which medical chamber each doctor belongs to today (the Bavarian chamber and/or the Cyprus
    Medical Council)
  - the professional liability insurer, its address and territorial scope
  - Dr. Tuszing's professional title, the state that granted it, her chamber and its rules
- [ ] Pabau answers (see [Pabau](#pabau)).
- [ ] Image licences ("Bildnachweise" is a TODO in the Impressum):
  - **`friendly-helpdesk-laptop.png`** is AI-generated: its metadata says ChatGPT gpt-image,
    `trainedAlgorithmicMedia`. It shows a woman beside "Send us a message" on the contact card on
    24 pages per locale. Replace it with a real photo, or drop the image.
  - The five `service-*.jpg` are from Unsplash (the IDs are in their metadata). Record each
    licence, and check that none is Unsplash+.
  - `service-bioidentical-hormone-therapy.png` and `wilden-call.jpg`: the source is unknown.
  - The nine studio photos (Yiangos Photography, 30 Sep 2026): a written licence is needed.
  - Every brand and partner logo: permission.
- [ ] Contradictions on the profiles:
  - Our Approach lists "surgery" among Dr. Wilden's fields; her profile doesn't.
  - The header titles on her profile (Hormone Expert · Certified in Bioidentical Hormone Therapy ·
    Certified in Orthomolecular Medicine) differ from her title in CLAUDE.md.
- [ ] "Book from anywhere in the world" (FAQ, all locales): may the doctors treat patients outside
      the EU? If not, narrow the wording.
- [ ] WhatsApp (+357 94 309399) as a cancellation channel. If it stays, the privacy policy has to
      cover it.
- [ ] Old tools named in the old privacy policy (EasyPractice, Whereby, Cookiebot, PostHog,
      Matomo, and Brevo, which still has DNS records): end them and settle their data.
- [ ] Search Console access for the existing property (a Google verification TXT record exists),
      so top pages and queries can be exported before the move.
- [ ] Opening hours: the old site says Mon–Fri 8:00–17:00, the new one Mon–Sat 9:00–17:00.
- [ ] The English Services heading's stray comma (F24).
- [ ] The oldest supported iOS (F28). The site needs Safari 16.4+. Look up the share of older
      iPhones in the old site's analytics.

### Lawyer or data protection adviser

These are questions, not conclusions. Points marked (unsure) were a first reading and need a
professional answer.

- [ ] **Structure:**
  - Endoone Limited (Cyprus) is the provider. AGB § 1.1 merges the company and Dr. Wilden into
    "die Ärztin". Who contracts with the patient: the company or each doctor?
  - May the doctors practise through a Cypriot company under the rules of their chamber?
  - Does Cyprus require a licence for a telemedicine practice? If so, the Impressum must name the
    supervisory authority.
  - Do German HWG and UWG apply?
- [ ] **AGB:**
  - The choice of Cypriot law needs the consumer-protection carve-out.
  - "Courts in Pyla": there's no court there (probably Larnaca, unsure).
  - § 4.1, GOÄ multipliers 5.0–7.0 "by accepting these AGB": either it needs a separate written
    agreement, or delete it if GOÄ doesn't apply, which is the FAQ's position.
  - Likely invalid clauses: § 4.4 (interest rate and dunning fees), § 4.6, § 8.2, § 10.2, and
    § 12.4 together with remote-treatment terms § 14.3 ("confirms all questions were answered").
  - § 8.6 gives insurance details only "on request", which is probably not enough.
  - § 9 right of withdrawal, and whether package parts that aren't treatment need a withdrawal
    button (unsure).
  - § 11.4's dispute-resolution statement is ambiguous.
  - Align § 3 with the pricing page (B3).
- [ ] **Titles:**
  - May "Dr. medic." (a Romanian degree) and "Dr. … M.D." (a Cypriot M.D.) be used as "Dr."?
  - Does "Specialist in Acupuncture" (a DÄGfA course) read as the chamber's Zusatzbezeichnung?
- [ ] **Impressum** (§ 5 DDG):
  - representatives and register number
  - the chamber's address and link
  - the professional rules and where to read them
  - the supervisory authority, if any
  - Dr. Tuszing's entries
  - insurance details
  - "Hormonexperten ist ein Angebot der Endoone Limited"
- [ ] **Privacy:**
  - Is a data protection officer needed? A DPIA? A record of processing activities?
  - Confidentiality undertakings from processors (§ 203 StGB).
  - Retention periods, "no automated decisions", and the Cyprus authority's address.
  - Is the UK adequacy decision still valid (Pabau)?
  - **Analytics:** the Vercel script reads one `localStorage` key on every page view (it writes
    only on `identify`, which the site never calls). Is the policy's "reads nothing from your
    device that isn't necessary" still accurate (§ 25 TDDDG)?
- [ ] **HWG wording to read** (all live):
  - "100 % online · No waiting room" applied to serious conditions (§ 9).
  - Named prescription substances, "approved weight-loss medication", testosterone for women, and
    peptide therapy (§ 10).
  - Efficacy phrasing: endometriosis "calm inflammation throughout the body"; osteoporosis "Yes,
    it can slow down bone loss"; "can improve significantly".
  - The doctors' personal health stories.
  - The comparative safety claim in remote-treatment terms § 3.1.
  - AGB § 3.2.3 ("Hormonergänzung statt Potenzmittel").
- [ ] **Testimonials** (UWG § 5b(3)): state whether and how reviews are verified and how they were
      chosen. All ten shown are five stars.
- [ ] **Partner logos:** supplier logos next to "medications delivered", under MBO-Ä §§ 31 and 34(5)
      and § 299a StGB.
- [ ] **Remote treatment** (§ 7(4) MBO-Ä): the disclosure exists (remote-treatment terms § 10, the
      Important information note). Does a fully online practice fit "im Einzelfall"?
- [ ] **Accessibility (BFSG):** a micro-enterprise is probably exempt (fewer than 10 staff and
      ≤ €2 M). A voluntary accessibility statement is still worthwhile. It would name the
      white-on-coral contrast (2.5:1) as a known limitation and give a contact for reporting
      barriers.
- [ ] **ODR:** the EU ODR platform closed on 20 July 2025. There's no link to it on the site; keep
      it out of the Pabau templates and invoices too.

### Pabau

- [ ] The legal entity, its address, the data region (EU or UK) and the sub-processor list (video,
      SMS, email).
- [ ] AI transcription ("Scribe") off, and recording off by default.
- [ ] The payment processor (Stripe?), and whether Diners Club and Klarna are really enabled.
      Klarna isn't in the privacy policy yet.
- [ ] The exact button label in the booking flow (the AGB quote it), an AGB and remote-terms
      checkbox, and a privacy link.
- [ ] No health data in reminder emails or SMS.
- [ ] The services set up in Pabau match the pricing page.
- [ ] Which system sends appointment emails, and what their links point to. Old
      `/termin-buchen|aendern|absagen` links must keep working ([`domain-cutover.md`](domain-cutover.md)).

### Tech

**Before launch:**

- [ ] Set `BOOKING_URL` (B1).
- [ ] Contact form: hide it for launch, or build it (see [Contact form](#contact-form)). Either way,
      the consent and privacy TODOs go.
- [ ] Legal pages in en/el/ru: until they're translated, show the German text marked
      `lang="de"` rather than empty TODO headings. Drop them from hreflang and the sitemap.
- [ ] Remove `CONTENT_CHECK` from Production once B1, B3 and B4 are done, and check the strict
      build passes. Keep `warn` on Preview only, if at all.
- [x] SEO, done 17 Oct: T01 check script, T03 noindex on vercel.app, T04 Open Graph, T07 sitemap,
      T08 robots.txt, T09 JSON-LD, T17 404 page. Left in the loop: the root redirect (`/` → `/de/`
      waits on your decision), T05 and T06 (metadata, fallback pages), T10–T16, T18–T22.
- [ ] Merge the redirect map into `vercel.json` and test it ([`domain-cutover.md`](domain-cutover.md)).
- [ ] The Approach CTA's "Learn More" has no descriptive accessible name (`Approach.astro:47`;
      the Team card already has one). Lighthouse SEO flags it.
- [ ] Three animations loop with no pause for touch or keyboard users. That fails WCAG 2.2.2
      (Pause, Stop, Hide) now that their content is live:
  - the hero trust line on phones (`hero-trust-cycler.ts`)
  - the logos (`logo-cycler.ts`)
  - the review sources on phones (`review-source-cycler.ts`)

  The services row also slides by itself 1.5 s after it comes into view (`service-rail.ts`, F7).
  Stop each after one turn, or show them static.
- [ ] The Header Services entry is a link inside a `<summary>`, which is a nested interactive
      control (`Header.astro`).
- [ ] Testimonials re-centre on every `resize` (`grab-scroll.ts:114`). Phones fire `resize` when the
      toolbar collapses, so a row the reader swiped jumps back. Touch swipes aren't tracked
      either (`:70`).
- [x] Dependencies updated 17 Oct (astro 7.4.0, @astrojs/react 7.1.0, @astrojs/vercel 11.0.15,
      prettier): the build and `astro check` pass. Not done: emdash 1.3.0 (CMS left alone). Open
      the pages with photos on production and check the images (`Photo.astro` relies on a private
      `src.clone`).
- [ ] Lighthouse on the production URL for every template (target 95+ on mobile). The last run was
      9 Oct, with 44 pages; there are 121 now. Home HTML has doubled to 48 KB brotli: 406 KB of the
      680 KB raw is 494 inline SVGs, including 300 identical stars. A shared `<symbol>` would remove
      most of that.
- [ ] Real-device checks (F25–F27): German hyphenation at 360px on an iPhone, the Book Now roll in
      Safari on a Mac, and the mobile menu and stacking deck on an iPhone.

**Should fix:**

- [ ] 37 meta descriptions run past 160 characters (161–291), and the home titles are 64–66
      characters. These live in the admin; SEO loop T05 drafts shorter ones.
- [ ] Team profiles in de/el/ru are about 78% English, and el/ru home testimonials are English.
      All still claim translations in hreflang (SEO loop T06).
- [ ] Public pages send no Content-Security-Policy; the admin does.
- [ ] No `favicon.ico`, `apple-touch-icon` or web manifest. Only `favicon.svg` exists.
- [ ] Greek header at 1440px (F1, partly fixed): the `text-wrap` shorthands are still at
      `global.css:849/855`. Recheck el at 1440px.
- [ ] The footer year is fixed at build time (`Footer.astro:97`). CMS publishes rebuild the site,
      so it fixes itself after the first publish in January.
- [x] Analytics also loads on Preview builds. That matches CLAUDE.md ("loaded only in Vercel
      builds"); the comment in `BaseLayout.astro` that said otherwise was corrected on 17 Oct.
- [ ] `prune-assets.mjs` prunes nothing any more: since the CMS, the server bundle imports every
      asset. Either make it smarter or remove it.
- [x] `.emdash/` added to `.prettierignore` (`seed.json` is regenerated on every build), and the
      four files that failed `prettier --check` (whitespace only) formatted (17 Oct).
- [x] Dead files removed: `logos/partner-1…5.svg` (the schema's logo list excludes them, so the live
      CMS can't name them) and `icons/building.svg`. The stale "glass helix" comment in
      `astro.config.mjs` is corrected (17 Oct).

## CMS and operations

The CMS setup and its own open items are in [`emdash-setup.md`](emdash-setup.md#open-items).
What matters for launch:

- [ ] **Backups.** Supabase's free plan has no automatic backups, and the nightly backup (a GitHub
      Action with `pg_dump`) isn't set up yet. Without it, a bad edit or a lost project loses
      every text published since 15 Oct (the seed in `src/content/` is a stale snapshot). Do a test
      restore into a scratch project once.
- [ ] **Failed rebuilds are silent.** Once `warn` is off, a publish that breaks the strict build
      leaves the previous version live, and the editor sees nothing. Turn on Vercel's notifications
      for failed production deployments (email) for whoever looks after the site.
- [ ] **New unconfirmed items aren't caught.** The publish check only stops Needs check being
      switched off on an existing item (`plugin.ts`, `unhidden`). A testimonial or claim *created*
      without the flag goes live. Add that to the editor guide, or extend the check to new items in
      flagged lists.
- [ ] **One failed connection breaks admin sign-in.** If the first database call on a function
      instance fails, `session-driver.ts:17` keeps the failed promise, and sign-ins on that
      instance fail until it restarts. Reset `ready` on error.
- [ ] **Variables:**
  - Delete `EMDASH_SETUP_KEY`: setup is done, and while the key exists the setup lock depends on
    it.
  - Delete `SUPABASE_URL` and `SUPABASE_KEY`, which are unused.
  - Store `~/hormonexperten-live.env` in a password manager (above all `EMDASH_ENCRYPTION_KEY`),
    then delete it and `~/hormonexperten-setup-link.txt`.
- [ ] **Vercel plan.** Confirm the team is on Pro: Hobby is for non-commercial use only, and the
      hourly cron job needs Pro.
- [ ] **Supabase.** The free plan pauses a database after 7 days without activity; the hourly cron
      prevents that. Sign Supabase's DPA: editors' names and emails are personal data.
- [ ] **Editors.** Invite Dr. Tuszing (Users → Invite user), add her Gmail to Google's test users,
      and give her the editor guide ([`emdash-guide.md`](emdash-guide.md)). It still uses the
      vercel.app address; update it after the move.
- [ ] **Minor:** the admin's health endpoint shows the EmDash version publicly, and `/_emdash/api/`
      answers 500.

## Contact form

If it's built rather than hidden, people will type health information into it: special category
data under Art. 9 GDPR. Before it goes live:

- **The backend:** a Vercel function in Frankfurt that sends each message by Strato SMTP over TLS to
  the practice inbox and stores nothing on the site.
- **The legal basis:** explicit consent, with an approved consent line in all four languages (the
  current line is a TODO). The lawyer confirms the basis.
- **Privacy text:**
  - a contact-form section in the privacy policy
  - retention: delete once the request is closed
  - a note asking people not to send findings
  - an emergency note (112 / 116 117)

  The policy currently calls the site "eine reine Informationsseite", which stops being true.
- **Spam protection:** a honeypot field, a time check and rate limiting. No reCAPTCHA or other
  third-party script.
- **The reply:** an auto-reply without health data.

## Domain cut-over

See [`domain-cutover.md`](domain-cutover.md):

- the redirect map, with 181 old paths tested
- the root and `/impressum` decisions
- the blog and PDF options
- the cut-over runbook and rollback

Both sites already run on Vercel and DNS already points there, so the move is a domain transfer
between Vercel projects, with no DNS change and no risk to email.

## After launch

- [ ] For two weeks, daily: Search Console coverage (404s, soft 404s), Vercel logs filtered to 404,
      and EmDash's 404 log. Add redirects for whatever shows up.
- [ ] Submit `/sitemap.xml` in Search Console and import the property into Bing Webmaster Tools.
- [ ] Update the links on Jameda, ProvenExpert, the Google Business Profile and Instagram. The
      Jameda URL itself changed to `jameda.de/profil/isabella-wilden`.
- [ ] Turn the temporary (302) redirects into 301s as the blog, downloads and booking decisions
      land.
- [ ] Rerun Lighthouse on hormonexperten.de.
- [ ] The rest of the SEO and GEO work (llms.txt, medical review dates, IndexNow): SEO loop T10–T21.

## Earlier audits: what's still open

Status of every item in the archived audits on 16 Oct. Of about 105 items: 37 done, 40 open,
7 obsolete, 21 waiting on a decision or the practice. Done and obsolete items aren't repeated here.
The open ones that matter for launch are already in the lists above.

**[Launch audit](archive/launch-audit.md) (9 Oct):**

- Open: booking URL, `warn` in production, redirects, sitemap, robots and 404, root language,
  the "Learn More" accessible name, home titles, Lighthouse rerun.
- Open, minor:
  - `wilden-standing` is used twice
  - a forced reflow on load (`header.ts:391`)
  - the profile image `sizes` (`ProfileHero.astro:52`)
  - the footer year
  - `home.team` duplicates the team content
- Waiting: legal facts, "35 years", RollText. RollText splits Book Now into three copies per
  letter, so crawlers read "Book NowBBooookk NNooww" and kerning is lost.

**[Fixes](archive/fixes.md) (F1–F28) and the [design audit](archive/design-audit.md) (11 Oct):**

- **Done:** F2, F21 (the photo was replaced, but its successor is the AI image above), F22, F23,
  and the H1 part of F20.
- **Obsolete:** F3 and F4.
- **Open:**

  | Item | What's left |
  |---|---|
  | F1 | Greek header |
  | F5 | A heading loads at 45% opacity |
  | F6 | The Approach paragraph fades in |
  | F7 | The services row slides by itself |
  | F8, F9 | Looping animations |
  | F10 | The mega menu has no ring |
  | F11 | Footer link targets are about 20px |
  | F12 | Carousel dot buttons are 24px |
  | F13 | The step tracker switches at 95% |
  | F19 | Phones still show two testimonial rows with clamped text |
  | F25–F27 | Device checks |

- **Waiting on you:**

  | Item | Decision |
  |---|---|
  | F14 | Full nav from 1280px |
  | F15 | 16px sentence-case nav labels |
  | F16 | A Book pill in the phone header |
  | F17 | Coral for booking only |
  | F18 | One booking label; there are now nine |
  | F20 | Image crop on phones |

- **Waiting on the practice:** F24 and F28.

**[SEO/GEO plan](seo-geo-plan.md) (9 Oct):** the technical items now run in the SEO loop. Still open
outside it: the redirect map, the blog, the downloads page, cited sources and author boxes on
medical pages, and the conflicting experience claims.

## CLAUDE.md drift

The factual drift was corrected on 17 Oct 2026:

- the coral and muted grey values
- the radii
- the header nav and the 1440px breakpoint
- the hero, logos, How it Works, closing CTA and footer descriptions
- where `typeset()` lives
- redirects in `vercel.json` instead of `src/redirects`
- the open questions
- a note that production runs `warn` until launch

What's left are places where the code and the rules disagree and someone has to choose which is
right:

- [ ] **`coral-tint` is the same colour as `surface`** (`#FCF8F4`, not `#FBE3DE`), so every
      "tint" hover is cream. Probably unintended.
- [ ] **Nav labels are 14px uppercase.** The rules say UI text at 16px and uppercase only for
      eyebrows (F15).
- [ ] **Section rhythm overrides:** `pt-footer!` in `Services.astro:41` and `pt-16!` in
      `TeamMembers.astro:31` break the "no `py-*!` overrides on a section" rule.
- [ ] **The medical Important information note is `text-sm`** (`Note.astro:50`). The rules say
      medical notes are never set smaller than body text.
- [ ] **Dr. Tuszing is unflagged**, while the content rules say to keep her card behind a flag
      until her credentials are confirmed (see B4).
- [ ] **AGB § 1.1 prints the Pyla home address,** while the rules allow it only in the Impressum
      and Datenschutz. That's a content fix, part of B3.
- [ ] **Not yet in CLAUDE.md** (worth adding once the SEO loop's T22 has added its section):
  - the trailing-slash and `api-slash` rules (now only in `emdash-setup.md`)
  - the cron route and Postgres sessions
  - EmDash serving robots.txt and sitemap.xml unless the site defines them
  - `IMAGE_QUALITY` 90 and the `Photo` wrapper
  - view transitions and speculation rules
  - React for the admin only
  - Node 24
