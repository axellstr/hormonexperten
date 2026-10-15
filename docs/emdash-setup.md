# EmDash: what's built and what you do next

Status 15 Oct 2026, branch `emdash-cms` (going to production). Read with `docs/emdash-plan.md` (the why).

## What's built and tested

- **The admin** runs at `/_emdash/admin`. Every text on the site is editable there, in all four
  languages: FAQ questions, team members, service, condition and legal pages, and one "page texts"
  entry per page (home, contact, pricing…).
- **The public site is unchanged.** Pages are still prebuilt static HTML. Built from the CMS, all
  121 pages are byte-for-byte identical to today's site (tested on SQLite and on Postgres).
- **Publishing:** Yvonne edits, presses **Publish**, and the site rebuilds itself on Vercel. The
  change is live in about 1–2 minutes.
- **Safety checks at publish:** an entry is refused, with the reason shown, if it contains
  "endocrinologist", lorem ipsum, "Hormon Experten", copy from the other clinic or straight quotes,
  or if it would break the page in any language (for example a wrong date or a missing required
  text). TODO markers are only refused once `CONTENT_CHECK` is no longer `warn` (launch).
- **Translations:** a field Yvonne leaves unchanged after pressing "Translate" counts as not
  translated, so it falls back to English and is marked as English for screen readers. A
  translation can hide an unconfirmed item but never show one English hides.
- **Unconfirmed content stays off:** switching **Needs check** off (an unconfirmed testimonial,
  claim or team member) is refused unless the person publishing is listed in
  `CONTENT_CONFIRMERS`. Hiding something is always allowed.
- **Setup is locked** on the deployed site: until the first admin account exists, EmDash would
  make whoever finishes the setup wizard first the admin. The wizard (and Google sign-in during
  setup) only opens with the setup key (`EMDASH_SETUP_KEY`).
- **Logins** are stored in the Supabase database (no extra Redis account needed).

### Changes from the plan

| Plan said | Built | Why |
|---|---|---|
| Server-rendered pages + CDN cache | Prebuilt pages, rebuilt on publish | Zero change for visitors; the site keeps working even if Supabase is down |
| Upstash Redis for logins | Logins in Supabase | One account less |
| Supabase Storage for photos | Later | The site doesn't use uploaded photos yet; photos stay in the code for now |

### Sign in with Google (instead of a passkey)

The admin offers **Sign in with Google** once a Google OAuth client is set up. Passkeys stay
available, but you don't have to use them. Once setup is done, EmDash only signs in Google accounts
whose address it already knows (you, and people you invite), so a random Google account can't get
in. Before setup, any Google account would become the admin, which is why setup needs the setup key.

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project
   `Hormonexperten admin`.
2. **Google Auth Platform → Branding:** app name `Hormonexperten admin`, your email as support
   and developer contact.
3. **Audience:** *External*, and leave it in **Testing**. Under **Test users** add your Gmail
   address and Yvonne's. (In Testing, only these accounts can sign in at all: a second lock.)
4. **Clients → Create client → Web application.** Under **Authorized redirect URIs** add:
   - `http://localhost:4321/_emdash/api/auth/oauth/google/callback` (your computer)
   - `https://hormonexperten.vercel.app/_emdash/api/auth/oauth/google/callback` (production now)
   - `https://hormonexperten.de/_emdash/api/auth/oauth/google/callback` (later, once the domain
     moves to this project)
5. Copy the **Client ID** and **Client secret** and set them as:

   | Name | Value |
   |---|---|
   | `EMDASH_OAUTH_GOOGLE_CLIENT_ID` | the client ID |
   | `EMDASH_OAUTH_GOOGLE_CLIENT_SECRET` | the client secret |

   - **On your computer:** put both lines in the `.env` file in the project folder
     (`NAME=value`, one per line; `.env` is never committed), then restart the dev server:
     `npx astro dev stop` and `npm run dev`.
   - **On Vercel:** add both under Settings → Environment Variables, then redeploy. EmDash reads
     them when the site is built, so a redeploy is needed after adding or changing them.
6. In the setup wizard, enter **the same Gmail address** on the account step, then choose
   **Google** instead of *Create passkey*.

To let Yvonne in: Users → **Invite user** with her Gmail address, copy the invite link, send it to
her; she opens it and chooses **Google**.

## What you do: set up production

Production is `main`, served at **https://hormonexperten.vercel.app**. hormonexperten.de is still
the old site on another project, so nothing here touches it. You need about 30 minutes.

### 1. Create the Supabase project

1. **New project** → name `hormonexperten-live`, region **Central EU (Frankfurt)**. Save the
   database password in your password manager.
