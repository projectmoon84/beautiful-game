import type { Fixture, Group, InsightCard, MatchEvent, Player, Team, Venue } from './types';

type TeamInput = Omit<Team, 'groupId' | 'form'>;

const GROUP_IDS = 'ABCDEFGHIJKL'.split('');
const POSITIONS: Player['position'][] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'FWD', 'FWD'];
const FIRST_NAMES = [
  'Alex', 'Bruno', 'Carlos', 'Diego', 'Emil', 'Felix', 'Gabriel', 'Hugo', 'Ivan', 'Jonas',
  'Kai', 'Leo', 'Marco', 'Nico', 'Oscar', 'Pablo', 'Rafael', 'Sami', 'Theo', 'Victor',
  'Wesley', 'Yuri', 'Zane', 'Luis', 'Mateo', 'Andre',
];
const LAST_NAMES = [
  'Silva', 'Costa', 'Santos', 'Mendez', 'Rossi', 'Khan', 'Miller', 'Garcia', 'Nakamura', 'Diallo',
  'Kova', 'Smith', 'Martin', 'Hassan', 'Lopez', 'Kim', 'Novak', 'Okafor', 'Berg', 'Moreau',
  'Taylor', 'Sousa', 'Ito', 'Reyes', 'Murphy', 'Vega',
];

