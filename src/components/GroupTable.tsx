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
const MOBILE_FULL_COLS = ['P', 'GD', 'PTS', 'W', 'D', 'L', 'GF', 'GA'] as const;

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
      <MobileGroupTable
        label={label}
        rows={rows}
        onTeamClick={onTeamClick}
        onGroupClick={onGroupClick}
        compact={compact}
        headerColor={headerColor}
      />

      <div className="hidden sm:block">
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
              className="flex min-h-[76px] w-full items-center gap-3 px-5 py-4 text-left active:brightness-95"
              style={{ background: row.team.primaryHex, color: row.team.secondaryHex }}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3 leading-none">
                <span className="text-[24px] leading-none">{row.team.flagEmoji}</span>
                <span className="truncate text-[15px] font-medium">{row.team.name}</span>
              </span>

              <div className="flex shrink-0 items-center gap-3 leading-none">
                {statValues.map((value, index) => {
                  const isLast = index === statValues.length - 1;
                  return (
                    <span
                      key={`${row.team.id}-${index}`}
                      className={isLast
                        ? 'w-9 text-center text-[17px] font-bold'
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
      </div>
    </section>
  );
}

function MobileGroupTable({
  label,
  rows,
  onTeamClick,
  onGroupClick,
  compact,
  headerColor,
}: {
  label: string;
  rows: GroupTableRow[];
  onTeamClick?: (teamId: string) => void;
  onGroupClick?: () => void;
  compact: boolean;
  headerColor: string;
}) {
  const cols = compact ? COMPACT_COLS : MOBILE_FULL_COLS;
  const mobileTrackWidth = compact ? '100%' : 'calc(50vw + 180px)';
  const leadSpacer = compact ? null : 'calc(50vw - 120px)';

  return (
    <div className="flex w-full overflow-hidden sm:hidden">
      <div className="min-w-0 shrink-0 basis-1/2">
        <button
          type="button"
          onClick={onGroupClick}
          disabled={!onGroupClick}
          className={[
            'flex h-[76px] w-full items-center px-4 text-left text-[15px] font-medium uppercase leading-none',
            onGroupClick ? 'active:opacity-70' : 'cursor-default',
          ].join(' ')}
          style={{ color: headerColor }}
        >
          {label}
        </button>

        {rows.map(row => {
          const TeamTag = onTeamClick ? 'button' : 'div';

          return (
            <TeamTag
              key={row.team.id}
              type={onTeamClick ? 'button' : undefined}
              onClick={onTeamClick ? () => onTeamClick(row.team.id) : undefined}
              className="flex h-[76px] w-full min-w-0 items-center px-4 text-left active:brightness-95"
              style={{ background: row.team.primaryHex, color: row.team.secondaryHex }}
            >
              <span className="flex min-w-0 items-center gap-2 leading-none">
                <span className="shrink-0 text-[13px] leading-none">{row.team.flagEmoji}</span>
                <span className="truncate text-[15px] font-medium">{row.team.name}</span>
              </span>
            </TeamTag>
          );
        })}
      </div>

      <div
        className="min-w-0 shrink-0 basis-1/2 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
      >
        <div className="min-w-full" style={{ width: mobileTrackWidth }}>
          <div
            className={[
              'flex h-[76px] w-full items-center gap-1 pr-4 text-[15px] font-medium uppercase leading-none',
              compact ? 'justify-end' : '',
            ].join(' ')}
            style={{ color: headerColor }}
          >
            {leadSpacer ? <span aria-hidden="true" className="shrink-0" style={{ width: leadSpacer }} /> : null}
            {cols.map(col => (
              <span key={col} className="w-8 shrink-0 text-center">
                {col}
              </span>
            ))}
          </div>

          {rows.map(row => {
            const StatsTag = onTeamClick ? 'button' : 'div';
            const values = mobileValuesForRow(row, compact);

            return (
              <StatsTag
                key={row.team.id}
                type={onTeamClick ? 'button' : undefined}
                onClick={onTeamClick ? () => onTeamClick(row.team.id) : undefined}
                className={[
                  'flex h-[76px] w-full items-center gap-1 pr-4 leading-none active:brightness-95',
                  compact ? 'justify-end' : '',
                ].join(' ')}
                style={{ background: row.team.primaryHex, color: row.team.secondaryHex }}
              >
                {leadSpacer ? <span aria-hidden="true" className="shrink-0" style={{ width: leadSpacer }} /> : null}
                {values.map(({ col, value }) => (
                  <span
                    key={`${row.team.id}-${col}`}
                    className="w-8 shrink-0 text-center text-[15px] font-medium"
                  >
                    {value}
                  </span>
                ))}
              </StatsTag>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function mobileValuesForRow(row: GroupTableRow, compact: boolean) {
  if (compact) {
    return [
      { col: 'P', value: row.played },
      { col: 'GD', value: row.goalDiff },
      { col: 'PTS', value: row.points },
    ];
  }

  return [
    { col: 'P', value: row.played },
    { col: 'GD', value: row.goalDiff },
    { col: 'PTS', value: row.points },
    { col: 'W', value: row.won },
    { col: 'D', value: row.drawn },
    { col: 'L', value: row.lost },
    { col: 'GF', value: row.goalsFor },
    { col: 'GA', value: row.goalsAgainst },
  ];
}
