import type { Fixture, Team } from '../data/types';
import { formatDate, formatTime } from '../utils/format';
import BigType from './BigType';

interface FixtureCardProps {
  fixture: Fixture;
  homeTeam: Team;
  awayTeam: Team;
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
export default function FixtureCard({ fixture: f, homeTeam: h, awayTeam: a, onClick }: FixtureCardProps) {
  const isLive = f.status === 'live';
  const isFinished = f.status === 'finished';
  const showScore = isLive || isFinished;

  // Scheduled gets large codes; scored variants stay readable alongside numbers
  const codeSize = showScore ? 'lg' : 'xl' as const;
  const cardHeight = showScore ? 'h-[100px]' : 'h-[118px]';

  return (
    <button
      onClick={onClick}
      className={`block w-full rounded-2xl overflow-hidden text-left shadow-sm active:scale-[0.98] transition-transform duration-100 ${cardHeight}`}
      type="button"
    >
      <div className="flex h-full">

        {/* ── Home half ── */}
        <div
          className="flex-1 flex flex-col justify-between p-3 overflow-hidden"
          style={{ background: h.secondaryHex }}
        >
          {/* Date · time — always shown */}
          <div
            className="text-[10px] font-semibold leading-none"
            style={{ color: h.primaryHex, opacity: 0.85 }}
          >
            {formatDate(f.kickoffUtc)} · {formatTime(f.kickoffUtc)}
          </div>

          {/* Flag + code + home score */}
          <div className="flex items-baseline gap-2">
            <span className="text-[18px] leading-none" role="img" aria-label={h.name}>
              {h.flagEmoji}
            </span>
            <BigType size={codeSize} color={h.primaryHex}>
              {h.shortCode}
            </BigType>
            {showScore && (
              <BigType
                size="sm"
                color={h.primaryHex}
                style={{ marginLeft: 'auto', lineHeight: 1 }}
              >
                {f.homeScore}
              </BigType>
            )}
          </div>
        </div>

        {/* ── Away half ── */}
        <div
          className="flex-1 flex flex-col justify-between items-end p-3 overflow-hidden"
          style={{ background: a.secondaryHex }}
        >
          {/* Status indicator top-right */}
          <div
            className="text-[10px] font-semibold leading-none text-right flex items-center gap-1.5"
            style={{ color: a.tertiaryHex }}
          >
            {isLive ? (
              <>
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: '#22c55e' }}
                />
                <span>{f.minute}'</span>
                <span className="opacity-60">· Group {f.groupId}</span>
              </>
            ) : isFinished ? (
              <span className="opacity-70">FT · Group {f.groupId}</span>
            ) : (
              `Group ${f.groupId}`
            )}
          </div>

          {/* Away score + code + flag */}
          <div className="flex items-baseline gap-2">
            {showScore && (
              <BigType
                size="sm"
                color={a.tertiaryHex}
                style={{ marginRight: 'auto', lineHeight: 1 }}
              >
                {f.awayScore}
              </BigType>
            )}
            <BigType size={codeSize} color={a.tertiaryHex}>
              {a.shortCode}
            </BigType>
            <span className="text-[18px] leading-none" role="img" aria-label={a.name}>
              {a.flagEmoji}
            </span>
          </div>
        </div>

      </div>
    </button>
  );
}
