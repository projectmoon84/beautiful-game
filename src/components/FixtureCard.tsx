import type { Fixture, Team } from '../data/types';
import { formatDate, formatTime } from '../utils/format';
import type { ResultQualifier } from '../utils/matchResult';
import { resultQualifierLabel } from '../utils/matchResult';
import ScoreDigit from './ScoreDigit';

interface FixtureCardProps {
  fixture: Fixture;
  homeTeam: Team;
  awayTeam: Team;
  obscured?: boolean;
  resultQualifier?: ResultQualifier;
  onClick?: () => void;
}

/**
 * FixtureCard — full-bleed split-kit row.
 * Variants (scheduled / live / finished) are derived from fixture.status.
 * Colours are read from team records only — no hard-coded hex.
 *
 * Layout per mockup:
 *   Top-left:  date · time  (always, home team colour)
 *   Top-right: minute pill (live) | group label (scheduled/finished)
 *   Bottom:    flag + BigType code  [score]  [score]  BigType code + flag
 *
 * Scheduled cards use xl codes to fill the extra space; live/finished use lg.
 */
export default function FixtureCard({
  fixture: f,
  homeTeam: h,
  awayTeam: a,
  obscured = false,
  resultQualifier = null,
  onClick,
}: FixtureCardProps) {
  const isLive = f.status === 'live';
  const isFinished = f.status === 'finished';

  const STAGE_SHORT: Record<string, string> = {
    r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'Final',
  };
  const stageLabel = f.groupId
    ? `Group ${f.groupId}`
    : (STAGE_SHORT[f.stage] ?? f.stage.toUpperCase());
  const qualifierLabel = obscured ? null : resultQualifierLabel(resultQualifier);
  const rightLabel = isFinished
    ? `${qualifierLabel ?? 'FT'} · ${stageLabel}`
    : stageLabel;

  const homeBg = h.primaryHex;
  const awayBg = a.primaryHex;
  const homeInk = h.secondaryHex;
  const awayInk = a.secondaryHex;
  const showScore = isLive || isFinished;
  const homeScore = f.homeScore ?? 0;
  const awayScore = f.awayScore ?? 0;

  return (
    <button
      onClick={onClick}
      className="relative block h-[130px] w-full overflow-hidden text-left active:brightness-95"
      type="button"
      aria-label={showScore ? `${h.name} ${homeScore}, ${a.name} ${awayScore}` : `${h.name} vs ${a.name}`}
    >
      <div className="flex h-full">

        <div
          className="flex flex-1 flex-col justify-between overflow-hidden p-4"
          style={{ background: homeBg }}
        >
          <div
            className="text-[12px] font-medium leading-none"
            style={{ color: homeInk }}
          >
            {formatDate(f.kickoffUtc)} · {formatTime(f.kickoffUtc)}
          </div>

          <div className="flex items-end justify-between gap-2">
            <span
              className="min-w-0 truncate text-[40px] font-bold uppercase leading-[0.9]"
              style={{ color: homeInk }}
            >
              {h.shortCode}
            </span>
            {showScore && (
              <ScoreDigit value={homeScore} ink={homeInk} obscured={obscured} />
            )}
          </div>
        </div>

        <div
          className="flex flex-1 flex-col justify-between overflow-hidden p-4"
          style={{ background: awayBg }}
        >
          <div
            className="text-right text-[12px] font-medium leading-none"
            style={{ color: awayInk }}
          >
            {rightLabel}
          </div>

          <div className="flex items-end justify-between gap-2">
            {showScore && (
              <ScoreDigit value={awayScore} ink={awayInk} obscured={obscured} />
            )}
            <span
              className="min-w-0 flex-1 truncate text-right text-[40px] font-bold uppercase leading-[0.9]"
              style={{ color: awayInk }}
            >
              {a.shortCode}
            </span>
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
