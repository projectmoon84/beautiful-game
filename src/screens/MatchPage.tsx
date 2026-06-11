import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import GroupTable from '../components/GroupTable';
import ShareComposer from '../components/ShareComposer';
import { LIVE_DEMO_EVENTS, LIVE_DEMO_FIXTURE } from '../data/liveDemo';
import { formatDate, formatTime } from '../utils/format';
import { randomTeamFact } from '../utils/facts';
import type { GroupTableRow, MatchEvent } from '../data/types';

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);

  const isLiveDemo = id === 'live-demo';
  const fixture = isLiveDemo ? LIVE_DEMO_FIXTURE : id ? dataService.fixture(id) : undefined;
  const home = fixture ? dataService.team(fixture.homeTeamId) : undefined;
  const away = fixture ? dataService.team(fixture.awayTeamId) : undefined;

  if (!fixture || !home || !away) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-center opacity-40">
        <p>Match not found.</p>
      </div>
    );
  }

  const venue = dataService.venue(fixture.venueId);
  const events = isLiveDemo ? LIVE_DEMO_EVENTS : dataService.matchEvents(fixture.id);
  const rows = isLiveDemo ? liveDemoRows() : dataService.standingsForGroup(fixture.groupId);
  const isScored = fixture.status === 'live' || fixture.status === 'finished';
  const isLive = fixture.status === 'live';
  const isUpcoming = fixture.status === 'scheduled';
  const awayInk = away.secondaryHex;
  const homeFact = useMemo(
    () => randomTeamFact(home),
    [fixture.id, home.id],
  );
  const awayFact = useMemo(
    () => randomTeamFact(away),
    [fixture.id, away.id],
  );

  return (
    <div className={['min-h-full bg-[var(--surface)]', isLive ? 'pb-14' : ''].join(' ')}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute left-4 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-lg font-bold text-white active:opacity-70"
        aria-label="Back"
      >
        ‹
      </button>

      <section className="relative flex h-[631px] w-full overflow-hidden">
        <div className="absolute inset-0 z-0 flex">
          <div className="flex-1" style={{ background: home.primaryHex }} />
          <div className="flex-1" style={{ background: away.primaryHex }} />
        </div>

        <PitchMarkings
          events={isLive ? events : []}
          minute={fixture.minute ?? 0}
          homeTeamId={home.id}
          homeColor={home.secondaryHex}
          awayColor={awayInk}
        />

        <div
          className="relative z-20 flex min-w-0 flex-1 flex-col gap-2 overflow-hidden p-4"
          style={{ color: home.secondaryHex }}
        >
          <div className="text-[12px] font-medium leading-none">
            {formatDate(fixture.kickoffUtc)} · {formatTime(fixture.kickoffUtc)}
          </div>

          <TeamHeader
            align="home"
            code={home.shortCode}
            marker={isScored ? String(fixture.homeScore ?? 0) : home.flagEmoji}
            color={home.secondaryHex}
            scored={isScored}
          />

          <div className={['flex flex-1 flex-col gap-0.5', isUpcoming ? 'pt-6' : 'justify-end'].join(' ')}>
            {isUpcoming && venue && (
              <InfoRow
                label="Venue"
                value={`${venue.stadium}, ${venue.city}`}
                color={home.secondaryHex}
              />
            )}
            <InfoRow
              label="Title odds"
              value={home.titleOdds}
              color={home.secondaryHex}
            />
            <InfoRow
              label="That's a fact"
              value={homeFact}
              color={home.secondaryHex}
            />
          </div>
        </div>

        <div
          className="relative z-20 flex min-w-0 flex-1 flex-col gap-2 overflow-hidden p-4"
          style={{ color: awayInk }}
        >
          <div
            className="text-right text-[12px] font-medium leading-none"
            style={{ color: awayInk }}
          >
            Group {fixture.groupId}
          </div>

          <TeamHeader
            align="away"
            code={away.shortCode}
            marker={isScored ? String(fixture.awayScore ?? 0) : away.flagEmoji}
            color={awayInk}
            scored={isScored}
          />

          <div className={['flex flex-1 flex-col gap-0.5', isUpcoming ? 'pt-6' : 'justify-end'].join(' ')}>
            {isUpcoming && (
              <InfoRow
                label="Last time"
                value={`${home.shortCode} 1 - 1 ${away.shortCode}`}
                color={awayInk}
                align="right"
              />
            )}
            <InfoRow
              label="Title odds"
              value={away.titleOdds}
              color={awayInk}
              align="right"
            />
            <InfoRow
              label="That's a fact"
              value={awayFact}
              color={awayInk}
              align="right"
            />
          </div>
        </div>

        {isLive && (
          <div className="absolute left-[54%] top-4 z-30 flex items-center gap-1 rounded-full bg-black/60 py-0.5 pl-1 pr-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5EE9B5]" />
            <span className="text-[10px] font-medium leading-none text-white">
              {fixture.minute ?? 0} min
            </span>
          </div>
        )}
      </section>

      <GroupTable
        label={`Group ${fixture.groupId}`}
        rows={rows}
        onTeamClick={teamId => navigate(`/team/${teamId}`)}
      />

      {isLive && <ShareResultBar onClick={() => setShareOpen(true)} />}
      {shareOpen && (
        <ShareComposer
          fixture={fixture}
          home={home}
          away={away}
          events={events}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

function TeamHeader({
  align,
  code,
  marker,
  color,
  scored,
}: {
  align: 'home' | 'away';
  code: string;
  marker: string;
  color: string;
  scored: boolean;
}) {
  const markerClass = scored
    ? 'min-w-8 text-center text-[54px] font-bold leading-[0.88]'
    : 'text-[30px] font-bold leading-none';
  const codeClass = 'max-w-full truncate text-[48px] font-bold uppercase leading-[0.88] sm:text-[64px]';

  return (
    <div
      className={[
        'flex items-center gap-6 pb-7 pt-[46px]',
        align === 'home' ? 'justify-end' : 'justify-start',
      ].join(' ')}
      style={{ color }}
    >
      {align === 'home' ? (
        <>
          <div className="flex min-w-0 flex-1 items-center justify-end">
            <span className={`${codeClass} text-right`}>
              {code}
            </span>
          </div>
          <span className={markerClass}>{marker}</span>
        </>
      ) : (
        <>
          <span className={markerClass}>{marker}</span>
          <div className="flex min-w-0 flex-1 items-center">
            <span className={codeClass}>
              {code}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  color,
  align = 'left',
}: {
  label: string;
  value: string;
  color: string;
  align?: 'left' | 'right';
}) {
  const right = align === 'right';

  return (
    <div
      className={[
        'flex min-h-[49px] flex-col justify-center border-t py-2',
        right ? 'items-end text-right' : 'items-start text-left',
      ].join(' ')}
      style={{ borderColor: color, color }}
    >
      <div className="w-full text-[12px] font-semibold leading-tight">
        {label}
      </div>
      <div className="w-full text-[12px] font-normal leading-tight">
        {value}
      </div>
    </div>
  );
}

function PitchMarkings({
  events,
  minute,
  homeTeamId,
  homeColor,
  awayColor,
}: {
  events: MatchEvent[];
  minute: number;
  homeTeamId: string;
  homeColor: string;
  awayColor: string;
}) {
  const rings = [
    { size: 121.68, border: 1, opacity: 1 },
    { size: 232.3, border: 55.31, opacity: 0.1 },
    { size: 453.53, border: 55.31, opacity: 0.1 },
    { size: 674.77, border: 55.31, opacity: 0.1 },
    { size: 896, border: 55.31, opacity: 0.1 },
  ];
  const timelineItems = [
    ...events.map(event => ({
      type: 'event' as const,
      minute: event.minute,
      event,
    })),
    ...(minute >= 45 ? [{ type: 'half-time' as const, minute: 45 }] : []),
  ].sort((a, b) => b.minute - a.minute);

  return (
    <>
      <div
        className="pointer-events-none absolute left-1/2 top-[-342px] z-10 h-[896px] w-[896px] -translate-x-1/2"
        aria-hidden="true"
      >
        {rings.map(ring => (
          <div
            key={ring.size}
            className="absolute rounded-full"
            style={{
              width: ring.size,
              height: ring.size,
              left: (896 - ring.size) / 2,
              top: (896 - ring.size) / 2,
              border: `${ring.border}px solid rgba(255,255,255,${ring.opacity})`,
            }}
          />
        ))}
        <div className="absolute left-1/2 top-[342px] h-[638px] w-px bg-white" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white" />
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-[-342px] z-30 h-[896px] w-[896px] -translate-x-1/2"
        aria-hidden="true"
      >
        {timelineItems.map((item, index) => {
          const top = eventTop(index);

          if (item.type === 'half-time') {
            return <HalfTimeEvent key="half-time" top={top} />;
          }

          const isHome = item.event.teamId === homeTeamId;
          return (
            <TimelineEvent
              key={item.event.id}
              event={item.event}
              isHome={isHome}
              color={isHome ? homeColor : awayColor}
              top={top}
            />
          );
        })}
      </div>
    </>
  );
}

function HalfTimeEvent({ top }: { top: number }) {
  return (
    <div
      className="absolute left-1/2 h-10 w-[300px] -translate-x-1/2"
      style={{ top }}
    >
      <div className="absolute left-1/2 top-1.5 z-30 -translate-x-1/2 text-center text-[12px] font-semibold leading-none text-white">
        HT
      </div>
    </div>
  );
}

function TimelineEvent({
  event,
  isHome,
  color,
  top,
}: {
  event: MatchEvent;
  isHome: boolean;
  color: string;
  top: number;
}) {
  const player = dataService.player(event.playerId);
  const assist = event.assistPlayerId ? dataService.player(event.assistPlayerId) : undefined;

  return (
    <div
      className="absolute left-1/2 h-11 w-[300px] -translate-x-1/2"
      style={{ top }}
    >
      <div className="absolute left-1/2 top-1.5 z-30 -translate-x-1/2">
        <MinutePill minute={event.minute} />
      </div>
      {isHome ? (
        <div className="absolute right-[172px] top-1.5 flex items-start justify-end gap-4">
          <EventNames player={player?.name ?? 'Unknown'} assist={assist?.name} color={color} align="right" />
          <EventIcon type={event.type} />
        </div>
      ) : (
        <div className="absolute left-[172px] top-1.5 flex items-start justify-start gap-4">
          <EventIcon type={event.type} />
          <EventNames player={player?.name ?? 'Unknown'} assist={assist?.name} color={color} align="left" />
        </div>
      )}
    </div>
  );
}

function EventNames({
  player,
  assist,
  color,
  align,
}: {
  player: string;
  assist?: string;
  color: string;
  align: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'} style={{ color }}>
      <div className="text-[14px] font-semibold leading-[14px]">{player}</div>
      {assist && <div className="mt-0.5 text-[14px] font-normal leading-[14px]">{assist}</div>}
    </div>
  );
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'yellow') {
    return (
      <span className="mt-0.5 block h-3.5 w-2.5 rounded-[2px] border border-white/60 bg-[#FFDF00]" />
    );
  }

  if (type === 'red') {
    return (
      <span className="mt-0.5 block h-3.5 w-2.5 rounded-[2px] border border-white/60 bg-[#E31B23]" />
    );
  }

  return <span className="text-[14px] font-semibold leading-[14px] text-white">⚽</span>;
}

function MinutePill({ minute }: { minute: number }) {
  return (
    <span className="flex h-3 w-7 items-center justify-center rounded-full bg-white px-[5px] py-0.5 text-[10px] font-semibold leading-none text-black">
      {minute}'
    </span>
  );
}

function eventTop(index: number): number {
  return 342 + 178 + index * 40;
}

function ShareResultBar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-24 left-0 right-0 z-40 flex h-14 items-center justify-center gap-2 bg-[var(--surface)] text-black outline outline-[5px] -outline-offset-[5px] outline-black active:bg-white"
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M6.667 7.5h-.834a1.667 1.667 0 0 0-1.666 1.667v6.666A1.667 1.667 0 0 0 5.833 17.5h8.334a1.667 1.667 0 0 0 1.666-1.667V9.167A1.667 1.667 0 0 0 14.167 7.5h-.834M10 11.667V2.5M12.5 5 10 2.5 7.5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[14px] font-semibold leading-none">Share the result</span>
      <span className="text-[18px] font-semibold leading-none">🎉</span>
    </button>
  );
}

function liveDemoRows(): GroupTableRow[] {
  const teams = ['BRA', 'NOR', 'CIV', 'POR']
    .map(id => dataService.team(id))
    .filter(Boolean);

  return teams.map((team, index) => ({
    team: team!,
    played: index === 0 || index === 3 ? 1 : 0,
    won: index === 0 ? 1 : 0,
    drawn: 0,
    lost: index === 3 ? 1 : 0,
    goalsFor: index === 0 ? 3 : 0,
    goalsAgainst: index === 0 ? 2 : index === 3 ? 3 : 0,
    goalDiff: index === 0 ? 1 : index === 3 ? -1 : 0,
    points: index === 0 ? 3 : 0,
  }));
}
