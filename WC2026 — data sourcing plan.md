# WC2026 — data sourcing plan

**Question on the table:** can we *definitely* obtain reliable data for every part of the app, or are we building on sand?

**Short answer:** yes, with the right layering. No single free source covers everything well, but a three-tier stack closes every gap. One of your three existing sync functions is also pointed at the wrong URL, which is probably why the data feels thin. This document sets out exactly where each piece of data comes from, what's guaranteed vs. best-effort, and how it should be stored so the insights page can tell stories.

---

## What you have today

Three Supabase edge functions already exist, plus a clean schema. Here's the honest state of each.

### sync-openfootball — solid, keep as the backbone

Pulls from the openfootball public-domain dataset on GitHub (no API key). I verified the live file: it currently contains **all 48 teams across 12 groups (A–L)**, with FIFA codes, confederations and flags, plus stadiums and the full group-stage schedule. This is your most reliable source because it has no rate limit, no key, and no commercial dependency.

Two caveats:

- It currently only imports **group-stage** fixtures (the function filters out knockout rounds). The knockout bracket needs adding.
- The team list reflects a *placeholder draw*. The real draw happens in December 2025, so some teams shown now (e.g. Haiti, Curaçao) are sample fillers. openfootball updates within a day of the real draw, so this self-corrects — but it means **do not hand-curate squads against today's team list**.

### sync-api-football — good for live events, watch the budget

Pulls from API-Football (api-football.com), `league=1, season=2026`. I confirmed this is the correct league/season and that the free tier (100 requests/day) covers fixtures, live scores, events, line-ups, player stats and pre-match odds. The function is well-written and already throttles itself to stay under 100/day.

This is your best source for **live, minute-by-minute match events** (goals, assists, cards with real timestamps). The 100/day cap is the real constraint — manageable during the group stage, tight on a heavy match day. Plan around it (see budget below).

### sync-balldontlie — **broken: wrong base URL**

This is almost certainly the source of your "not enough data" feeling. The function calls:

```
https://api.balldontlie.io/v1/teams        ← NBA-style endpoint, no World Cup data
```

The actual BALLDONTLIE **FIFA** World Cup API lives at a different path:

```
https://api.balldontlie.io/fifa/worldcup/v1/...
```

So every request this function makes is hitting the wrong product and silently returning nothing useful. Once repointed, this becomes a genuinely strong source — it has dedicated endpoints for matches, **events**, group standings, squads, per-match player stats, shot maps and **betting odds** (including title/outright and player props), and it updates matches in real time. It also has a more generous rate limit than API-Football.

**This is the single highest-value fix in this whole document.**

---

## The data requirements, mapped to guaranteed sources

For each requirement: a **primary** source (what we lead with) and a **fallback** (what we drop to if the primary is down or thin). Every row has at least one key-free or reliable option, so nothing is left to chance.

### 1. All 48 teams and their squads

| | Source | Guarantee |
|---|---|---|
| **Teams (48) + groups** | openfootball | **Guaranteed.** Key-free, already working, verified complete. |
| **Squads — primary** | BALLDONTLIE FIFA `/players` (once repointed) | Strong once fixed. Full rosters with shirt numbers + positions. |
| **Squads — fallback** | API-Football `/players/squads` | Reliable but costs request budget; fetch once per team, then stop. |
| **Squads — safety net** | The hand-seeded `006_squads.sql` you already have | Always present so the app never shows an empty squad. |

**Verdict: guaranteed.** Teams are rock-solid. Squads have three independent sources, so a real squad will always be available; the seed file guarantees the app is never blank in the meantime. The only rule: don't finalise squads until after the December 2025 draw.

### 2. All World Cup fixtures

