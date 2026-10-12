# Design audit

Head-of-design review of the whole site on 11 Oct 2026: visual quality, UX, the booking path, motion, and Chromium vs Safari (WebKit). It builds on [`launch-audit.md`](launch-audit.md) (9 Oct) and doesn't repeat its blockers unless they affect the design.

## How it was checked

- **Builds:** two static builds of the working tree at 23:28, including the other session's uncommitted edits. One is a work-in-progress build (`CONTENT_CHECK=warn`, unconfirmed content shown, as in `astro dev`); the other is a production build (unconfirmed content hidden).
- **Engines:** Chromium 156 and WebKit (Safari 27-era engine, Playwright 1.64 in Docker).
- **Matrix:** 7 page types (home, services, a service, team, profile, FAQ, Impressum), in en, de, ru and el, at 360, 768, 1280 and 1440px. That's 88 combinations per engine. Phone runs used touch emulation.
- **Automated checks:** horizontal overflow, text overflowing its box, words broken across lines, tap target size, text under 14px, contrast, heading outline, line length, and section heights compared between the two engines.
- **Interactions** captured in both engines: mega menu, mobile menu sheet, How it Works deck while scrolling, FAQ accordion, and the Book Now letter roll.
- **Not covered:**
  - The About and Contact pages, which were being built in another session during the audit.
  - A real iPhone or Mac. Headless WebKit on Linux has no hyphenation dictionaries and throttles rendering, so a few items below are marked *check on device*.
  - Firefox.

## Verdict

The craft is high:

- The type system and tokens are applied consistently.
- No page overflows horizontally at 360px in any language, in either engine.
- Every page has one H1 and no skipped heading levels.
- Contrast passes everywhere except the coral buttons, which were accepted on 9 Oct.
- Reduced motion is respected throughout.
- The mobile menu sheet and the stacking deck are distinctive and well made.

Four things stand between "looks perfect" and "works for a 45-year-old patient deciding whether to book":

1. **Dev isn't what ships.** The production build hides the trust line, the logos, the testimonials, three of the six services and Dr. Tuszing. What's left has visible holes: a services row with an empty quarter, a single doctor card in a half-empty grid, and a hero with no trust signal.
2. **The booking path is weak.**
   - Phones have no Book button in the header.
   - The home page shows five coral buttons for three different actions.
   - Booking has four different labels across the site.
   - There's no price anywhere on the site.
3. **Too much moves on its own** for a clinical brand and an older audience. Three looping animations fail WCAG 2.2.2 (Pause, Stop, Hide) as soon as their content goes live.
4. **One real cross-browser layout bug** (the Greek header). Its root cause is a global CSS rule that can break `whitespace-nowrap` anywhere.

## Chromium vs Safari

Layout matches in both engines at every width and in every language. The differences are below.

| Area | Chromium | Safari (WebKit) | Action |
|---|---|---|---|
| Paragraph line breaks (`text-wrap: pretty`) | Its own algorithm | Different, often one line more (footer blurb: 3 vs 4 lines; pages 20–160px taller at 360px) | None. Nothing depends on fixed text heights. |
| Hyphenation (de, ru, el) | Follows the rules in `global.css` (body 7+ letters, headings 14+) | Can't be judged here: Linux WebKit has no dictionaries. Real Safari hyphenates, and the tested engine supports `hyphenate-limit-chars` | **Check on device:** German FAQ page at 360px on an iPhone. If an older iOS ignores `hyphenate-limit-chars`, short words could split in headings. |
| Accordion height animation (FAQ, Services in the mobile menu) | Animates (`interpolate-size`) | Snaps open: no `interpolate-size` in Safari, so the chevron animates while the panel jumps | Acceptable progressive enhancement. No action. |
| Hanging quotes in testimonials (`hanging-punctuation`) | Not supported | The opening quote hangs into the card padding | Intended. |
| Scroll-linked word reveal | Supported | Supported (Safari 26+). Older Safari and Firefox show the text in full | Fallback works. |
| Book Now letter roll | Works | Reaches the correct end state, but headless WebKit throttles rendering, so its timing couldn't be judged | **Check on device:** one hover in Safari on a Mac. |
| `requestIdleCallback` | Yes | No | Already handled by a fallback in `header.ts`. |
| Minimum browser | | Tailwind v4 needs **Safari 16.4+** (iOS 16.4, March 2023). Older iPhones stuck on iOS 15 get a badly broken page | Decide this deliberately: look up the share of iOS < 16.4 in the live site's analytics. The audience skews older. |

