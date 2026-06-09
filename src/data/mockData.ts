import type { Team, Player, Group, Venue, Fixture, MatchEvent } from './types';

// ── Teams ────────────────────────────────────────────────────────
// Colours sourced from official kit / FIFA records.
// on* values are explicit where auto-contrast may be borderline.

export const TEAMS: Team[] = [
  // Group A
  {
    id: 'ARG', name: 'Argentina', shortCode: 'ARG', flagEmoji: '🇦🇷', groupId: 'A',
    seed: 1, titleOdds: '9/2',
    primaryHex: '#75AADB', secondaryHex: '#FFFFFF', tertiaryHex: '#F6B40E',
    onPrimary: '#0A2A52', onSecondary: '#0A2A52',
    funFact: 'Reigning champions, unbeaten in their last 12 group games.',
    form: ['W', 'W', 'W', 'D', 'W'],
  },
  {
    id: 'FRA', name: 'France', shortCode: 'FRA', flagEmoji: '🇫🇷', groupId: 'A',
    seed: 3, titleOdds: '5/1',
    primaryHex: '#001E96', secondaryHex: '#FFFFFF', tertiaryHex: '#EE2436',
    onPrimary: '#FFFFFF', onSecondary: '#001E96',
    funFact: 'France have reached two of the last three World Cup finals.',
    form: ['D', 'W', 'W', 'L', 'W'],
  },
  {
    id: 'URU', name: 'Uruguay', shortCode: 'URU', flagEmoji: '🇺🇾', groupId: 'A',
    seed: 9, titleOdds: '28/1',
    primaryHex: '#5FB4E8', secondaryHex: '#FFFFFF', tertiaryHex: '#5FB4E8',
    onPrimary: '#001A40', onSecondary: '#001A40',
    funFact: 'Two-time world champions; the original host of the first-ever World Cup.',
    form: ['W', 'D', 'W', 'W', 'L'],
  },
  {
    id: 'POL', name: 'Poland', shortCode: 'POL', flagEmoji: '🇵🇱', groupId: 'A',
    seed: 16, titleOdds: '80/1',
    primaryHex: '#FFFFFF', secondaryHex: '#DC143C', tertiaryHex: '#DC143C',
    onPrimary: '#1A1A1A', onSecondary: '#FFFFFF',
    funFact: 'Lewandowski is their all-time top scorer with over 80 international goals.',
    form: ['L', 'W', 'D', 'W', 'W'],
  },

  // Group B
  {
    id: 'ESP', name: 'Spain', shortCode: 'ESP', flagEmoji: '🇪🇸', groupId: 'B',
    seed: 4, titleOdds: '6/1',
    primaryHex: '#C60B1E', secondaryHex: '#FFC400', tertiaryHex: '#FFC400',
    onPrimary: '#FFFFFF', onSecondary: '#1A1A1A',
    funFact: "Spain's average squad age is the youngest of the favourites.",
    form: ['W', 'D', 'W', 'W', 'W'],
  },
  {
    id: 'ENG', name: 'England', shortCode: 'ENG', flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', groupId: 'B',
    seed: 5, titleOdds: '7/1',
    primaryHex: '#FFFFFF', secondaryHex: '#CE1124', tertiaryHex: '#001489',
    onPrimary: '#001489', onSecondary: '#FFFFFF',
    funFact: 'England have never won a World Cup on foreign soil.',
    form: ['L', 'W', 'D', 'W', 'W'],
  },
  {
    id: 'CRO', name: 'Croatia', shortCode: 'CRO', flagEmoji: '🇭🇷', groupId: 'B',
    seed: 12, titleOdds: '40/1',
    primaryHex: '#003087', secondaryHex: '#EF3340', tertiaryHex: '#FFFFFF',
    onPrimary: '#FFFFFF', onSecondary: '#FFFFFF',
    funFact: 'Runners-up in 2018; Croatia punch well above their population of 3.8m.',
    form: ['W', 'W', 'L', 'D', 'W'],
  },
  {
    id: 'BEL', name: 'Belgium', shortCode: 'BEL', flagEmoji: '🇧🇪', groupId: 'B',
    seed: 14, titleOdds: '50/1',
    primaryHex: '#000000', secondaryHex: '#FFD700', tertiaryHex: '#EF3340',
    onPrimary: '#FFD700', onSecondary: '#000000',
    funFact: "Belgium's 2018 'golden generation' makes one final push.",
    form: ['D', 'W', 'W', 'D', 'L'],
  },

  // Group C
  {
    id: 'BRA', name: 'Brazil', shortCode: 'BRA', flagEmoji: '🇧🇷', groupId: 'C',
    seed: 2, titleOdds: '13/2',
    primaryHex: '#009739', secondaryHex: '#F5C800', tertiaryHex: '#F5C800',
    onPrimary: '#FFFFFF', onSecondary: '#1A1A1A',
    funFact: 'Brazil have the shortest average squad height in the tournament.',
    form: ['W', 'W', 'D', 'W', 'L'],
  },
  {
    id: 'POR', name: 'Portugal', shortCode: 'POR', flagEmoji: '🇵🇹', groupId: 'C',
    seed: 7, titleOdds: '8/1',
    primaryHex: '#DA291C', secondaryHex: '#DA291C', tertiaryHex: '#FFD100',
    onPrimary: '#FFFFFF', onSecondary: '#FFFFFF',
    funFact: 'Portugal have scored the most free-kicks in the tournament.',
    form: ['W', 'L', 'W', 'W', 'D'],
  },
  {
    id: 'SEN', name: 'Senegal', shortCode: 'SEN', flagEmoji: '🇸🇳', groupId: 'C',
    seed: 11, titleOdds: '60/1',
    primaryHex: '#00853F', secondaryHex: '#FDEF42', tertiaryHex: '#EF3340',
    onPrimary: '#FFFFFF', onSecondary: '#1A1A1A',
    funFact: '2022 Africa Cup of Nations winners; reached the quarter-finals in 2022.',
    form: ['W', 'W', 'D', 'W', 'L'],
  },
  {
    id: 'SRB', name: 'Serbia', shortCode: 'SRB', flagEmoji: '🇷🇸', groupId: 'C',
    seed: 15, titleOdds: '100/1',
    primaryHex: '#C6363C', secondaryHex: '#0C4076', tertiaryHex: '#FFFFFF',
    onPrimary: '#FFFFFF', onSecondary: '#FFFFFF',
    funFact: "Mitrović holds the European qualifying record with 14 goals in one campaign.",
    form: ['D', 'L', 'W', 'W', 'D'],
  },

  // Group D
  {
    id: 'GER', name: 'Germany', shortCode: 'GER', flagEmoji: '🇩🇪', groupId: 'D',
    seed: 6, titleOdds: '8/1',
    primaryHex: '#000000', secondaryHex: '#DD0000', tertiaryHex: '#FFCE00',
    onPrimary: '#FFFFFF', onSecondary: '#FFFFFF',
    funFact: 'Four-time winners, chasing a record-equalling fifth star.',
    form: ['W', 'D', 'L', 'W', 'W'],
  },
  {
    id: 'NED', name: 'Netherlands', shortCode: 'NED', flagEmoji: '🇳🇱', groupId: 'D',
    seed: 8, titleOdds: '12/1',
    primaryHex: '#AE1C28', secondaryHex: '#FF7900', tertiaryHex: '#21468B',
    onPrimary: '#FFFFFF', onSecondary: '#FFFFFF',
    funFact: 'Three-time finalists who have never lifted the trophy.',
    form: ['D', 'D', 'W', 'L', 'W'],
  },
  {
    id: 'JPN', name: 'Japan', shortCode: 'JPN', flagEmoji: '🇯🇵', groupId: 'D',
    seed: 13, titleOdds: '60/1',
    primaryHex: '#BC002D', secondaryHex: '#FFFFFF', tertiaryHex: '#BC002D',
    onPrimary: '#FFFFFF', onSecondary: '#1A1A1A',
    funFact: 'Knocked out both Germany and Spain in the 2022 group stage.',
    form: ['W', 'L', 'W', 'D', 'W'],
  },
  {
    id: 'MAR', name: 'Morocco', shortCode: 'MAR', flagEmoji: '🇲🇦', groupId: 'D',
    seed: 10, titleOdds: '35/1',
    primaryHex: '#C1272D', secondaryHex: '#006233', tertiaryHex: '#C1272D',
    onPrimary: '#FFFFFF', onSecondary: '#FFFFFF',
    funFact: '2022 semi-finalists — the first African team to reach the last four.',
    form: ['W', 'W', 'D', 'W', 'W'],
  },
];

