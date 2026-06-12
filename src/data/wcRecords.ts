export interface WCRecord {
  player: string;
  flag: string;
  year: number;
  value: number;
  note?: string;
}

export interface WCRankedRecord {
  rank: number;
  player: string;
  country: string;
  year?: number;
  goals?: number;
  assists?: number | null;
  involvements?: number;
  cleanSheets?: number;
  games?: number;
  editions?: string;
  worldCups?: number;
}

export interface WCRecordFact {
  record: string;
  holder: string;
  country?: string;
  figure: string;
  detail?: string;
}

export interface WCTeamRecord {
  record: string;
  detail: string;
  figure: string;
  year?: string;
}

export const SINGLE_TOURNAMENT_RECORDS = {
  goals: { player: 'Just Fontaine', flag: '🇫🇷', year: 1958, value: 13 } satisfies WCRecord,
  assists: { player: 'Pelé', flag: '🇧🇷', year: 1970, value: 6 } satisfies WCRecord,
  cleanSheets: { player: 'Fabien Barthez', flag: '🇫🇷', year: 1998, value: 5 } satisfies WCRecord,
  involvement: [
    { player: 'Just Fontaine', flag: '🇫🇷', year: 1958, value: 13, note: 'pre-assist records' },
    { player: 'Pelé', flag: '🇧🇷', year: 1970, value: 10 },
  ] satisfies WCRecord[],
};

export const SINGLE_TOURNAMENT_INVOLVEMENTS: WCRankedRecord[] = [
  { rank: 1, player: 'Pelé', country: 'Brazil', year: 1970, goals: 4, assists: 6, involvements: 10 },
  { rank: 2, player: 'Diego Maradona', country: 'Argentina', year: 1986, goals: 5, assists: 5, involvements: 10 },
  { rank: 3, player: 'Lionel Messi', country: 'Argentina', year: 2022, goals: 7, assists: 3, involvements: 10 },
  { rank: 4, player: 'Gerd Muller', country: 'West Germany', year: 1970, goals: 10, assists: 1, involvements: 11 },
  { rank: 5, player: 'Grzegorz Lato', country: 'Poland', year: 1974, goals: 7, assists: 2, involvements: 9 },
  { rank: 6, player: 'Kylian Mbappe', country: 'France', year: 2022, goals: 8, assists: 2, involvements: 10 },
  { rank: 7, player: 'Ronaldo', country: 'Brazil', year: 2002, goals: 8, assists: 1, involvements: 9 },
  { rank: 8, player: 'Just Fontaine', country: 'France', year: 1958, goals: 13, assists: null, involvements: 13 },
  { rank: 9, player: 'Johan Neeskens', country: 'Netherlands', year: 1974, goals: 5, assists: 3, involvements: 8 },
  { rank: 10, player: 'Teofilo Cubillas', country: 'Peru', year: 1978, goals: 5, assists: 2, involvements: 7 },
];

export const SINGLE_TOURNAMENT_GOALS: WCRankedRecord[] = [
  { rank: 1, player: 'Just Fontaine', country: 'France', year: 1958, goals: 13, games: 6 },
  { rank: 2, player: 'Sandor Kocsis', country: 'Hungary', year: 1954, goals: 11, games: 5 },
  { rank: 3, player: 'Gerd Muller', country: 'West Germany', year: 1970, goals: 10, games: 6 },
  { rank: 4, player: 'Ademir', country: 'Brazil', year: 1950, goals: 9, games: 6 },
  { rank: 4, player: 'Eusebio', country: 'Portugal', year: 1966, goals: 9, games: 6 },
  { rank: 6, player: 'Guillermo Stabile', country: 'Argentina', year: 1930, goals: 8, games: 4 },
  { rank: 6, player: 'Ronaldo', country: 'Brazil', year: 2002, goals: 8, games: 7 },
  { rank: 6, player: 'Kylian Mbappe', country: 'France', year: 2022, goals: 8, games: 7 },
  { rank: 9, player: 'Leonidas', country: 'Brazil', year: 1938, goals: 7, games: 5 },
  { rank: 9, player: 'Jairzinho', country: 'Brazil', year: 1970, goals: 7, games: 6 },
  { rank: 9, player: 'Grzegorz Lato', country: 'Poland', year: 1974, goals: 7, games: 7 },
];

