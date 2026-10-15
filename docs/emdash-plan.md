# Moving the Hormonexperten site to EmDash CMS

A plain-language guide to what we're doing, why, and in what order. Written 15 Oct 2026.

> **Update, later on 15 Oct 2026:** built on branch `emdash-cms`. What changed from this plan
> (pages are rebuilt on publish instead of cached; logins live in Supabase, so no Upstash;
> photo storage comes later) and your next steps are in **`docs/emdash-setup.md`**.

---

## 1. The short version

Today, every word on the site lives in JSON files in the code (`src/content/`). To change a sentence,
someone edits a file, commits it to git, and Vercel rebuilds the whole site.

**EmDash** is a content management system (CMS): a private admin website where the practice can log in
and edit text, photos and FAQs in a form, then press **Publish**. The change appears on the live site
within seconds, with no code, git or rebuild involved.

EmDash is built for Astro, the framework the site already uses, so we keep all our components,
design and pages. Only the place the text comes from changes: a database instead of JSON files.

---

## 2. How the site works today

```
 You edit a JSON file ──► git push ──► Vercel builds every page once ──► finished HTML files on Vercel's CDN
                                         (about 1–2 minutes)                 (visitors get these, very fast)
```

- **Static site:** every page is built in advance into a plain HTML file. Nothing runs when someone visits.
- **Pros:** very fast, very cheap, nothing to break, nothing to hack.
- **Con:** only someone who can edit code can change content.

## 3. How it will work with EmDash

```
 Editor logs in at hormonexperten.de/_emdash/admin
        │
        ▼
 Edits text / uploads a photo ──► saved in the DATABASE / MEDIA STORAGE
        │
        ▼
 Presses Publish ──► EmDash tells Vercel's CDN "these pages are out of date"

 Visitor opens a page
        │
        ├─ page is in the CDN cache?  ──► served instantly (most visits)
        │
        └─ not cached / just changed? ──► Vercel runs the page once, reads the database,
                                          builds the HTML, caches it, serves it
```

The site becomes a **server-rendered** site with a **cache** in front. Thanks to the cache, visitors almost
always get a ready-made page, just like today.

---

## 4. Words you'll meet

| Word | What it means here |
|---|---|
| **CMS** | Content management system: the admin website where content is edited. |
| **Static vs server-rendered** | Static: pages are built once, ahead of time. Server-rendered: a page is built when someone asks for it. |
| **Adapter** | The plug-in that lets Astro run on a particular host. For us: `@astrojs/vercel`. |
| **CDN cache** | Copies of finished pages kept on Vercel's servers around the world. **Invalidating** (or purging) the cache throws a copy away so the next visit gets the fresh version. |
| **Database** | Where EmDash stores the text, settings and editor accounts. |
| **Object storage (S3)** | Where uploaded photos and files are stored. "S3-compatible" is the industry-standard way of talking to such storage. |
| **Session / session driver** | How the admin remembers that an editor is logged in. Needs a small, fast store (Redis). |
| **Cron job** | A task that runs on a timer, e.g. "every 5 minutes, publish anything scheduled for now". |
| **Environment variables** | Secret settings (passwords, keys) stored in Vercel's project settings, never in the code. |
| **Connection pooler** | A middleman that lets many short-lived Vercel functions share a few database connections. Supabase's is called Supavisor. |
| **Supabase Data API** | A feature that turns database tables into a public web API automatically. Useful for apps, dangerous for us, so we keep EmDash's tables out of it (see section 6). |
| **Seed file** | A JSON file that fills a fresh EmDash database with our content model and starting content. |
| **Collection** | A type of content in EmDash, e.g. "FAQ items" or "Team members". Each has **fields** (title, answer, photo…). |
| **Repeater / Blocks** | Field types for lists: a repeater is a simple list of rows; blocks are a list of different kinds of section. |
| **Portable Text** | EmDash's format for rich text (paragraphs, bold, links). |
| **Locale / translation** | Language version (`en`, `de`, `el`, `ru`). In EmDash each translation is its own entry, linked to the English one. |
| **Preview deployment** | The test copy of the site Vercel makes for every branch. |
| **Spike** | A small, throwaway experiment to prove something works before committing to it. |