// ── Groups ────────────────────────────────────────────────────────

export const GROUPS: Group[] = [
  { id: 'A', label: 'Group A', teamIds: ['ARG', 'FRA', 'URU', 'POL'] },
  { id: 'B', label: 'Group B', teamIds: ['ESP', 'ENG', 'CRO', 'BEL'] },
  { id: 'C', label: 'Group C', teamIds: ['BRA', 'POR', 'SEN', 'SRB'] },
  { id: 'D', label: 'Group D', teamIds: ['GER', 'NED', 'JPN', 'MAR'] },
];

// ── Venues ────────────────────────────────────────────────────────

export const VENUES: Venue[] = [
  {
    id: 'V1', stadium: 'MetLife Stadium', city: 'New York/NJ', country: 'USA',
    funFact: 'Will host the 2026 final — the largest in the tournament.',
  },
  {
    id: 'V2', stadium: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico',
    funFact: 'The only stadium to host two previous World Cup finals.',
  },
  {
    id: 'V3', stadium: 'BC Place', city: 'Vancouver', country: 'Canada',
    funFact: 'Sits right on the downtown waterfront.',
  },
];

// ── Players ───────────────────────────────────────────────────────

export const PLAYERS: Player[] = [
  // Brazil
  { id: 'BRA-01', teamId: 'BRA', name: 'Alisson',       shirtNumber:  1, position: 'GK'  },
  { id: 'BRA-02', teamId: 'BRA', name: 'Danilo',        shirtNumber:  2, position: 'DEF' },
  { id: 'BRA-03', teamId: 'BRA', name: 'Marquinhos',    shirtNumber:  3, position: 'DEF' },
  { id: 'BRA-05', teamId: 'BRA', name: 'Casemiro',      shirtNumber:  5, position: 'MID' },
  { id: 'BRA-08', teamId: 'BRA', name: 'Fabinho',       shirtNumber:  8, position: 'MID' },
  { id: 'BRA-07', teamId: 'BRA', name: 'Vinícius Jr',   shirtNumber:  7, position: 'FWD' },
  { id: 'BRA-09', teamId: 'BRA', name: 'Endrick',       shirtNumber:  9, position: 'FWD' },
  { id: 'BRA-10', teamId: 'BRA', name: 'Rodrygo',       shirtNumber: 10, position: 'FWD' },
  { id: 'BRA-11', teamId: 'BRA', name: 'Raphinha',      shirtNumber: 11, position: 'FWD' },
  { id: 'BRA-15', teamId: 'BRA', name: 'Thiago',        shirtNumber: 15, position: 'MID' },
  { id: 'BRA-19', teamId: 'BRA', name: 'Martinelli',    shirtNumber: 19, position: 'FWD' },

  // Portugal
  { id: 'POR-01', teamId: 'POR', name: 'Diogo Costa',   shirtNumber:  1, position: 'GK'  },
  { id: 'POR-02', teamId: 'POR', name: 'Dalot',         shirtNumber:  2, position: 'DEF' },
  { id: 'POR-03', teamId: 'POR', name: 'Pepe',          shirtNumber:  3, position: 'DEF' },
  { id: 'POR-12', teamId: 'POR', name: 'Nuno Mendes',   shirtNumber: 12, position: 'DEF' },
  { id: 'POR-08', teamId: 'POR', name: 'B. Fernandes',  shirtNumber:  8, position: 'MID' },
  { id: 'POR-10', teamId: 'POR', name: 'Bernardo',      shirtNumber: 10, position: 'MID' },
  { id: 'POR-20', teamId: 'POR', name: 'Vitinha',       shirtNumber: 20, position: 'MID' },
  { id: 'POR-07', teamId: 'POR', name: 'Ronaldo',       shirtNumber:  7, position: 'FWD' },
  { id: 'POR-11', teamId: 'POR', name: 'Leão',          shirtNumber: 11, position: 'FWD' },

  // Argentina
  { id: 'ARG-01', teamId: 'ARG', name: 'E. Martínez',   shirtNumber:  1, position: 'GK'  },
  { id: 'ARG-05', teamId: 'ARG', name: 'Paredes',       shirtNumber:  5, position: 'MID' },
  { id: 'ARG-10', teamId: 'ARG', name: 'Messi',         shirtNumber: 10, position: 'FWD' },
  { id: 'ARG-11', teamId: 'ARG', name: 'Lautaro',       shirtNumber: 11, position: 'FWD' },
  { id: 'ARG-13', teamId: 'ARG', name: 'Romero',        shirtNumber: 13, position: 'DEF' },
  { id: 'ARG-17', teamId: 'ARG', name: 'De Paul',       shirtNumber: 17, position: 'MID' },
  { id: 'ARG-26', teamId: 'ARG', name: 'Molina',        shirtNumber: 26, position: 'DEF' },

  // France
  { id: 'FRA-01', teamId: 'FRA', name: 'Maignan',       shirtNumber:  1, position: 'GK'  },
  { id: 'FRA-02', teamId: 'FRA', name: 'Pavard',        shirtNumber:  2, position: 'DEF' },
  { id: 'FRA-05', teamId: 'FRA', name: 'Kounde',        shirtNumber:  5, position: 'DEF' },
  { id: 'FRA-06', teamId: 'FRA', name: 'Rabiot',        shirtNumber:  6, position: 'MID' },
  { id: 'FRA-07', teamId: 'FRA', name: 'Griezmann',     shirtNumber:  7, position: 'FWD' },
  { id: 'FRA-10', teamId: 'FRA', name: 'Mbappé',        shirtNumber: 10, position: 'FWD' },
  { id: 'FRA-11', teamId: 'FRA', name: 'Dembélé',       shirtNumber: 11, position: 'FWD' },
  { id: 'FRA-14', teamId: 'FRA', name: 'Tchouaméni',    shirtNumber: 14, position: 'MID' },

  // Germany
  { id: 'GER-01', teamId: 'GER', name: 'Neuer',         shirtNumber:  1, position: 'GK'  },
  { id: 'GER-04', teamId: 'GER', name: 'Schlotterbeck', shirtNumber:  4, position: 'DEF' },
  { id: 'GER-06', teamId: 'GER', name: 'Kimmich',       shirtNumber:  6, position: 'MID' },
  { id: 'GER-09', teamId: 'GER', name: 'Füllkrug',      shirtNumber:  9, position: 'FWD' },
  { id: 'GER-10', teamId: 'GER', name: 'Wirtz',         shirtNumber: 10, position: 'MID' },
  { id: 'GER-14', teamId: 'GER', name: 'Musiala',       shirtNumber: 14, position: 'MID' },

  // Netherlands
  { id: 'NED-01', teamId: 'NED', name: 'Flekken',       shirtNumber:  1, position: 'GK'  },
  { id: 'NED-02', teamId: 'NED', name: 'Frimpong',      shirtNumber:  2, position: 'DEF' },
  { id: 'NED-04', teamId: 'NED', name: 'Van Dijk',      shirtNumber:  4, position: 'DEF' },
  { id: 'NED-08', teamId: 'NED', name: 'F. de Jong',    shirtNumber:  8, position: 'MID' },
  { id: 'NED-09', teamId: 'NED', name: 'Gakpo',         shirtNumber:  9, position: 'FWD' },
  { id: 'NED-10', teamId: 'NED', name: 'Depay',         shirtNumber: 10, position: 'FWD' },
];

