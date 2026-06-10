# World Cup 2026 — interactive tool: plan and architecture

A planning document for an interactive, data-rich web app celebrating the 2026 World Cup. Written for a designer-led build: design and product thinking up front, with the technical parts explained plainly and step by step.

---

## 1. The vision in one line

A bold, colourful, fluid web app where every team and fixture is dressed in its own kit colours — big typography, lots of movement, and genuinely insightful data — that feels like a native mobile app but lives on the web.

The signature idea, proven by your result-page concept, is **the kit becomes the interface**. When you open Brazil vs Portugal, the screen *is* yellow and red. That single idea ties the whole product together and is the thing to protect through every decision.

---

## 2. What the app needs to do

Grouping your requirements into clear feature areas:

**Browse and discover**

- Teams and squads — browse and search every nation, see the squad, kit design, flag.
- Groups — the eight (or twelve) groups with standings.
- Fixtures — every match with date, time, location, plus a fun fact about the game or venue.
- Knockout tree — the bracket, updating as the tournament progresses.

**Match and team detail**

- Results — final score, goal timeline, man of the match, cards.
- Form — last five games per team.
- Head-to-head — historical meetings between two nations.
- Seeding and bookies' odds — seed number, title odds.
- Headline news — a snippet shown on a team page or fixture.

**Insight and storytelling**

- Tournament player stats — goals, assists, cards.
- Editorial stats — highest-scoring team, most cards, "dark horse", "defying the odds".

**Behind the scenes**

- An admin area for you to update team assets: colours, flag, kit design — without touching code.
- A colour and component system that makes per-team theming trivial to update.

---

## 3. The colour system — the heart of it

This is the most important architectural decision, so it comes first.

### The principle

Every team owns a small set of colours. Throughout your concept I can see at least three roles in play: a **primary** (Brazil's green text, Portugal's red field), a **secondary** (Brazil's yellow field), and a **tertiary** (Portugal's gold text). We define those roles once, and every component reads from the roles — never from a hard-coded colour.

In practice this means the app never says "make this green". It says "make this the *primary* colour", and the team currently in view decides what primary means. Swap the team, and the whole screen re-themes instantly.

### How it works technically (plain version)

Modern browsers support **CSS custom properties** — think of them as named colour slots you can change on the fly. We define slots like `--team-primary`, `--team-secondary`, `--team-tertiary`, plus a few neutral globals (`--white`, `--black`, `--surface`). Every component is styled against those slot names.

When a user opens a team or fixture, the app looks up that team's colours and pours them into the slots. The repaint is automatic and instant — and because it is the browser doing it, it is also free to animate, which is where your "movement through transitions" comes from.

For a fixture between two teams, we run **two themed zones** side by side (your split screen): the left zone's slots hold the home team's colours, the right zone's hold the away team's. The same components render twice, themed differently, with no duplicated code.

### Why this maps perfectly to Supabase later

Because colours live in data, not in code, the admin area becomes simple: a `teams` table with `primary`, `secondary`, `tertiary` columns. You edit a hex value in the admin form, save, and the live site re-themes. The prototype already proves this by driving everything from one team config object — the exact shape a database row will take.

### Accessibility note

Kit colours are not chosen for contrast — yellow text on white fails badly, for instance. The system needs a rule layer: for each team we either store a guaranteed-legible "on-colour" (the text colour to use on top of each kit colour), or we compute it automatically from the background's luminance. The prototype includes a helper for this so text never becomes unreadable when you swap a team in. This is a WCAG 2.1 AA concern and worth treating as a first-class part of the colour system, not an afterthought.

---

## 4. Information architecture

How the screens relate:

```
Home  ──►  Groups  ──►  Group detail (standings)
  │
  ├──►  Fixtures (list, filterable by day/group)  ──►  Match page
  │                                                      ├─ pre-match (odds, fun fact, form, H2H)
  │                                                      └─ result (score, goal timeline, MOM, cards)
  │
  ├──►  Teams (browse + search)  ──►  Team page
  │                                     ├─ squad + kit
  │                                     ├─ form (last 5), odds, seed
  │                                     ├─ news snippet
  │                                     └─ fixtures for this team
  │
  ├──►  Knockout tree  ──►  Match page
  │
  └──►  Stats hub  ──►  player leaderboards + editorial insight cards
```

