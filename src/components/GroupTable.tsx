import type { GroupTableRow } from '../data/types';

interface GroupTableProps {
  label: string;
  rows: GroupTableRow[];
  onTeamClick?: (teamId: string) => void;
  onGroupClick?: () => void;
  compact?: boolean;
  tint?: string;
}

const FULL_COLS = ['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'PTS'] as const;
const COMPACT_COLS = ['P', 'GD', 'PTS'] as const;

export default function GroupTable({
  label,
  rows,
  onTeamClick,
  onGroupClick,
  compact = false,
  tint,
}: GroupTableProps) {
  const cols = compact ? COMPACT_COLS : FULL_COLS;
  const headerColor = tint ?? 'var(--black)';

  if (rows.length === 0) return null;

  return (
    <section className="w-full">
      <button
        type="button"
        onClick={onGroupClick}
        disabled={!onGroupClick}
        className={[
          'flex w-full items-center gap-2 px-4 py-3 text-left',
          onGroupClick ? 'active:opacity-70' : 'cursor-default',
        ].join(' ')}
        style={{ color: headerColor }}
      >
        <span className="flex-1 text-[12px] font-semibold uppercase leading-none">
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-2 text-[12px] font-semibold uppercase leading-none">
          {cols.map(col => (
            <span key={col} className={col === 'PTS' ? 'w-7 text-center' : 'w-5 text-center'}>
              {col}
            </span>
          ))}
        </div>
      </button>

      {rows.map(row => {
        const RowTag = onTeamClick ? 'button' : 'div';
        const statValues = compact
          ? [row.played, row.goalDiff, row.points]
          : [row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst, row.goalDiff, row.points];

        return (
          <RowTag
            key={row.team.id}
            type={onTeamClick ? 'button' : undefined}
            onClick={onTeamClick ? () => onTeamClick(row.team.id) : undefined}
            className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left transition-[filter]"
            style={{ background: row.team.primaryHex, color: row.team.secondaryHex }}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2 text-[14px] font-semibold leading-none">
              <span className="leading-none">{row.team.flagEmoji}</span>
              <span className="truncate">{row.team.name}</span>
            </span>

            <div className="flex shrink-0 items-center gap-2 text-[12px] font-semibold uppercase leading-none">
              {statValues.map((value, index) => {
                const isLast = index === statValues.length - 1;
                return (
                  <span key={`${row.team.id}-${index}`} className={isLast ? 'w-7 text-center' : 'w-5 text-center'}>
                    {value}
                  </span>
                );
              })}
            </div>
          </RowTag>
        );
      })}
    </section>
  );
}