// ── Fixtures ──────────────────────────────────────────────────────
// Dates are set relative to the app's current demo period (Jun 8–11 2026).
// TODAY = 2026-06-09. Spread across 4 days so the DateScroller has variety.

export const FIXTURES: Fixture[] = [
  // ── Jun 8 (yesterday) ─────────────────────────────────────────
  {
    id: 'F1', homeTeamId: 'BRA', awayTeamId: 'POR', venueId: 'V1', groupId: 'C',
    kickoffUtc: '2026-06-08T19:00:00Z', stage: 'group',
    status: 'finished', homeScore: 3, awayScore: 2,
    manOfMatchPlayerId: 'BRA-07',
  },
  {
    id: 'F4', homeTeamId: 'GER', awayTeamId: 'NED', venueId: 'V1', groupId: 'D',
    kickoffUtc: '2026-06-08T16:00:00Z', stage: 'group',
    status: 'finished', homeScore: 1, awayScore: 1,
    manOfMatchPlayerId: 'NED-09',
  },

  // ── Jun 9 (TODAY) ─────────────────────────────────────────────
  {
    id: 'F2', homeTeamId: 'ARG', awayTeamId: 'FRA', venueId: 'V2', groupId: 'A',
    kickoffUtc: '2026-06-09T16:00:00Z', stage: 'group',
    status: 'live', minute: 67, homeScore: 1, awayScore: 0,
  },
  {
    id: 'F3', homeTeamId: 'ESP', awayTeamId: 'ENG', venueId: 'V3', groupId: 'B',
    kickoffUtc: '2026-06-09T19:00:00Z', stage: 'group',
    status: 'scheduled',
  },

  // ── Jun 10 ────────────────────────────────────────────────────
  {
    id: 'F5', homeTeamId: 'BRA', awayTeamId: 'SEN', venueId: 'V3', groupId: 'C',
    kickoffUtc: '2026-06-10T16:00:00Z', stage: 'group',
    status: 'scheduled',
  },
  {
    id: 'F6', homeTeamId: 'POR', awayTeamId: 'SRB', venueId: 'V2', groupId: 'C',
    kickoffUtc: '2026-06-10T19:00:00Z', stage: 'group',
    status: 'scheduled',
  },

  // ── Jun 11 ────────────────────────────────────────────────────
  {
    id: 'F7', homeTeamId: 'FRA', awayTeamId: 'URU', venueId: 'V1', groupId: 'A',
    kickoffUtc: '2026-06-11T16:00:00Z', stage: 'group',
    status: 'scheduled',
  },
  {
    id: 'F8', homeTeamId: 'ENG', awayTeamId: 'BEL', venueId: 'V3', groupId: 'B',
    kickoffUtc: '2026-06-11T19:00:00Z', stage: 'group',
    status: 'scheduled',
  },
];