export const SINGLE_TOURNAMENT_ASSISTS: WCRankedRecord[] = [
  { rank: 1, player: 'Pelé', country: 'Brazil', year: 1970, assists: 6 },
  { rank: 2, player: 'Robert Gadocha', country: 'Poland', year: 1974, assists: 5 },
  { rank: 2, player: 'Pierre Littbarski', country: 'West Germany', year: 1982, assists: 5 },
  { rank: 2, player: 'Diego Maradona', country: 'Argentina', year: 1986, assists: 5 },
  { rank: 2, player: 'Thomas Hassler', country: 'Germany', year: 1994, assists: 5 },
  { rank: 6, player: 'Siegfried Held', country: 'West Germany', year: 1966, assists: 4 },
  { rank: 6, player: 'Tostao', country: 'Brazil', year: 1970, assists: 4 },
  { rank: 6, player: 'Zico', country: 'Brazil', year: 1982, assists: 4 },
  { rank: 6, player: 'Igor Belanov', country: 'USSR', year: 1986, assists: 4 },
  { rank: 6, player: 'Michael Ballack', country: 'Germany', year: 2002, assists: 4 },
  { rank: 6, player: 'Francesco Totti', country: 'Italy', year: 2006, assists: 4 },
  { rank: 6, player: 'Juan Roman Riquelme', country: 'Argentina', year: 2006, assists: 4 },
];

export const SINGLE_TOURNAMENT_CLEAN_SHEETS: WCRankedRecord[] = [
  { rank: 1, player: 'Fabien Barthez', country: 'France', year: 1998, cleanSheets: 5, games: 7 },
  { rank: 2, player: 'Peter Shilton', country: 'England', year: 1982, cleanSheets: 4, games: 5 },
  { rank: 2, player: 'Fabien Barthez', country: 'France', year: 2006, cleanSheets: 4, games: 7 },
  { rank: 2, player: 'Gianluigi Buffon', country: 'Italy', year: 2006, cleanSheets: 4, games: 7 },
  { rank: 2, player: 'Iker Casillas', country: 'Spain', year: 2010, cleanSheets: 4, games: 7 },
  { rank: 2, player: 'Manuel Neuer', country: 'Germany', year: 2014, cleanSheets: 4, games: 7 },
  { rank: 2, player: 'Emiliano Martinez', country: 'Argentina', year: 2022, cleanSheets: 4, games: 7 },
];

export const ALL_TIME_INVOLVEMENTS: WCRankedRecord[] = [
  { rank: 1, player: 'Lionel Messi', country: 'Argentina', games: 26, goals: 13, assists: 8, involvements: 21 },
  { rank: 2, player: 'Pelé', country: 'Brazil', games: 14, goals: 12, assists: 9, involvements: 21 },
  { rank: 3, player: 'Gerd Muller', country: 'West Germany', games: 13, goals: 14, assists: 5, involvements: 19 },
  { rank: 4, player: 'Ronaldo', country: 'Brazil', games: 19, goals: 15, assists: 4, involvements: 19 },
  { rank: 5, player: 'Miroslav Klose', country: 'Germany', games: 24, goals: 16, assists: 3, involvements: 19 },
  { rank: 6, player: 'Thomas Muller', country: 'Germany', games: 19, goals: 10, assists: 6, involvements: 16 },
  { rank: 6, player: 'Diego Maradona', country: 'Argentina', games: 21, goals: 8, assists: 8, involvements: 16 },
  { rank: 8, player: 'Grzegorz Lato', country: 'Poland', games: 20, goals: 10, assists: 7, involvements: 17 },
  { rank: 9, player: 'Just Fontaine', country: 'France', games: 6, goals: 13, assists: null, involvements: 13 },
  { rank: 10, player: 'Jurgen Klinsmann', country: 'Germany', games: 17, goals: 11, assists: 3, involvements: 14 },
  { rank: 11, player: 'Cristiano Ronaldo', country: 'Portugal', games: 22, goals: 8, assists: 2, involvements: 10 },
];

