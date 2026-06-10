# WC2026 — data implementation plan

A step-by-step guide to fixing and completing the data layer using **Claude Code** and **Codex** inside **Cursor**. Written to match the existing build plan: every phase has a plain-English explanation, copy-paste-ready agent prompts, the steps **you** need to take by hand, and acceptance checks before you move on.

Read this alongside **`WC2026 — data sourcing plan.md`** — that's the *strategy* (where each piece of data comes from), this is the *execution* (how to build it, in order).

> **The golden rule, again:** commit after every working phase, and never accept code you haven't sanity-checked by running it. Each phase ends with a check you can do yourself without reading every line.

---

## How to read this plan

- **🟦 YOU** — a manual step only you can do (clicking in a dashboard, getting a key, running a command). The agents can't do these.
- **🤖 CLAUDE CODE** — a prompt to paste into Claude Code. Best for multi-file reasoning, schema/migration work, and "understand the whole repo then change it" tasks.
- **🤖 CODEX** — a prompt to paste into Codex. Best for tight, well-scoped single-file edits and quick refactors.
- **✅ CHECK** — how to confirm the phase worked before moving on.

**Which agent for what:** Claude Code leads on anything touching multiple files, the database schema, or logic that spans the syncs and the front-end. Codex is the scalpel for one-file jobs (fix this URL, rewrite this function). You can do every phase with either — these are just the assignments that play to each tool's strengths. If one agent gives you something that doesn't run, paste the error straight back to it.

---

## Part A — One-time setup for the data work

You already did the big setup (GitHub, Supabase, Vercel) in the original build plan. This part only covers the **data-specific** keys and tools you don't have yet.

### 🟦 A1. Get your API keys

You need two free API keys. Both take five minutes.

