import type { MatchTeamStats, Team } from '../data/types';

interface Props {
  home: Team;
  away: Team;
  homeStats: MatchTeamStats | null;
  awayStats: MatchTeamStats | null;
}

interface StatRow {
  label: string;
  homeValue: number | undefined;
  awayValue: number | undefined;
  isPossession?: boolean;
}

export default function MatchStats({ home, away, homeStats, awayStats }: Props) {
  const rows: StatRow[] = [
    { label: 'Possession', homeValue: homeStats?.possessionPct, awayValue: awayStats?.possessionPct, isPossession: true },
    { label: 'Shots on target', homeValue: homeStats?.shotsOnTarget, awayValue: awayStats?.shotsOnTarget },
    { label: 'Shots off target', homeValue: homeStats?.shotsOffTarget, awayValue: awayStats?.shotsOffTarget },
    { label: 'Shots blocked', homeValue: homeStats?.shotsBlocked, awayValue: awayStats?.shotsBlocked },
    { label: 'Corners', homeValue: homeStats?.corners, awayValue: awayStats?.corners },
    { label: 'Offside', homeValue: homeStats?.offsides, awayValue: awayStats?.offsides },
    { label: 'Fouls', homeValue: homeStats?.fouls, awayValue: awayStats?.fouls },
    { label: 'Yellow cards', homeValue: homeStats?.yellowCards, awayValue: awayStats?.yellowCards },
    { label: 'Red cards', homeValue: homeStats?.redCards, awayValue: awayStats?.redCards },
  ];

  const visibleRows = rows.filter(row => {
    if (row.homeValue === undefined && row.awayValue === undefined) return false;
    return true;
  });

  if (visibleRows.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center bg-black">
        <p className="text-[13px] text-white/40">Stats not yet available</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col bg-black py-4">
      {visibleRows.map(row => (
        <StatRowItem
          key={row.label}
          label={row.label}
          homeValue={row.homeValue ?? 0}
          awayValue={row.awayValue ?? 0}
          homeColor={home.primaryHex}
          awayColor={away.primaryHex}
          isPossession={row.isPossession}
        />
      ))}
    </div>
  );
}

function StatRowItem({
  label,
  homeValue,
  awayValue,
  homeColor,
  awayColor,
  isPossession,
}: {
  label: string;
  homeValue: number;
  awayValue: number;
  homeColor: string;
  awayColor: string;
  isPossession?: boolean;
}) {
  const total = homeValue + awayValue;

  // Possession: proportional to each other (41/59 fills full half each)
  // Other: value / max(home, away) of half-width, min 1px stub when 0
  const homeFrac = isPossession
    ? total > 0 ? homeValue / total : 0.5
    : total > 0 ? homeValue / Math.max(homeValue, awayValue) : 0;
  const awayFrac = isPossession
    ? total > 0 ? awayValue / total : 0.5
    : total > 0 ? awayValue / Math.max(homeValue, awayValue) : 0;

  const homeLabel = isPossession ? `${homeValue}%` : String(homeValue);
  const awayLabel = isPossession ? `${awayValue}%` : String(awayValue);

  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-2.5">
      {/* Label */}
      <span className="text-[10px] font-medium leading-none text-white/80 uppercase tracking-wide">
        {label}
      </span>

      {/* Bars */}
      <div className="flex h-[6px] w-full items-center gap-[2px]">
        {/* Home bar — grows outward from centre (right-to-left) */}
        <div className="flex h-full flex-1 items-center justify-end">
          <div className="relative h-full w-full rounded-full bg-white/20">
            <div
              className="absolute right-0 top-0 h-full rounded-full"
              style={{
                width: homeFrac > 0 ? `${homeFrac * 100}%` : '1px',
                minWidth: homeFrac === 0 ? '1px' : undefined,
                background: homeFrac === 0 ? homeColor : homeColor,
              }}
            />
          </div>
        </div>

        {/* Away bar — grows outward from centre (left-to-right) */}
        <div className="flex h-full flex-1 items-center justify-start">
          <div className="relative h-full w-full rounded-full bg-white/20">
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{
                width: awayFrac > 0 ? `${awayFrac * 100}%` : '1px',
                minWidth: awayFrac === 0 ? '1px' : undefined,
                background: awayColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="flex w-full">
        <span className="flex-1 text-left text-[11px] font-semibold leading-none text-white">
          {homeLabel}
        </span>
        <span className="flex-1 text-right text-[11px] font-semibold leading-none text-white">
          {awayLabel}
        </span>
      </div>
    </div>
  );
}