---

## 5. What we'll add to Vercel

Vercel Pro runs the site. EmDash needs a few extra services, all of them in **EU regions** for GDPR.

| Service | What it does | Provider | Needed? |
|---|---|---|---|
| **Vercel adapter + CDN cache** | Runs pages on request and caches them | `@astrojs/vercel` with `cacheVercel()` | Yes |
| **Database** | Stores all content and Yvonne's admin account | **Supabase** Postgres, region Frankfurt (`eu-central-1`) | Yes |
| **Media storage** | Stores uploaded photos | **Supabase Storage**, through its S3-compatible endpoint (same project) | Yes |
| **Session store** | Keeps Yvonne logged in to the admin | **Upstash Redis**, EU region (free tier, available in the Vercel Marketplace) | Yes, or sign-in fails |
| **Hourly housekeeping job** | Clears expired login links and abandoned uploads, and keeps the free Supabase database from pausing | A Vercel Cron job, once an hour | Yes (not for scheduling: there's no scheduled publishing) |
| **Nightly backup** | Copies the database and photos somewhere safe | A GitHub Action (free) | Yes, while on Supabase's free plan |
| **Encryption key** | Protects secrets EmDash stores | Generated by `npx emdash secrets generate` | Yes; **keep a backup** |

So it's two outside accounts: **Supabase** (database + photos) and **Upstash** (logins).

Things that **don't** work on Vercel and that we don't need: EmDash's third-party plugin marketplace
(it needs a sandbox Vercel can't run). Our own small plugins work fine.

## 6. Supabase setup notes

You've used Supabase before. Here's what's different when it's EmDash's database:

1. **Create a new, separate Supabase project** just for the website, in **Frankfurt**. Don't share it with another app.
2. **Keep EmDash's tables out of the Data API.** Supabase automatically turns tables in the `public`
   schema into a web API. EmDash stores admin accounts and drafts there, and doesn't use Supabase's
   row-level security. So we either put EmDash in its own schema (`emdash`) that isn't exposed, or
   switch the Data API off for this project (the site doesn't need it). We'll do both.
3. **Connect through the pooler, not directly.** Supabase's direct database address is IPv6-only, and
   Vercel functions can't reach it. We use the **transaction pooler** connection string (port 6543) and
   keep EmDash's own pool small. EmDash only uses transaction-scoped locks, which work through this pooler
   (checked in its source). We confirm it in the spike.
4. **One database user, forever.** EmDash creates and changes its own tables (for example, when a field is
   added). The database user it connects as owns those tables, so we never swap it for a different user.
   Changing the password is fine.
5. **Photos:** create a Storage bucket, generate **S3 access keys** in Supabase's Storage settings, and give
   EmDash the endpoint (`https://<project>.supabase.co/storage/v1/s3`), the region and the keys. The bucket is
   public-read so the site can show the photos. Uploads still need the keys.
6. **Plan: we start free.** Free Supabase projects are **paused after 7 days without database activity**,
   and a paused database would break uncached pages (it takes about 30 seconds to wake). Visitors
   alone might not keep it awake, because the CDN cache means few visits reach the database. The
   **hourly housekeeping job** does, though: it writes to the database every hour, which counts as activity.
   What the free plan doesn't give us:
   - **Supabase's automatic daily backups** (a paid feature). We add our own: a nightly GitHub Action that
     copies the database (`pg_dump`) and the photos to a backup.
   - **Room to grow without limits.** The free limits (at last check 500 MB of database and 1 GB of files)
     are far more than this site needs: all the text today is about 0.2 MB.

   Upgrading later is a button in the same project, with no move or migration. Upgrade if the site grows,
   or if you'd rather have Supabase's backups than our own. The free plan allows two active projects:
   one for testing, one for the live site.

---

## 7. What stays the same

- The design, components, Tailwind setup and every page layout.
- URLs: `/en/…`, `/de/…`, `/el/…`, `/ru/…`.
- Vercel Web Analytics, security headers, redirects.
- **For visitors:** no JavaScript, no cookies, no cookie banner. (Editors get a login cookie in the admin
  only. It's strictly necessary, so it needs no banner. We'll turn off EmDash's "edit" toolbar on public pages.)
- The English fallback for missing translations, the non-breaking-space rules (`typeset()`), and the
  `needs_check` flag for unconfirmed claims.

## 8. What changes or gets harder

| Change | Why it matters | What we'll do |
|---|---|---|
| The site now **runs code on each uncached visit** | More moving parts: if the database is down, uncached pages fail | CDN cache, EU services close to Vercel's Frankfurt region, backups |
| The **content checks** (no "endocrinologist", no lorem ipsum, no straight quotes, no TODOs) run at build time today | Without a build per edit, they'd never run | Move them into an EmDash plugin that **blocks Publish** when a rule is broken, which is better than today |
| **Translations fall back per page**, not per sentence | Today a German page can be half German, half English; EmDash copies the whole English page into a German draft | Design a rule so English text is still marked `lang="en"` for screen readers |
| Some content is **nested lists** (footer columns → links, CV milestones → items) | EmDash repeaters can't contain repeaters | Use "blocks" fields or separate collections |
| **Astro setting `prefixDefaultLocale`** must go | It breaks the EmDash admin (returns 404) | Our own `[lang]` routes keep `/en/` URLs; we test this first |
| **Monthly costs** | None to start: Supabase and Upstash free plans, cron and backups included in Vercel Pro and GitHub | If the hourly job ever stops, the free database pauses after 7 days; the nightly backup also checks the last housekeeping run and fails loudly (GitHub emails you) if it's more than a few hours old |
| **No second pair of eyes** | Yvonne edits and publishes on her own, including medical text that HWG applies to | The content-check plugin blocks the known mistakes before they go live; we turn on revision history for every collection, so any change can be undone |
| **EmDash is young** (version 1.2) | Updates may bring breaking changes | Pin versions, update deliberately, read the changelog |

---

## 9. The plan, step by step

Each phase ends with a check, so we always know it worked before moving on. **The live site keeps
running from the JSON files until the very last step**, so nothing visitors see changes until we're sure.

### Phase 0: Prepare (no EmDash yet, safe to do now)

- [ ] Commit the work currently in progress.
- [ ] Put all content loading behind one async "loader" in `src/lib/content.ts`, so pages don't care
      where content comes from. Later we swap the JSON loader for an EmDash loader.
- [ ] Write the **content map**: every current JSON section → an EmDash collection and fields.
      First draft:
      - FAQ, team, services, conditions, pricing packages, testimonials, trust logos → **collections** (one entry per item)
      - Home, Our approach, Contact → **single pages** with repeaters/blocks
      - Main nav and footer links → EmDash **menus** (one per language)
      - Legal pages → a collection with blocks
      - IDs, links, images, `needs_check`, sort order → **not translatable** (shared by all languages)
- [ ] Decide which images editors may change (doctor and service photos → media library) and which stay in
      the code (logo, icons, brand art).

**Done when:** the site builds and looks identical, and the content map is agreed.

### Phase 1: Spike (on a separate branch)

- [ ] Create a **test** Supabase project (Frankfurt) with a Storage bucket, and an Upstash Redis database.
- [ ] Install EmDash, the Vercel adapter and the cache provider.
- [ ] Move **only the FAQ** to EmDash, in all four languages.
- [ ] Deploy it to a **preview deployment** with its own test database.

**Done when:**
- `/en/`, `/de/`, `/el/`, `/ru/` URLs all work, and so does the admin;
- logging in works;
- the Supabase Data API can't see EmDash's tables;
- uploading a photo lands it in Supabase Storage and it shows on the page;
- editing an FAQ answer and pressing Publish updates the page within seconds;
- Lighthouse on mobile is still 95+.

### Phase 2: Move all content

- [ ] Write a script that converts every `src/content/*/{lang}.json` file into EmDash's seed file, with
      translations linked to their English originals.
- [ ] Render the whole site twice, once from JSON and once from EmDash, and compare the HTML of every
      page in all four languages.

**Done when:** the two versions are identical (or every difference is explained).

### Phase 3: Rebuild our safety rules

- [ ] Content-check plugin: blocks Publish on forbidden or placeholder text.
- [ ] `needs_check` items stay hidden on the live site but visible in preview.
- [ ] English-fallback marking for screen readers.
- [ ] Non-breaking-space rules also apply to rich text.
- [ ] Old-URL redirects stored in EmDash.

**Done when:** each rule has been tested by deliberately breaking it.

### Phase 4: Go live and hand over

- [ ] Live Supabase project (free plan) and Upstash database; the test ones stay for preview deployments.
- [ ] The hourly housekeeping cron job.
- [ ] The nightly backup GitHub Action, plus a test restore into the test project.
- [ ] Yvonne's **admin** account, with her passkey on her own device and a second passkey or recovery option.
- [ ] A short guide for Yvonne: how to edit, translate, publish, and undo a change.
- [ ] Update `CLAUDE.md` (it still says "static site, content in `src/content/`").
- [ ] Switch production over. If anything goes wrong, Vercel's **Instant Rollback** returns to the previous version.

---

## 10. Decisions (made 15 Oct 2026)

1. **Hosting:** Vercel Pro, as today.
2. **Database and photos:** Supabase (Postgres + Storage), Frankfurt, on the **free plan**; our own nightly backups.
3. **Scheduled publishing:** not needed. Only the hourly housekeeping job runs.
4. **Who edits:** Dr. Yvonne Tuszing, as **admin**, with no approval step. She can edit everything,
   including medical copy, legal pages and prices, so the publish-time content checks are our safety net.

## 11. Things only you can do

- Create the two Supabase projects (test and live) and the Upstash database, then add their keys to
  Vercel's **Environment Variables** (test keys for Preview, live keys for Production).
- Store the EmDash **encryption key** and the Supabase database password somewhere safe, such as a password
  manager. If the key is lost, the secrets stored in the database can't be read.
- Create the first admin account (passkey login), then invite Yvonne.

---

## 12. Questions you might have

**Will the site go down during the move?**
No. The live site keeps using the JSON files until Phase 4. All testing happens on preview deployments.

**Can we go back if it doesn't work out?**
Yes. Until Phase 4 nothing live has changed. After Phase 4, Vercel's Instant Rollback restores the previous
deployment in one click, and the JSON files stay in git history.

**Does Yvonne need GitHub or code?**
No. She only uses the admin at `/_emdash/admin`, and logs in with a passkey (fingerprint, face or device PIN).

**What if she publishes a mistake?**
Known mistakes (forbidden words, placeholders, straight quotes) are blocked before publishing. Anything else
can be fixed by restoring an earlier revision in the admin; the page updates within seconds.

**Will I still change content in the code?**
No. After go-live the database is the only source of content, so the JSON files are retired and content
changes happen only in the admin. Design and layout changes still happen in code, as today.

**Will the site get slower?**
It shouldn't. Cached pages are served just like today's static files. We measure it in Phase 1 before going further.

**Does this change anything for privacy?**
Visitors: no. They still get no cookies and no third-party scripts. New: content now lives in a database and
storage provider, which is why all of them must be in EU regions. No patient data is involved; booking stays in Pabau.

---

### Sources

- EmDash with Astro: https://docs.astro.build/en/guides/cms/emdash/
- Astro route caching (Vercel cache provider): https://docs.astro.build/en/guides/caching/
- EmDash source and docs: https://github.com/emdash-cms/emdash (i18n, deployment, field types, configuration)
