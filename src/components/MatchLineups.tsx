import type { LineupSlot, MatchLineup, Player, Position, Team } from '../data/types';

const POSITION_ORDER: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

interface Props {
  home: Team;
  away: Team;
  homeLineup: MatchLineup | null;
  awayLineup: MatchLineup | null;
  homeSquad: Player[];
  awaySquad: Player[];
}

export default function MatchLineups({
  home,
  away,
  homeLineup,
  awayLineup,
  homeSquad,
  awaySquad,
}: Props) {
  const homeSlots = lineupSlots(homeLineup, homeSquad);
  const awaySlots = lineupSlots(awayLineup, awaySquad);
  const isPredictedHome = homeLineup === null;
  const isPredictedAway = awayLineup === null;

  return (
    <div className="flex w-full">
      <TeamColumn
        team={home}
        slots={homeSlots}
        isPredicted={isPredictedHome}
        align="left"
      />
      <TeamColumn
        team={away}
        slots={awaySlots}
        isPredicted={isPredictedAway}
        align="right"
      />
    </div>
  );
}

function lineupSlots(lineup: MatchLineup | null, squad: Player[]): LineupSlot[] {
  if (lineup) return lineup.players;
  return squad.map(p => ({
    playerId: p.id,
    playerName: p.name,
    shirtNumber: p.shirtNumber,
    position: p.position,
    isStarter: true,
  }));
}

function TeamColumn({
  team,
  slots,
  isPredicted,
  align,
}: {
  team: Team;
  slots: LineupSlot[];
  isPredicted: boolean;
  align: 'left' | 'right';
}) {
  const ink = team.secondaryHex;
  const starters = slots.filter(s => s.isStarter);
  const subs = slots.filter(s => !s.isStarter);

  const grouped = POSITION_ORDER.reduce<Record<Position, LineupSlot[]>>(
    (acc, pos) => {
      acc[pos] = starters.filter(s => s.position === pos).sort((a, b) => a.shirtNumber - b.shirtNumber);
      return acc;
    },
    { GK: [], DEF: [], MID: [], FWD: [] },
  );

  return (
    <div
      className="flex min-w-0 flex-1 flex-col px-3 py-4"
      style={{ background: team.primaryHex }}
    >
      {POSITION_ORDER.map(pos => {
        const group = grouped[pos];
        if (group.length === 0) return null;
        return (
          <div key={pos} className="mb-4">
            <PositionHeader
              label={isPredicted ? `${pos} ·` : pos}
              inkColor={ink}
              align={align}
              predicted={isPredicted}
            />
            {group.map(slot => (
              <PlayerRow
                key={slot.playerId}
                slot={slot}
                inkColor={ink}
                align={align}
              />
            ))}
          </div>
        );
      })}

      {subs.length > 0 && (
        <div>
          <PositionHeader label="SUBS" inkColor={ink} align={align} />
          {subs.map(slot => (
            <PlayerRow
              key={slot.playerId}
              slot={slot}
              inkColor={ink}
              align={align}
              isSub
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PositionHeader({
  label,
  inkColor,
  align,
  predicted,
}: {
  label: string;
  inkColor: string;
  align: 'left' | 'right';
  predicted?: boolean;
}) {
  const isRight = align === 'right';
  return (
    <div className={`mb-1.5 flex items-center gap-1.5 ${isRight ? 'flex-row-reverse' : ''}`}>
      <span
        className="shrink-0 text-[11px] font-medium uppercase leading-none"
        style={{ color: inkColor, opacity: 0.75 }}
      >
        {label}
        {predicted && (
          <span className="ml-1 text-[9px] font-normal normal-case opacity-60">predicted</span>
        )}
      </span>
      <div className="h-px flex-1" style={{ background: inkColor, opacity: 0.3 }} />
    </div>
  );
}

function PlayerRow({
  slot,
  inkColor,
  align,
  isSub = false,
}: {
  slot: LineupSlot;
  inkColor: string;
  align: 'left' | 'right';
  isSub?: boolean;
}) {
  const isRight = align === 'right';
  const hasSubOff = slot.subbedOffMinute !== undefined;
  const hasSubOn = slot.subbedOnMinute !== undefined;

  const numberEl = (
    <span
      className="w-6 shrink-0 text-[13px] font-normal leading-none tabular-nums"
      style={{ color: inkColor, opacity: 0.5, textAlign: isRight ? 'right' : 'left' }}
    >
      {slot.shirtNumber}
    </span>
  );

  const nameEl = (
    <span
      className="min-w-0 truncate text-[13px] font-semibold leading-none"
      style={{ color: inkColor }}
    >
      {slot.playerName}
    </span>
  );

  const indicatorEl = (hasSubOff || hasSubOn) ? (
    <SubIndicator
      direction={isSub ? 'on' : 'off'}
      minute={isSub ? slot.subbedOnMinute! : slot.subbedOffMinute!}
    />
  ) : null;

  return (
    <div
      className={`flex items-center gap-1.5 py-[5px] ${isRight ? 'flex-row-reverse' : ''}`}
    >
      {indicatorEl && !isRight && indicatorEl}
      {isRight ? (
        <>
          {numberEl}
          {nameEl}
          {indicatorEl}
        </>
      ) : (
        <>
          {numberEl}
          {nameEl}
        </>
      )}
    </div>
  );
}

export function SubIndicator({ direction, minute }: { direction: 'on' | 'off'; minute: number }) {
  const isOn = direction === 'on';
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <span
        className="text-[10px] font-semibold leading-none"
        style={{ color: isOn ? '#5EE9B5' : '#E31B23' }}
      >
        {isOn ? '↑' : '↓'}
      </span>
      <span className="text-[9px] font-medium leading-none text-white/50">
        {minute}'
      </span>
    </span>
  );
}
