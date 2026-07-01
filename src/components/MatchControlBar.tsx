export type MatchTab = 'timeline' | 'lineups' | 'stats';

export type MatchControlBarStatus =
  | { kind: 'upcoming'; date: string; time: string }
  | { kind: 'live'; minute: number }
  | { kind: 'replaying'; minute: number; label?: string }
  | { kind: 'finished'; label?: string };

interface Props {
  activeTab: MatchTab;
  onTab: (tab: MatchTab) => void;
  status: MatchControlBarStatus;
}

function formatMinute(m: number) {
  if (m >= 121) return 'PEN';
  return m > 90 ? `90+${m - 90}'` : `${m}'`;
}

export default function MatchControlBar({ activeTab, onTab, status }: Props) {
  return (
    <div className="flex h-[52px] w-full shrink-0">
      <TabCell label="Lineups" isActive={activeTab === 'lineups'} onClick={() => onTab('lineups')} />
      <StatusCell status={status} isActive={activeTab === 'timeline'} onClick={() => onTab('timeline')} />
      <TabCell label="Stats" isActive={activeTab === 'stats'} onClick={() => onTab('stats')} />
    </div>
  );
}

function TabCell({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full flex-1 items-center justify-center text-[12px] font-semibold leading-none transition-none"
      style={{
        background: isActive ? 'var(--surface)' : '#000',
        color: isActive ? '#000' : 'var(--surface)',
        borderTop: isActive ? 'none' : '3px solid #000',
        outline: isActive ? '6px solid #000' : 'none',
        outlineOffset: isActive ? '-6px' : undefined,
      }}
    >
      {label}
    </button>
  );
}

function StatusCell({
  status,
  isActive,
  onClick,
}: {
  status: MatchControlBarStatus;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full flex-1 items-center justify-center px-2 transition-none"
      style={{
        background: isActive ? 'var(--surface)' : '#000',
        borderTop: isActive ? 'none' : '3px solid #000',
        outline: isActive ? '6px solid #000' : 'none',
        outlineOffset: isActive ? '-6px' : undefined,
      }}
    >
      {status.kind === 'live' ? (
        <div className="flex items-center gap-1 rounded-full bg-black/60 py-0.5 pl-1.5 pr-2 outline outline-1 outline-white/40">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5EE9B5]" />
          <span className="text-[10px] font-semibold leading-none text-white">
            {formatMinute(status.minute)}
          </span>
        </div>
      ) : status.kind === 'replaying' ? (
        <div className="flex items-center gap-1 rounded-full bg-black/60 py-0.5 pl-1.5 pr-2 outline outline-1 outline-white/20">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" />
          <span className="text-[10px] font-semibold leading-none text-white/80">
            {status.label ?? formatMinute(status.minute)}
          </span>
        </div>
      ) : status.kind === 'upcoming' ? (
        <div className="flex flex-col items-center gap-0.5">
          <span
            className="text-[10px] font-medium uppercase leading-none tracking-[0.5px]"
            style={{ color: isActive ? '#00000070' : '#ffffff70' }}
          >
            {status.date}
          </span>
          <span
            className="text-[12px] font-semibold leading-none"
            style={{ color: isActive ? '#000' : '#fff' }}
          >
            {status.time}
          </span>
        </div>
      ) : (
        <span
          className="text-[11px] font-semibold uppercase leading-none tracking-wide"
          style={{ color: isActive ? '#00000060' : '#ffffff60' }}
        >
          {status.label ?? 'FT'}
        </span>
      )}
    </button>
  );
}
