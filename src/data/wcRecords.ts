export interface WCRecord {
  player: string;
  flag: string;
  year: number;
  value: number;
  note?: string;
}

export const SINGLE_TOURNAMENT_RECORDS = {
  goals: { player: 'Just Fontaine', flag: '🇫🇷', year: 1958, value: 13 } satisfies WCRecord,
  assists: { player: 'Pelé', flag: '🇧🇷', year: 1970, value: 6 } satisfies WCRecord,
  involvement: [
    { player: 'Just Fontaine', flag: '🇫🇷', year: 1958, value: 13, note: 'pre-assist records' },
    { player: 'Pelé', flag: '🇧🇷', year: 1970, value: 10 },
  ] satisfies WCRecord[],
};

export const MESSI_RONALDO = {
  left: { name: 'Messi', flag: '🇦🇷', hex: '#8AC5EA' },
  right: { name: 'Ronaldo', flag: '🇵🇹', hex: '#AC192D' },
  rows: [
    { label: 'World Cups', l: 5, r: 5 },
    { label: 'Matches', l: 26, r: 22 },
    { label: 'Goals', l: 13, r: 8 },
    { label: 'Assists', l: 8, r: 2 },
    { label: 'Goal involvement', l: 21, r: 10 },
    { label: 'Player of the Match', l: 10, r: 1 },
  ],
};
