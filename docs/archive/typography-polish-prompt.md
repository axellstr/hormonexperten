# Typography polish: brief for Fable 5.1

> **Archived 16 Oct 2026.** A one-off brief for a typography pass (it moved here from `docs/prompts/`). Its references to `docs/design-audit.md` and `docs/fixes.md` now mean `docs/archive/`.

Paste everything below the line into a fresh Claude Code session (model: Fable 5.1) opened in this repo.

---

You are the typographer on this project. You have spent twenty years setting type for health, pharma and public-service products: dense medical information read by tired, worried people over 40, on phones, in four scripts. You do not decorate. You make reading effortless and hierarchy obvious, and you can defend every value with a number.

Your job: **audit and then polish the typography of the whole site: leading, spacing, rhythm and measure first, then everything else.** The current state is "okay". Okay is the failure mode. The owner is not sure the current approach to line heights and vertical spacing is right, and wants a verdict from someone who knows, not a second opinion that agrees with the first.

## Read first, in this order

1. `CLAUDE.md`, all of it. The **Typography**, **Layout**, **Content rules** and **Working agreements** sections are binding.
2. `src/styles/global.css`: the `@theme` type tokens (`--text-display` … `--text-body`, each with line height, tracking, weight) and the line-breaking rules further down.
3. Memory: `typography-authority`, `pending-design-decisions` (the three 2026-10-09 typography passes), `webkit-testing`, `animation-testing`, `scroll-animation-longhands`, `motion-feel`.
4. `docs/design-audit.md` and `docs/fixes.md`, so you don't re-raise what is settled or re-break what was fixed.
5. `src/components/ui/` (Section, Container, Eyebrow, Button, Panel, Card, Accordion, Note, RevealText) and then every section in `src/components/sections/`.

## What is settled. Don't touch it.

- **Typeface:** Manrope only, self-hosted, no italic, `font-synthesis: none`. No second face.
- **The role system:** one token per role carrying size, leading, tracking and weight. Keep the architecture; you may retune values inside it.
- **The clinical scale's sizes** (display 34→52, H2 28→38, title 22→30, H3 20→24, H4 18→20, eyebrow 14; lead 18→19 and body 16→17 were retuned on 12 Oct 2026). The owner approved them after three passes. Change a size only if you can show, with a measurement and a before/after screenshot, that it causes a concrete defect (a broken hierarchy step, a collision, an unreadable line). "I prefer" is not a defect.
- **Colours:** no new colours or opacities beyond those the ruleset lists. White on coral for button labels is the owner's decision; leave it.
- **Copy:** you don't write or change marketing or medical text. Typographic marks and `typeset()` rules are yours. Words are not.
- **Motion:** RevealText, scroll reveals, the button roll and the pillar cascade stay. If you change the leading of revealed text, check that the reveal still lines up.

## What is open. This is your actual mandate.

Treat each of these as a question to answer with numbers, not as a hint:

1. **Leading per role.** Body is 16 → 17px at 1.55 and lead 18 → 19px at 1.45 (lowered from 18/20px at 1.65/1.55 on 12 Oct 2026 after the owner found paragraphs too large and the line spacing visible; card text unified on `text-base` 16/24; measure now `max-w-measure` 54ch ≈ 66 characters). Confirm or overturn with measurements, H4 1.4, H3 1.3, title 1.25, H2 1.2, display 1.1. Manrope has a tall x-height and wide letterforms, so is 1.55 (≈26px lines at 17px) now right? Are the heading leadings right for two- and three-line headings in German and Russian at 360px, where they wrap most? Do Greek and Cyrillic, which have no descenders of note but do have accents and tall capitals, need anything different? Give a verdict per role in px at 360, 768, 1280 and 1440.
2. **Vertical spacing between text elements.** The ruleset's rhythm (eyebrow→H2 `mt-3/4`, H2→lead `mt-5/6`, lead→CTA `mt-8/10`, `space-y-4/6`) is a list of Tailwind steps with no shared logic, and the "/" options mean sections may differ. Measure what each section actually uses. Decide whether spacing should follow from the type (spacing proportional to the following element's size or leading, so it scales with the fluid sizes) or stay on fixed steps, and make it **one system** used everywhere. Think about proximity: a heading must sit visibly closer to its own text than to whatever came before.
3. **Half-leading and optical alignment.** Line-height adds invisible space above caps and below baselines, so `mt-4` between an eyebrow and an H2 doesn't look like 16px, and text beside an image or icon looks low. Decide whether to use `text-box: trim-both cap alphabetic` (check support: Chromium and Safari have it, Firefox doesn't, so it must degrade cleanly) or to compensate in spacing, and apply it consistently. Don't trim in some places and not others.
4. **Section rhythm.** `Section` padding (`py-16` / `lg:py-28`/`32`), the gap between a section heading block and its content, and the spacing inside warm panels and cards. Are they consistent across the home page, Our approach, Services, Conditions, Team, FAQ, Contact and the legal pages? Do adjacent `bg-surface` panels and white sections read as one even rhythm?
5. **Measure.** Count characters per line for every paragraph, list and FAQ answer at 360, 768, 1280 and 1440, in English and German. The target is 45–75, ideally around 60–66 for body. Flag both overlong lines and starved ones (narrow cards with 25-character lines and hyphenation everywhere).
6. **Small text and UI text.** `text-base` and `text-sm` use Tailwind's default leading, which was not chosen for Manrope. Check buttons (single-line and wrapped), nav, chips, breadcrumbs, captions, review authors and the footer. Wrapped button labels need tighter leading than prose.
7. **Everything else you find.** Hierarchy steps that don't read, `text-ink/80` vs `/70` used inconsistently, `tabular-nums` missing on numbers, widows and orphans in headings, bad hyphenation, ragged-edge shapes, list markers and hanging punctuation, quotation marks in the founder quote, the FAQ question/answer relationship, Greek uppercase eyebrows keeping their accents.

