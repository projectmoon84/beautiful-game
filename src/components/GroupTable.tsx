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
          'flex w-full items-center gap-3 px-5 py-3 text-left',
          onGroupClick ? 'active:opacity-70' : 'cursor-default',
        ].join(' ')}
        style={{ color: headerColor }}
      >
        <span className="flex-1 text-[13px] font-bold uppercase tracking-widest leading-none">
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-3 text-[11px] font-bold uppercase tracking-wider leading-none opacity-60">
          {cols.map(col => (
            <span key={col} className={col === 'PTS' ? 'w-9 text-center' : 'w-7 text-center'}>
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
            className="flex min-h-[68px] w-full items-center gap-3 px-5 py-4 text-left active:brightness-95"
            style={{ background: row.team.primaryHex, color: row.team.secondaryHex }}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3 leading-none">
              <span className="text-[24px] leading-none">{row.team.flagEmoji}</span>
              <span className="truncate text-[17px] font-bold">{row.team.name}</span>
            </span>

            <div className="flex shrink-0 items-center gap-3 leading-none">
              {statValues.map((value, index) => {
                const isLast = index === statValues.length - 1;
                return (
                  <span
                    key={`${row.team.id}-${index}`}
                    className={isLast
                      ? 'w-9 text-center text-[20px] font-black'
                      : 'w-7 text-center text-[15px] font-semibold opacity-80'}
                  >
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
