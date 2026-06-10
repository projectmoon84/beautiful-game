/**
 * sync-api-football
 *
 * Syncs squads and match events from API-Football (api-football.com).
 * Uses API_Football_API_Key secret.
 *
 * BUDGET: 100 requests/day hard limit on the free plan.
 * Strategy: run 4× per day (every 6 hours). Per run:
 *   - 1 req  → GET /teams   (build AF team-ID → FIFA-code map)
 *   - 1 req  → GET /fixtures (build AF fixture-ID map + see what's finished)
 *   - N reqs → GET /fixtures/events per finished fixture that has no events yet
 *   - M reqs → GET /players/squads per team that still needs its squad (one-time only)
 *   Min 2 reqs / Max ~25 reqs per run. 4 runs = max ~100/day.
 *
 * Rows with edited_by_admin = true are never overwritten.
 *
 * Deploy:   supabase functions deploy sync-api-football
 * Cron:     0 *\/6 * * *  (every 6 hours — set in Supabase SQL Editor via cron.schedule)
 * Manual:   curl -X POST $SUPABASE_URL/functions/v1/sync-api-football \
 *             -H "Authorization: Bearer $SUPABASE_ANON_KEY"
 */

import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const API_BASE   = 'https://v3.football.api-sports.io';
const API_KEY    = Deno.env.get('API_Football_API_Key') ?? '';
const LEAGUE_ID  = 1;    // FIFA World Cup
const SEASON     = 2026;
const MAX_EVENTS = 20;   // hard cap on event-fetch requests per run

// API-Football position → our position
const POSITION_MAP: Record<string, string> = {
  Goalkeeper:  'GK',  G:   'GK',
  Defender:    'DEF', D:   'DEF',
  Midfielder:  'MID', M:   'MID',
  Attacker:    'FWD', F:   'FWD',
  Forward:     'FWD',
};

// API-Football event type → our event type
function mapEventType(
  type: string,
  detail: string,
): string | null {
  if (type === 'Goal') {
    if (detail.toLowerCase().includes('own'))     return 'own_goal';
    if (detail.toLowerCase().includes('penalty')) return 'penalty';
    return 'goal';
  }
  if (type === 'Card') {
    if (detail.toLowerCase().includes('yellow')) return 'yellow';
    if (detail.toLowerCase().includes('red'))    return 'red';
    return null;
  }
  if (type === 'subst') return 'sub';
  return null;
}