const TEAM_INPUTS: TeamInput[] = [
  { id: 'ARG', name: 'Argentina', shortCode: 'ARG', flagEmoji: '🇦🇷', seed: 1, titleOdds: '9/2', primaryHex: '#75AADB', secondaryHex: '#FFFFFF', tertiaryHex: '#F6B40E', onPrimary: '#0A2A52', onSecondary: '#0A2A52', funFact: 'Reigning champions, unbeaten in their last 12 group games.' },
  { id: 'CAN', name: 'Canada', shortCode: 'CAN', flagEmoji: '🇨🇦', seed: 26, titleOdds: '100/1', primaryHex: '#E31B23', secondaryHex: '#FFFFFF', tertiaryHex: '#E31B23', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Canada are hosting World Cup matches for the first time.' },
  { id: 'CRO', name: 'Croatia', shortCode: 'CRO', flagEmoji: '🇭🇷', seed: 12, titleOdds: '40/1', primaryHex: '#003087', secondaryHex: '#FFFFFF', tertiaryHex: '#EF3340', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Croatia punch well above their population of 3.8m.' },
  { id: 'NGA', name: 'Nigeria', shortCode: 'NGA', flagEmoji: '🇳🇬', seed: 34, titleOdds: '80/1', primaryHex: '#008753', secondaryHex: '#FFFFFF', tertiaryHex: '#008753', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Nigeria have reached the knockouts three times.' },
  { id: 'FRA', name: 'France', shortCode: 'FRA', flagEmoji: '🇫🇷', seed: 3, titleOdds: '5/1', primaryHex: '#001E96', secondaryHex: '#FFFFFF', tertiaryHex: '#EE2436', onPrimary: '#FFFFFF', onSecondary: '#001E96', funFact: 'France have reached two of the last three World Cup finals.' },
  { id: 'MEX', name: 'Mexico', shortCode: 'MEX', flagEmoji: '🇲🇽', seed: 18, titleOdds: '50/1', primaryHex: '#006847', secondaryHex: '#FFFFFF', tertiaryHex: '#CE1126', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Estadio Azteca becomes the first three-time World Cup stadium.' },
  { id: 'URU', name: 'Uruguay', shortCode: 'URU', flagEmoji: '🇺🇾', seed: 9, titleOdds: '28/1', primaryHex: '#5FB4E8', secondaryHex: '#FFFFFF', tertiaryHex: '#001A40', onPrimary: '#001A40', onSecondary: '#001A40', funFact: 'Uruguay hosted and won the first World Cup.' },
  { id: 'KOR', name: 'Korea Republic', shortCode: 'KOR', flagEmoji: '🇰🇷', seed: 30, titleOdds: '90/1', primaryHex: '#C60C30', secondaryHex: '#FFFFFF', tertiaryHex: '#003478', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Korea Republic reached the semi-finals in 2002.' },
  { id: 'BRA', name: 'Brazil', shortCode: 'BRA', flagEmoji: '🇧🇷', seed: 2, titleOdds: '13/2', primaryHex: '#009739', secondaryHex: '#F5C800', tertiaryHex: '#F5C800', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Brazil have played at every World Cup.' },
  { id: 'POR', name: 'Portugal', shortCode: 'POR', flagEmoji: '🇵🇹', seed: 7, titleOdds: '8/1', primaryHex: '#DA291C', secondaryHex: '#006600', tertiaryHex: '#FFD100', onPrimary: '#FFFFFF', onSecondary: '#FFFFFF', funFact: 'Portugal arrive with one of the deepest midfields.' },
  { id: 'SEN', name: 'Senegal', shortCode: 'SEN', flagEmoji: '🇸🇳', seed: 19, titleOdds: '60/1', primaryHex: '#00853F', secondaryHex: '#FDEF42', tertiaryHex: '#EF3340', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Senegal reached the quarter-finals on debut in 2002.' },
  { id: 'JPN', name: 'Japan', shortCode: 'JPN', flagEmoji: '🇯🇵', seed: 15, titleOdds: '60/1', primaryHex: '#BC002D', secondaryHex: '#FFFFFF', tertiaryHex: '#BC002D', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Japan beat both Germany and Spain in the 2022 group stage.' },
  { id: 'ESP', name: 'Spain', shortCode: 'ESP', flagEmoji: '🇪🇸', seed: 4, titleOdds: '6/1', primaryHex: '#C60B1E', secondaryHex: '#FFC400', tertiaryHex: '#FFC400', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: "Spain's average squad age is among the youngest of the favourites." },
  { id: 'ENG', name: 'England', shortCode: 'ENG', flagEmoji: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', seed: 5, titleOdds: '7/1', primaryHex: '#FFFFFF', secondaryHex: '#CE1124', tertiaryHex: '#001489', onPrimary: '#001489', onSecondary: '#FFFFFF', funFact: 'England have never won a World Cup on foreign soil.' },
  { id: 'GHA', name: 'Ghana', shortCode: 'GHA', flagEmoji: '🇬🇭', seed: 35, titleOdds: '125/1', primaryHex: '#006B3F', secondaryHex: '#FCD116', tertiaryHex: '#CE1126', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Ghana were a penalty away from the 2010 semi-finals.' },
  { id: 'USA', name: 'United States', shortCode: 'USA', flagEmoji: '🇺🇸', seed: 20, titleOdds: '45/1', primaryHex: '#3C3B6E', secondaryHex: '#FFFFFF', tertiaryHex: '#B22234', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'The USA host World Cup games for the first time since 1994.' },
  { id: 'GER', name: 'Germany', shortCode: 'GER', flagEmoji: '🇩🇪', seed: 6, titleOdds: '8/1', primaryHex: '#000000', secondaryHex: '#FFFFFF', tertiaryHex: '#FFCE00', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Germany are chasing a record-equalling fifth star.' },
  { id: 'NED', name: 'Netherlands', shortCode: 'NED', flagEmoji: '🇳🇱', seed: 8, titleOdds: '12/1', primaryHex: '#AE1C28', secondaryHex: '#FF7900', tertiaryHex: '#21468B', onPrimary: '#FFFFFF', onSecondary: '#FFFFFF', funFact: 'Three-time finalists who have never lifted the trophy.' },
  { id: 'MAR', name: 'Morocco', shortCode: 'MAR', flagEmoji: '🇲🇦', seed: 10, titleOdds: '35/1', primaryHex: '#C1272D', secondaryHex: '#006233', tertiaryHex: '#C1272D', onPrimary: '#FFFFFF', onSecondary: '#FFFFFF', funFact: 'Morocco were the first African World Cup semi-finalists.' },
  { id: 'AUS', name: 'Australia', shortCode: 'AUS', flagEmoji: '🇦🇺', seed: 33, titleOdds: '100/1', primaryHex: '#0057B8', secondaryHex: '#FFCD00', tertiaryHex: '#00843D', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Australia have reached five consecutive World Cups.' },
  { id: 'ITA', name: 'Italy', shortCode: 'ITA', flagEmoji: '🇮🇹', seed: 11, titleOdds: '22/1', primaryHex: '#0066B3', secondaryHex: '#FFFFFF', tertiaryHex: '#008C45', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Italy have four World Cup titles.' },
  { id: 'BEL', name: 'Belgium', shortCode: 'BEL', flagEmoji: '🇧🇪', seed: 14, titleOdds: '50/1', primaryHex: '#000000', secondaryHex: '#FFD700', tertiaryHex: '#EF3340', onPrimary: '#FFD700', onSecondary: '#000000', funFact: "Belgium's 2018 generation makes one final push." },
  { id: 'COL', name: 'Colombia', shortCode: 'COL', flagEmoji: '🇨🇴', seed: 21, titleOdds: '45/1', primaryHex: '#FCD116', secondaryHex: '#003893', tertiaryHex: '#CE1126', onPrimary: '#1A1A1A', onSecondary: '#FFFFFF', funFact: 'Colombia reached the quarter-finals in 2014.' },
  { id: 'EGY', name: 'Egypt', shortCode: 'EGY', flagEmoji: '🇪🇬', seed: 32, titleOdds: '100/1', primaryHex: '#CE1126', secondaryHex: '#FFFFFF', tertiaryHex: '#000000', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Egypt were the first African nation to play at a World Cup.' },
  { id: 'DEN', name: 'Denmark', shortCode: 'DEN', flagEmoji: '🇩🇰', seed: 13, titleOdds: '40/1', primaryHex: '#C60C30', secondaryHex: '#FFFFFF', tertiaryHex: '#C60C30', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Denmark won Euro 1992 after entering late.' },
  { id: 'POL', name: 'Poland', shortCode: 'POL', flagEmoji: '🇵🇱', seed: 23, titleOdds: '80/1', primaryHex: '#FFFFFF', secondaryHex: '#DC143C', tertiaryHex: '#DC143C', onPrimary: '#1A1A1A', onSecondary: '#FFFFFF', funFact: 'Poland have twice finished third at the World Cup.' },
  { id: 'SRB', name: 'Serbia', shortCode: 'SRB', flagEmoji: '🇷🇸', seed: 25, titleOdds: '100/1', primaryHex: '#C6363C', secondaryHex: '#0C4076', tertiaryHex: '#FFFFFF', onPrimary: '#FFFFFF', onSecondary: '#FFFFFF', funFact: 'Serbia bring one of Europe’s most physical forward lines.' },
  { id: 'ECU', name: 'Ecuador', shortCode: 'ECU', flagEmoji: '🇪🇨', seed: 29, titleOdds: '80/1', primaryHex: '#FFD100', secondaryHex: '#034EA2', tertiaryHex: '#ED1C24', onPrimary: '#1A1A1A', onSecondary: '#FFFFFF', funFact: 'Ecuador often turn altitude into an advantage in qualifying.' },
  { id: 'SUI', name: 'Switzerland', shortCode: 'SUI', flagEmoji: '🇨🇭', seed: 16, titleOdds: '50/1', primaryHex: '#FF0000', secondaryHex: '#FFFFFF', tertiaryHex: '#FF0000', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Switzerland are regular knockout-stage troublemakers.' },
  { id: 'AUT', name: 'Austria', shortCode: 'AUT', flagEmoji: '🇦🇹', seed: 22, titleOdds: '70/1', primaryHex: '#ED2939', secondaryHex: '#FFFFFF', tertiaryHex: '#ED2939', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Austria finished third at the 1954 World Cup.' },
  { id: 'TUN', name: 'Tunisia', shortCode: 'TUN', flagEmoji: '🇹🇳', seed: 36, titleOdds: '150/1', primaryHex: '#E70013', secondaryHex: '#FFFFFF', tertiaryHex: '#E70013', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Tunisia were the first African team to win a World Cup match.' },
  { id: 'IRN', name: 'IR Iran', shortCode: 'IRN', flagEmoji: '🇮🇷', seed: 31, titleOdds: '125/1', primaryHex: '#239F40', secondaryHex: '#FFFFFF', tertiaryHex: '#DA0000', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Iran topped Asian qualifying groups multiple times.' },
  { id: 'SWE', name: 'Sweden', shortCode: 'SWE', flagEmoji: '🇸🇪', seed: 24, titleOdds: '70/1', primaryHex: '#005293', secondaryHex: '#FECB00', tertiaryHex: '#FECB00', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Sweden reached the 1958 final on home soil.' },
  { id: 'TUR', name: 'Türkiye', shortCode: 'TUR', flagEmoji: '🇹🇷', seed: 27, titleOdds: '80/1', primaryHex: '#E30A17', secondaryHex: '#FFFFFF', tertiaryHex: '#E30A17', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Türkiye finished third at the 2002 World Cup.' },
  { id: 'QAT', name: 'Qatar', shortCode: 'QAT', flagEmoji: '🇶🇦', seed: 42, titleOdds: '250/1', primaryHex: '#8A1538', secondaryHex: '#FFFFFF', tertiaryHex: '#8A1538', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Qatar hosted the first winter World Cup in 2022.' },
  { id: 'PAR', name: 'Paraguay', shortCode: 'PAR', flagEmoji: '🇵🇾', seed: 38, titleOdds: '150/1', primaryHex: '#0038A8', secondaryHex: '#FFFFFF', tertiaryHex: '#D52B1E', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Paraguay reached the 2010 quarter-finals.' },
  { id: 'CHI', name: 'Chile', shortCode: 'CHI', flagEmoji: '🇨🇱', seed: 37, titleOdds: '125/1', primaryHex: '#D52B1E', secondaryHex: '#FFFFFF', tertiaryHex: '#0039A6', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Chile finished third as hosts in 1962.' },
  { id: 'CRC', name: 'Costa Rica', shortCode: 'CRC', flagEmoji: '🇨🇷', seed: 40, titleOdds: '200/1', primaryHex: '#002B7F', secondaryHex: '#FFFFFF', tertiaryHex: '#CE1126', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Costa Rica shocked a heavyweight group in 2014.' },
  { id: 'UKR', name: 'Ukraine', shortCode: 'UKR', flagEmoji: '🇺🇦', seed: 28, titleOdds: '90/1', primaryHex: '#0057B7', secondaryHex: '#FFD700', tertiaryHex: '#FFD700', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Ukraine reached the 2006 quarter-finals.' },
  { id: 'NOR', name: 'Norway', shortCode: 'NOR', flagEmoji: '🇳🇴', seed: 17, titleOdds: '35/1', primaryHex: '#BA0C2F', secondaryHex: '#FFFFFF', tertiaryHex: '#00205B', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Norway have never lost to Brazil at senior men’s level.' },
  { id: 'CMR', name: 'Cameroon', shortCode: 'CMR', flagEmoji: '🇨🇲', seed: 39, titleOdds: '150/1', primaryHex: '#007A5E', secondaryHex: '#FCD116', tertiaryHex: '#CE1126', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Cameroon were the first African World Cup quarter-finalists.' },
  { id: 'NZL', name: 'New Zealand', shortCode: 'NZL', flagEmoji: '🇳🇿', seed: 46, titleOdds: '300/1', primaryHex: '#000000', secondaryHex: '#FFFFFF', tertiaryHex: '#C8102E', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'New Zealand went unbeaten at the 2010 World Cup.' },
  { id: 'KSA', name: 'Saudi Arabia', shortCode: 'KSA', flagEmoji: '🇸🇦', seed: 41, titleOdds: '200/1', primaryHex: '#006C35', secondaryHex: '#FFFFFF', tertiaryHex: '#006C35', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Saudi Arabia beat Argentina in one of 2022’s biggest shocks.' },
  { id: 'ROU', name: 'Romania', shortCode: 'ROU', flagEmoji: '🇷🇴', seed: 43, titleOdds: '200/1', primaryHex: '#002B7F', secondaryHex: '#FCD116', tertiaryHex: '#CE1126', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Romania reached the 1994 quarter-finals.' },
  { id: 'PAN', name: 'Panama', shortCode: 'PAN', flagEmoji: '🇵🇦', seed: 44, titleOdds: '250/1', primaryHex: '#005AA7', secondaryHex: '#FFFFFF', tertiaryHex: '#D21034', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Panama scored their first World Cup goal in 2018.' },
  { id: 'JAM', name: 'Jamaica', shortCode: 'JAM', flagEmoji: '🇯🇲', seed: 45, titleOdds: '250/1', primaryHex: '#009B3A', secondaryHex: '#FED100', tertiaryHex: '#000000', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Jamaica’s first World Cup appearance came in 1998.' },
  { id: 'BOL', name: 'Bolivia', shortCode: 'BOL', flagEmoji: '🇧🇴', seed: 47, titleOdds: '300/1', primaryHex: '#007934', secondaryHex: '#F9E300', tertiaryHex: '#D52B1E', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Bolivia hosted and won the 1963 Copa America.' },
  { id: 'THA', name: 'Thailand', shortCode: 'THA', flagEmoji: '🇹🇭', seed: 48, titleOdds: '400/1', primaryHex: '#2D2A4A', secondaryHex: '#FFFFFF', tertiaryHex: '#A51931', onPrimary: '#FFFFFF', onSecondary: '#1A1A1A', funFact: 'Thailand bring a fast, technical attacking style.' },
];

export const DEV_MOCK_GROUPS: Group[] = GROUP_IDS.map((id, index) => ({
  id,
  label: `Group ${id}`,
  teamIds: TEAM_INPUTS.slice(index * 4, index * 4 + 4).map(team => team.id),
}));

export const DEV_MOCK_TEAMS: Team[] = TEAM_INPUTS.map((team, index) => ({
  ...team,
  groupId: GROUP_IDS[Math.floor(index / 4)],
  form: formFor(index),

}));

export const DEV_MOCK_VENUES: Venue[] = [
  { id: 'V-ATL', stadium: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA', funFact: 'The retractable roof opens like a camera aperture.' },
  { id: 'V-MEX', stadium: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico', funFact: 'The first stadium to host matches at three World Cups.' },
  { id: 'V-NY', stadium: 'MetLife Stadium', city: 'New York/New Jersey', country: 'USA', funFact: 'MetLife Stadium hosts the 2026 final.' },
  { id: 'V-TOR', stadium: 'BMO Field', city: 'Toronto', country: 'Canada', funFact: 'Toronto hosts Canada’s first men’s World Cup match on home soil.' },
  { id: 'V-LA', stadium: 'SoFi Stadium', city: 'Los Angeles', country: 'USA', funFact: 'The translucent roof covers a 70,000-seat bowl.' },
  { id: 'V-VAN', stadium: 'BC Place', city: 'Vancouver', country: 'Canada', funFact: 'The stadium sits in the heart of downtown Vancouver.' },
  { id: 'V-MIA', stadium: 'Hard Rock Stadium', city: 'Miami', country: 'USA', funFact: 'Miami brings humid late-game legs into play.' },
  { id: 'V-DAL', stadium: 'AT&T Stadium', city: 'Dallas', country: 'USA', funFact: 'One of the largest venues in the tournament.' },
];

export const DEV_MOCK_PLAYERS: Player[] = DEV_MOCK_TEAMS.flatMap((team, teamIndex) =>
  Array.from({ length: 26 }, (_, playerIndex) => {
    const shirtNumber = playerIndex + 1;
    return {
      id: `${team.id}-P${shirtNumber.toString().padStart(2, '0')}`,
      teamId: team.id,
      name: `${FIRST_NAMES[(teamIndex + playerIndex) % FIRST_NAMES.length]} ${LAST_NAMES[(teamIndex * 3 + playerIndex) % LAST_NAMES.length]}`,
      shirtNumber,
      position: POSITIONS[Math.min(playerIndex, POSITIONS.length - 1)],
    };
  }),
);

const generated = generateFixturesAndEvents();

export const DEV_MOCK_FIXTURES: Fixture[] = generated.fixtures;
export const DEV_MOCK_EVENTS: MatchEvent[] = generated.events;

export const DEV_MOCK_INSIGHTS: InsightCard[] = [
  { kind: 'Dark horse',     teamId: 'MAR', value: '',              blurb: 'The 2022 semi-finalists are level with Brazil in their group and quietly going about their business.' },
  { kind: 'Fire power',     teamId: 'NOR', value: '',              blurb: 'Back after 28 years, they scored 37 in 8 qualifiers (4.62 per game)' },
  { kind: 'Safe hands',     teamId: 'CUW', value: '15 saves',      blurb: 'Keeper Eloy Room made a record 15 saves to hold Ecuador to a 0-0 draw.' },
  { kind: 'Messi Magic',    teamId: 'ARG', value: '18 and counting', blurb: 'Messi breaks the record for the most World Cup goals scored.' },
  { kind: 'Ronaldo Reigns', teamId: 'POR', value: '6 World Cups',  blurb: 'His brace against Uzbekistan made him the first player ever to score at six separate tournaments.' },
];

function generateFixturesAndEvents(): { fixtures: Fixture[]; events: MatchEvent[] } {
  const fixtures: Fixture[] = [];
  const events: MatchEvent[] = [];
  const groupPairs = DEV_MOCK_GROUPS.flatMap(group => {
    const [a, b, c, d] = group.teamIds;
    return [
      [a, b, group.id], [c, d, group.id],
      [a, c, group.id], [b, d, group.id],
      [a, d, group.id], [b, c, group.id],
    ] as Array<[string, string, string]>;
  });
  const liveIndex = 37;

  groupPairs.forEach(([homeTeamId, awayTeamId, groupId], index) => {
    const dayOffset = Math.floor(index / 4);
    const kickoffHour = [16, 19, 22, 1][index % 4];
    const kickoff = new Date(Date.UTC(2026, 5, 1 + dayOffset, kickoffHour, 0, 0));
    const id = `DEV-${(index + 1).toString().padStart(3, '0')}`;
    const venue = DEV_MOCK_VENUES[index % DEV_MOCK_VENUES.length];
    const baseHomeScore = (index * 7 + 2) % 4;
    const baseAwayScore = (index * 5 + 1) % 3;
    const status: Fixture['status'] = index < liveIndex ? 'finished' : index === liveIndex ? 'live' : 'scheduled';
    const fixtureEvents = status === 'scheduled'
      ? []
      : eventsForFixture(id, homeTeamId, awayTeamId, baseHomeScore, baseAwayScore, status === 'live');
    const score = scoreFromEvents(fixtureEvents, homeTeamId, awayTeamId);

    fixtures.push({
      id,
      homeTeamId,
      awayTeamId,
      venueId: venue.id,
      groupId,
      kickoffUtc: kickoff.toISOString(),
      stage: 'group',
      status,
      minute: status === 'live' ? 63 : undefined,
      homeScore: status === 'scheduled' ? undefined : score.home,
      awayScore: status === 'scheduled' ? undefined : score.away,
      manOfMatchPlayerId: status === 'finished' ? scorerId(homeTeamId, 10) : undefined,
    });
    events.push(...fixtureEvents);
  });

  return { fixtures, events };
}

function eventsForFixture(
  fixtureId: string,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  live: boolean,
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const maxMinute = live ? 63 : 90;
  const addGoal = (teamId: string, sequence: number, minute: number) => {
    if (minute > maxMinute) return;
    events.push({
      id: `${fixtureId}-G-${teamId}-${sequence}`,
      fixtureId,
      minute,
      type: sequence % 4 === 0 ? 'penalty' : 'goal',
      teamId,
      playerId: scorerId(teamId, 10 + (sequence % 2)),
      assistPlayerId: sequence % 4 === 0 ? undefined : scorerId(teamId, 7 + (sequence % 3)),
    });
  };

  for (let i = 0; i < homeScore; i++) addGoal(homeTeamId, i + 1, 12 + i * 24);
  for (let i = 0; i < awayScore; i++) addGoal(awayTeamId, i + 1, 23 + i * 22);

  if (maxMinute >= 34) {
    events.push({
      id: `${fixtureId}-YC-${homeTeamId}`,
      fixtureId,
      minute: 34,
      type: 'yellow',
      teamId: homeTeamId,
      playerId: scorerId(homeTeamId, 5),
    });
  }
  if (maxMinute >= 58 && (homeScore + awayScore) % 2 === 0) {
    events.push({
      id: `${fixtureId}-YC-${awayTeamId}`,
      fixtureId,
      minute: 58,
      type: 'yellow',
      teamId: awayTeamId,
      playerId: scorerId(awayTeamId, 6),
    });
  }

  return events.sort((a, b) => a.minute - b.minute);
}

function scoreFromEvents(events: MatchEvent[], homeTeamId: string, awayTeamId: string): { home: number; away: number } {
  const goalEvents = events.filter(event => event.type === 'goal' || event.type === 'penalty');
  return {
    home: goalEvents.filter(event => event.teamId === homeTeamId).length,
    away: goalEvents.filter(event => event.teamId === awayTeamId).length,
  };
}

function scorerId(teamId: string, shirtNumber: number): string {
  return `${teamId}-P${shirtNumber.toString().padStart(2, '0')}`;
}

function formFor(index: number): Team['form'] {
  const forms: Team['form'][] = [
    ['W', 'W', 'D', 'W', 'L'],
    ['D', 'W', 'W', 'L', 'W'],
    ['L', 'D', 'W', 'W', 'D'],
    ['W', 'L', 'D', 'D', 'W'],
  ];
  return forms[index % forms.length];
}
