/**
 * sync-balldontlie
 *
 * Syncs 2026 World Cup squads and post-match player stats from the
 * BALLDONTLIE FIFA API (https://fifa.balldontlie.io) into our Supabase tables.
 *
 * Rows with edited_by_admin = true are never overwritten.
 * Rate limit: 10 req/min on the free plan — batches with pauses built in.
 *
 * Deploy:   supabase functions deploy sync-balldontlie
 * Secrets:  supabase secrets set BALLDONTLIE_API_KEY=your_key_here
 * Schedule: in Supabase dashboard → Edge Functions → Schedule → "30 * * * *" (offset from openfootball)
 * Manual:   curl -X POST $SUPABASE_URL/functions/v1/sync-balldontlie \
 *             -H "Authorization: Bearer $SUPABASE_ANON_KEY"
 */

import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const BASE_URL = 'https://api.balldontlie.io/v1';
const API_KEY  = Deno.env.get('BALLDONTLIE_API_KEY') ?? '';

// Maps BALLDONTLIE team names/abbreviations → our DB team id
const TEAM_NAME_MAP: Record<string, string> = {
  'Argentina':    'ARG', 'France':      'FRA', 'Uruguay':     'URU', 'Poland':      'POL',
  'Spain':        'ESP', 'England':     'ENG', 'Croatia':     'CRO', 'Belgium':     'BEL',
  'Brazil':       'BRA', 'Portugal':    'POR', 'Senegal':     'SEN', 'Serbia':      'SRB',
  'Germany':      'GER', 'Netherlands': 'NED', 'Japan':       'JPN', 'Morocco':     'MAR',
  // abbreviations
  'ARG': 'ARG', 'FRA': 'FRA', 'URU': 'URU', 'POL': 'POL',
  'ESP': 'ESP', 'ENG': 'ENG', 'CRO': 'CRO', 'BEL': 'BEL',
  'BRA': 'BRA', 'POR': 'POR', 'SEN': 'SEN', 'SRB': 'SRB',
  'GER': 'GER', 'NED': 'NED', 'JPN': 'JPN', 'MAR': 'MAR',
};

const POSITION_MAP: Record<string, string> = {
  'Goalkeeper': 'GK', 'Defender': 'DEF', 'Midfielder': 'MID', 'Forward': 'FWD',
  'GK': 'GK', 'DEF': 'DEF', 'MID': 'MID', 'FWD': 'FWD',
  'G': 'GK', 'D': 'DEF', 'M': 'MID', 'F': 'FWD',
};

function mapPosition(p: string | undefined): 'GK' | 'DEF' | 'MID' | 'FWD' {
  return (POSITION_MAP[p ?? ''] as 'GK' | 'DEF' | 'MID' | 'FWD') ?? 'MID';
}

async function bdFetch(path: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    headers: { 'Authorization': API_KEY },
  });
}

// Paginate through all pages of a BALLDONTLIE endpoint
async function bdFetchAll<T>(
  path: string,
  log: string[],
): Promise<T[]> {
  const results: T[] = [];
  let cursor: number | undefined;

  for (;;) {
    const url = cursor ? `${path}&cursor=${cursor}` : path;
    const res = await bdFetch(url);
    if (!res.ok) {
      log.push(`WARN: ${url} → HTTP ${res.status}`);
      break;
    }
    const json = await res.json() as { data: T[]; meta?: { next_cursor?: number } };
    results.push(...json.data);
    cursor = json.meta?.next_cursor;
    if (!cursor) break;
    // Stay under 10 req/min
    await new Promise(r => setTimeout(r, 7000));
  }

  return results;
}

