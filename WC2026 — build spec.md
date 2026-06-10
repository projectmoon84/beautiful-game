# The Beautiful Game — master build spec

*World Cup 2026 companion app.* The single source of truth for building it. Written to be handed, section by section, to Codex / Claude Code inside Cursor. Stack: **GitHub + Supabase + Vercel**. Mobile-first.

**The name is the brief.** "The Beautiful Game" is football's own nickname and a promise about the app's craft — motion, smoothness and reveal are first-class features, not polish. See §13 for the motion & performance system that delivers on it.

This spec reflects the eleven Figma screens in `Design mockups/` (Matches, Match × 4 states + Share, Standings, Group, Team × 3 tabs). Where a screen isn't yet designed (Insights, Admin), the spec defines intent and structure for you to design onto.

---

## 1. Product summary

A bold, kit-coloured companion app for the 2026 World Cup. Every team and match is dressed in its national/kit colours; big typography; pitch-texture overlays; fluid transitions. Three primary sections — **Matches, Standings, Insights** — plus a URL-only **Admin** area for editorial control of colours, facts and trivia. A **share feature** turns any result into a stickered image for social, with a path to auto-posting results to a dedicated Instagram account.

Design principle to protect throughout: **the kit becomes the interface.** No component hard-codes a colour; every component reads theme tokens, and the team/match in view supplies them.

---

## 2. Information architecture (confirmed from designs)

```
Bottom nav (persistent): MATCHES · STANDINGS · INSIGHTS

MATCHES  (tab)
  • Horizontal date scroller (… Thu 11 · TODAY · Thu 11 …)
  • For the selected day: fixture cards (split-kit, full-bleed)
  • Relevant group standings surfaced inline beneath that day's fixtures
  └─► MATCH page  (one screen, three states)
        - Upcoming  : crest circle shows flags + "vs"; panels = Venue / Last time (H2H) / Title odds / fact
        - Live      : "NN min" pill; live score; timeline builds top-down; (live stats)
        - Finished  : full score; full goal/card timeline + HT marker; MOM pill; fact panels both sides
        - Share bar pinned above nav on Live/Finished → SHARE IMAGE composer

STANDINGS  (tab)
  • Sub-tabs: Groups | Knockouts
  • Groups: every group table (P W D L GF GA GD PTS), colour bar per row
  └─► GROUP view (single group table + that group's fixtures below)
        └─► TEAM page  (kit-themed, pitch-texture overlay)
              - Header: flag, BIG name, Seed / Title odds / fact / Venue
              - Sub-tabs: Standings | Matches | Squad
                · Standings = this team's group table
                · Matches   = this team's fixtures (split-kit cards)
                · Squad     = grouped by position (GK/DEF/MID/FWD), number + name

INSIGHTS  (tab — not yet designed)
  • Player stats (goals, assists, cards) · Team stats
  • Editorial insight surfaces (Dark horse, Defying the odds, Highest scoring, Most cards …)

ADMIN  (URL-only, authenticated — e.g. /admin)
  • Team palette editor (primary/secondary/tertiary + on-colours, flag, kit)
  • Facts & trivia per team; venue facts; H2H notes
  • Fixture/result entry & match-state control (for live/finished when no feed)
```

Navigation model: the three tabs are the shell; Match, Group and Team are detail views that push over the top with a back affordance. Detail views set the theme; the shell stays neutral.

---

## 3. Theming system (the core)

### Token roles

Per team, three kit roles plus computed/explicit on-colours:

| Token | Meaning | Brazil | Portugal |
|---|---|---|---|
| `--team-primary` | dominant ink / headline | `#009739` | `#FFD100` |
| `--team-secondary` | field / background | `#F5C800` | `#DA291C` |
| `--team-tertiary` | accent | `#F5C800` | `#FFD100` |
| `--team-on-primary` | text on primary | auto/`#fff` | auto |
| `--team-on-secondary` | text on secondary | auto | auto |

Globals stay constant: `--white`, `--black`, `--surface` (the cream `#F3EFE3`-ish used on Matches/Standings), nav `#14161A`.

### How it runs

CSS custom properties set on a wrapper element (`ThemeProvider` / a `data-team` scope). Swapping the team rewrites the variables; the browser repaints and can animate the transition. A **match** = two themed zones side by side: left zone gets home tokens, right gets away tokens, divided at 50% with a hairline and the crest circle straddling the seam.