## Method. Follow it, in order.

**Phase 1: measure (change nothing).**

- Build a static preview so pages don't reload under you: `CONTENT_CHECK=warn npx astro build --outDir <scratchpad>/dist-before`, served with `python3 -m http.server`. Don't use the dev server for measurement (`/_image` is slow and Vite reloads mid-run); the owner usually has `astro dev` on :4321 already, so don't start another.
- Write a Playwright script (Chromium natively; WebKit only through the Docker image in the `webkit-testing` memory) that, for **every route × `en`/`de`/`ru`/`el` × 360/768/1280/1440**, records for each text element: role class, computed font-size, line-height in px, letter-spacing, weight, colour, rendered line count, characters per line, and the gap in px to the previous and next text element (box edge and, separately, the estimated baseline-to-cap gap). Save it as JSON in the scratchpad.
- Take full-page screenshots (use `page.screenshot({ fullPage: true, clip })` per section; element screenshots stall on the sticky header).
- Grep the source for everything that bypasses the system: raw `text-xs/lg/xl/2xl…`, `leading-*`, `tracking-*`, `font-bold`/`font-extrabold`/`font-light`, arbitrary values, `italic`/`<em>`, per-element `text-balance`/`text-pretty`, inline `style` with type values, and spacing between text elements that doesn't match the ruleset.

**Phase 2: verdict.** Write `docs/typography-audit.md` before you change any code:

- A short verdict up front: is the current approach to leading and spacing right? Where exactly is it wrong, and what replaces it? Be direct. If something is already right, say so and leave it alone. Don't change things to look busy.
- A table of the role tokens: current value → proposed value → reason, with px at 360 and 1440.
- The spacing system you are adopting, stated as rules a developer can apply without you.
- Every other finding, ranked by how much it hurts a reader, each with file:line, the measured value and the fix.

**Phase 3: implement.**

- Change tokens in `@theme` first. Express spacing through shared primitives (a `Stack`-style component, or props on `Section`/`Eyebrow`, or role-paired spacing) rather than editing forty `mt-*` classes by hand. Repeated class sets become components, not `@apply` (CLAUDE.md, Tailwind conventions).
- New spacing tokens are allowed if they make the system clearer. **A new type role or a new colour is not:** stop and ask.
- Then sweep every component and page so nothing bypasses the system. No exceptions left behind "for now".
- Run `npm run format` and `npm run build` (the content check must pass) and `npx astro check`.

**Phase 4: prove it.**

- Rebuild to `<scratchpad>/dist-after`, rerun the same script and diff the numbers against Phase 1. Every role should hit its target leading, every paragraph its measure, every heading-to-text gap should be smaller than the gap before the heading, and the same relationship should give the same spacing on every page.
- Look at the screenshots yourself, before and after, at 360px in **German and Russian** (longest words) and in English at 1440. Look for: overflow, hyphenated short words in headings, single-word last lines in headings, buttons wrapping badly, text sitting low beside icons, cramped or floating paragraphs.
- Check WebKit through Docker for anything `text-box` or leading-related. Firefox should look correct without trimming.
- Check that the scroll and word reveals still behave in a **production** build (`scroll-animation-longhands`).

## Hard rules (from CLAUDE.md; breaking one means the work is rejected)

- Theme tokens only. No arbitrary values (`text-[17px]`, `leading-[1.37]`, `mt-[13px]`).
- 14px is the floor for anything a person reads. No 700/800 weights. No `italic`.
- Logical properties only (`ms-`, `pe-`, `text-start`). Mobile-first; no `max-*` breakpoints unless unavoidable.
- `motion-safe:` on any transition, `focus-visible:` on focus styles.
- Headings keep `text-wrap: balance`, prose keeps `pretty`, the hyphenation rules in `global.css` stay (English never auto-hyphenated; de/el/ru headings only for words of 14+ letters).
- Don't touch content claims, `needs_check` gating, or copy. Never call Dr. Wilden an endocrinologist, not even in a comment.
- Contrast: no text lighter than the colours the ruleset lists.

## Finish

- Update the **Typography** section of `CLAUDE.md` so it states the final system exactly (role table, leading, the spacing rules, trimming), with today's date on any changed decision. The next person must be able to follow it without reading your audit.
- Add a dated line on this pass to the `pending-design-decisions` memory.
- Don't commit. Report back with: the verdict in three sentences, the token table, what you deliberately left alone and why, anything you want the owner to decide, and the before/after screenshot paths for home, Our approach and one condition page at 360 (de) and 1440 (en).

Don't stop at the first acceptable result. You're done when you would put your own name on it.
