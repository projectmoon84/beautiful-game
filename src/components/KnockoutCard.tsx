import type { Fixture, Team } from '../data/types';
import { formatDate, formatTime } from '../utils/format';

const TBD_BG  = '#14161a';
const TBD_INK = 'rgba(255,255,255,0.22)';

export interface KnockoutCardProps {
  fixture: Fixture;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  stageLabel: string;
  onClick?: () => void;
}

export default function KnockoutCard({
  fixture: f,
  homeTeam,
  awayTeam,
  homePlaceholder,
  awayPlaceholder,
  stageLabel,
  onClick,
}: KnockoutCardProps) {
  const isLive     = f.status === 'live';
  const isFinished = f.status === 'finished';
  const showScore  = isLive || isFinished;

  const homeBg  = homeTeam?.primaryHex   ?? TBD_BG;
  const homeInk = homeTeam?.secondaryHex ?? TBD_INK;
  const awayBg  = awayTeam?.primaryHex   ?? TBD_BG;
  const awayInk = awayTeam?.secondaryHex ?? TBD_INK;

  const rightLabel = isFinished ? `FT · ${stageLabel}` : stageLabel;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="relative block h-[130px] w-full overflow-hidden text-left disabled:cursor-default active:brightness-95 disabled:active:brightness-100"
      aria-label={
        showScore
          ? `${homeTeam?.name ?? 'TBD'} ${f.homeScore ?? 0} – ${f.awayScore ?? 0} ${awayTeam?.name ?? 'TBD'}`
          : `${homeTeam?.name ?? 'TBD'} vs ${awayTeam?.name ?? 'TBD'}`
      }
    >
      <div className="flex h-full">

        <div
          className="flex flex-1 flex-col justify-between overflow-hidden p-4"
          style={{ background: homeBg }}
        >
          <div className="text-[12px] font-medium leading-none" style={{ color: homeInk }}>
            {formatDate(f.kickoffUtc)} · {formatTime(f.kickoffUtc)}
          </div>
          <div className="flex items-end justify-between gap-2">
            {homeTeam ? (
              <span
                className="min-w-0 truncate text-[40px] font-bold uppercase leading-[0.9]"
                style={{ color: homeInk }}
              >
                {homeTeam.shortCode}
              </span>
            ) : (
              <PlaceholderSlot label={homePlaceholder} ink={homeInk} />
            )}
            {showScore && homeTeam && (
              <span className="shrink-0 text-[40px] font-bold leading-[0.9]" style={{ color: homeInk }}>
                {f.homeScore ?? 0}
              </span>
            )}
          </div>
        </div>

        <div
          className="flex flex-1 flex-col justify-between overflow-hidden p-4"
          style={{ background: awayBg }}
        >
          <div className="text-right text-[12px] font-medium leading-none" style={{ color: awayInk }}>
            {rightLabel}
          </div>
          <div className="flex items-end justify-between gap-2">
            {showScore && awayTeam && (
              <span className="shrink-0 text-[40px] font-bold leading-[0.9]" style={{ color: awayInk }}>
                {f.awayScore ?? 0}
              </span>
            )}
            {awayTeam ? (
              <span
                className="min-w-0 flex-1 truncate text-right text-[40px] font-bold uppercase leading-[0.9]"
                style={{ color: awayInk }}
              >
                {awayTeam.shortCode}
              </span>
            ) : (
              <PlaceholderSlot label={awayPlaceholder} ink={awayInk} align="right" />
            )}
          </div>
        </div>

      </div>

      {isLive && (
        <div className="absolute left-[54%] top-4 flex items-center gap-1 rounded-full bg-black/60 py-0.5 pl-1 pr-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#5EE9B5]" />
          <span className="text-[10px] font-medium leading-none text-white">
            {f.minute ?? 0} min
          </span>
        </div>
      )}
    </button>
  );
}

function PlaceholderSlot({
  label,
  ink,
  align = 'left',
}: {
  label?: string;
  ink: string;
  align?: 'left' | 'right';
}) {
  const [qualifier, group] = label?.includes(' · ')
    ? label.split(' · ')
    : [null, label ?? '?'];

  const textAlign = align === 'right' ? 'text-right' : 'text-left';

  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${textAlign}`}>
      {qualifier && (
        <span
          className="truncate text-[10px] font-semibold uppercase tracking-wider leading-none"
          style={{ color: ink, opacity: 0.6 }}
        >
          {qualifier}
        </span>
      )}
      <span
        className="truncate text-[20px] font-bold leading-tight"
        style={{ color: ink }}
      >
        {group}
      </span>
    </div>
  );
}
