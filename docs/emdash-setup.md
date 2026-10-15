# EmDash: what's built and what you do next

Status 15 Oct 2026, branch `emdash-cms`. Read with `docs/emdash-plan.md` (the why).

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
- **Logins** are stored in the Supabase database (no extra Redis account needed).

### Changes from the plan

| Plan said | Built | Why |
|---|---|---|
| Server-rendered pages + CDN cache | Prebuilt pages, rebuilt on publish | Zero change for visitors; the site keeps working even if Supabase is down |
| Upstash Redis for logins | Logins in Supabase | One account less |
| Supabase Storage for photos | Later | The site doesn't use uploaded photos yet; photos stay in the code for now |

### Sign in with Google (instead of a passkey)

The admin offers **Sign in with Google** once a Google OAuth client is set up. Passkeys stay
available, but you don't have to use them. EmDash only signs in Google accounts whose address it
already knows (the first admin, created in the setup wizard, and people you invite), so a random
Google account can't get in.

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project
   `Hormonexperten admin`.
2. **Google Auth Platform → Branding:** app name `Hormonexperten admin`, your email as support
   and developer contact.
3. **Audience:** *External*, and leave it in **Testing**. Under **Test users** add your Gmail
   address and Yvonne's. (In Testing, only these accounts can sign in at all: a second lock.)
4. **Clients → Create client → Web application.** Under **Authorized redirect URIs** add:
   - `http://localhost:4321/_emdash/api/auth/oauth/google/callback` (your computer)
   - `https://<preview address>/_emdash/api/auth/oauth/google/callback` (the preview, step 3 below)
   - `https://hormonexperten.de/_emdash/api/auth/oauth/google/callback` (later, the live site)
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

## What you do: test on a preview first

You need about 20 minutes. Nothing here touches the live site.

### 1. Push the branch

```bash
git push -u origin emdash-cms
```

### 2. Create a test Supabase project

1. **New project** → name `hormonexperten-test`, region **Central EU (Frankfurt)**. Save the
   database password in your password manager.
2. **Project Settings → Data API** → switch the Data API **off**. (EmDash keeps logins and drafts
   in the database; nothing should reach them through Supabase's public API.)
3. Click **Connect** (top of the dashboard) → **Transaction pooler**. Note the **host**
   (`aws-…pooler.supabase.com`), **port** (`6543`), **database** (`postgres`) and **user**
   (`postgres.<something>`).

### 3. Add environment variables in Vercel

Project → **Settings → Environment Variables**. Add each for **Preview**, branch `emdash-cms`:

| Name | Value |
|---|---|
| `PGHOST` | the pooler host from step 2 |
| `PGPORT` | `6543` |
| `PGDATABASE` | `postgres` |
| `PGUSER` | the pooler user from step 2 |
| `PGPASSWORD` | the database password |
| `PGSSLMODE` | `no-verify` |
| `EMDASH_SITE_URL` | the branch's preview address, e.g. `https://hormonexperten-git-emdash-cms-<team>.vercel.app` (Deployments → the branch → Domains) |
| `EMDASH_ENCRYPTION_KEY` | run `npx emdash secrets generate` and paste the key. **Keep a copy in your password manager.** |
| `CRON_SECRET` | any long random text (e.g. from your password manager's generator) |
| `CONTENT_SOURCE` | `json` for now (step 5 switches it) |

Keep `CONTENT_CHECK=warn` for Preview if it's already set: the booking link is still a TODO.

Also check **Settings → Functions → Function Region** is **Frankfurt (fra1)** (`vercel.json`
asks for it).

### 4. Deploy and run the setup wizard

1. Redeploy the branch (Deployments → … → Redeploy) so it picks up the variables.
2. Open `<preview address>/_emdash/admin`. The setup wizard opens:
   - Site title `Hormonexperten`, choose **Sample content**. (That's the real site content, not
     demo posts.)
   - Your email and name.
   - **Google** (if you set it up, see "Sign in with Google" above), or **Create passkey**
     (unlocked with your device PIN, password manager or fingerprint).
3. You land on the dashboard. Look around: FAQ questions, Team members, Page texts…

### 5. Switch the site to read from the CMS

1. Set `CONTENT_SOURCE` to `emdash` (Preview).
2. Settings → **Git → Deploy Hooks** → create a hook named `CMS publish` for branch `emdash-cms`.
   Copy its URL into a new variable `VERCEL_DEPLOY_HOOK_URL` (Preview).
3. Redeploy. The preview now shows the content from Supabase. It should look exactly as before.

### 6. Try it

1. Admin → FAQ questions → open one in German → change a word → **Publish**.
2. Within a minute a new deployment appears in Vercel; when it's ready, the preview shows the change.
3. Try publishing "endocrinologist" in an answer: it's refused with the reason.
4. Users → **Invite user** for Yvonne (role: Administrator). No email is set up, so copy the
   invite link and send it to her; she signs in with Google (or a passkey).

Tell me what you see. If anything looks off, send a screenshot.

## Later: going live

Same steps against a second Supabase project `hormonexperten-live` with the variables set for
**Production**, `EMDASH_SITE_URL=https://hormonexperten.de`, a deploy hook for `main`, then merge
the branch. Before that we add the nightly backup (GitHub Action) and decide on Supabase Storage.

## Notes

- **Seed:** `.emdash/seed.json` is generated from `src/content/` on every build
  (`npm run cms:seed`). The setup wizard applies it once, to an empty database. After go-live the
  database is the source and the JSON files are retired.
- **Local:** `npm run dev` also starts the admin at `http://localhost:4321/_emdash/admin` with a
  local SQLite file in `.emdash/`. Pages read the JSON files unless `CONTENT_SOURCE=emdash`.
- **Checks:** `npm run cms:check` converts every content file to CMS entries and back.
- **npm audit** reports 3 "high" issues in `path-to-regexp`, pulled in by the Vercel adapter's
  build tools and EmDash's (disabled) MCP server; neither handles visitor input. We update when
  fixed versions ship.