export const ALL_TIME_GOALS: WCRankedRecord[] = [
  { rank: 1, player: 'Miroslav Klose', country: 'Germany', editions: '2002-2014', worldCups: 4, goals: 16, games: 24 },
  { rank: 2, player: 'Ronaldo', country: 'Brazil', editions: '1998-2006', worldCups: 3, goals: 15, games: 19 },
  { rank: 3, player: 'Gerd Muller', country: 'West Germany', editions: '1970-1974', worldCups: 2, goals: 14, games: 13 },
  { rank: 4, player: 'Just Fontaine', country: 'France', editions: '1958', worldCups: 1, goals: 13, games: 6 },
  { rank: 5, player: 'Lionel Messi', country: 'Argentina', editions: '2006-2022', worldCups: 5, goals: 13, games: 26 },
  { rank: 6, player: 'Pelé', country: 'Brazil', editions: '1958-1970', worldCups: 4, goals: 12, games: 14 },
  { rank: 7, player: 'Sandor Kocsis', country: 'Hungary', editions: '1954', worldCups: 1, goals: 11, games: 5 },
  { rank: 7, player: 'Jurgen Klinsmann', country: 'Germany', editions: '1990-1998', worldCups: 3, goals: 11, games: 17 },
  { rank: 9, player: 'Kylian Mbappe', country: 'France', editions: '2018-2022', worldCups: 2, goals: 12, games: 14 },
  { rank: 10, player: 'Helmut Rahn', country: 'West Germany', editions: '1954-1958', worldCups: 2, goals: 10, games: 10 },
  { rank: 10, player: 'Teofilo Cubillas', country: 'Peru', editions: '1970-1978', worldCups: 3, goals: 10, games: 13 },
  { rank: 10, player: 'Grzegorz Lato', country: 'Poland', editions: '1974-1982', worldCups: 3, goals: 10, games: 20 },
  { rank: 13, player: 'Cristiano Ronaldo', country: 'Portugal', editions: '2006-2022', worldCups: 5, goals: 8, games: 22 },
];

export const ALL_TIME_ASSISTS: WCRankedRecord[] = [
  { rank: 1, player: 'Lionel Messi', country: 'Argentina', assists: 8 },
  { rank: 1, player: 'Diego Maradona', country: 'Argentina', assists: 8 },
  { rank: 3, player: 'Pierre Littbarski', country: 'Germany', assists: 7 },
  { rank: 3, player: 'Grzegorz Lato', country: 'Poland', assists: 7 },
  { rank: 5, player: 'David Beckham', country: 'England', assists: 6 },
  { rank: 5, player: 'Pelé', country: 'Brazil', assists: 6 },
  { rank: 5, player: 'Thomas Hassler', country: 'Germany', assists: 6 },
  { rank: 5, player: 'Bastian Schweinsteiger', country: 'Germany', assists: 6 },
  { rank: 5, player: 'Thomas Muller', country: 'Germany', assists: 6 },
  { rank: 5, player: 'Uwe Seeler', country: 'Germany', assists: 6 },
  { rank: 5, player: 'Francesco Totti', country: 'Italy', assists: 6 },
  { rank: 12, player: 'Cristiano Ronaldo', country: 'Portugal', assists: 2 },
];

