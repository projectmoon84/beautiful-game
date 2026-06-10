# The Beautiful Game — phased build plan

A step-by-step guide to building the app with **Codex** and **Claude Code** inside **Cursor**. Written for someone strong on design and newer to the build mechanics: every phase has copy-paste-ready agent prompts, a plain-English explanation of what's happening, and a checklist of what to verify before you move on.

Read this alongside **`WC2026 — build spec.md`** — that's the *what*, this is the *how and when*. Keep both open.

> **The golden rule:** never accept code you haven't sanity-checked, and commit after every working phase. The agents are fast and usually right, but small course-corrections early save big rewrites later. You don't need to read every line — you need to confirm the app still runs and the phase's acceptance checks pass.

---

## Part A — One-time setup (do this once, in order)

You're creating four things: a code folder on your computer, a place to store it online (GitHub), a database (Supabase), and a place to publish it (Vercel). Take it slowly; it's mostly clicking and pasting.

### A1. Install the tools

1. **Node.js** — the engine that runs the app locally. Install the **LTS** version from [nodejs.org](https://nodejs.org). Verify in a terminal: `node -v` (should print a version number).
2. **Git** — version control. macOS usually has it (`git -v`); if not, [git-scm.com](https://git-scm.com).
3. **Cursor** — your editor, from [cursor.com](https://cursor.com). This is where you'll do everything.
4. **Claude Code** — install from [claude.com/claude-code](https://claude.com/claude-code); it runs in Cursor's built-in terminal and also has a panel. Sign in.
5. **Codex** — install/enable per OpenAI's instructions; it runs as a Cursor extension / CLI. Sign in.
6. **GitHub account** — [github.com](https://github.com). **Supabase account** — [supabase.com](https://supabase.com). **Vercel account** — [vercel.com](https://vercel.com). Sign up with the same email where practical and use "Sign in with GitHub" for Supabase and Vercel to keep things linked.

### A2. Create the project folder & open it in Cursor

1. Make a folder on your computer, e.g. `the-beautiful-game`.
2. Copy the spec files into a `/docs` subfolder inside it: `WC2026 — build spec.md`, this plan, and the demo files. (Agents read your repo — having the spec *in* the repo means you can point them at it.)
3. In Cursor: **File → Open Folder →** select `the-beautiful-game`.

### A3. Create the GitHub repo

Easiest path, no command line:
1. On [github.com](https://github.com) click **New repository**, name it `the-beautiful-game`, keep it **Private**, don't add any files, **Create**.
2. GitHub shows a "push an existing repository" snippet. You'll run those commands once Phase 1 has created files (Phase 1's prompt handles `git init`). For now just note the repo URL.

### A4. Create the Supabase project

1. In Supabase: **New project**. Name it `the-beautiful-game`, choose a region near your users, set a strong database password (save it in your password manager).
2. Once created, go to **Project Settings → API** and copy two values you'll need later: the **Project URL** and the **anon public key**. (You'll also see a `service_role` key — *never* put that in front-end code; it's for server functions only.)
3. Leave it for now — Phase 7 fills it with tables.

### A5. Create the `.env` file (your secret keys)

The app reads keys from a file called `.env.local` that **never** gets committed to GitHub.
1. In Cursor, create a file `.env.local` at the project root.
2. Add (you'll paste real values from A4):
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Create a `.gitignore` if Phase 1 hasn't, and make sure it contains `.env.local` and `node_modules`.

> **Why `VITE_` prefix?** Vite (the build tool) only exposes variables starting with `VITE_` to the app. Anything else stays server-side.

### A6. Connect Vercel (do the first time you want it live — fine to defer to after Phase 3)

1. In Vercel: **Add New → Project → Import** your GitHub repo.
2. Framework preset: **Vite**. Build command and output are auto-detected.
3. Under **Environment Variables**, add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. **Deploy.** From now on, every push to your `main` branch auto-deploys; every pull request gets its own preview URL.

---

## Part B — How to work with the agents (read once, refer back)

### Which agent for what

- **Claude Code — architecture, multi-file features, planning, debugging.** Best when a task touches several files or needs a plan first (most phases here). It can explore the codebase and keep the whole picture in mind. **Start each phase with Claude Code.**
- **Codex — focused implementation, tests, tight iterations.** Great for "implement this well-defined thing" and writing tests. Good second opinion if Claude Code gets stuck.
- **Cursor's own inline edits (Cmd/Ctrl-K)** — small tweaks, renames, one-liners you can describe in a sentence.

You don't have to use both every phase. A simple, reliable rhythm: **plan + build with Claude Code, then ask Codex to review or add tests.**

### The rhythm for every phase

1. **Branch.** Work each phase on its own branch so mistakes are easy to throw away. Prompt the agent: *"Create a new git branch called `phase-N-name`."*
2. **Point at the spec.** Start the prompt by telling the agent to read the relevant spec section (it's in `/docs`).
3. **Ask for a plan first** on anything non-trivial: *"Before writing code, give me a short plan and the files you'll create/change."* Read it. If it's heading the wrong way, correct it now.
4. **Let it build**, then **verify** against the phase's acceptance checks below.
5. **Commit** with a clear message, **open a PR**, glance at the Vercel preview, then **merge**.
6. **Tell the agent it's done** and move on — start the next phase fresh so context stays clean.

### Keeping the spec in context

Agents forget. Each prompt below starts by naming the spec file and section. For big phases, ask Claude Code to *"summarise §X back to me in five bullets before you start"* — if its summary is wrong, your prompt was unclear; fix it before any code is written.

### When an agent goes wrong (recovery)

- **It broke something that worked:** *"That introduced an error: [paste it]. Revert that change and try a different approach."* If messy, `git checkout .` discards uncommitted changes and you're back to your last commit — this is why you commit often.
- **It's overcomplicating:** *"This is more complex than needed. What's the simplest version that meets the acceptance checks in the plan?"*
- **It's guessing at data shapes:** point it at the data model in §6 of the spec, or paste the actual Supabase table.
- **It keeps looping on a bug:** switch agents (Claude Code ↔ Codex) for a fresh perspective, or ask: *"Add a few console.logs to find exactly where this fails, run it, and tell me what you find before fixing."*

---

## Part C — The build phases

Each maps to the build sequence in the spec (§11). Each ends with the app in a working, shippable state. **Do them in order.**

---

### Phase 1 — Scaffold & foundations

**Goal:** an empty but running app with navigation, the theming engine, and the motion foundation — so nothing is retrofitted later.

**Agent:** Claude Code.

**Prompt:**
```
Read docs/WC2026 — build spec.md, sections 3 (theming), 10 (tech stack), and 13.1–13.2
(motion budget + tiers). Then scaffold the project:

- Vite + React + TypeScript + Tailwind CSS + React Router.
- A ThemeProvider that sets CSS custom properties for team tokens
  (--team-primary/secondary/tertiary + on-colours) per §3, with a readableOn()
  auto-contrast helper.
- Global tokens (--white, --black, --surface, nav colour).
- AppShell with a persistent bottom nav: Matches / Standings / Insights, plus
  placeholder route components for each.
- A useMotionTier() hook returning 'reduced' | 'core' | 'rich' per §13.2
  (prefers-reduced-motion = reduced; hover+fine pointer = rich; else core), and a
  documented rule that animations use transform/opacity only.
- Initialise git, create a sensible .gitignore (include .env.local, node_modules),
  and make the first commit.

Before coding, give me a short plan and the file list. Then build it and tell me how
to run it locally.
```

**Verify:**
- `npm install` then `npm run dev` opens the app in a browser with no console errors.
- The three nav tabs switch between placeholder screens.
- Toggling a team in code visibly changes the theme tokens (ask the agent to add a temporary demo swatch if needed).
- Turning on your OS "reduce motion" makes `useMotionTier()` report `reduced` (ask the agent to log it).

**Then:** push to GitHub (the agent can give you the exact commands), and if you've done A6, confirm the Vercel preview builds.

---

### Phase 2 — Primitives & mock data service

**Goal:** the reusable building blocks, fed by fake data, so screens have something to render before the database exists.

**Agent:** Claude Code to build, Codex to add a couple of tests.

**Prompt (Claude Code):**
```
Read §5 (component inventory) and §6 (data model) of the spec. Create a typed
dataService that returns MOCK data shaped exactly like §6 (teams, players, groups,
venues, fixtures, match_events). Use the BRA/POR/ARG/etc. sample data from the
existing prototype as a starting point. Then build these presentational primitives,
each reading theme tokens only (never hard-coded colours): BigType, Pill, Flag,
FormStrip, FixtureCard (variants: scheduled/live/finished), GroupTable.
Build a simple /sandbox route that renders one of each so I can see them.
Plan first, then build.
```

**Prompt (Codex, after):**
```
Add unit tests for the dataService mock functions and for FixtureCard's three
variants. Keep tests minimal but meaningful.
```

**Verify:** the `/sandbox` route shows every primitive; a `FixtureCard` themed with two teams shows correct kit colours; tests pass (`npm test`).

---

### Phase 3 — Matches tab

**Goal:** the first real screen — the date scroller, day-filtered fixtures, and inline group standings. Matches your `Matches.png`.

**Agent:** Claude Code.

**Prompt:**
```
Read §2 (IA) and the Matches description, plus docs for the Matches.png mockup. Build
the Matches tab: a horizontal DateScroller (snaps, TODAY centred) that filters the
fixture list by day; the day's FixtureCards; and InlineStandings surfaced beneath the
day's fixtures (compact group tables). Tapping a fixture routes to a placeholder match
page (real one is Phase 4). Pull everything from dataService. Match the mockup layout.
Plan first.
```

**Verify:** against `Design mockups/Matches/Matches.png` — date scroller works, fixtures filter by day, inline standings appear, tapping a card navigates. **Good point to wire up Vercel (A6)** if you haven't.

---

### Phase 4 — Match page + the signature replay

**Goal:** the hero screen, in all three states, with the match-replay motion.

**Agent:** Claude Code (this is the big one — let it plan thoroughly).

**Prompt:**
```
Read §2, §5 (match components) and ALL of §13.4 (the match replay) carefully. Also
open docs/WC2026-replay-demo.html — reproduce that interaction in React.

Build the Match page as ONE component that morphs across three states (upcoming / live
/ finished) per the mockups (Upcoming.png, Live.png, Finished.png):
- MatchHero with the two BigType codes and a CrestCircle straddling the seam.
- A top-pinned minute clock.
- The push-feed: events enter just below the circle and push older ones down; newest
  nearest the circle; settles into newest-on-top resting order.
- FactPanel (content differs by state), MomPill, ShareBar (Finished/Live).
- The replay: driven by ONE playhead value (Motion useMotionValue, 0->1 mapped to
  match minutes). Derive clock, home/away score, and each event's revealed flag from
  the playhead so they cannot desync. 90' runs in 10s (REPLAY_DURATION_MS = 10000).
  On a goal the score ticks +1 at that minute with a scale-bump. Auto-play once on
  open; tap anywhere to skip to settled final; honour reduced-motion (Tier 0 = cross-
  fade straight to final, no replay).

Give me a detailed plan and the component breakdown before writing anything.
```

**Verify:** all three states match their mockups; the replay plays on open, score ticks in sync with events, tap skips, reduce-motion cross-fades. Compare feel against the demo. **This is worth iterating on** — don't rush the acceptance.

---

### Phase 5 — Pitch-texture system

**Goal:** the random, kit-tinted pattern overlays around the centre circle and on team pages.

**Agent:** Claude Code.

**Prompt:**
```
Read §4 (pitch-texture system). Build a PitchTexture component that renders a
monochrome SVG pattern inheriting currentColor (so it tints to the team colour), at
6–12% opacity with a luminance-aware blend mode, and variants "centre" (radial mask
concentrating around the crest circle) and "full" (diagonal full-bleed). Add a
pickTexture(seed) helper that selects a stable texture per fixture/team id, and a
textures.config.ts registry. Include 2–3 starter SVG textures to the authoring
template in §4 (I'll add more later). Apply variant="centre" to the Phase-4 match hero.
Plan first.
```

**Verify:** the same match always shows the same texture (reload to check stability); texture concentrates around the circle; text stays readable over it.

---

### Phase 6 — Standings, Group & Team pages

**Goal:** the whole Standings branch — group tables, drill-down, and the kit-themed team page with its sub-tabs.

**Agent:** Claude Code.

**Prompt:**
```
Read §2 and §5. Build, matching the mockups (Standings.png, Group.png, Team/*.png):
- Standings tab with Groups | Knockouts sub-tabs; GroupTable for every group, colour
  bar per row carrying team primary; KnockoutBracket placeholder.
- GroupView: one group's table + that group's fixtures below.
- TeamPage: kit-themed TeamHeader (flag, BigType name, Seed/Odds/fact/Venue) with a
  PitchTexture variant="full"; Standings | Matches | Squad sub-tabs (Squad grouped by
  GK/DEF/MID/FWD). Reuse FixtureCard for Matches.
All from dataService. Plan first.
```

**Verify:** against the four mockups; sub-tabs switch; team page is fully kit-themed; squad groups by position.

---

### Phase 7 — Supabase backend (data goes real)

**Goal:** replace mock data with a real database — without changing any screens.

**Agent:** Claude Code, plus you doing a few Supabase dashboard clicks.

**Prompt:**
```
Read §6 (data model) and §10. Create SQL migration files for all tables in §6, plus
SQL views for standings (aggregate fixtures, with 2026 third-place ranking) and
player_stats (aggregate match_events into goals/assists/cards). Add a seed script that
inserts the current mock data. Create a Supabase client using VITE_SUPABASE_URL /
VITE_SUPABASE_ANON_KEY from .env.local. Then rewrite the INSIDE of dataService to read
from Supabase while keeping its function signatures identical, so no screen changes.
Generate TypeScript types from the schema. Walk me through what I need to run in the
Supabase dashboard. Plan first.
```

**You do:** in Supabase **SQL Editor**, run the migration + seed the agent produced (it'll tell you exactly what to paste). Confirm tables appear under **Table Editor**.

**Verify:** the app looks identical but is now reading from Supabase (change a value in the Supabase table editor → it shows in the app after refresh). No screen behaviour changed.

---

### Phase 8 — Admin area

**Goal:** your editorial control — palette editor, facts, fixtures/results, textures, news — behind a login.

**Agent:** Claude Code.

**Prompt:**
```
Read §9 (admin) and §3 (theming) and §6. Build a URL-only /admin area gated by
Supabase Auth (email allowlist = me). Add Row-Level Security: public read on published
content, writes only for the admin role; never expose the service_role key client-side.
Build admin forms over the tables:
- Team palette editor: primary/secondary/tertiary pickers with a LIVE match-page
  preview and an automatic WCAG contrast warning; flag + kit upload to Supabase
  Storage; seed, odds, fun fact, texture choice.
- Facts & trivia; Fixtures & results (set score/status/minute/MOM and match_events);
  News; Insights; Textures enable/disable.
Plan first, and tell me the Supabase Auth + RLS settings I need to click.
```

**You do:** enable email auth in Supabase, add your email to the allowlist as instructed.

**Verify:** you can log in at `/admin`; editing a team's colour re-themes the public site; the contrast warning fires on a bad pair; a non-logged-in visitor can't reach `/admin`.

---

### Phase 9 — Feed sync (free data in)

**Goal:** auto-populate fixtures/results and squads from the free sources, with your admin edits winning.

**Agent:** Claude Code (Edge Functions are fiddly — let it plan).

**Prompt:**
```
Read §7 (data sources). Create Supabase Edge Functions, scheduled via cron:
- sync-openfootball: fetch
  https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
  and upsert fixtures/groups/venues/results into our tables.
- sync-balldontlie: fetch 2026 squads + post-match player stats from the BALLDONTLIE
  FIFA API using a key in Supabase secrets (NOT in the client); respect the free rate
  limit; cache hard into our tables.
Rule: never overwrite fields an admin has manually edited (add an `edited_by_admin`
flag or updated_at comparison). All third-party calls happen server-side only; the app
keeps reading our Supabase tables. Plan first and tell me what secrets/cron to set.
```

**You do:** add the BALLDONTLIE key to Supabase **Edge Function secrets**; set the cron schedule as instructed.

**Verify:** trigger a function manually (the agent shows how); tables populate/update; an admin-edited field survives a re-sync.

---

### Phase 10 — Share v1 (the image export)

**Goal:** turn a result into a stickered, kit-themed image to save/share.

**Agent:** Claude Code to build, Codex to harden the export.

**Prompt (Claude Code):**
```
Read §8.1 (share v1) and check Share image.png. Build ShareComposer: a 4:5 portrait
card of the result (kit split, BigType score, timeline, date/group) reusing the match
theming. Add draggable preset Stickers ("GREAT GAME", "CRAZY GAME", custom text) with
spring drag. Export the card node to a PNG client-side (use html-to-image or
satori+resvg). Offer Save-to-device and the Web Share API (navigator.share with the
file). Open it from the ShareBar. Plan first.
```

**Verify:** matches `Share image.png`; stickers drag; export produces a clean PNG that looks right on a phone.

---

### Phase 11 — Insights

**Goal:** the stats hub (currently undesigned — design it first or let the agent propose a layout consistent with the rest).

**Agent:** Claude Code.

**Prompt:**
```
Read §2 (Insights intent) and §5. Build the Insights tab: a StatLeaderboard (players
ranked by goals, then assists, then cards — derived from the player_stats view) and
InsightCard editorial surfaces (Highest scoring, Most cards, Dark horse, Defying the
odds), each themed to its subject team, pulling curated cards from the insights table
with sensible query-based defaults. Keep the bold typography + kit-colour style of the
rest of the app. Propose a layout first (I'll review), then build.
```

**Verify:** leaderboards compute correctly from real match events; insight cards render themed; style matches the app.

---

### Phase 12 — Polish & Tier 2 motion

**Goal:** the "buttery" desktop layer, PWA, accessibility, performance.

**Agent:** Claude Code, with Codex for the accessibility audit.

**Prompt (Claude Code):**
```
Read §13 in full. Layer the rich-tier (desktop) motion, gated by useMotionTier()=='rich'
and degrading gracefully:
- Navigation via the View Transitions API (wrap in if(document.startViewTransition);
  fall back to a fade). Shared-element match-open: the tapped FixtureCard's split
  halves morph into the match page (matched view-transition-names).
- Scroll-driven parallax on kit fields/pitch textures (CSS scroll-timeline first,
  Motion useScroll fallback).
- Colour-wash re-theming when switching team/match (animate the CSS custom properties).
- Hover micro-interactions on desktop.
Then make the app a PWA (installable). Enforce the §13.1 performance budget. Plan first.
```

**Prompt (Codex):**
```
Run an accessibility pass: colour-contrast across several team kits (flag the failures),
keyboard navigation through nav/tabs/forms, and screen-reader labels on interactive
elements. List issues by severity with fixes.
```

**Verify:** smooth at Tier 2 on desktop and Tier 1 on a mid-range phone (Cursor/Chrome DevTools performance panel — watch for dropped frames); reduce-motion still fully degrades; the app installs to the home screen.

---

### Phase 13 — (Later) Instagram auto-posting

**Goal:** auto-post each finished result to a dedicated IG account. **Only start once you have a Business/Creator IG account + Facebook Page + Meta app.**

**Agent:** Claude Code.

**Prompt:**
```
Read §8.2. Behind a feature flag, add a Supabase Edge Function that fires when a fixture
flips to 'finished': render the result card server-side (satori+resvg), upload the PNG
to Supabase Storage to get a public URL, then publish via the Instagram Graph API
(media -> media_publish) using a long-lived token stored in Edge Function secrets and
refreshed on schedule. Add a caption template ("FT: BRA 3-2 POR ..."). Respect IG rate
limits (~25/day). Tell me the Meta app + token setup I must do. Plan first.
```

**Verify:** a test fixture flip posts a correctly-rendered card to the IG account; the feature flag cleanly turns it off.

---

## Part D — Pre-flight checklist (quick reference)

Before Phase 1: ☐ Node, Git, Cursor, Claude Code, Codex installed · ☐ GitHub/Supabase/Vercel accounts · ☐ project folder open in Cursor with `/docs` spec files.

Each phase: ☐ new branch · ☐ agent read the right spec section · ☐ reviewed its plan · ☐ acceptance checks pass · ☐ app runs with no console errors · ☐ committed + merged · ☐ Vercel preview builds.

Never commit: ☐ `.env.local` · ☐ the Supabase `service_role` key · ☐ any API key in front-end code.

---

## Part E — If you get stuck

- **The app won't start:** read the terminal error and paste it to Claude Code: *"`npm run dev` fails with this error: [paste]. Diagnose and fix."*
- **A deploy fails on Vercel but works locally:** usually a missing environment variable — check Vercel → Settings → Environment Variables match your `.env.local`.
- **You're unsure whether to accept a change:** ask *"Explain what this change does in plain English and what could break."* before merging.
- **An agent rewrote too much:** `git checkout .` (discard uncommitted) or revert the PR. This is why you branch and commit per phase.
- **You want a second opinion:** hand the same task to the other agent and compare.

---

*Build order tracks §11 of the spec. Each phase is shippable on its own — you always have a working app. Go at your own pace; design-led iteration on Phases 3, 4 and 6 is time well spent.*

> Sources for the agent-workflow guidance: [Agentic coding in 2026 (Claude Code / Codex / Cursor)](https://ofox.ai/blog/agentic-coding-claude-codex-gemini-cursor-2026/) · [Claude Code vs Cursor vs Codex, six months in](https://thenewstack.io/claude-code-vs-cursor-vs-codex-2026/)