function mapFixtureStatus(short: string): 'scheduled' | 'live' | 'finished' {
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(short)) return 'live';
  if (['FT', 'AET', 'PEN'].includes(short)) return 'finished';
  return 'scheduled';
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API-Football HTTP ${res.status} for ${path}`);
  return (await res.json()) as T;
}

interface AFTeamResponse {
  response: Array<{ team: { id: number; name: string; code: string } }>;
}

interface AFFixtureResponse {
  response: Array<{
    fixture: { id: number; date: string; status: { short: string; elapsed: number | null } };
    teams: {
      home: { id: number };
      away: { id: number };
    };
    goals: { home: number | null; away: number | null };
  }>;
}

interface AFEventsResponse {
  response: Array<{
    time:   { elapsed: number };
    team:   { id: number };
    player: { id: number; name: string };
    assist: { id: number | null; name: string | null };
    type:   string;
    detail: string;
  }>;
}

interface AFSquadResponse {
  response: Array<{
    team: { id: number };
    players: Array<{
      id: number; name: string; number: number; pos: string;
    }>;
  }>;
}

Deno.serve(async () => {
  const log: string[] = [];
  let reqCount = 0;

  if (!API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'API_Football_API_Key secret not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    // ── 1. Fetch teams → build AF-ID → FIFA-code map ───────────────────
    log.push('Fetching teams from API-Football…');
    const teamsData = await apiFetch<AFTeamResponse>(`/teams?league=${LEAGUE_ID}&season=${SEASON}`);
    reqCount++;
    log.push(`API req ${reqCount}: /teams → ${teamsData.response.length} teams`);

    const afTeamToOurs = new Map<number, string>(); // AF team ID → our FIFA code
    for (const item of teamsData.response) {
      // API-Football `code` field is typically the 3-letter FIFA code
      const code = item.team.code?.toUpperCase();
      if (code) afTeamToOurs.set(item.team.id, code);
    }

    // ── 2. Fetch fixtures → build match map + find finished ones ────────
    log.push('Fetching fixtures from API-Football…');
    const fixturesData = await apiFetch<AFFixtureResponse>(
      `/fixtures?league=${LEAGUE_ID}&season=${SEASON}`,
    );
    reqCount++;
    log.push(`API req ${reqCount}: /fixtures → ${fixturesData.response.length} fixtures`);

    // Map "HOME_AWAY" → AF fixture ID (for matching to our DB)
    const afFixtureIndex = new Map<string, number>();
    // Map AF fixture ID → status/result (for updating our DB)
    const afFixtureState = new Map<number, {
      status: 'scheduled' | 'live' | 'finished';
      minute: number | null;
      home_score: number | null;
      away_score: number | null;
    }>();

    for (const item of fixturesData.response) {
      const homeCode = afTeamToOurs.get(item.teams.home.id);
      const awayCode = afTeamToOurs.get(item.teams.away.id);
      if (!homeCode || !awayCode) continue;
      afFixtureIndex.set(`${homeCode}_${awayCode}`, item.fixture.id);
      afFixtureState.set(item.fixture.id, {
        status: mapFixtureStatus(item.fixture.status.short),
        minute: item.fixture.status.elapsed,
        home_score: item.goals.home,
        away_score: item.goals.away,
      });
    }

    // ── 3. Load our DB fixtures ────────────────────────────────────────
    const { data: dbFixtures, error: fxErr } = await supabaseAdmin
      .from('fixtures')
      .select('id, home_team_id, away_team_id, status, edited_by_admin');
    if (fxErr) throw fxErr;

    // Build reverse map: "HOME_AWAY" → our fixture row
    const ourFixtureIndex = new Map<string, typeof dbFixtures[0]>();
    for (const f of (dbFixtures ?? [])) {
      ourFixtureIndex.set(`${f.home_team_id}_${f.away_team_id}`, f);
    }

    // Update live/finished fixtures from the feed. Admin-locked rows always win.
    const fixtureUpdates: Array<{
      id: string;
      status: string;
      minute: number | null;
      home_score: number | null;
      away_score: number | null;
    }> = [];
    for (const [key, afId] of afFixtureIndex) {
      const state = afFixtureState.get(afId);
      if (!state) continue;
      const dbFix = ourFixtureIndex.get(key);
      if (!dbFix || dbFix.edited_by_admin) continue;
      fixtureUpdates.push({
        id: dbFix.id,
        status: state.status,
        minute: state.status === 'live' ? state.minute : null,
        home_score: state.home_score,
        away_score: state.away_score,
      });
    }
    if (fixtureUpdates.length > 0) {
      await supabaseAdmin.from('fixtures').upsert(fixtureUpdates, { onConflict: 'id' });
      log.push(`Updated ${fixtureUpdates.length} fixture statuses/scores`);
    }

    // ── 4. Find finished fixtures that need events ─────────────────────
    const { data: allEvents } = await supabaseAdmin
      .from('match_events')
      .select('fixture_id');
    const fixturesWithEvents = new Set((allEvents ?? []).map((e: { fixture_id: string }) => e.fixture_id));

    const { data: finishedFixtures } = await supabaseAdmin
      .from('fixtures')
      .select('id, home_team_id, away_team_id')
      .eq('status', 'finished')
      .eq('edited_by_admin', false);

    const needEvents = (finishedFixtures ?? []).filter(f => !fixturesWithEvents.has(f.id));
    log.push(`Finished fixtures needing events: ${needEvents.length}`);

    // ── 5. Fetch events for each, up to MAX_EVENTS requests ─────────────
    let eventsInserted = 0;
    for (const fixture of needEvents.slice(0, MAX_EVENTS)) {
      const key   = `${fixture.home_team_id}_${fixture.away_team_id}`;
      const afId  = afFixtureIndex.get(key);
      if (!afId) { log.push(`WARN: no AF fixture ID for ${key}`); continue; }

      const evData = await apiFetch<AFEventsResponse>(`/fixtures/events?fixture=${afId}`);
      reqCount++;
      log.push(`API req ${reqCount}: /fixtures/events?fixture=${afId} → ${evData.response.length} events`);

      const placeholderPlayers: Array<{
        id: string;
        team_id: string;
        name: string;
        shirt_number: number;
        position: string;
      }> = [];

      const rows = evData.response.flatMap((ev, i) => {
        const ourTeam = afTeamToOurs.get(ev.team.id);
        if (!ourTeam) return [];
        const type = mapEventType(ev.type, ev.detail);
        if (!type) return [];
        const playerId = `${ourTeam}-${ev.player.id}`;
        placeholderPlayers.push({
          id: playerId,
          team_id: ourTeam,
          name: ev.player.name,
          shirt_number: 99,
          position: 'MID',
        });

        let assistPlayerId: string | null = null;
        if (ev.assist?.id && ev.assist.name) {
          assistPlayerId = `${ourTeam}-${ev.assist.id}`;
          placeholderPlayers.push({
            id: assistPlayerId,
            team_id: ourTeam,
            name: ev.assist.name,
            shirt_number: 99,
            position: 'MID',
          });
        }

        return [{
          id:         `${fixture.id}-ev-${i}`,
          fixture_id: fixture.id,
          minute:     ev.time.elapsed,
          type,
          team_id:    ourTeam,
          player_id:  playerId,
          assist_player_id: assistPlayerId,
        }];
      });

      if (rows.length > 0) {
        const uniquePlayers = [...new Map(placeholderPlayers.map(player => [player.id, player])).values()];
        await supabaseAdmin.from('players').upsert(uniquePlayers, { onConflict: 'id', ignoreDuplicates: true });
        const { error } = await supabaseAdmin.from('match_events').insert(rows);
        if (error) log.push(`WARN events ${fixture.id}: ${error.message}`);
        else eventsInserted += rows.length;
      }
    }
    log.push(`Inserted ${eventsInserted} match events`);

    // ── 6. Squads — fetch teams with thin squads first ────────────────
    const remainingBudget = MAX_EVENTS - needEvents.slice(0, MAX_EVENTS).length;
    const { data: existingPlayers } = await supabaseAdmin
      .from('players')
      .select('team_id');
    const playerCountsByTeam = new Map<string, number>();
    for (const row of (existingPlayers ?? []) as Array<{ team_id: string }>) {
      playerCountsByTeam.set(row.team_id, (playerCountsByTeam.get(row.team_id) ?? 0) + 1);
    }
    const thinTeams = teamsData.response
      .map(item => ({ item, ourCode: afTeamToOurs.get(item.team.id) }))
      .filter(entry => entry.ourCode && (playerCountsByTeam.get(entry.ourCode) ?? 0) < 23);

    if (thinTeams.length > 0 && remainingBudget > 0) {
      log.push(`${thinTeams.length} teams have fewer than 23 players — fetching squads`);
      const { data: lockedPlayers } = await supabaseAdmin
        .from('players').select('id').eq('edited_by_admin', true);
      const lockedPlayerIds = new Set((lockedPlayers ?? []).map((r: { id: string }) => r.id));

      let squadsFetched = 0;
      for (const { item, ourCode } of thinTeams.slice(0, remainingBudget)) {
        if (!ourCode) continue;

        const squadData = await apiFetch<AFSquadResponse>(`/players/squads?team=${item.team.id}`);
        reqCount++;
        log.push(`API req ${reqCount}: /players/squads?team=${item.team.id}`);

        const playerRows = (squadData.response[0]?.players ?? [])
          .filter(p => {
            const id = `${ourCode}-${p.id}`;
            return !lockedPlayerIds.has(id);
          })
          .map(p => ({
            id:           `${ourCode}-${p.id}`,
            team_id:      ourCode,
            name:         p.name,
            shirt_number: p.number ?? 99,
            position:     POSITION_MAP[p.pos ?? ''] ?? 'MID',
          }));

        if (playerRows.length > 0) {
          await supabaseAdmin.from('players').upsert(playerRows, { onConflict: 'id' });
        }
        squadsFetched += playerRows.length;
      }
      log.push(`Upserted ${squadsFetched} players`);
    } else {
      log.push(thinTeams.length === 0 ? 'Squads already populated, skipping' : 'No request budget left for squads');
    }

    log.push(`Total API requests this run: ${reqCount}`);

    return new Response(
      JSON.stringify({ ok: true, reqCount, log }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    log.push(`ERROR: ${err}`);
    console.error('[sync-api-football]', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err), reqCount, log }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
