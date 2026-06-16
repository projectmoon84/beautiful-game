# Insights screen — implementation notes for Codex

Visual spec: `insights-screen-spec.html` (open in a browser; it is the source of truth for layout, colours and type).
Target file: `src/screens/Insights.tsx` (replace the existing leaderboard/storyline body — keep the routing and `dataService` wiring).

This screen replaces the card-grid leaderboards with **full-bleed, proportional team-colour rows**, frames each live race with the **all-time record**, and adds a **diverging Messi-v-Ronaldo block**. Everything below maps the static HTML to live data.

---

## 1. Design tokens (already in the app — do not re-declare)
- Paper surface: `var(--surface)` = `#F5F1E4` (spec uses `--paper`, same value).
- Black: `#000` for the pulse strip + active sub-tab.
- Section heading: 24px, `font-weight:700`, `text-transform:uppercase`, `line-height:1`.
- Row height: 76px (leaderboards), 60px (rivalry). Horizontal padding: 16px (14px rivalry).
- Font: Instrument Sans (already loaded globally).

## 2. Team colours — pull from the `Team` record, never hardcode
For each row, look up the team via `dataService.team(stat.teamId)` and use:
- `team.primaryHex`  → row background
- text colour → `readableOn(team.primaryHex)` from `src/theme/contrast.ts` (already used by InsightCard). This auto-handles white/yellow rows (e.g. Brazil yellow → green text, England white → navy-ish).
  - NOTE: spec hardcodes Brazil row as `#F5C800` bg + `#009739` text and uses `secondary/tertiary` for some on-colour text. If you want the exact spec look, prefer `team.secondaryHex` for text where `readableOn` returns plain black/white but the team has a stronger brand secondary. Simplest correct path: `readableOn(team.primaryHex)`.

## 3. Proportional row width — the core mechanic
Each leaderboard is the **top 4** for that metric (matches current `slice`, was 5 — spec shows 4; use 4).
```
const leaderValue = rows[0].value;            // largest in this metric
const widthPct = (row.value / leaderValue) * 100;   // STRICTLY proportional (user chose this)
// row style: width: `${widthPct}%`
```
- Leader is always 100% (full bleed). No minimum floor — user chose strict proportional.
- Rows are left-aligned to the screen edge; the right edge is ragged. This is intentional.
- Round nothing here (values are integers).

## 4. All-time record header (above each leaderboard)
Static reference data — add a constants file `src/data/wcRecords.ts` (see §7). Render above the rows:
```
🇫🇷 Just Fontaine   1958              13
All-time record · the bar to beat
```
- name 15px/500, year 14px italic opacity .4, value 15px/700 right-aligned.
- For Goals+Assists, show TWO record lines (Fontaine 13 + Pelé 10) and the "pre-assist records" italic note on Fontaine.

## 5. Goals + Assists split rows
Each row = two butted segments with a 2px gap:
- solid segment: `team.primaryHex`, width ∝ goals
- faded segment: same hex at `0.55` opacity, width ∝ assists
- whole-row outer width ∝ `(goals+assists) / leaderTotal` (so the row shrinks for lower-ranked players)
```
outerWidthPct = (g+a) / leaderTotal * 100
goalsFlex   = g / (g+a)      // flex-grow within the row
assistsFlex = a / (g+a)
```
Player name + goals number sit in the solid segment; assists number right-aligned in the faded segment.

## 6. White / very-light team rows
England (`#FFFFFF`) and the faded white assist segment nearly vanish on paper. Add a hairline:
`box-shadow: inset 0 0 0 1px rgba(0,0,0,.10)` (class `.hair` in spec) whenever
`contrastRatio(team.primaryHex, '#F5F1E4') < 1.3` (use existing `contrastRatio`). Apply to both segments of a split row.

## 7. Records constants — new file `src/data/wcRecords.ts`
These are static all-time records (verified June 2026; see `world-cup-insights-data.xlsx`). Suggested shape:
```ts
export interface WCRecord { player: string; flag: string; year: number; value: number; note?: string; }
export const SINGLE_TOURNAMENT_RECORDS = {
  goals:       { player: 'Just Fontaine', flag: '🇫🇷', year: 1958, value: 13 } as WCRecord,
  assists:     { player: 'Pelé',          flag: '🇧🇷', year: 1970, value: 6  } as WCRecord,  // since 1966
  involvement: [
    { player: 'Just Fontaine', flag: '🇫🇷', year: 1958, value: 13, note: 'pre-assist records' },
    { player: 'Pelé',          flag: '🇧🇷', year: 1970, value: 10 },
  ] as WCRecord[],
};
```
(If you later add a clean-sheets race: Barthez, 1998, 5.)

## 8. Messi v Ronaldo — diverging block
Static head-to-head (WC only, through Qatar 2022). Hardcode in `wcRecords.ts` as a list of metric rows:
```ts
export const MESSI_RONALDO = {
  left:  { name: 'Messi',   flag: '🇦🇷', hex: '#8AC5EA' },   // Argentina sky
  right: { name: 'Ronaldo', flag: '🇵🇹', hex: '#AC192D' },   // Portugal red
  rows: [
    { label: 'World Cups',         l: 5,  r: 5  },
    { label: 'Matches',            l: 26, r: 22 },
    { label: 'Goals',              l: 13, r: 8  },
    { label: 'Assists',            l: 8,  r: 2  },   // since 1966
    { label: 'Goal involvement',   l: 21, r: 10 },
    { label: 'Player of the Match',l: 10, r: 1  },
  ],
};
```
Render each row as: centre line; left (blue) bar grows leftward, right (red) grows rightward.
**Scale per row** (user's choice): `leftPct = l / max(l,r) * 100`, `rightPct = r / max(l,r) * 100`. The winner of each metric hits 100%. Cream chip (`background: var(--surface)`) absolutely-centred over the seam carries the label.

## 9. Pulse strip (top) & sub-tabs
- Pulse cells: Matches / Goals / Cards counts from played 2026 matches (`dataService.playerStats()` totals + match count). Cards cell shows red+yellow with the small rounded rects (`#D20101` red, `#FFDF00` yellow).
- Sub-tab bar "Stats | Insights" — this is the existing in-page toggle; Insights active = black fill. Wire to whatever sub-tab state Stats/Insights already uses (see `SubTabs.tsx`).

## 10. Empty / early-tournament state
On day 1 most live values are 0–2, so rows are short and several tie. That's acceptable and honest. If a metric has zero events, show the all-time record header alone with a muted "No goals yet" row (reuse existing empty-state copy).

---

### Build order suggestion
1. Add `wcRecords.ts`.
2. Build a `ProportionalRow` + `RecordHeader` + `LeaderboardSection` component trio; render Goals/Assists with them.
3. Build `SplitRow` for Goals+Assists.
4. Build `DivergingRow` + `RivalryBlock`.
5. Swap into `Insights.tsx`, keep the pulse strip and navigation intact.