2. **Project Settings → Data API** → switch the Data API **off**. (EmDash keeps logins and drafts
   in the database; nothing should reach them through Supabase's public API.)
3. Click **Connect** (top of the dashboard) → **Transaction pooler**. Note the **host**
   (`aws-…pooler.supabase.com`), **port** (`6543`), **database** (`postgres`) and **user**
   (`postgres.<something>`).

### 2. Google sign-in

In the Google Cloud client (see "Sign in with Google" above), add the redirect URI
`https://hormonexperten.vercel.app/_emdash/api/auth/oauth/google/callback`.

### 3. Add environment variables in Vercel

Project → **Settings → Environment Variables**, each for **Production**:

| Name | Value |
|---|---|
| `PGHOST` | the pooler host from step 1 |
| `PGPORT` | `6543` |
| `PGDATABASE` | `postgres` |
| `PGUSER` | the pooler user from step 1 |
| `PGPASSWORD` | the database password |
| `PGSSLMODE` | `no-verify` |
| `EMDASH_SITE_URL` | `https://hormonexperten.vercel.app` |
| `EMDASH_ENCRYPTION_KEY` | run `npx emdash secrets generate` and paste the key. **Keep a copy in your password manager.** |
| `EMDASH_SETUP_KEY` | any long random text (e.g. `openssl rand -hex 24`). Opens the setup wizard; can be deleted once setup is done. |
| `EMDASH_OAUTH_GOOGLE_CLIENT_ID` | the Google client ID (same as in `.env`) |
| `EMDASH_OAUTH_GOOGLE_CLIENT_SECRET` | the Google client secret (same as in `.env`) |
| `CONTENT_CONFIRMERS` | your admin email address. Only these people (comma-separated) may switch **Needs check** off. |
| `CRON_SECRET` | any long random text |
| `CONTENT_SOURCE` | `json` for now (step 6 switches it) |

Keep `CONTENT_CHECK=warn` if it's already set for Production: the booking link is still a TODO.
Check **Settings → Functions → Function Region** is **Frankfurt (fra1)** (`vercel.json` asks for
it).

### 4. Deploy

`main` gets the `emdash-cms` branch merged and pushed; Vercel builds production. The public
pages stay exactly as they are (they still read the JSON files).

### 5. Run the setup wizard

1. Open `https://hormonexperten.vercel.app/_emdash/admin/setup?setup_key=<EMDASH_SETUP_KEY>`.
   The key is kept in a cookie for an hour and removed from the address bar. (Without it, the
   wizard's steps answer "Setup is locked".)
2. Site title `Hormonexperten`, choose **Sample content**. (That's the real site content, not
   demo posts.)
3. Your email (the Gmail address from Google's test users) and name, then **Google**.
4. You land on the dashboard. Look around: FAQ questions, Team members, Home page…

### 6. Switch the site to read from the CMS

1. Settings → **Git → Deploy Hooks** → create a hook named `CMS publish` for branch `main`. Copy
   its URL into a new variable `VERCEL_DEPLOY_HOOK_URL` (Production).
2. Set `CONTENT_SOURCE` to `emdash` (Production).
3. Redeploy (Deployments → latest production → … → Redeploy). The site now shows the content
   from Supabase. It should look exactly as before.

### 7. Try it

1. Admin → Home page → the German entry → change a word in **Hero › Title** → **Publish**.
2. Within a minute a new deployment appears in Vercel; when it's ready, `/de/` shows the change.
3. Try publishing "endocrinologist" in an answer: it's refused with the reason.
4. Switch **Needs check** off on a hidden FAQ question: refused, unless your email is in
   `CONTENT_CONFIRMERS` (then switch it back on and publish again).
5. Users → **Invite user** for Yvonne (role: Administrator). No email is set up, so copy the
   invite link and send it to her; she signs in with Google (or a passkey). Don't add her to
   `CONTENT_CONFIRMERS` unless she is the one confirming content.

Tell me what you see. If anything looks off, send a screenshot.

## Later: moving hormonexperten.de here

When the domain moves to this project: set `EMDASH_SITE_URL=https://hormonexperten.de`, add the
domain's Google redirect URI (above), redeploy. Passkeys made on the vercel.app address don't
work on the new domain (Google sign-in does). Before that we add the nightly backup (GitHub
Action).

## Notes

- **Seed:** `.emdash/seed.json` is generated from `src/content/` on every build
  (`npm run cms:seed`). The setup wizard applies it once, to an empty database. After go-live the
  database is the source and the JSON files are retired.
- **Local:** `npm run dev` also starts the admin at `http://localhost:4321/_emdash/admin` with a
  local SQLite file in `.emdash/`. Pages read the JSON files unless `CONTENT_SOURCE=emdash` (your
  `.env` sets it, so local pages show the admin's content, not edits to `src/content/`). Locally
  the setup wizard needs no key, and publishing doesn't rebuild: reload the page instead.
- **Checks:** `npm run cms:check` converts every content file to CMS entries and back.
- **npm audit** reports 3 "high" issues in `path-to-regexp`, pulled in by the Vercel adapter's
  build tools and EmDash's (disabled) MCP server; neither handles visitor input. We update when
  fixed versions ship.