The **Match page** is the convergence point — fixtures, teams, and the knockout tree all lead into it. It is also your hero screen, so it is the right place to set the visual bar.

---

## 5. Data model

The shape of the data, described as tables. This doubles as your future Supabase schema.

**teams** — the spine of the colour system

- `id`, `name`, `short_code` (BRA, POR), `flag_emoji` or `flag_url`
- `primary`, `secondary`, `tertiary` (hex), optional `on_primary` / `on_secondary` for contrast
- `kit_image_url`, `group_id`, `seed`, `title_odds`
- `fun_fact` (the "That's a fact" line)

**players**

- `id`, `team_id`, `name`, `shirt_number`, `position`

**groups**

- `id`, `label` (A–L), and a derived standings view (played, won, drawn, lost, GD, points)

**venues**

- `id`, `stadium`, `city`, `country`, `fun_fact`

**fixtures**

- `id`, `home_team_id`, `away_team_id`, `venue_id`, `group_id`
- `kickoff` (datetime, with timezone for the "21:00 UK" line), `stage` (group / R32 / R16 / QF / SF / final)
- `status` (scheduled / live / finished)
- `home_score`, `away_score`, `man_of_match_player_id`

**match_events** — drives your goal/card timeline

- `id`, `fixture_id`, `minute`, `type` (goal / own_goal / penalty / yellow / red / sub)
- `team_id`, `player_id`, `assist_player_id`

**head_to_head** — historical meetings (can be derived or stored)

**news** — `id`, `team_id` (nullable), `fixture_id` (nullable), `headline`, `url`, `published_at`

**player_stats** (a view, not a table) — aggregates goals/assists/cards from `match_events` for the tournament leaderboards.

Two things worth noting. First, **the editorial insights are mostly queries, not data** — "highest-scoring team" is a sort on aggregated goals, "most cards" a count on `match_events`. Storing the raw events well means the insights come almost for free. Second, **"dark horse" and "defying the odds" are interpretive** — they combine odds with results, and you may want to curate them manually at first, so leave room for an editorial override.

---

## 6. The component library

The reusable building blocks, named so they can be specced and reused. Each is **theme-agnostic** — it reads colour slots, never fixed colours.

Foundational:

