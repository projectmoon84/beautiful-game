import type { Player } from '../data/types';

const POSITION_ORDER = ['GK', 'DEF', 'MID', 'FWD'] as const;
type Position = typeof POSITION_ORDER[number];

interface SquadListProps {
  players: Player[];
  /** Team primary hex — used for section labels and dividers. */
  primaryColor: string;
}

/**
 * SquadList — players grouped by GK / DEF / MID / FWD.
 * Renders on the kit-coloured team page background.
 */
export default function SquadList({ players, primaryColor }: SquadListProps) {
  const grouped = POSITION_ORDER.reduce<Record<Position, Player[]>>(
    (acc, pos) => {
      acc[pos] = players.filter(p => p.position === pos).sort((a, b) => a.shirtNumber - b.shirtNumber);
      return acc;
    },
    { GK: [], DEF: [], MID: [], FWD: [] },
  );

  return (
    <div className="px-4 pt-4 pb-6">
      {POSITION_ORDER.map(pos => {
        const group = grouped[pos];
        if (group.length === 0) return null;

        return (
          <div key={pos} className="mb-5">
            {/* Position section header */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[11px] font-bold tracking-[0.1em] uppercase"
                style={{ color: primaryColor, opacity: 0.65 }}
              >
                {pos}
              </span>
              <div className="flex-1 h-px" style={{ background: primaryColor, opacity: 0.25 }} />
            </div>

            {/* Player rows */}
            {group.map(player => (
              <div
                key={player.id}
                className="flex items-center py-2.5"
                style={{ borderBottom: `1px solid ${primaryColor}18` }}
              >
                <span
                  className="w-8 text-[13px] font-semibold shrink-0"
                  style={{ color: primaryColor, opacity: 0.5 }}
                >
                  {player.shirtNumber}
                </span>
                <span
                  className="text-[14px] font-bold tracking-wide uppercase"
                  style={{
                    color: primaryColor,
                    fontFamily: '"Instrument Sans", system-ui, sans-serif',
                    letterSpacing: '0.04em',
                  }}
                >
                  {player.name}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
