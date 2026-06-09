import type { GroupTableRow } from '../data/types';

interface GroupTableProps {
  label: string;            // "Group C"
  rows: GroupTableRow[];
  onTeamClick?: (teamId: string) => void;
  compact?: boolean;        // true = hide W/D/L columns (for InlineStandings in Phase 3)
}

const HEADER_COLS = ['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'PTS'] as const;
const COMPACT_COLS = ['P', 'GD', 'PTS'] as const;

/**
 * GroupTable — full standings table.
 * Each row has a coloured bar carrying the team's primary hex.
 * TeamRows are tappable when onTeamClick is provided.
 */
export default function GroupTable({ label, rows, onTeamClick, compact = false }: GroupTableProps) {
  const cols = compact ? COMPACT_COLS : HEADER_COLS;

  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Group header */}
      <div
        className="px-4 py-2 text-[13px] font-bold text-white tracking-wide"
        style={{ background: '#14161a' }}
      >
        {label}
      </div>

      {/* Column headers */}
      <div className="flex items-center text-[10px] font-semibold text-[#999] uppercase tracking-wide px-4 py-1.5 border-b border-[#f0f0f0]">
        <span className="flex-1">Team</span>
        {cols.map(col => (
          <span key={col} className="w-7 text-center">{col}</span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const qualifies = i < 2; // top 2 qualify; third-place logic added in Phase 6
        const RowTag = onTeamClick ? 'button' : 'div';

        return (
          <RowTag
            key={row.team.id}
            type={onTeamClick ? 'button' : undefined}
            onClick={onTeamClick ? () => onTeamClick(row.team.id) : undefined}
            className={[
              'flex items-center w-full px-4 py-2.5 gap-3 text-left',
              'border-b border-[#f5f5f5] last:border-0',
              onTeamClick ? 'hover:bg-[#fafafa] active:bg-[#f3f3f3] transition-colors' : '',
              qualifies ? 'font-semibold' : 'opacity-60',
            ].join(' ')}
          >
            {/* Colour bar */}
            <span
              className="w-1.5 h-5 rounded-full shrink-0"
              style={{ background: row.team.primaryHex }}
            />

            {/* Flag + name */}
            <span className="flex-1 flex items-center gap-1.5 min-w-0">
              <span className="text-sm">{row.team.flagEmoji}</span>
              <span className="text-[13px] truncate">{row.team.name}</span>
            </span>

            {/* Stats */}
            {compact ? (
              <>
                <span className="w-7 text-center text-[13px]">{row.played}</span>
                <span className="w-7 text-center text-[13px]">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</span>
                <span className="w-7 text-center text-[13px] font-bold">{row.points}</span>
              </>
            ) : (
              <>
                <span className="w-7 text-center text-[13px]">{row.played}</span>
                <span className="w-7 text-center text-[13px]">{row.won}</span>
                <span className="w-7 text-center text-[13px]">{row.drawn}</span>
                <span className="w-7 text-center text-[13px]">{row.lost}</span>
                <span className="w-7 text-center text-[13px]">{row.goalsFor}</span>
                <span className="w-7 text-center text-[13px]">{row.goalsAgainst}</span>
                <span className="w-7 text-center text-[13px]">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</span>
                <span className="w-7 text-center text-[13px] font-bold">{row.points}</span>
              </>
            )}
          </RowTag>
        );
      })}
    </div>
  );
}