- **ThemeZone** — wraps a region and sets the colour slots for one team. The split match page is two ThemeZones.
- **BigType** — the oversized team-code typography (BRA / POR), with responsive sizing.
- **Pill** — the rounded minute badge (87', HT) and small labels.
- **MetaRow** — the top strip (group, date, kick-off, venue) with the thin top borders.

Match-specific:

- **ScoreHeader** — flag + team code + score, mirrored left/right.
- **EventTimeline** — the vertical centre line with goal/card events branching left and right, HT marker in the middle.
- **EventItem** — one row: scorer, assist, icon, minute pill.
- **FactPanel** — the "Title odds" / "That's a fact" stacked cells with hairline dividers.

Browse and list:

- **FixtureCard** — a compact match row themed in both teams' colours (mini split).
- **GroupTable** — standings.
- **TeamCard** — for the teams grid.
- **SquadList**, **FormStrip** (W/D/L last five), **H2HStrip**, **OddsBadge**, **NewsSnippet**.

Insight:

- **StatLeaderboard** — ranked players with bars.
- **InsightCard** — editorial stat with a headline and supporting number, themed to the relevant team.
- **BracketTree** — the knockout view.

Navigation:

- **AppShell** + **BottomNav** (mobile-first tab bar) / sidebar on larger screens.

The discipline that makes this work: **a component never knows which team it is showing.** It only knows the colour slots. That is what lets one FixtureCard render 104 different matches and lets the admin area change everything from data.

---

## 7. Recommended tech stack (and why)

You chose React + Supabase, which is a strong, modern, well-documented pairing. In plain terms:

- **React** builds the interface as reusable components — exactly matching the library above. Pair it with **Vite** (a fast build tool) and **TypeScript** (catches mistakes as you type; gentle to learn).
- **Tailwind CSS** for styling. It works beautifully with CSS variables, so the theming engine slots straight in, and it keeps styles next to the markup, which is friendlier when you are reading code rather than writing it.
- **Framer Motion** for the movement — page transitions, the timeline events animating in, the big type sliding. This is what makes it feel alive rather than static.
- **Supabase** is your backend without the backend work: a Postgres database (the tables above), instant APIs, authentication for the admin login, and file storage for kit images and flags. Its admin-friendly table editor also means you can correct data directly if needed.

A realistic deployment path: the app is a static front-end that talks to Supabase, so it hosts cheaply on **Vercel** or **Netlify** with automatic deploys. A Vercel connector is available here when you reach that stage.

You do **not** need to decide on the football API yet. The plan below keeps the data layer abstract so the swap from mock data to a live feed is a single, contained change.

---

## 8. Mock data now, live API later

The smart sequence, and the reason it is low-risk:

1. **Define a data shape** (section 5) and write a small set of mock data to it — a few groups, a dozen fixtures, two or three fully detailed matches, squads for the headline teams.
2. **Build the whole UI against a `dataService`** — a single module every screen asks for data. In the prototype it returns mock data.
3. **Later, swap the inside of `dataService`** to call Supabase, and later still to sync from a football API into Supabase on a schedule. The screens never change, because they only ever talked to `dataService`.

When you do pick a feed, the usual candidates are **API-Football (api-sports.io)**, **Sportmonks**, and **Football-Data.org** (the last has a free tier good for prototyping). They differ on price, squad depth, and live-event granularity — worth a short evaluation against the data model above when the time comes, since your goal/assist timeline needs match-event detail that not every cheap tier provides.

---

## 9. The admin area

A simple authenticated section, gated by Supabase auth, with forms over the tables:

- **Teams** — edit name, colours (with a live preview swatch and an automatic contrast warning), upload flag and kit image, set seed, odds, and the fun fact.
- **Fixtures** — set venue, kick-off, and after the match the score, MOM, and timeline events.
- **News** — paste a headline and link, attach it to a team or fixture.
- **Insights** — optionally hand-curate the "dark horse" / "defying the odds" cards.

Because the public site reads the same tables, every save is reflected live. The single most valuable admin screen is **team colours**, since it powers the whole visual identity — so it deserves the most polish (live preview, contrast check, the ability to see a sample match page update as you edit).

---

## 10. Phased roadmap

A sequence that always leaves you with something usable.

**Phase 0 — Prototype (this session).** Clickable front-end of the four screen types, driven by mock data and the CSS-variable theming engine. Proves the look, the feel, and the per-team theming idea.

**Phase 1 — Foundation.** Stand up the real React + Vite + Tailwind project, port the prototype components in cleanly, set up `dataService` with mock data, wire up navigation and the mobile shell.

**Phase 2 — Backend.** Create the Supabase project and tables, move mock data in, point `dataService` at Supabase, build the admin login and the teams/colours editor.

**Phase 3 — Full content.** Fixtures and results admin, the goal/card timeline editor, groups standings, knockout tree, news, stats and insight queries.

**Phase 4 — Live data.** Evaluate and connect a football API, set up a scheduled sync into Supabase, add a "live" match state.

**Phase 5 — Polish.** Motion pass, performance, accessibility audit (contrast across all kits, keyboard and screen-reader support), share images per match.

---

## 11. Things worth deciding early ("anything else?")

You asked what else to consider. The ones that change the build:

- **Tournament format and size.** 2026 is the first 48-team World Cup — 12 groups of four, with a new knockout structure (a round of 32). Your groups and bracket components need to handle this from the start, not the old 8-group shape.
- **Time zones.** Your concept shows "21:00 UK". With matches across North America, every kick-off needs a stored timezone and a user-facing local conversion — a small data decision with a big correctness payoff.
- **Kit assets and rights.** Real kit imagery and flags carry licensing considerations. The system should treat kit images as swappable assets (which the admin area already does), so you can start with illustrated or simplified kits and upgrade later.
- **Live vs. final state.** A match has three lives — upcoming (odds, fun fact, form, H2H), in-progress (live timeline), and finished (your result page). Designing the match page to morph across these three states, rather than as three separate screens, will pay off enormously.
- **Shareability.** A "share this result" image, themed in the kit colours, is a natural growth loop for something this visual. Worth designing the result page so it exports cleanly to a social card.
- **Offline-friendliness.** Made mobile-first and installable (a PWA), it can feel like an app on the home screen — a low-cost, high-delight addition once Phase 1 is stable.

---

*Next: a clickable prototype of the four screen types, built on this colour engine.*
