# Needs Alex

Things only you can do or decide. The loop adds to this list; T99 rewrites it as one clean list at the end.

## Setup
- [ ] **The `seo/` folder wasn't copied.** The loop instructions were at `docs/seo-loop-prompt.md`; I moved them to `docs/seo/LOOP.md` and committed them on `seo/launch-prep`. Still missing: `docs/seo/seo-geo-plan.md` and `docs/seo/snippets/`. `docs/seo-geo-plan.md` is deleted in your working tree (not committed), so I read the plan from git (the 9 Oct audit). Copy the current plan and the snippets into `docs/seo/` if you have them. The snippets are first needed in T02. Without them I'll work from the plan and from the earlier, unmerged SEO commit on `origin/seo-geo`.

## Decisions
- [ ] **How a pass counts as green.** `npm run build` already fails on `main` (649 `TODO` markers: the placeholder booking URL on every page and the draft legal texts). Until those are filled, I count a pass as green when `astro build` succeeds, the content check reports nothing but those `TODO` markers, and `seo:check` passes. OK? (Production builds with `CONTENT_CHECK=warn`, which also shows every `needs_check` item; `docs/launch-audit.md` says to unset it for launch.)
- [ ] **Root language (before T03).** Today `/` goes to `/en/`, `x-default` points to `/en/`, and CLAUDE.md names English the master. T03 says `/` → `/de/` (temporary redirect), and the plan recommends German for `x-default` too. Confirm `/de/`, and say whether `x-default` should change as well.
- [ ] **Dr. Yvonne Tuszing.** Her profile is built in all four locales (no `needs_check` in the team content), but CLAUDE.md and the loop rules say her credentials are unconfirmed. Are they confirmed now? Until you say so, I'll leave her out of JSON-LD and `llms.txt`.
- [ ] **AI crawlers (before T08).** Allow training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot), or only search and answer crawlers (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot)? Plan section 5.
- [ ] **Earlier SEO branch.** `origin/seo-geo` (9 Oct, never merged) already has a sitemap, structured data and robots.txt. I'll use it as reference code for T07–T12, not merge it. Say if you'd rather merge it or drop it.

## Facts to supply
- [ ] **Dr. Wilden's profile meta description is live on production** with an unconfirmed claim: “has worked as a physician for more than 35 years”. CLAUDE.md allows “35+ years” only with a source, and the plan notes the old site says 14 years. Confirm it with a source, or change it in the admin (team → profile → meta description) in all four languages.
- [ ] Final booking URL (Pabau). It also clears most of the build's `TODO` failures.

## Review my drafts
(none yet)

## Launch-day steps
(collected in T99)