### Contrast safety (required, not optional)

Kit colours are not chosen for legibility. For each team, store explicit `on_*` colours **or** compute them: `luminance(bg) > 0.6 ? near-black : white`. Every text-on-kit surface uses the on-token. Treat WCAG AA as a build acceptance criterion; the admin palette editor must warn when a chosen pair fails.

### Source of truth

Colours live in the `teams` table (section 6). The prototype's `TEAMS` object is the exact row shape. Admin edits a hex → live site re-themes. No redeploy needed.

---

## 4. Pitch-texture overlay system

Goal: a set of subtle patterns ("pitch textures") that sit as a low-opacity overlay on match screens (around the centre circle) and team pages, randomly selected per render for variety.

### Approach (recommended)

Author each texture as a **single SVG `<pattern>` / tiled SVG**, monochrome, designed to read at low opacity. Store the set as static assets (`/public/textures/*.svg`) or in Supabase Storage so they're swappable without a deploy. Each texture is colour-agnostic — it inherits `currentColor`, so it tints to the team colour automatically.

Rendering rules:

- **Layer:** an absolutely-positioned overlay above the kit background, below content. `opacity: 0.06–0.12`, `mix-blend-mode: multiply` (on light kits) or `screen`/`overlay` (on dark kits) — pick per-luminance like the contrast helper.
- **Match screen positioning:** the texture is anchored to the **centre circle** — i.e. radial placement, densest near the seam, fading outward. Practically: a container centred on the crest circle with the pattern, masked with a radial gradient so it concentrates around the centre and dissolves toward the screen edges. Each half can carry its own texture instance tinted to its team.
- **Team page:** full-bleed diagonal texture (as in the Squad/Matches mockups) at low opacity, tinted to the team's primary on its secondary field.
- **Random selection:** a `pickTexture(seed)` helper. Seed it with the fixture id / team id so the choice is **stable per entity** (same match always shows the same texture — avoids flicker on re-render) but varied across the app. Keep an admin/config list of enabled texture ids.

### Template for authoring textures

Provide a documented SVG template so new textures drop in without code changes:

```
viewBox 0 0 120 120, single <pattern id> tiled, strokes/fills use currentColor,
no hard-coded colours, target visual weight ~ readable at 8–12% opacity.
File naming: texture-<name>.svg. Register the id in textures.config.ts (or a
`textures` table) to enable it.
```

A `<PitchTexture textureId variant="centre|full" tone="auto" />` component encapsulates the masking, blend mode and tint so screens just drop it in.

---

## 5. Component inventory (mapped to screens)

Theme-agnostic, reusable. Each reads tokens only.

**Shell & nav**
- `AppShell` — holds the page + persistent `BottomNav` (Matches/Standings/Insights).
- `BottomNav` — three items, active item accented; dark bar.
- `BackButton` — floating affordance on detail views.

**Matches**
- `DateScroller` — horizontal day strip, centred TODAY, snaps; drives the day filter.
- `FixtureCard` — full-bleed split-kit row. Variants: `scheduled` (KO time + group), `live` ("NN min" pill + live score), `finished` (final score). **Renders all 104 matches.**
- `InlineStandings` — compact group table surfaced under a day's fixtures on Matches.

**Match page**
- `MatchHero` — meta row (date · group), the two `BigType` codes, `CrestCircle` (flags+vs / score) straddling the seam, `PitchTexture variant="centre"` per half.
- `EventTimeline` + `EventItem` — centre line, events branch left/right (scorer + assist, icon, minute `Pill`), `HT` marker.
- `FactPanel` — hairline-bordered stacked cells. Content varies by state (Venue, Last time/H2H, Title odds, fact).
- `MomPill` — man-of-the-match chip.
- `ShareBar` — pinned above nav (Live/Finished) → opens `ShareComposer`.
- `LiveStatsStrip` — possession/shots/cards (Live only; feed-dependent).

**Standings & team**
- `GroupTable` — full standings; `colour-bar` per row carries team primary. `TeamRow` tappable.
- `SubTabs` — Groups/Knockouts, and Standings/Matches/Squad on team page.
- `TeamHeader` — kit-themed, flag + `BigType` name + key facts, diagonal `PitchTexture variant="full"`.
- `SquadList` — grouped by `GK/DEF/MID/FWD`; number + name rows.
- `KnockoutBracket` — horizontal scroll; **starts at Round of 32** (2026 format).

