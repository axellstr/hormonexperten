# Editing the Hormonexperten website

A plain guide to the content admin (EmDash), written for the practice. Each section is short
enough to become one scene of a walkthrough video. The technical setup is in
`docs/emdash-setup.md`.

## 1. What the admin is

All text on the website lives in the admin: FAQ questions, team members, service, condition and
legal pages, and one “page texts” entry per page (Home, Contact, Pricing…). You change text there;
nobody needs to touch code for it.

Layout, design, new sections and photos are not in the admin. Ask Alex for those.

## 2. Signing in

1. Open https://hormonexperten.vercel.app/_emdash/admin
2. Click **Sign in with Google** and use the Gmail address you were invited with.

Only invited addresses can sign in.

## 3. Finding a text

The menu on the left lists the content types. Each page has one entry per language: English,
German, Greek and Russian. English is the master: anything not translated shows in English.

## 4. Changing a text

1. Open the entry and the language you want.
2. Change the text.
3. Press **Publish**.

The website updates itself in **about 5 minutes**. Until you press Publish, your change is a
draft and nobody else sees it. The preview shows the published page, so a change appears there
only after publishing.

## 5. Translating

Press **Translate** on an entry to create its German, Greek or Russian version. Any field you
leave unchanged stays in English on the website.

## 6. Made a mistake?

Open the entry, go to its **revision history**, pick the version from before your change, press
**Restore**, then **Publish**. The website shows the old text again after about 5 minutes.

The last 50 versions of each entry are kept, separately for each language.

## 7. Safety checks

The admin refuses to publish a text that breaks one of the practice's rules, and shows why. For
example:

- Dr. Wilden called an “endocrinologist” (her title is “Specialist in General Medicine with a
  focus on bioidentical hormone therapy”)
- placeholder text such as lorem ipsum
- the brand written “Hormon Experten” instead of **Hormonexperten**
- straight quotes ' and " instead of typographic ones (“ ” „ « »)
- a missing required text or a wrong date

Fix what it names and press Publish again.

## 8. “Needs check”

Some items stay hidden until the practice confirms them: testimonials, figures such as
“5,000+ patients treated”, and the second doctor's card. Anyone can switch **Needs check** on to
hide something. Only the confirmed people can switch it off.

## 9. Rules for the text

- Never call Dr. Wilden an endocrinologist.
- Russian is a website translation only. Consultations are in English, German, Greek and
  Romanian; never say or suggest they are offered in Russian.
- No promises of results (German medical advertising law, HWG).
- Testimonials must be real and name their platform (e.g. Jameda).
- Write **Hormonexperten**, one word.

---

## For the site admin (not for the video)

- **Emergency:** if something bad is live and can't wait 5 minutes, use Vercel → Deployments →
  previous production deployment → **Instant Rollback**. It changes only the website, not the
  admin: the bad text is still published there, and the next Publish brings it back. Restore the
  revision in the admin as well.
- Restoring creates a draft; the publish checks run again when it is published.
- Who may switch “Needs check” off: `CONTENT_CONFIRMERS` in Vercel.
- Until launch, `CONTENT_CHECK=warn` lets some unconfirmed content show on the site.
- Open items (View links, invites, Google test users): `docs/emdash-setup.md`.
