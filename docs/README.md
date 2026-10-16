# Docs

The project's rules are in [`../CLAUDE.md`](../CLAUDE.md). These files hold everything else.

## Start here

| File | What it's for |
|---|---|
| [`launch-readiness.md`](launch-readiness.md) | **The working list until launch.** Blockers, decisions, and checklists for the practice, the lawyer, Pabau and tech. |
| [`domain-cutover.md`](domain-cutover.md) | Moving hormonexperten.de here: the old URLs, the redirect map, the runbook and the rollback. |

## CMS (EmDash)

| File | What it's for |
|---|---|
| [`emdash-setup.md`](emdash-setup.md) | How the CMS runs on Vercel and Supabase, how production was set up, its open items, and lessons such as trailing slashes. |
| [`emdash-guide.md`](emdash-guide.md) | The editor guide for the practice, in plain language. Each section is short enough for one scene of a walkthrough video. |
| [`emdash-plan.md`](emdash-plan.md) | The original plan of 15 Oct: why EmDash, and what it changes. Code comments refer to it; `emdash-setup.md` says where the build differs from it. |

## SEO

| File | What it's for |
|---|---|
| [`seo/`](seo/PROGRESS.md) | The SEO/GEO launch tasks, run as a `/loop` on branch `seo/launch-prep`: [`LOOP.md`](seo/LOOP.md) has the instructions, [`PROGRESS.md`](seo/PROGRESS.md) the state, and [`NEEDS-ALEX.md`](seo/NEEDS-ALEX.md) the questions for you. The loop owns these files. |
| [`migration/`](migration/) | Data for the cut-over: the old site's URL inventory (`old-site-urls.txt`) and the draft redirect map (`redirects-draft.json`, with notes per row in `redirects-table.tsv`). |

The SEO and GEO plan of 9 Oct is [`seo-geo-plan.md`](seo-geo-plan.md). The SEO loop expects the
current version at `docs/seo/seo-geo-plan.md`, so it moves there with that branch. `docs/seo/` is
on branch `seo/launch-prep` until it's merged.

## Archive

Audits that have been superseded, kept for their reasoning and screenshots. What's still open from
them is in `launch-readiness.md` ("Earlier audits").

| File | What it was |
|---|---|
| [`archive/launch-audit.md`](archive/launch-audit.md) | Pre-launch check of 9 Oct: Lighthouse baseline, blockers. |
| [`archive/design-audit.md`](archive/design-audit.md) | Design review of 11 Oct: method, and Chromium vs Safari notes. |
| [`archive/fixes.md`](archive/fixes.md) | The F1–F28 fix list from that review, with screenshots in `archive/fixes/`. |
| [`archive/typography-polish-prompt.md`](archive/typography-polish-prompt.md) | A one-off brief for a typography pass. |

## Writing docs here

- Date every status ("16 Oct 2026"), never "today" or "last week".
- One topic per file. Status and checklists go in `launch-readiness.md` until launch, not in a
  new audit file.
- When a doc is superseded, move it to `archive/` with a one-line note at the top saying what
  replaced it.