| | Source | Guarantee |
|---|---|---|
| **Group stage (72 matches)** | openfootball | **Guaranteed**, already imported. |
| **Knockouts (32 matches)** | openfootball (needs the function's stage filter removed) | Guaranteed once the one-line filter is lifted. |
| **Fallback** | API-Football `/fixtures?league=1&season=2026` (all 104) | Full schedule on the free tier. |

**Verdict: guaranteed.** The only work is letting the existing function import knockout rounds, not just group games.

### 3. Seed and title odds

This is the **weakest spot today** — both are hardcoded `'TBD'`/seed-by-index in the sync, and the real seeding/odds aren't set.

| | Source | Guarantee |
|---|---|---|
| **Seeds (FIFA pots)** | Set at the December 2025 draw; openfootball reflects them after | Available post-draw; until then, your editorial seed values stand in. |
| **Title odds — primary** | BALLDONTLIE FIFA `/odds` (outright/title market) | Best-effort: good coverage, updates through the tournament. |
| **Title odds — fallback** | API-Football odds endpoint | Available but request-budget-heavy. |
| **Title odds — safety net** | Admin override (you already have `edited_by_admin`) | **Guaranteed.** You can always type them in and lock them. |

**Verdict: best-effort with a guaranteed safety net.** Live odds are the one thing no free API promises perfectly, but your admin-override system means you're never blocked — worst case, you set them by hand and they're locked from being overwritten.

### 4. Tournament data: results, scorers, assists, cards

| | Source | Guarantee |
|---|---|---|
| **Results (scores)** | openfootball (daily) → API-Football / BALLDONTLIE (faster) | **Guaranteed.** openfootball alone covers this within a day. |
| **Goal scorers** | API-Football events (primary) / BALLDONTLIE | Strong. |
| **Assists** | API-Football events (has assist field) | Good — API-Football is better than BALLDONTLIE here, which historically gives assists as aggregate stats, not linked events. |
| **Cards** | API-Football / BALLDONTLIE | Strong. |

**Verdict: guaranteed for results, strong for the rest.** Note: the *current* balldontlie function fabricates random minutes for events because box-score stats lack timestamps — once you lead with API-Football events for the detail and use BALLDONTLIE as backup, you get real minutes and proper assist links.

### 5. Match data: live goal / assist / card events

| | Source | Guarantee |
|---|---|---|
| **Live events — primary** | API-Football events, polled during live windows | Real timestamps; the 100/day cap means poll *only* during live matches. |
| **Live events — secondary** | BALLDONTLIE FIFA matches/events (real-time updates) | Repointed, this gives near-live scores with a friendlier rate limit. |
| **"As live as possible"** | Poll every 1–2 min only while `status = 'live'` | Realistic target: ~1–2 min latency, not true real-time. |

**Verdict: achievable, with honest expectations.** "As live as possible" on free tiers means a 1–2 minute delay, not instant. Combining the two APIs (BALLDONTLIE for the cheap score refresh, API-Football for the detailed event timeline) gets you there without blowing the budget.

---

## The recommended stack (in one picture)

```
TIER 1 — SPINE (key-free, always on)
  openfootball  →  48 teams, 12 groups, venues, ALL 104 fixtures, daily results
  Runs hourly. The app is fully functional on this alone.

TIER 2 — DETAIL (repointed BALLDONTLIE FIFA API)
  →  full squads, group standings, title/outright odds, per-match stats, near-live scores
  More generous rate limit; carries the bulk of the "rich" data.

TIER 3 — LIVE PRECISION (API-Football, 100 req/day)
  →  minute-accurate goal/assist/card events during live matches only
  Spent carefully: squads once, then events only while matches are live.

ALWAYS — ADMIN OVERRIDE (edited_by_admin)
  Any field can be hand-set and locked. No sync ever overwrites a locked row.
  This is your guarantee that the app is never wrong or blank on the day.
```

Why this order: Tier 1 means the app works even if every paid API dies. Tier 2 does the heavy lifting for free. Tier 3 is rationed for the one thing only it does well (precise live timing). The override is the human backstop.

---

## Storage — so the data is useful *and* tells stories

Your schema is already well-designed for this. Three things make the difference between "data sitting in tables" and "data that powers an insights page".

### Keep the source-agnostic event model

`match_events` (one row per goal/assist/card with minute, team, player) is the right shape. Every source normalises *into* this one table, so the app and insights never care which API a fact came from. Keep it. The two derived views — `standings` and `player_stats` — already turn raw events into leaderboards automatically. That's exactly the pattern: **store atomic events, derive everything else in views.**

### Add a provenance column (small change, big payoff)

Add `source TEXT` and `updated_at TIMESTAMPTZ` to `fixtures`, `players` and `match_events`. This lets you:

- show "live" vs "official" confidence in the UI,
- debug which feed is thin without guessing,
- prefer the better source when two disagree (e.g. API-Football minute beats a fabricated one).

### Make the insights page data-driven, not hardcoded

Right now the insights page computes "highest scoring / most cards / dark horse" on the fly from scores, and seeds/odds are placeholders. To bring data *into stories*, feed it from real signals:

- **Highest scoring / meanest defence** → already derivable from the `standings` view. Real.
- **Golden Boot race** → straight off the `player_stats` view (goals). Real once events flow.
- **Most assists / most-booked** → same view. Real.
- **Dark horse / defying the odds** → compare a team's live `points` (standings) against its pre-tournament `seed` and `title_odds`. This needs real seeds/odds — which is why getting Tier 2 odds (or admin-setting them) matters: it's what turns "dark horse" from a guess into a genuine story.
- **Editorial insights** → the `insights` table you already have lets you publish hand-written angles alongside the auto-generated ones. Keep it.

The principle: **every insight card should trace back to a row or a view, not a hardcoded value.** Where live data isn't available yet, the admin-set value fills in and the card still renders.

---

## What I'd do next, in order

1. **Fix the BALLDONTLIE base URL** (`/v1` → `/fifa/worldcup/v1`) and re-map its endpoints. Biggest single data unlock, and it's the source of the "not enough data" feeling. *(~half a day)*
2. **Let openfootball import knockout fixtures**, not just group stage. One filter to lift. Gets you all 104 matches. *(~1 hour)*
3. **Add `source` + `updated_at` columns** and write each sync's name into them. *(~1 hour, one migration)*
4. **Wire title odds**: pull from BALLDONTLIE odds; fall back to admin-set values. Replaces the `'TBD'` placeholders. *(~half a day)*
5. **Make insights read from the views**, with admin/editorial overrides layered on top. *(~half a day)*
6. **Tune the live-polling budget**: API-Football only while `status = 'live'`; BALLDONTLIE for cheap score refreshes. *(~half a day)*

After step 1 and 2, the app has genuinely complete, reliable data for teams, fixtures and results. Steps 3–6 turn that into the rich, story-driven experience the insights page is designed for.

---

## The one honest limitation

Free tiers cannot promise **true real-time** (sub-10-second) live events, and **live betting odds** are the least reliable free data of all. Both are covered to a *good* standard by the stack above (1–2 min latency; odds via two APIs plus admin override), but if true real-time or guaranteed odds ever become a hard requirement, that's the point where a paid tier (Sportmonks or API-Football's paid plan) earns its cost. Everything else — all 48 teams, all squads, all 104 fixtures, all results, scorers, assists and cards — is obtainable reliably for free with what's above.

---

*Sources: [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) · [BALLDONTLIE FIFA World Cup API](https://fifa.balldontlie.io/) · [API-Football WC2026 guide](https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports) · [API-Football pricing](https://www.api-football.com/pricing)*
