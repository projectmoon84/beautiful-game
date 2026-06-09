import { dataService } from '../data/dataService';

interface InlineStandingsProps {
  groupId: string;
}

/**
 * InlineStandings — flat group table surfaced beneath a day's fixtures.
 * No card chrome — sits directly on the surface background.
 * Mirrors the layout in the Matches mockup.
 */
export default function InlineStandings({ groupId }: InlineStandingsProps) {
  const rows = dataService.standingsForGroup(groupId);
  if (rows.length === 0) return null;

  return (
    <div>
      {/* Group label */}
      <div className="flex items-center px-4 py-2 gap-3">
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#1a1a1a]">
          Group {groupId}
        </span>
        {/* Column headers — right-aligned to match data cells */}
        <div className="ml-auto flex gap-0 text-[10px] font-semibold text-[#aaa] uppercase tracking-wide">
          {['P','W','D','L','GF','GA','GD','PTS'].map(col => (
            <span key={col} className="w-6 text-center">{col}</span>
          ))}
        </div>
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const qualifies = i < 2;
        return (
          <div
            key={row.team.id}
            className={[
              'flex items-center px-4 py-2',
              'border-t border-[#e8e5df]',
              qualifies ? 'opacity-100' : 'opacity-50',
            ].join(' ')}
          >
            {/* Colour bar */}
            <span
              className="w-1 h-[18px] rounded-full mr-2.5 shrink-0"
              style={{ background: row.team.primaryHex }}
            />

            {/* Flag + name */}
            <span className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-sm leading-none">{row.team.flagEmoji}</span>
              <span className="text-[13px] font-medium truncate">{row.team.name}</span>
            </span>

            {/* Stats */}
            <div className="flex gap-0 text-[13px] shrink-0">
              <span className="w-6 text-center">{row.played}</span>
              <span className="w-6 text-center">{row.won}</span>
              <span className="w-6 text-center">{row.drawn}</span>
              <span className="w-6 text-center">{row.lost}</span>
              <span className="w-6 text-center">{row.goalsFor}</span>
              <span className="w-6 text-center">{row.goalsAgainst}</span>
              <span className="w-6 text-center">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</span>
              <span className="w-6 text-center font-bold">{row.points}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