**Insights**
- `StatLeaderboard` — ranked players, bar = metric, secondary value.
- `InsightCard` — editorial stat themed to its subject team (Dark horse etc.).

**Share**
- `ShareComposer` — 4:5 canvas of the result + draggable `Sticker` overlays; export to image; save/share.
- `Sticker` — preset graphic/text stickers ("GREAT GAME", "CRAZY GAME"), draggable/rotatable.

**Primitives**
- `BigType`, `Pill`, `FormStrip` (W/D/L, semantic colours), `Flag`, `ThemeProvider`, `PitchTexture`.

---

## 6. Data model (Supabase / Postgres)

```
teams
  id (pk), name, short_code, fifa_code, flag_emoji, flag_url,
  group_id (fk), seed, title_odds,
  primary_hex, secondary_hex, tertiary_hex, on_primary, on_secondary,
  kit_image_url, fun_fact, texture_id (nullable → else random)

players
  id (pk), team_id (fk), name, shirt_number, position (GK|DEF|MID|FWD)

groups
  id (pk), label (A..L)            -- 12 groups in 2026

venues
  id (pk), stadium, city, country, fun_fact

fixtures
  id (pk), home_team_id (fk), away_team_id (fk), venue_id (fk), group_id (fk),
  kickoff_utc (timestamptz), stage (group|r32|r16|qf|sf|final),
  status (scheduled|live|finished), minute (nullable, for live),
  home_score, away_score, man_of_match_player_id (fk, nullable)

match_events                       -- drives timeline + all player stats
  id (pk), fixture_id (fk), minute, type (goal|own_goal|penalty|yellow|red|sub),
  team_id (fk), player_id (fk), assist_player_id (fk, nullable)

head_to_head
  id (pk), team_a_id, team_b_id, summary (e.g. "BRA 1-1 POR")  -- or derive

news
  id (pk), team_id (nullable), fixture_id (nullable), headline, url, published_at

insights                           -- editorial overrides (Dark horse etc.)
  id (pk), kind, team_id (fk), value, blurb, is_published

textures
  id (pk), name, file_path, enabled
```

Derived (views, not tables): **standings** (aggregate fixtures → P/W/D/L/GF/GA/GD/PTS per group, with third-place ranking for 2026 qualification), **player_stats** (aggregate `match_events` → goals/assists/cards), and most **insights** (sortable queries; the `insights` table is only for hand-curated narrative cards).

Time zones: store `kickoff_utc` as `timestamptz`; convert to the user's local zone in the UI (the design shows local times). Keep a display TZ note per venue if you want "local kick-off" too.

---

## 7. Data sources (researched — free build)

Genuinely free options are limited, so use a **layered** approach, all synced into Supabase with the **admin area as the override**.

**Primary — fixtures, groups, results spine: `openfootball/worldcup.json`**
- CC0 public domain, **no API key**. Has a `2026/worldcup.json` with the full 104-match schedule (teams, groups, grounds, kickoff). Past cups include full goals/scorers — same shape will populate 2026 as it's filled in.
- Caveat: **wiki-style, hand-updated ~daily, not live.** Perfect for schedule + final results; not for real-time.
- Use: raw URL `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`, fetched on a schedule into Supabase.

**Squads & player stats: `BALLDONTLIE` FIFA World Cup API (free account)**
- Teams, players, rosters, standings, events, per-match stats, odds for season `2026`. Free tier exists but is **rate-limited** (live granularity is paid).
- Use: sync squads + post-match stats periodically; respect the free rate limit (cache hard in Supabase, never call from the client).

**Structured fallback: `football-data.org` free tier**
- Includes the World Cup, **10 req/min**, scores delayed. Clean JSON for standings/fixtures if openfootball lags.

**Override layer: the Admin area** — for live/finished states during matches, missing squads, facts/trivia, colours, MOM, and anything a free feed doesn't carry. This is what makes the free-data approach viable.

**Recommendation:** openfootball (spine) + BALLDONTLIE free (squads/stats) + admin override. Wrap all of it behind a single `dataService` so swapping/adding a paid feed later is one contained change. **Never call third-party APIs from the browser** — sync server-side (Supabase Edge Function on a cron) into your own tables; the app only ever reads Supabase.

