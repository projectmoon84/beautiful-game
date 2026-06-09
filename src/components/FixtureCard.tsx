import type { Fixture, Team } from '../data/types';
import { formatDate, formatTime } from '../utils/format';
import BigType from './BigType';
import Pill from './Pill';

interface FixtureCardProps {
  fixture: Fixture;
  homeTeam: Team;
  awayTeam: Team;
  onClick?: () => void;
}

/**
 * FixtureCard — full-bleed split-kit row.
 * Variants (scheduled / live / finished) are derived from fixture.status.
 * Colours are always read from the team records — never hard-coded.
 */
export default function FixtureCard({ fixture: f, homeTeam: h, awayTeam: a, onClick }: FixtureCardProps) {
  const isFinished = f.status === 'finished';
  const isLive = f.status === 'live';
  const showScore = isFinished || isLive;

  return (
    <button
      onClick={onClick}
      className="block w-full rounded-2xl overflow-hidden text-left shadow-sm active:scale-[0.98] transition-transform duration-100"
      type="button"
    >
      <div className="flex h-24">
        {/* Home half */}
        <div
          className="flex-1 flex flex-col justify-between p-3 overflow-hidden relative"
          style={{ background: h.secondaryHex }}
        >
          {/* Top meta */}
          <div
            className="text-[10px] font-semibold leading-none opacity-85"
            style={{ color: h.primaryHex }}
          >
            {isLive ? (
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: h.primaryHex }}
                />
                LIVE
              </span>
            ) : (
              `${formatDate(f.kickoffUtc)} · ${formatTime(f.kickoffUtc)}`
            )}
          </div>

          {/* Code + score */}
          <div className="flex items-baseline gap-2">
            <span className="text-[18px]" role="img" aria-label={h.name}>
              {h.flagEmoji}
            </span>
            <BigType size="md" color={h.primaryHex}>{h.shortCode}</BigType>
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

        {/* Away half */}
        <div
          className="flex-1 flex flex-col justify-between items-end p-3 overflow-hidden"
          style={{ background: a.secondaryHex }}
        >
          {/* Top meta */}
          <div
            className="text-[10px] font-semibold leading-none opacity-90"
            style={{ color: a.tertiaryHex }}
          >
            {isLive ? (
              <Pill variant="live">{f.minute}'</Pill>
            ) : (
              `Group ${f.groupId}`
            )}
          </div>

          {/* Score + code */}
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
            <BigType size="md" color={a.tertiaryHex}>{a.shortCode}</BigType>
            <span className="text-[18px]" role="img" aria-label={a.name}>
              {a.flagEmoji}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