### Bug: the Greek header breaks at 1440px (both engines)

At exactly 1440px (a 13" MacBook Air), every Greek nav label wraps onto two lines and hyphenates ("ΥΠΗΡΕΣ-ΙΕΣ", "ΕΠΙΚΟΙΝΩ-ΝΙΑ", "Ελλη-νικά"). From about 1500px it fits.

**Root cause:** `global.css:416` sets `text-wrap: pretty` on every `li`. `text-wrap` is a shorthand, so it also resets `text-wrap-mode` to `wrap`. That cancels the `whitespace-nowrap` the nav list sets for its items (`Header.astro:87`). Line 410 does the same for headings with `balance`. Any future `whitespace-nowrap` on a parent of `p`/`li`/headings will silently stop working too.

**Fix:**

1. Use the longhands: `text-wrap-style: pretty` and `text-wrap-style: balance`. Browsers that don't know the longhand simply skip the balancing, as they do today. That keeps the labels on one line.
2. Make the Greek bar fit at 1440, which item 10 below covers: remove the palette dot and use a compact language switcher.

## Findings and fixes

### P0: before launch (design)

| # | Finding | Fix |
|---|---|---|
| 1 | **Production layout gaps.** Services: 3 cards in a row sized for 4 (`header-desktop:w-1/4`, `Services.astro:32`), leaving an empty quarter at 1440px. Team: one card in a 2-column grid (`Team.astro:25`, `TeamMembers.astro:35`), leaving the right half empty. Hero: no trust line at all, because it's unconfirmed. | Size the service cards by how many there are: 3 or fewer fill the row (`w-1/3`), and the rail only kicks in when the row overflows. Give Team a single-member layout (photo and text side by side, like the profile hero). Review the hero without the trust line: that's how it will look on launch day. |
| 2 | **Greek header bug** (above). | `text-wrap-style`, then the header fit in item 10. |
| 3 | **The palette tester still ships** (launch audit #3). Besides the privacy issue, its dot uses the one free slot in the phone header, which is where a Book button belongs (item 6). | Gate it behind `DEV` or remove it. |
| 4 | **The contact photo shows Google Gemini**: an AI chatbot, French interface, a stranger's name ("Bonjour Cassandra") on screen. On a doctor's "Still have questions? Get in touch" card it suggests an AI answers patient questions, and it shows a third-party brand. Used on the home page, the FAQ page and the new About page (`home/en.json:211`, `faq/en.json:10`, `about/en.json:13`). | Replace it with a real photo of the practice or of Dr. Wilden, or drop the image and let the card be text. |
| 5 | **One photo carries the whole site.** `dr-wilden.png` appears 3 times on the home page (hero, Our Approach, Team), plus on the team page and the profile. The second hero slide is a portrait stock photo (683px wide) cropped to landscape and soft on retina screens. The service photos are 536px wide and generic (a twig, a white wall), so they don't say what the service is. | A short shoot (shot list below). Until then, use a different crop of the existing photo for Our Approach rather than repeating the same frame. |

### P1: the booking path

| # | Finding | Fix |
|---|---|---|
| 6 | **Phones have no Book button in the header** (`hidden sm:block`, `Header.astro:267`). After the hero, the next booking button is the closing CTA at the bottom of the page. | Put a compact "Book" pill in the header on phones, in the slot the palette dot frees up. It's the simplest option; a sticky bottom bar would be the heavier alternative. |
| 7 | **Coral means everything.** The home page body has 5 coral buttons: book, Learn More (Approach), Learn More (Team), Get in touch, and book again. The booking action doesn't stand out. CLAUDE.md already says the Approach CTA should be secondary. | Use coral only for booking. Make Learn More and Get in touch the secondary variant, and the team card's link a text link or secondary button. |
| 8 | **Four labels for one action:** "Book Now", "Book Online Consultation", "Start with a consultation", "Book your consultation". | Pick one label, plus a short form for the header (e.g. "Book a consultation" / "Book"). This is a copy decision. |
| 9 | **No price anywhere.** There's no € in any content file, and the cost and booking FAQ answers are `TODO`. The live site has `/kosten` (programmes 380 € / 499 €, first consultation 180 €). Self-paying patients look for the price before they click Book. | Add a Costs page or section (content from the practice), linked from the booking CTAs and the FAQ. Add one line of microcopy near the main CTA saying what happens next ("You'll pick a time in our booking system"). |
| 10 | **Laptops get the hamburger menu.** The full nav needs 1440px (`--breakpoint-header-desktop`), so 1280–1439px screens (most Windows laptops, 13" MacBooks at some scalings) see "Menu". Measured at 1280px, the bar has about 1,075px for its contents. English needs 1,023px, Russian 1,065px, German 1,108px. Removing the palette dot frees 56px, and a globe-plus-code language switcher (as CLAUDE.md specifies) frees about 45px more. | Lower the breakpoint to 80rem (1280px) after both changes. Re-measure Greek: it may also need `px-3` nav padding. |
| 11 | **Nav labels are 14px uppercase** (`Header.astro:49`). Your type rules say nav uses the UI role (16px) and that uppercase is only for eyebrows. | 16px sentence case is easier to read for this audience and about as wide as 14px uppercase with tracking. Re-measure together with item 10. |

### P1: motion and calm

Everything that moves without the visitor doing anything, on the home page:

| Element | Behaviour | Proposal |
|---|---|---|
| Hero trust line (phones) | Cycles every 2s, forever, with no pause control. Fails WCAG 2.2.2 once live | Show it static, wrapped onto two lines. |
| Trust logos | Turn every 2s, forever. Hover pauses them, but nothing pauses them on touch or keyboard. Fails 2.2.2 | A static row, or stop after one full turn. |
| Testimonials | Drift forever. Hover or focus pauses them, but nothing pauses them on touch. Fails 2.2.2 | Drop the drift and keep manual swiping (see item 15). |
| Services row | Slides one card on by itself after 1.5s | Drop it: the peek of the next card already shows there's more, and moving content under a reader disorients. In production on desktop it won't fire anyway (3 cards, no overflow). |
| Word reveal on headings | Words start at 20% opacity, about 1.6:1 contrast. At 1440×900 the Services heading sits at 88% of the first screen, so the site **loads with a heading that looks disabled** | If you keep it, start it lower so nothing above the fold loads faded. |
| Word reveal on the Approach paragraph (`Approach.astro:37`) | Reading text at 20% opacity until it scrolls up | Remove it from body text and keep it on headings only. A patient reading at their own pace shouldn't have to scroll to un-fade a sentence. |
| Stacking deck, header hide/show, Book Now roll, mega menu | Driven by the visitor | Keep. These are the site's signature. |

This follows your own "simple interactions" rule: fewer things competing, so the deck and the roll stand out more.

### P2: polish

| # | Finding | Fix |
|---|---|---|
| 12 | The mega menu panel has no edge. Its white panel blends into the cream hero and sits right on the H1 (`Header.astro:128`). The language dropdown and palette popover use `ring-1 ring-ink/10`. | Use the same ring. No new shadow token needed. |
| 13 | Footer at 360px: the email address runs into the column gap on every page. Links are 20px tall (`Footer.astro:69`). "9:00–17:00" breaks after the dash. The blurb is `text-sm` where your rules say `text-body`. | Put the padding on the link (`py-2`) for targets of 36px or more. Allow the email to break (`wrap-anywhere`) or give the Contact column the full width on phones. Extend `typeset()` to keep number ranges together. Set the blurb in `text-body`. |
| 14 | The hero carousel dots are 24×24px (`Hero.astro:131`). That meets the WCAG minimum but is small for this audience. | Keep the 10px dot and make the button 44px. |
| 15 | Testimonials on phones (when they go live): two staggered rows show mostly cut-off cards, reviews are clamped to 4 lines with no way to read the rest (`Testimonials.astro:86`), and the avatars are grey placeholders (`:69`), which the build check doesn't catch. | On phones: one row, whole cards, scroll-snap, full text or a "Read on Jameda" link. Drop the avatars (Jameda reviews have no photos) or use initials. |
| 16 | Phone padding stacks up: container 16px, panel 24px, card 24px. Hero, step and FAQ text runs at 28–34 characters per line at 360px. | Optional: `px-5` panels on phones gain 8px of measure on each side. |
| 17 | The deck's step tracker changes step only when a card has 95% landed (`step-stack.ts:12`). By then the card has hidden the previous step's text. | Change at about 0.5. This is a fix, not one of the extras you declined. |
| 18 | Hero on phones: image first, so the H1 and CTA sit at the bottom of the first screen and below it on short phones. The H1 is 22px, smaller than the section H2s (launch audit #11, still open). | Use a shorter image crop on phones (4:3 instead of 7:6). That keeps the image-first rule and brings the CTA up. |
| 19 | The English Services heading "Hormone Health tailored, to your personal needs." has a stray comma. | Copy fix for the practice to approve. |

## Plan

**Phase 1: code only, about a day, no decisions needed**

- `text-wrap-style` in `global.css`
- Gate the palette tester
- Mega menu ring
- Footer targets, email and number ranges
- Larger dot hit area
- Services row sized by card count; single-member Team layout
- Reveal only on headings, nothing faded above the fold
- Drop the services auto-slide
- Static hero trust line on phones
- Logos and testimonials: stop or pause controls before they go live

**Phase 2: needs your call**

- Phone header Book button
- Coral for booking only
- One booking label
- Header breakpoint at 1280px and the nav type size
- Tracker threshold
- Shorter hero image on phones

**Phase 3: needs the practice**

- Photography (shot list below)
- Replacement for the contact photo
- Prices and booking-flow microcopy
- Approved testimonials and logos with sources
- Heading comma

**Phase 4: verify on real devices**

- iPhone (current iOS, and iOS 17/18 if available): German FAQ at 360px, accordion, menu sheet, deck
- Mac Safari: Book Now roll, mega menu hover
- Older-iOS share from the live site's analytics

### Shot list (for item 5)

1. Dr. Wilden portrait, landscape, plain warm background (hero, team card)
2. Dr. Wilden on a video call, seen from the side: the consultation itself (How it Works step 2, Approach)
3. Hands and laptop with a patient portal or booking screen, practice branding only (How it Works step 1, contact card)
4. Lab and blood-test context, kit or results printout (How it Works step 3, Check-Up)
5. Two or three lifestyle images of women 45–60, consistent light and colour (service cards)
6. Originals at least 2,000px on the long edge

## Decisions for you

- [ ] Coral only for booking? (Item 7)
- [ ] One booking label, and which? (Item 8)
- [ ] Phone header Book button? (Item 6)
- [ ] Nav from 1280px, at 16px sentence case? (Items 10–11)
- [ ] Motion: static trust line and logos, no testimonial drift, reveal on headings only? (Motion table)
- [ ] Ask the practice for prices and a photo shoot (items 5 and 9)