> Sources: [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) · [football-data.org coverage](https://www.football-data.org/coverage) · [BALLDONTLIE FIFA API](https://fifa.balldontlie.io/) · [API-Football 2026 guide](https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports)

---

## 8. Share feature + Instagram

### v1 — user share (spec now)

1. From a Live/Finished match, tap `ShareBar` → `ShareComposer`.
2. Composer renders a **4:5 portrait** card (matches the Share image mockup): kit-split background, BigType score, timeline, date/group. Built as a real DOM node themed identically to the match page.
3. User drags preset `Sticker`s onto the canvas ("GREAT GAME", "CRAZY GAME", custom text).
4. **Export to image:** render the node to PNG client-side (`html-to-image` / `satori` + `resvg`, or canvas). Offer **Save to device** and the native **Web Share API** (`navigator.share` with the file) so the user posts to their own socials.
5. No server needed for v1.

### v2 — auto-post to a dedicated Instagram account (later phase — noted, not blocking)

- Requires an **Instagram Business/Creator account + Facebook Page + Meta app**, using the **Instagram Graph API** `media` → `media_publish` flow. IG requires a **public image URL** (you can't upload raw bytes), so the server renders the result card, uploads it to Supabase Storage (public URL), then publishes via the Graph API. Long-lived access token refreshed on a schedule.
- Trigger: a Supabase Edge Function fires when a fixture flips to `finished`, generates the card server-side (`satori`/`resvg` in the function), and posts. Add a caption template ("FT: BRA 3-2 POR …").
- Constraints to plan for: Meta app review/permissions, rate limits (~25 posts/24h per account), token lifecycle. Keep it behind a feature flag.

---

## 9. Admin area

URL-only, `/admin`, gated by **Supabase Auth** (single admin user / email allowlist; protect with RLS so only the admin role can write). Forms over the tables:

- **Team palette editor** — primary/secondary/tertiary pickers with a **live match-page preview** and an automatic **contrast warning**; flag + kit upload (Supabase Storage); seed, odds, fun fact, texture choice. *Highest-value screen — give it the most polish.*
- **Facts & trivia** — per-team fun facts, venue facts, H2H notes/summaries.
- **Fixtures & results** — set/override score, status (scheduled→live→finished), minute, MOM, and the `match_events` timeline entries. This is the live/finished control when no live feed.
- **News** — headline + URL, attached to team or fixture.
- **Insights** — curate Dark horse / Defying the odds narrative cards.
- **Textures** — enable/disable available patterns.

RLS posture: public read on published content; writes restricted to the admin role; never expose service keys to the client.

---

## 10. Tech stack & repo shape

- **Frontend:** React + Vite + TypeScript; **Tailwind CSS** (pairs with CSS-variable theming); **Framer Motion** (page/timeline/score transitions); React Router. Consider a **PWA** wrapper so it installs to the home screen (mobile-first goal).
- **Backend:** **Supabase** — Postgres (schema §6), Auth (admin), Storage (flags/kits/textures/share images), Edge Functions (scheduled feed sync; later IG posting), Row-Level Security, Realtime (optional, for live updates).
- **Hosting/CI:** **GitHub** repo → **Vercel** (preview deploys per PR, prod on `main`). Supabase project linked; env vars in Vercel.
- **Data access rule:** the app reads **only** Supabase via a single `dataService` module. Feeds are synced server-side into Supabase. This keeps secrets off the client and lets you swap feeds without touching screens.

Suggested structure:
```
/src
  /components        (primitives + the inventory in §5)
  /screens           (Matches, MatchPage, Standings, GroupView, TeamPage, Insights, Admin)
  /theme             (ThemeProvider, tokens, contrast helpers)
  /textures          (PitchTexture, textures.config.ts, /public/textures/*.svg)
  /data              (dataService, supabase client, types generated from schema)
  /share             (ShareComposer, stickers, image export)
/supabase
  /migrations        (schema)
  /functions         (sync-openfootball, sync-balldontlie, post-instagram)
```

---

## 11. Build sequence (for Codex / Claude Code in Cursor)

Hand these over roughly in order. Each is scoped to be a self-contained prompt/PR; each ends shippable.

1. **Scaffold** — Vite + React + TS + Tailwind + Router; `ThemeProvider` with the token roles (§3) and the contrast helper; global tokens; `AppShell` + `BottomNav` (3 tabs) with placeholder routes. **Establish the motion foundation now (§13):** `useMotionTier()` hook, `prefers-reduced-motion` Tier 0, and the transform/opacity-only performance rules — so motion is never retrofitted. *Acceptance: app runs, nav switches, theme tokens demonstrably swap, motion tier resolves and reduced-motion is honoured.*
2. **Primitives & mock dataService** — `BigType`, `Pill`, `Flag`, `FormStrip`, `FixtureCard` (3 variants), `GroupTable`; a `dataService` returning typed mock data shaped to §6. *Acceptance: components render from mock data only.*
3. **Matches tab** — `DateScroller`, day-filtered fixture list, `InlineStandings`. *Acceptance: matches the Matches.png mockup; tapping a card routes to the match page.*
4. **Match page** — `MatchHero` + `CrestCircle`, `EventTimeline`/`EventItem`, `FactPanel`, `MomPill`; the three states (upcoming/live/finished) as **one morphing screen**. **Build the signature match replay here (§13.4)** at Tier 1 — chronological event reveal with the score ticking in sync. *Acceptance: all three states match the mockups; score and timeline stay bound to one playhead; holds 60fps; tap-to-skip and reduced-motion both work.*
5. **PitchTexture system** — component + masking + tint + `pickTexture(seed)`; the SVG template; apply `variant="centre"` to the match hero. *Acceptance: stable-per-fixture texture concentrated around the centre circle, readable contrast.*
6. **Standings + Group + Team** — `SubTabs`, `GroupTable`, `GroupView`, `TeamHeader` (with `variant="full"` texture), `SquadList`, team Standings/Matches/Squad tabs. *Acceptance: matches Standings/Group/Team mockups.*
7. **Supabase backend** — create project; migrate schema §6; seed from mock; generate TS types; point `dataService` at Supabase; standings + player_stats **views**. *Acceptance: app reads live from Supabase; no behaviour change.*
8. **Admin** — Auth + RLS; palette editor (live preview + contrast warning), facts, fixture/result + events editor, textures, news. *Acceptance: editing a colour re-themes the public site; editing events updates a timeline.*
9. **Feed sync** — Edge Functions on cron: `sync-openfootball` (schedule/results), `sync-balldontlie` (squads/stats); admin override wins on conflict. *Acceptance: a scheduled run populates/updates tables within rate limits, client untouched.*
10. **Share v1** — `ShareComposer` (4:5), stickers, client-side PNG export, Web Share/save. *Acceptance: matches Share image.png; exports a clean themed PNG.*
11. **Insights** — design then build `StatLeaderboard` + `InsightCard`; wire the derived stats and the curated `insights` table. *Acceptance: scorers/cards leaderboards correct from `match_events`; narrative cards render themed.*
12. **Polish & Tier 2 motion** — layer the rich-tier motion (§13.2/§13.5): scroll-driven parallax, shared-element match-open, colour-wash re-theming, hover micro-interactions; PWA; full accessibility audit across all kits (contrast, keyboard, screen reader); performance pass. *Acceptance: 60fps on a mid-range phone (Tier 1) and desktop (Tier 2), full reduced-motion degrade.*
13. **(Later) Instagram auto-post** — server-side card render → Storage public URL → Graph API publish on `finished`, behind a feature flag.

---

## 12. Open decisions to confirm before/while building

- **Squad sourcing:** BALLDONTLIE free vs. manual entry per team if its rate limits/coverage prove thin — decide at step 9.
- **Live data:** no free source is truly live. v1 likely drives Live/Finished via the **admin** during matches; revisit a paid livescore feed only if needed.
- **Sticker set:** which presets ship (and whether users can add free text). Affects step 10.
- **Texture set:** how many patterns, authored by you to the §4 template.
- **Third-place qualification UI:** how to flag best-third-placed teams in group tables (2026 format).
- **Instagram:** confirm a Business account + Meta app exist before scheduling step 13.

---

## 13. Motion & performance — "The Beautiful Game"

Motion is the brand thesis. The app should feel buttery: nothing snaps, nothing janks, everything reveals. This section is a build contract, not a mood board.

### 13.1 The performance budget (the non-negotiable)

Smoothness is a measurable target, not a vibe. Hold these as acceptance criteria:

- **60fps minimum, 120fps where the display allows.** Every animation runs on the compositor — animate **only `transform` and `opacity`**. Never animate `width`, `height`, `top`, `left`, `margin`, or anything that triggers layout/paint on each frame.
- **No animation may block scroll.** Scrolling is sacred; effects attach to scroll, they never fight it.
- **Interaction latency < 100ms.** A tap or hover gets immediate feedback even if the full transition takes longer.
- **Promote deliberately.** Use `will-change` / `transform: translateZ(0)` only on elements actively animating, and remove it after — over-promoting burns GPU memory and *causes* the jank it's meant to prevent.

### 13.2 The tiered motion system (mobile vs desktop vs accessibility)

Three tiers, chosen at runtime so mobile is always smooth and desktop shows off:

- **Tier 0 — Reduced.** Honours `prefers-reduced-motion: reduce`. Transitions become instant or simple cross-fades (≤150ms opacity). No parallax, no large movement, no auto-playing motion. This is a hard floor and ships from day one.
- **Tier 1 — Core (mobile default).** Always-smooth essentials: page transitions, the match replay (§13.4), tap feedback, momentum scroll. Tuned to be cheap — short distances, transform/opacity only, capped concurrent animations. This is what every device gets.
- **Tier 2 — Rich (desktop / high-capability).** Adds the showpieces: scroll-driven parallax on kit fields and pitch textures, shared-element match-open morph, colour-wash re-theming, hover micro-interactions, larger orchestration. Unlocked only when the device can pay for it.

**Capability gate:** detect with `matchMedia('(hover: hover) and (pointer: fine)')` (desktop signal) plus `navigator.hardwareConcurrency` and `deviceMemory`, and **adapt down** if frame timings degrade (watch `requestAnimationFrame` deltas / long-task observer — if frames drop, drop a tier). Expose tiers as a `useMotionTier()` hook so every component asks for its allowance rather than guessing.

### 13.3 Recommended motion tech (and why)

A two-layer approach — native where it's cheapest, a library where orchestration earns it:

- **Navigation between screens → the View Transitions API.** Native, GPU-driven page/element transitions with effectively zero JS and no bundle cost. Cross-document and same-document transitions ship in **Chrome 126+ and Safari 18.2+**; **Firefox** lacks stable cross-doc support, so treat it as **progressive enhancement** — wrap in `if (document.startViewTransition)` and fall back to a Tier-1 fade. This powers the shared-element match-open (the fixture card's kit halves morph into the full match page via matched `view-transition-name`s).
- **Orchestrated reveals, gestures, layout animation → Motion** (the library formerly called Framer Motion; package `motion`, React-native fit). Use it for the signature match-replay playhead (`useMotionValue`/spring driving score + event reveals), `AnimatePresence` enter/exit, drag on the share-sticker composer, and `layout` animations. Excellent DX, hybrid-engine performance (runs transform/opacity on the compositor).
- **Scroll-driven effects → CSS `animation-timeline: scroll()`/`view()` first**, falling back to Motion's `useScroll` where CSS scroll-timelines aren't supported. CSS scroll animations run off the main thread — the smoothest possible scroll reveals.
- **Colour-wash re-theming → animate the CSS custom properties** (register with `@property` for interpolatable hex) so a team change sweeps rather than snaps — no library needed.

Rule of thumb: **CSS/native for the common case, Motion for the complex case.** Don't reach for JS when a CSS transition or a view transition will do — it's faster and lighter.

### 13.4 Signature moment — the match replay

The defining moment, on opening a **finished** match. Rather than showing the final score and filling the timeline in afterwards, the match **replays**: events reveal in chronological order and **the score ticks up in sync with the timeline** — the score is a live readout of the replay, not a spoiler. Opening a result becomes a miniature re-watch of the match.

**Core concept:** a virtual match clock runs `0' → 90'+`, **pinned at the top** under the meta row (a fixed minute pill — it does not travel). As the clock reaches each event's minute, that event **enters the feed just below the centre circle**; when it reaches a goal, the relevant team's score increments **at that exact instant**. Score, clock and feed are all bound to one shared playback position.

**The push-feed (resolves the layout question):** events live in a column anchored **directly under the crest circle**. Each new event is **prepended at the top of the column (nearest the circle) and pushes the older events downward** — so the match appears to *feed out of the circle* as time passes, newest always closest to the score. Because newest is always on top, the column **already rests in the static design's order (newest at top)** when playback ends — the replay feels chronological yet the finished state matches the Figma mockup with no re-sort. Movement is **event-stepped**: the column shifts when a new event enters, not continuously, which keeps it clean and readable (a goal/card landing is the beat). Implement with a flex column + CSS/`layout` transition on the items so the push animates for free.

**Pacing — 90 minutes in 10 seconds (locked).** The clock advances on a compressed-but-proportional timescale: the full 90' replay runs **10s** (`REPLAY_DURATION_MS = 10000`). Real minute gaps are preserved in proportion so the match's *rhythm* shows — a flurry of late goals feels frantic, an early goal then quiet feels like a wait. 10s deliberately errs cinematic — it gives each goal room to land; tap-to-skip covers repeat visits. (Optional refinement noted in §12: clamp dead stretches so a goalless spell never drags.) Knockout matches with extra time/penalties extend proportionally past 90'.

**Choreography:**
1. **Kickoff** (0–300ms): the two `BigType` codes slide in from their outer edges; the crest circle scales up from the seam; **score and clock start at 0–0 / 0'**.
2. **Playback** (~300ms → ~10s): the top-pinned clock counts up. As it reaches each event's minute, the `EventItem` **enters just below the circle** (fade + small downward translate) and pushes the prior events down. On a **goal**, the scoring team's number **counts/snaps +1** with a brief colour-pulse and a scale-bump on that side — the heartbeat. The `HT` chip enters at 45'. Cards/subs enter without touching the score.
3. **Full time** (~10s + brief beat): the clock reads `FT`; the score reads the true final; `MomPill` lands; fact panels fade up beneath. The feed is already in resting (newest-on-top) order — the static finished design is now on screen.

**Control:** auto-plays **once** on open. **Tap anywhere skips** straight to the settled final state (full score, full timeline, no animation) — respectful of repeat visits. (A replay control can be added later; see §12.) On revisit within a session, consider defaulting to the settled state.

**Implementation sketch:** drive everything from one `playhead` value (a Motion `useMotionValue` from 0→1 mapped to match minutes). Derive the clock, `homeScore`/`awayScore`, and each event's `revealed` boolean from `playhead` so they can never desync. Render revealed events newest-first in a flex column anchored under the circle; new entries prepend and the `layout` transition animates the push. This keeps clock, score and feed mathematically bound to one source — the key to it feeling honest.

**Tier behaviour:** **Tier 1 (mobile core)** runs the full push-feed replay with lighter springs and reduced scale-bumps. **Tier 0 (reduced-motion)** skips the replay entirely and cross-fades the settled final state in — no clock run, no push, no movement. **Tier 2 (desktop)** adds texture parallax during playback, a gentle colour-pulse wash on each goal, and slightly more generous timing to let it breathe.

### 13.5 Per-screen motion notes

- **Matches:** `DateScroller` snaps with momentum; selecting a day cross-fades the list and slides the inline standings up. Fixture cards have a subtle press-scale (`0.98`) and, on Tier 2, a hover lift.
- **Match open:** shared-element transition — the tapped card's split halves expand to fill the match page (matched view-transition-names on each half + the crest). Back reverses it.
- **Live state:** new timeline events animate in at the top with a soft pulse; the "NN min" pill ticks without layout shift; updates arrive via Realtime with a quiet "updating" shimmer, never a reload.
- **Standings / Team:** sub-tab changes slide-and-fade (horizontal); team page header parallaxes its texture on scroll (Tier 2); squad rows stagger-reveal on scroll-into-view.
- **Share composer:** stickers drag with spring physics and momentum; export button shows a satisfying capture beat.
- **Insights:** leaderboards animate their bars on scroll-into-view; insight cards reveal with a stagger.

### 13.6 Build & acceptance

Slot into the §11 sequence: establish **Tier 0 + `useMotionTier()` + the budget rules in step 1** (so nothing is retrofitted), build the signature reveal **with step 4 (match page)**, layer scroll/parallax/shared-element **in step 12 (polish)**. Acceptance for step 12: holds 60fps on a mid-range phone at Tier 1 and on desktop at Tier 2 (verify with DevTools performance + the rAF monitor), and fully degrades under `prefers-reduced-motion`.

> Sources: [View Transitions API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) · [Cross-document view transitions, cross-browser 2026](https://trade-assistance.com/blog/cross-document-view-transitions-mpa-2026/) · [Can I use: View Transitions](https://caniuse.com/view-transitions)

---

*Companion files in this folder: the clickable prototype (`WC2026-prototype.html`), the wireframe set (`WC2026-wireframes.html`), and the earlier plan (`WC2026 — plan and architecture.md`). This spec supersedes the plan where they differ, as it's built from the final designs.*