// ── Match events ──────────────────────────────────────────────────
// These drive the timeline, player stats, and the Phase 4 match replay.

export const MATCH_EVENTS: MatchEvent[] = [
  // F1: BRA 3-2 POR
  { id: 'E-F1-1', fixtureId: 'F1', minute: 23, type: 'goal',   teamId: 'BRA', playerId: 'BRA-07', assistPlayerId: 'BRA-19' },
  { id: 'E-F1-2', fixtureId: 'F1', minute: 48, type: 'goal',   teamId: 'BRA', playerId: 'BRA-07', assistPlayerId: 'BRA-15' },
  { id: 'E-F1-3', fixtureId: 'F1', minute: 69, type: 'goal',   teamId: 'POR', playerId: 'POR-08', assistPlayerId: 'POR-20' },
  { id: 'E-F1-4', fixtureId: 'F1', minute: 70, type: 'yellow', teamId: 'BRA', playerId: 'BRA-05' },
  { id: 'E-F1-5', fixtureId: 'F1', minute: 85, type: 'goal',   teamId: 'POR', playerId: 'POR-02', assistPlayerId: 'POR-12' },
  { id: 'E-F1-6', fixtureId: 'F1', minute: 87, type: 'goal',   teamId: 'BRA', playerId: 'BRA-15', assistPlayerId: 'BRA-08' },

  // F2: ARG 1-0 FRA (live @ 67')
  { id: 'E-F2-1', fixtureId: 'F2', minute: 23, type: 'goal',   teamId: 'ARG', playerId: 'ARG-10', assistPlayerId: 'ARG-17' },
  { id: 'E-F2-2', fixtureId: 'F2', minute: 45, type: 'yellow', teamId: 'FRA', playerId: 'FRA-14' },

  // F4: GER 1-1 NED
  { id: 'E-F4-1', fixtureId: 'F4', minute: 34, type: 'goal',   teamId: 'GER', playerId: 'GER-10', assistPlayerId: 'GER-14' },
  { id: 'E-F4-2', fixtureId: 'F4', minute: 77, type: 'goal',   teamId: 'NED', playerId: 'NED-09', assistPlayerId: 'NED-02' },
];