1. **BALLDONTLIE** — go to [app.balldontlie.io](https://app.balldontlie.io), create a free account, and copy your API key from the dashboard. This is the one that unlocks squads, odds and standings.
2. **API-Football** — go to [dashboard.api-football.com](https://dashboard.api-football.com), register, and copy the API key. (You may have this already — the `sync-api-football` function references a secret called `API_Football_API_Key`.)

Keep both keys somewhere safe (a password manager). You'll paste them into Supabase in A2, not into any code file.

### 🟦 A2. Store the keys as Supabase secrets

The sync functions run on Supabase's servers, so the keys live there as **secrets**, never in your repo.

1. Install the Supabase CLI if you haven't: in Cursor's terminal run `npm install -g supabase`, then `supabase login` (it opens a browser to authorise).
2. Link your project (one time): `supabase link --project-ref btzuwdoqrlsnyqtsikwp`
3. Set the secrets (paste your real keys):
   ```
   supabase secrets set BALLDONTLIE_API_KEY=your_balldontlie_key
   supabase secrets set API_Football_API_Key=your_api_football_key
   ```
4. Confirm: `supabase secrets list` — you should see both names (values are hidden).

> If the CLI gives you trouble, you can set the same secrets in the Supabase dashboard: **Project Settings → Edge Functions → Secrets**. Either route works.

### 🟦 A3. Make a safety branch

Before the agents touch anything, give yourself an undo button.

In Cursor's terminal: `git checkout -b data-layer-overhaul`

All the work below happens on this branch. If anything goes sideways, you can always `git checkout main` and you're back to safety. Merge to main only after Phase 7 passes.

✅ **CHECK:** `supabase secrets list` shows both keys, and `git branch` shows you're on `data-layer-overhaul`.

---

## Phase 1 — Fix the broken BALLDONTLIE sync (the big unlock)

**Why first:** this is the single highest-value fix. The `sync-balldontlie` function currently calls the wrong base URL (`api.balldontlie.io/v1` — that's the NBA product) instead of the FIFA World Cup API (`api.balldontlie.io/fifa/worldcup/v1/`). Every request returns nothing useful. Fix this and you immediately get squads, standings and a near-live score feed.

### 🤖 CLAUDE CODE

> The file `supabase/functions/sync-balldontlie/index.ts` is pointed at the wrong BALLDONTLIE API. It uses the NBA-style base URL `https://api.balldontlie.io/v1` and NBA-shaped endpoints (`/teams`, `/players`, `/games`, `/box_scores`). It should use the **FIFA World Cup API** at base URL `https://api.balldontlie.io/fifa/worldcup/v1/`.
>
> Please:
> 1. Fetch and read the BALLDONTLIE FIFA World Cup API documentation at https://fifa.balldontlie.io/ so you use the correct endpoint paths and response shapes (teams, players/rosters, matches, events, group_standings).
> 2. Rewrite the function to: map BALLDONTLIE teams to our FIFA-code team IDs; upsert full squads into `players` (id format `{TEAM}-{bdId}`, with shirt_number and position mapped to GK/DEF/MID/FWD); and upsert match results and events into `fixtures` and `match_events` using the real event endpoints with **real minutes** — do NOT fabricate random minutes as the current code does.
> 3. Keep the existing safeguards: never overwrite rows where `edited_by_admin = true`; respect the rate limit with pauses between requests.
> 4. Keep the same auth header style (`Authorization: <API_KEY>` from the `BALLDONTLIE_API_KEY` env var) and the same logging/response format.
>
> Before writing code, tell me the exact endpoint paths and response fields you found in the docs, so I can confirm them. Then make the change.

**What's happening:** the agent reads the real docs, confirms the endpoints with you, then rewrites the function to hit the right API and store real (not fabricated) event minutes.

### 🟦 Deploy and test it

The agent can write the code but **you** deploy and run it:

```
supabase functions deploy sync-balldontlie
curl -X POST https://btzuwdoqrlsnyqtsikwp.supabase.co/functions/v1/sync-balldontlie \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

(Get your anon key from **Supabase → Project Settings → API**.) The response is JSON with a `log` array — read it. It should report teams mapped and players upserted, not HTTP errors.

✅ **CHECK:** In Supabase → **Table Editor → players**, you see real squad rows beyond the seeded ones. The function response shows `"ok": true` and a log that mentions players upserted. If it 404s, the endpoint path is still wrong — paste the log back to Claude Code.

### 🟦 Commit

`git add -A && git commit -m "Fix sync-balldontlie to use FIFA World Cup API"`

---

## Phase 2 — Import the knockout fixtures

**Why:** `sync-openfootball` currently imports only group-stage matches (it filters out everything that isn't a group game). You're missing all 32 knockout fixtures, so the bracket is empty.

### 🤖 CODEX

> In `supabase/functions/sync-openfootball/index.ts`, the fixture loop skips every match where `stage !== 'group'` (the line `if (stage !== 'group') continue;`). I want to import **all** stages, not just group.
>
> Change it so knockout matches are imported too. The `stageForRound` function already maps round names to `r32`, `r16`, `qf`, `sf`, `final`. For knockout fixtures, `group_id` will be null and the two teams may be unresolved placeholders (e.g. "Winner Group A") in the source data — in that case, skip only that individual fixture with a warning, but do NOT skip the whole stage. Keep venue resolution and the admin-lock safeguard intact.
>
> Show me the diff before applying.

**What's happening:** Codex lifts the one filter that's blocking knockout rounds, while keeping the guard that skips individual unresolved placeholder fixtures (real knockout teams aren't known until the group stage finishes).

### 🟦 Deploy and test

```
supabase functions deploy sync-openfootball
curl -X POST https://btzuwdoqrlsnyqtsikwp.supabase.co/functions/v1/sync-openfootball \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

✅ **CHECK:** Supabase → **Table Editor → fixtures**, filter `stage` to `r32`/`r16`/`final` etc. — you should now see knockout rows (even if some teams are placeholders for now). Group fixtures are still there.

### 🟦 Commit

`git commit -am "Import knockout fixtures from openfootball"`

---

## Phase 3 — Add data provenance (source + updated_at)

**Why:** when two feeds disagree or one goes thin, you need to know which source wrote each row and when. This is a small schema change that pays off every time you debug or want to show "live vs official" confidence in the UI.

### 🤖 CLAUDE CODE

> Create a new migration `migrations/007_provenance.sql` that adds two columns to `fixtures`, `players` and `match_events`:
> - `source TEXT` (e.g. 'openfootball', 'balldontlie', 'api-football', 'admin')
> - `updated_at TIMESTAMPTZ DEFAULT now()`
>
> Then update all three sync functions (`sync-openfootball`, `sync-balldontlie`, `sync-api-football`) so every upsert sets `source` to that function's source name and `updated_at` to now(). Don't break the existing `edited_by_admin` logic. Keep the migration idempotent (`ADD COLUMN IF NOT EXISTS`).
>
> Show me the migration file and a summary of the changes to each function before applying.

### 🟦 Apply the migration

The agent writes the SQL; **you** run it against the database. Easiest route: Supabase → **SQL Editor** → paste the contents of `007_provenance.sql` → **Run**. Then redeploy the three functions:

```
supabase functions deploy sync-openfootball
supabase functions deploy sync-balldontlie
supabase functions deploy sync-api-football
```

✅ **CHECK:** Supabase → **Table Editor → fixtures** now shows `source` and `updated_at` columns. After re-running a sync, rows have a source name filled in.

### 🟦 Commit

`git commit -am "Add source + updated_at provenance columns"`

---

## Phase 4 — Register and schedule sync-api-football

**Why:** I noticed `supabase/config.toml` declares `sync-openfootball` and `sync-balldontlie` but **not** `sync-api-football`. It also has no cron schedules. Right now your syncs only run when you poke them by hand. This phase makes them run automatically and stay within the 100-requests/day budget.

### 🤖 CLAUDE CODE

> Two things in the Supabase config:
> 1. `supabase/config.toml` is missing a declaration for the `sync-api-football` function. Add it with `verify_jwt = false`, matching the style of the other two function blocks.
> 2. Create a migration `migrations/008_cron.sql` that uses `pg_cron` (and `pg_net` for HTTP) to schedule the three functions:
>    - `sync-openfootball` every hour (`0 * * * *`)
>    - `sync-balldontlie` hourly, offset (`30 * * * *`)
>    - `sync-api-football` every 6 hours (`0 */6 * * *`) — it has a 100 req/day cap, so it must not run more often.
>
> Use `cron.schedule(...)` calling each function's URL via `net.http_post`, with the service role key in the Authorization header read from a Vault secret (don't hardcode the key in the migration). Show me the SQL and explain exactly what I need to set up in the Supabase Vault first, before I run it.

**What's happening:** the agent registers the missing function and writes the cron schedule. It will tell you what to put in the Supabase Vault (the service-role key) so the cron jobs can authenticate without the key sitting in your repo.

### 🟦 Set up the Vault secret, then apply

Follow the agent's instructions to add the service-role key to **Supabase → Project Settings → Vault**, then run `008_cron.sql` in the **SQL Editor**.

✅ **CHECK:** Supabase → **Database → Cron Jobs** (or run `select * from cron.job;` in the SQL Editor) — you see three scheduled jobs. Wait an hour (or trigger manually) and confirm `updated_at` timestamps on rows are moving.

### 🟦 Commit

`git commit -am "Schedule syncs via pg_cron, register sync-api-football"`

---

## Phase 5 — Wire up title odds

**Why:** `title_odds` is currently hardcoded to `'TBD'` for synced teams. This phase pulls real odds from BALLDONTLIE, falling back to your admin-set values so a team always shows *something* sensible.

### 🤖 CLAUDE CODE

> Extend `supabase/functions/sync-balldontlie/index.ts` to also fetch **outright/title-winner odds** from the BALLDONTLIE FIFA odds endpoint and write them to the `teams.title_odds` column (keep the existing fractional/string format the app expects, e.g. "9/2").
>
> Rules:
> - Read the odds endpoint shape from the docs at https://fifa.balldontlie.io/ first and confirm the path with me.
> - Never overwrite a team where `edited_by_admin = true` — those are my manual values and they win.
> - If the odds endpoint returns nothing for a team, leave the existing value untouched (don't blank it to 'TBD').
> - Set `source = 'balldontlie'` and `updated_at = now()` on updated rows.
>
> Confirm the endpoint with me, then implement.

### 🟦 Deploy, run, spot-check

```
supabase functions deploy sync-balldontlie
curl -X POST https://btzuwdoqrlsnyqtsikwp.supabase.co/functions/v1/sync-balldontlie \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

✅ **CHECK:** Supabase → **Table Editor → teams** → the `title_odds` column shows real odds for top teams instead of 'TBD'. Any team you've manually locked still shows your value.

### 🟦 Commit

`git commit -am "Sync title odds from BALLDONTLIE with admin override"`

---

## Phase 6 — Make the insights page data-driven

**Why:** the insights page currently computes some cards on the fly and uses placeholder seeds/odds for "dark horse" and "defying the odds". Now that real data flows, each insight should trace back to a real database view, with editorial/admin overrides layered on top.

### 🤖 CLAUDE CODE

> Look at `src/screens/Insights.tsx` and the two database views `standings` and `player_stats` (defined in `migrations/001_schema.sql`). I want every insight card to derive from real data, with the `insights` table and admin values as overrides.
>
> Specifically:
> - **Highest scoring / meanest defence** → derive from the `standings` view (goals_for / goals_against).
> - **Golden Boot, most assists, most-booked** → derive from the `player_stats` view.
> - **Dark horse / defying the odds** → compare a team's live `points` from `standings` against its `seed` and `title_odds`.
> - Where an editorial row exists in the `insights` table for a given `kind`, it overrides the auto-generated card (this layering already partly exists — keep and extend it).
> - If real data isn't available yet (early in the tournament), fall back gracefully to the admin/seed value so every card still renders.
>
> Don't change the visual design or the card components — only change where the data comes from. Walk me through the data flow before editing, then make the change.

### 🟦 Run the app and look at it

```
npm run dev
```

Open the local URL, go to the Insights page. Cards should reflect real standings/stats (or sensible fallbacks if no matches have finished yet).

✅ **CHECK:** Every insight card shows a value that you can trace to a table or view — no obviously hardcoded placeholders. Locked editorial insights still appear.

### 🟦 Commit

`git commit -am "Make insights page derive from standings/player_stats views"`

---

## Phase 7 — Tune live polling and verify end-to-end

**Why:** the final piece is "as live as possible" without blowing the 100-req/day API-Football budget. API-Football should poll **only while matches are live**; BALLDONTLIE handles cheaper score refreshes.

### 🤖 CLAUDE CODE

> Review the live-update strategy across `sync-api-football` and `sync-balldontlie`. I want API-Football's expensive event polling to happen **only when there is at least one fixture with `status = 'live'`**, and to spend its request budget on those live fixtures' events first. When nothing is live, it should do near-zero work (just the cheap status check). BALLDONTLIE should carry the routine score/standings refresh.
>
> Make sure the combined behaviour stays under 100 API-Football requests per day across the 6-hourly schedule even on a busy match day (multiple simultaneous matches). Explain the budget maths to me, then implement any changes.

### 🟦 Final end-to-end verification (do this carefully)

This is the phase where you confirm the whole thing holds together. Go through each:

1. **Teams:** `select count(*) from teams;` → should be 48.
2. **Fixtures:** `select stage, count(*) from fixtures group by stage;` → group + all knockout stages present (~104 total).
3. **Squads:** `select team_id, count(*) from players group by team_id;` → every team has a squad (real or seeded).
4. **Events flow:** after a finished match, `select * from match_events where fixture_id = '...';` → real minutes, scorers, assists, cards.
5. **Provenance:** `select source, count(*) from fixtures group by source;` → rows attributed to real sources.
6. **Cron:** `select jobname, schedule from cron.job;` → three jobs.
7. **App:** `npm run build` then `npm run preview` → the standings, matches and insights pages all populate from Supabase (set `VITE_DATA_SOURCE=supabase` in `.env.local` to force real data and confirm it's not falling back to mocks).

### 🟦 Merge to main and deploy

Once all seven checks pass:

```
git checkout main
git merge data-layer-overhaul
git push
```

Vercel auto-deploys from main. Open the live URL and confirm the same data shows in production.

✅ **CHECK:** Production site shows real teams, fixtures and insights, pulling live from Supabase.

---

## Optional Phase 8 — Have an agent verify the agents

**Why:** before you trust this on match day, get a fresh agent to audit the work with no prior context — it catches things the implementing agent rationalised past.

### 🤖 CLAUDE CODE

> Act as a reviewer with no prior context. Audit the three sync functions and the migrations for: (1) any remaining wrong API endpoints or response-shape mismatches; (2) places a sync could overwrite an admin-locked row; (3) the API-Football daily request budget actually staying under 100 on a busy match day; (4) any column written by a sync that doesn't exist in the schema; (5) error handling that would leave a half-synced match. Give me a findings list ranked by severity. Don't fix anything yet — just report.

Then fix the findings one at a time, re-running the Phase 7 checks after each.

---

## Quick reference — the whole plan at a glance

| Phase | What | Lead agent | Your manual steps |
|---|---|---|---|
| A | Keys, secrets, safety branch | — | Get 2 API keys, set Supabase secrets, branch |
| 1 | Fix BALLDONTLIE base URL | Claude Code | Deploy + test function, commit |
| 2 | Import knockout fixtures | Codex | Deploy + test, commit |
| 3 | Add source + updated_at | Claude Code | Run migration, redeploy, commit |
| 4 | Schedule syncs via cron | Claude Code | Set Vault secret, run migration, commit |
| 5 | Sync title odds | Claude Code | Deploy + spot-check, commit |
| 6 | Data-driven insights | Claude Code | Run app, eyeball, commit |
| 7 | Live polling + full verify | Claude Code | 7-point check, merge, deploy |
| 8 | Independent audit (optional) | Claude Code | Triage + fix findings |

**Realistic effort:** Phases 1–2 in an afternoon get you complete teams/fixtures/squads. Phases 3–7 over a couple of focused sessions get you the full live, story-driven experience. Phase 8 is an hour of insurance before the tournament starts.

> **One thing to remember throughout:** don't finalise real squads or seeds until **after the December 2025 draw** — until then the team list is a placeholder. The seed file keeps the app populated in the meantime, and the admin override lets you correct anything by hand.