export const RECORDS_AND_FIRSTS: WCRecordFact[] = [
  { record: 'Youngest goalscorer', holder: 'Pelé', country: 'Brazil', figure: '17y 239d', detail: 'v Wales, 1958' },
  { record: 'Oldest goalscorer', holder: 'Roger Milla', country: 'Cameroon', figure: '42y 39d', detail: 'v Russia, 1994' },
  { record: 'Youngest player', holder: 'Norman Whiteside', country: 'N. Ireland', figure: '17y 41d', detail: '1982' },
  { record: 'Fastest goal', holder: 'Hakan Sukur', country: 'Turkey', figure: '11 seconds', detail: 'v South Korea, 2002' },
  { record: 'Most goals, single tournament', holder: 'Just Fontaine', country: 'France', figure: '13 goals', detail: '1958' },
  { record: 'Most goals, career', holder: 'Miroslav Klose', country: 'Germany', figure: '16 goals', detail: '2002-2014' },
  { record: "Most assists, career (since '66)", holder: 'Messi / Maradona', country: 'Argentina', figure: '8 assists' },
  { record: 'Most clean sheets, career', holder: 'Shilton / Barthez', country: 'Eng / Fra', figure: '10 each' },
  { record: "Most assists in a match (since '66)", holder: 'Robert Gadocha', country: 'Poland', figure: '4', detail: 'v Haiti, 1974' },
  { record: 'Only sub to score a hat-trick', holder: 'Laszlo Kiss', country: 'Hungary', figure: '3 in 7 min', detail: 'v El Salvador, 1982' },
  { record: 'Most Player-of-Match awards', holder: 'Lionel Messi', country: 'Argentina', figure: '11 career' },
  { record: 'Only 2x Golden Ball winner', holder: 'Lionel Messi', country: 'Argentina', figure: '2014 & 2022' },
];

export const TEAM_TOURNAMENT_RECORDS: WCTeamRecord[] = [
  { record: 'Most goals by a team, one tournament', detail: 'Hungary', figure: '27 goals', year: '1954' },
  { record: '2nd most goals by a team, one tournament', detail: 'West Germany', figure: '25 goals', year: '1954' },
  { record: 'Biggest win', detail: 'Hungary 10-1 El Salvador', figure: '9 goals', year: '1982' },
  { record: 'Biggest clean-sheet win', detail: 'Hungary 9-0 South Korea', figure: '9 goals', year: '1954' },
  { record: 'Highest-scoring match', detail: 'Austria 7-5 Switzerland', figure: '12 goals', year: '1954' },
  { record: 'Most goals, whole tournament', detail: 'Qatar 2022', figure: '172 goals', year: '2022' },
  { record: '2nd most goals, whole tournament', detail: 'France 1998 / Brazil 2014', figure: '171 goals', year: '1998 & 2014' },
  { record: 'Most goals conceded, one tournament', detail: 'South Korea', figure: '16 conceded', year: '1954' },
  { record: 'Most titles', detail: 'Brazil', figure: '5', year: '1958-2002' },
  { record: 'Most finals', detail: 'Germany', figure: '8' },
  { record: 'First World Cup winner', detail: 'Uruguay', figure: '-', year: '1930' },
];

export const MESSI_RONALDO = {
  left: { id: 'messi', name: 'Messi', fullName: 'Lionel Messi', flag: '🇦🇷', hex: '#8AC5EA' },
  right: { id: 'ronaldo', name: 'Ronaldo', fullName: 'Cristiano Ronaldo', flag: '🇵🇹', hex: '#AC192D' },
  rows: [
    { key: 'worldCups', label: 'World Cups', l: 5, r: 5 },
    { key: 'matches', label: 'Matches', l: 26, r: 22 },
    { key: 'goals', label: 'Goals', l: 13, r: 8 },
    { key: 'assists', label: 'Assists', l: 8, r: 2 },
    { key: 'involvements', label: 'Goal involvement', l: 21, r: 10 },
    { key: 'knockoutGoals', label: 'Knockout goals', l: 6, r: 0 },
    { key: 'knockoutAssists', label: 'Knockout assists', l: 6, r: 0 },
    { key: 'playerOfMatch', label: 'Player of the Match', l: 10, r: 1 },
    { key: 'goldenBalls', label: 'Golden Balls', l: 2, r: 0 },
    { key: 'worldCupsWon', label: 'World Cups won', l: 1, r: 0 },
    { key: 'finals', label: 'Finals reached', l: 2, r: 0 },
  ],
};