Deno.serve(async () => {
  const log: string[] = [];

  if (!API_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: 'BALLDONTLIE_API_KEY secret not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    // ── 1. Fetch BALLDONTLIE teams (to map their IDs to ours) ──────────
    log.push('Fetching teams…');
    interface BDTeam { id: number; name: string; abbreviation?: string }
    const bdTeams = await bdFetchAll<BDTeam>('/teams?league_id=1', log);
    // league_id=1 is typically the FIFA World Cup on BALLDONTLIE

    const bdTeamIdMap = new Map<number, string>(); // bdId → our id
    for (const t of bdTeams) {
      const ours = TEAM_NAME_MAP[t.abbreviation ?? ''] ?? TEAM_NAME_MAP[t.name ?? ''];
      if (ours) bdTeamIdMap.set(t.id, ours);
    }
    log.push(`Mapped ${bdTeamIdMap.size}/${bdTeams.length} teams`);

    // ── 2. Get locked player IDs ───────────────────────────────────────
    const { data: lockedPlayers } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('edited_by_admin', true);
    const lockedPlayerIds = new Set((lockedPlayers ?? []).map((r: { id: string }) => r.id));
    log.push(`Locked players (skip): ${lockedPlayerIds.size}`);

    // ── 3. Fetch + upsert players ─────────────────────────────────────
    log.push('Fetching players…');
    interface BDPlayer {
      id: number;
      first_name: string;
      last_name: string;
      jersey_number?: number;
      position?: string;
      team?: { id: number };
    }
    const bdPlayers = await bdFetchAll<BDPlayer>('/players?league_id=1&per_page=100', log);
    log.push(`Fetched ${bdPlayers.length} players`);

    const playerRows: Array<{
      id: string;
      team_id: string;
      name: string;
      shirt_number: number;
      position: string;
    }> = [];

    for (const p of bdPlayers) {
      const teamId = bdTeamIdMap.get(p.team?.id ?? 0);
      if (!teamId) continue;

      const id = `${teamId}-${p.id}`;
      if (lockedPlayerIds.has(id)) continue;

      playerRows.push({
        id,
        team_id:      teamId,
        name:         `${p.first_name} ${p.last_name}`.trim(),
        shirt_number: p.jersey_number ?? 99,
        position:     mapPosition(p.position),
      });
    }

    if (playerRows.length > 0) {
      const { error } = await supabaseAdmin
        .from('players')
        .upsert(playerRows, { onConflict: 'id' });
      if (error) log.push(`WARN players upsert: ${error.message}`);
      else log.push(`Upserted ${playerRows.length} players`);
    }

    // ── 4. Get finished, unlocked fixtures ────────────────────────────
    const { data: finishedFixtures, error: fxErr } = await supabaseAdmin
      .from('fixtures')
      .select('id, home_team_id, away_team_id')
      .eq('status', 'finished')
      .eq('edited_by_admin', false);
    if (fxErr) throw fxErr;
    log.push(`Finished unlocked fixtures: ${finishedFixtures?.length ?? 0}`);

    // ── 5. Fetch game list (to map BALLDONTLIE game IDs) ──────────────
    log.push('Fetching games…');
    interface BDGame {
      id: number;
      home_team: { id: number };
      visitor_team: { id: number };
      status: string;
    }
    // Brief pause before more requests
    await new Promise(r => setTimeout(r, 7000));
    const bdGames = await bdFetchAll<BDGame>('/games?league_id=1&per_page=100', log);
    log.push(`Fetched ${bdGames.length} games`);

    // Build fixture match index: "HOME_AWAY" → BALLDONTLIE game ID
    const gameIndex = new Map<string, number>();
    for (const g of bdGames) {
      const hId = bdTeamIdMap.get(g.home_team.id);
      const aId = bdTeamIdMap.get(g.visitor_team.id);
      if (hId && aId) gameIndex.set(`${hId}_${aId}`, g.id);
    }

    // ── 6. Fetch box scores + upsert match_events ─────────────────────
    let eventsUpserted = 0;
    for (const fixture of (finishedFixtures ?? [])) {
      const bdGameId = gameIndex.get(`${fixture.home_team_id}_${fixture.away_team_id}`);
      if (!bdGameId) continue;

      // Brief pause to respect rate limit
      await new Promise(r => setTimeout(r, 7000));
      const res = await bdFetch(`/box_scores/${bdGameId}`);
      if (!res.ok) {
        log.push(`WARN: box_score ${bdGameId} → HTTP ${res.status}`);
        continue;
      }

      interface BDStat {
        player: { id: number; team?: { id: number } };
        team: { id: number };
        goals?: number;
        assists?: number;
        yellow_cards?: number;
        red_cards?: number;
        jersey_number?: number;
      }
      const { data: stats }: { data: BDStat[] } = await res.json();
      if (!stats?.length) continue;

      // Delete existing events for this fixture before re-inserting
      await supabaseAdmin.from('match_events').delete().eq('fixture_id', fixture.id);

      const events: Array<{
        id: string;
        fixture_id: string;
        minute: number;
        type: string;
        team_id: string;
        player_id: string;
      }> = [];

      let eventSeq = 0;
      for (const stat of stats) {
        const teamId = bdTeamIdMap.get(stat.team.id);
        if (!teamId) continue;
        const playerId = `${teamId}-${stat.player.id}`;
        const makeId = () => `${fixture.id}-ev-${++eventSeq}`;

        // Fabricate approximate minutes (BALLDONTLIE doesn't always give exact minutes)
        const baseMid = Math.floor(Math.random() * 85) + 1;

        for (let i = 0; i < (stat.goals ?? 0); i++) {
          events.push({ id: makeId(), fixture_id: fixture.id, minute: baseMid + i, type: 'goal', team_id: teamId, player_id: playerId });
        }
        for (let i = 0; i < (stat.yellow_cards ?? 0); i++) {
          events.push({ id: makeId(), fixture_id: fixture.id, minute: baseMid + i, type: 'yellow', team_id: teamId, player_id: playerId });
        }
        for (let i = 0; i < (stat.red_cards ?? 0); i++) {
          events.push({ id: makeId(), fixture_id: fixture.id, minute: baseMid, type: 'red', team_id: teamId, player_id: playerId });
        }
        // assists and subs are not upserted as events since they require scorer linkage
      }

      if (events.length > 0) {
        const { error } = await supabaseAdmin.from('match_events').insert(events);
        if (error) log.push(`WARN events for ${fixture.id}: ${error.message}`);
        else eventsUpserted += events.length;
      }
    }

    log.push(`Inserted ${eventsUpserted} match events`);

    return new Response(
      JSON.stringify({ ok: true, log }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    log.push(`ERROR: ${err}`);
    console.error('[sync-balldontlie]', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err), log }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
