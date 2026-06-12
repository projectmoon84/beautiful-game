import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import GroupTable from '../components/GroupTable';
import ShareComposer from '../components/ShareComposer';
import { LIVE_DEMO_EVENTS, LIVE_DEMO_FIXTURE } from '../data/liveDemo';
import { formatDate, formatTime } from '../utils/format';
import { randomTeamFact } from '../utils/facts';
import type { Fixture, GroupTableRow, MatchEvent, Team } from '../data/types';

// PitchMarkings geometry: the 896×896 ring container sits at top:−342px
// relative to wherever it's anchored, so its geometric centre is at y=106px
// from the anchor's top edge. We pin the score row to this same y offset
// so the numbers sit exactly on the centre spot.
const CENTRE_SPOT_Y = 106;
const SECTION_H = 212;

// How long (ms) the event replay takes for matches that have event data.
const PLAYBACK_MS = 15_000;

type RevealPhase = 'enter' | 'rings' | 'colours' | 'score' | 'events' | 'done';

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [, setLiveRefreshTick] = useState(0);

  const isLiveDemo = id === 'live-demo';
  const fixture = isLiveDemo ? LIVE_DEMO_FIXTURE : id ? dataService.fixture(id) : undefined;
  const home = fixture ? dataService.team(fixture.homeTeamId) : undefined;
  const away = fixture ? dataService.team(fixture.awayTeamId) : undefined;

  useEffect(() => {
    if (!fixture || isLiveDemo) return;
    if (fixture.status !== 'live' && fixture.status !== 'finished') return;
    let cancelled = false;
    async function refresh() {
      const changed = await dataService.refreshMatch(fixture!.id);
      if (!cancelled && changed) setLiveRefreshTick(t => t + 1);
    }
    refresh();
    if (fixture.status !== 'live') return () => { cancelled = true; };
    const interval = window.setInterval(refresh, 10_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [fixture?.id, fixture?.status, isLiveDemo]);

  const homeFact = useMemo(() => home ? randomTeamFact(home) : '', [fixture?.id, home?.id]);
  const awayFact = useMemo(() => away ? randomTeamFact(away) : '', [fixture?.id, away?.id]);

  if (!fixture || !home || !away) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-center opacity-40">
        <p>Match not found.</p>
      </div>
    );
  }

  const venue = dataService.venue(fixture.venueId);
  const allEvents = isLiveDemo ? LIVE_DEMO_EVENTS : dataService.matchEvents(fixture.id);
  const rows = isLiveDemo ? liveDemoRows() : dataService.standingsForGroup(fixture.groupId);
  const isScored = fixture.status === 'live' || fixture.status === 'finished';
  const isLive = fixture.status === 'live';
  const isUpcoming = fixture.status === 'scheduled';
  const hasTimeline = isScored && allEvents.length > 0;
  const awayInk = away.secondaryHex;

  return (
    <MatchPageContent
      fixture={fixture}
      home={home}
      away={away}
      awayInk={awayInk}
      allEvents={allEvents}
      rows={rows}
      venue={venue}
      isScored={isScored}
      isLive={isLive}
      isUpcoming={isUpcoming}
      hasTimeline={hasTimeline}
      homeFact={homeFact}
      awayFact={awayFact}
      onBack={() => navigate(-1)}
      shareOpen={shareOpen}
      setShareOpen={setShareOpen}
    />
  );
}

// ─── Inner component — owns reveal state ────────────────────────────────────

function MatchPageContent({
  fixture, home, away, awayInk, allEvents, rows, venue,
  isScored, isLive, isUpcoming, hasTimeline,
  homeFact, awayFact,
  onBack, shareOpen, setShareOpen,
}: {
  fixture: Fixture;
  home: Team;
  away: Team;
  awayInk: string;
  allEvents: MatchEvent[];
  rows: GroupTableRow[];
  venue: ReturnType<typeof dataService.venue>;
  isScored: boolean;
  isLive: boolean;
  isUpcoming: boolean;
  hasTimeline: boolean;
  homeFact: string;
  awayFact: string;
  onBack: () => void;
  shareOpen: boolean;
  setShareOpen: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  // ── Reveal animation state ─────────────────────────────────────────────────
  const [phase, setPhase] = useState<RevealPhase>('enter');
  const [revealedCount, setRevealedCount] = useState(0);
  const [confettiItems, setConfettiItems] = useState<Array<{ key: string; colors: string[] }>>([]);
  const revealTimerIdsRef = useRef<number[]>([]);

  // Capture the playable events exactly once on mount so the replay is a
  // faithful 15-second recap, independent of live data updates that arrive later.
  const playableRef = useRef<MatchEvent[]>(null!);
  if (playableRef.current === null) {
    playableRef.current = [...allEvents]
      .filter(e => e.type === 'goal' || e.type === 'penalty' || e.type === 'yellow' || e.type === 'red')
      .sort((a, b) => a.minute - b.minute);
  }
  const playableEvents = playableRef.current;
  const isDone = phase === 'done';

  const clearRevealTimers = useCallback(() => {
    revealTimerIdsRef.current.forEach(timerId => window.clearTimeout(timerId));
    revealTimerIdsRef.current = [];
  }, []);

  const skipReveal = useCallback(() => {
    if (!hasTimeline || playableEvents.length === 0 || isDone) return;
    clearRevealTimers();
    setRevealedCount(playableEvents.length);
    setPhase('done');
  }, [clearRevealTimers, hasTimeline, isDone, playableEvents.length]);

  const handleReplayTap = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('button, a, input, select, textarea, [role="button"]')) return;
    skipReveal();
  }, [skipReveal]);

  // ── FLIP: smooth push-down of bottom section when a new event appears ─────
  const bottomRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (revealedCount === 0) return;
    const el = bottomRef.current;
    if (!el) return;
    // Approximate height of the newly inserted event row so we can pre-invert
    // the bottom section and transition it back to its natural position.
    const newEvent = playableRef.current[revealedCount - 1];
    const rowH = newEvent?.assistPlayerId ? 58 : 46;
    // Apply the displaced starting position with no transition.
    el.style.transition = 'none';
    el.style.transform = `translateY(-${rowH}px)`;
    // getBoundingClientRect forces a synchronous layout flush so the browser
    // commits the displaced state before we enable the transition.
    el.getBoundingClientRect();
    el.style.transition = 'transform 480ms cubic-bezier(0.16,1,0.3,1)';
    el.style.transform = '';
  }, [revealedCount]);

  useEffect(() => {
    const timers: number[] = [];
    const schedule = (fn: () => void, delay: number) => {
      const timerId = window.setTimeout(fn, delay);
      timers.push(timerId);
      revealTimerIdsRef.current.push(timerId);
      return timerId;
    };

    schedule(() => setPhase('rings'),   20);
    schedule(() => setPhase('colours'), 480);
    schedule(() => setPhase('score'),   820);

    if (!hasTimeline || playableEvents.length === 0) {
      schedule(() => setPhase('done'), 1100);
      return () => {
        timers.forEach(timerId => window.clearTimeout(timerId));
        revealTimerIdsRef.current = revealTimerIdsRef.current.filter(timerId => !timers.includes(timerId));
      };
    }

    schedule(() => setPhase('events'), 1200);
    const gap = PLAYBACK_MS / playableEvents.length;

    playableEvents.forEach((evt, i) => {
      schedule(() => {
        setRevealedCount(i + 1);
        if (evt.type === 'goal' || evt.type === 'penalty') {
          const team = evt.teamId === home.id ? home : away;
          setConfettiItems(prev => [
            ...prev,
            { key: `${evt.id}-${i}`, colors: [team.primaryHex, team.secondaryHex, '#ffffff'] },
          ]);
        }
      }, 1200 + i * gap);
    });

    schedule(() => setPhase('done'), 1200 + PLAYBACK_MS + 400);
    return () => {
      timers.forEach(timerId => window.clearTimeout(timerId));
      revealTimerIdsRef.current = revealTimerIdsRef.current.filter(timerId => !timers.includes(timerId));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // ── Derived display values ─────────────────────────────────────────────────
  const scoreVisible = phase === 'score' || phase === 'events' || isDone;
  const colorsVisible = phase !== 'enter';
  const ringsVisible = phase !== 'enter';

  // During replay build up the score from revealed goal events.
  // After replay, use the real fixture scores.
  const displayHomeScore = isScored
    ? isDone || !hasTimeline
      ? (fixture.homeScore ?? 0)
      : playableEvents
          .slice(0, revealedCount)
          .filter(e => (e.type === 'goal' || e.type === 'penalty') && e.teamId === home.id)
          .length
    : null;
  const displayAwayScore = isScored
    ? isDone || !hasTimeline
      ? (fixture.awayScore ?? 0)
      : playableEvents
          .slice(0, revealedCount)
          .filter(e => (e.type === 'goal' || e.type === 'penalty') && e.teamId === away.id)
          .length
    : null;

  // The timeline shows the events revealed so far; once done, use the live array.
  const shownEvents: MatchEvent[] = isDone
    ? allEvents.filter(e => e.type === 'goal' || e.type === 'penalty' || e.type === 'yellow' || e.type === 'red')
    : playableEvents.slice(0, revealedCount);

  return (
    <div
      className={['relative flex min-h-[calc(100dvh-6rem)] flex-col overflow-x-hidden bg-[var(--surface)]', isLive ? 'pb-14' : ''].join(' ')}
      onPointerUpCapture={handleReplayTap}
    >
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="absolute left-4 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-lg font-bold text-white active:opacity-70"
        aria-label="Back"
      >
        ‹
      </button>

      {/* Pitch rings — outside the section so they're never clipped */}
      <PitchRings reveal={ringsVisible} />

      {/* Single unified centre line spanning the full page height */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-10 w-px -translate-x-px"
        style={{
          height: '100%',
          background: 'rgba(255,255,255,0.20)',
          opacity: colorsVisible ? 1 : 0,
          transition: 'opacity 350ms 300ms ease-out',
        }}
      />

      {/* ── Score hero ────────────────────────────────────────────────────────── */}
      {/* No overflow-hidden here — rings bleed through intentionally */}
      <section
        className="relative w-full shrink-0"
        style={{ height: SECTION_H, background: '#000' }}
      >
        {/* Team colour wash */}
        <div
          className="absolute inset-0 z-0 flex"
          style={{ opacity: colorsVisible ? 1 : 0, transition: 'opacity 520ms ease-out' }}
        >
          <div className="flex-1" style={{ background: home.primaryHex }} />
          <div className="flex-1" style={{ background: away.primaryHex }} />
        </div>

        {/* Top info bar */}
        <div
          className="absolute left-0 right-0 top-4 z-20 flex px-5"
          style={{ opacity: scoreVisible ? 1 : 0, transition: 'opacity 300ms ease-out' }}
        >
          <span className="flex-1 text-[12px] font-medium leading-none" style={{ color: home.secondaryHex }}>
            {formatDate(fixture.kickoffUtc)} · {formatTime(fixture.kickoffUtc)}
          </span>
          <span className="flex-1 text-right text-[12px] font-medium leading-none" style={{ color: awayInk }}>
            Group {fixture.groupId}
          </span>
        </div>

        {/* Score row — pinned exactly at the centre-spot y */}
        <div
          className="absolute left-0 right-0 z-20 flex items-center"
          style={{ top: CENTRE_SPOT_Y, transform: 'translateY(-50%)' }}
        >
          {/* Home: code → score, right-aligned toward centre */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-7 pl-5 pr-2">
            <span
              className="min-w-0 truncate text-[44px] font-bold uppercase leading-none sm:text-[56px]"
              style={{
                color: home.secondaryHex,
                opacity: scoreVisible ? 1 : 0,
                animation: scoreVisible ? 'ui-in 450ms cubic-bezier(0.16,1,0.3,1) both' : undefined,
              }}
            >
              {home.shortCode}
            </span>
            {isScored ? (
              <TickerNumber value={displayHomeScore ?? 0} color={home.secondaryHex} visible={scoreVisible} />
            ) : (
              <FlagMarker flag={home.flagEmoji} visible={scoreVisible} />
            )}
          </div>

          {/* Away: score → code, left-aligned from centre */}
          <div className="flex min-w-0 flex-1 items-center justify-start gap-7 pl-2 pr-5">
            {isScored ? (
              <TickerNumber value={displayAwayScore ?? 0} color={awayInk} visible={scoreVisible} />
            ) : (
              <FlagMarker flag={away.flagEmoji} visible={scoreVisible} />
            )}
            <span
              className="min-w-0 truncate text-[44px] font-bold uppercase leading-none sm:text-[56px]"
              style={{
                color: awayInk,
                opacity: scoreVisible ? 1 : 0,
                animation: scoreVisible ? 'ui-in 450ms cubic-bezier(0.16,1,0.3,1) both' : undefined,
              }}
            >
              {away.shortCode}
            </span>
          </div>
        </div>

        {/* LIVE pill */}
        {isLive && scoreVisible && (
          <div
            className="absolute right-5 z-30 flex items-center gap-1 rounded-full bg-black/60 py-0.5 pl-1 pr-1.5"
            style={{ top: CENTRE_SPOT_Y + 30 }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5EE9B5]" />
            <span className="text-[10px] font-medium leading-none text-white">
              {fixture.minute ?? 0} min
            </span>
          </div>
        )}
      </section>

      {/* ── Events + info ──────────────────────────────────────────────────────── */}
      <div className="relative flex w-full flex-1 flex-col">
        {/* Split team colour bg */}
        <div className="absolute inset-0 z-0 flex">
          <div className="flex-1" style={{ background: home.primaryHex }} />
          <div className="flex-1" style={{ background: away.primaryHex }} />
        </div>
        {/* Progressive event timeline — renders only revealed events */}
        {shownEvents.length > 0 && (
          <EventTimeline
            events={shownEvents}
            homeTeamId={home.id}
            homeColor={home.secondaryHex}
            awayColor={awayInk}
          />
        )}

        {/* Info rows */}
        <div ref={bottomRef} className={['relative z-20 mt-auto flex', shownEvents.length > 0 ? 'pt-20' : ''].join(' ')}>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-4 pt-2" style={{ color: home.secondaryHex }}>
            {isUpcoming && venue && (
              <InfoRow label="Venue" value={`${venue.stadium}, ${venue.city}`} color={home.secondaryHex} />
            )}
            <InfoRow label="Title odds" value={home.titleOdds} color={home.secondaryHex} />
            <InfoRow label="That's a fact" value={homeFact} color={home.secondaryHex} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-4 pt-2" style={{ color: awayInk }}>
            {isUpcoming && (
              <InfoRow label="Last time" value={`${home.shortCode} 1 - 1 ${away.shortCode}`} color={awayInk} align="right" />
            )}
            <InfoRow label="Title odds" value={away.titleOdds} color={awayInk} align="right" />
            <InfoRow label="That's a fact" value={awayFact} color={awayInk} align="right" />
          </div>
        </div>
      </div>

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
          events={allEvents}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Confetti — fixed so particles fly across the full viewport */}
      {confettiItems.map(item => (
        <ConfettiBurst key={item.key} colors={item.colors} />
      ))}
    </div>
  );
}

// ─── Pitch rings ──────────────────────────────────────────────────────────────
// Positioned relative to the outer page div so they're never clipped.
// The 896×896 container at top:−342px centres at y=106px = CENTRE_SPOT_Y.

const RINGS = [
  { size: 121.68, border: 1,     opacity: 1   },
  { size: 232.3,  border: 55.31, opacity: 0.1 },
  { size: 453.53, border: 55.31, opacity: 0.1 },
  { size: 674.77, border: 55.31, opacity: 0.1 },
  { size: 896,    border: 55.31, opacity: 0.1 },
];

function PitchRings({ reveal }: { reveal: boolean }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 z-10 h-[896px] w-[896px] -translate-x-1/2"
      style={{ top: -342 }}
      aria-hidden="true"
    >
      {RINGS.map((ring, i) => (
        <div
          key={ring.size}
          className="absolute rounded-full"
          style={{
            width: ring.size,
            height: ring.size,
            left: (896 - ring.size) / 2,
            top:  (896 - ring.size) / 2,
            border: `${ring.border}px solid rgba(255,255,255,${ring.opacity})`,
            transform: reveal ? undefined : 'scale(0)',
            animation: reveal
              ? `ring-in 620ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms both`
              : undefined,
          }}
        />
      ))}

      {/* Centre dot */}
      <div
        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white"
        style={{
          opacity: reveal ? 1 : 0,
          transition: 'opacity 200ms 180ms ease-out',
        }}
      />
    </div>
  );
}

// ─── Score ticker ─────────────────────────────────────────────────────────────

function TickerNumber({ value, color, visible }: { value: number; color: string; visible: boolean }) {
  return (
    <span
      // Changing the key causes React to unmount+remount → animation replays on score change
      key={value}
      className="min-w-[1ch] text-center text-[54px] font-bold leading-[0.88] tabular-nums sm:text-[68px]"
      style={{
        color,
        opacity: visible ? undefined : 0,
        animation: visible ? 'score-pop 380ms cubic-bezier(0.16,1,0.3,1) both' : undefined,
      }}
    >
      {value}
    </span>
  );
}

function FlagMarker({ flag, visible }: { flag: string; visible: boolean }) {
  return (
    <span
      className="text-[30px] leading-none"
      style={{
        opacity: visible ? 1 : 0,
        animation: visible ? 'ui-in 450ms 80ms cubic-bezier(0.16,1,0.3,1) both' : undefined,
      }}
    >
      {flag}
    </span>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
// Fixed-position so particles can fly anywhere in the viewport.

interface ConfettoPiece {
  id: number; color: string;
  dx: number; dy: number; rot: number;
  delay: number; w: number; h: number;
}

function ConfettiBurst({ colors }: { colors: string[] }) {
  const pieces = useMemo<ConfettoPiece[]>(() => {
    return Array.from({ length: 54 }, (_, i) => {
      // Bias particles upward — top hemisphere for the first two-thirds
      const biasUp = i < 36;
      const angle = biasUp
        ? -165 + (i / 36) * 150 + (Math.random() - 0.5) * 28
        : Math.random() * 360;
      const rad = (angle * Math.PI) / 180;
      const speed = 80 + Math.random() * 210;
      return {
        id: i,
        color: colors[i % colors.length],
        dx: Math.cos(rad) * speed,
        dy: Math.sin(rad) * speed,
        rot: Math.random() * 720 - 360,
        delay: Math.random() * 0.2,
        w: 5 + Math.random() * 9,
        h: 3 + Math.random() * 6,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{ top: CENTRE_SPOT_Y, left: '50%' }}
      aria-hidden="true"
    >
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            width: p.w, height: p.h,
            background: p.color,
            // @ts-expect-error CSS custom properties
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--rot': `${p.rot}deg`,
            animation: `confetti-fly 1.4s ${p.delay}s cubic-bezier(0.22,1,0.36,1) both`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Event timeline ───────────────────────────────────────────────────────────
// Events are displayed newest-first (desc minute). During replay they arrive
// in chronological order, so each new event appears at the TOP and existing
// events are pushed down — matching "shifting down as they come in".

function EventTimeline({
  events, homeTeamId, homeColor, awayColor,
}: {
  events: MatchEvent[];
  homeTeamId: string;
  homeColor: string;
  awayColor: string;
}) {
  // Sort descending so newest sits at top
  const sorted = [...events].sort((a, b) => b.minute - a.minute);

  return (
    <div className="relative z-20 w-full py-2">
      {sorted.map(event => (
        <TimelineEvent
          key={event.id}
          event={event}
          isHome={event.teamId === homeTeamId}
          color={event.teamId === homeTeamId ? homeColor : awayColor}
        />
      ))}
    </div>
  );
}

function TimelineEvent({
  event, isHome, color,
}: {
  event: MatchEvent;
  isHome: boolean;
  color: string;
}) {
  const player = dataService.player(event.playerId);
  const assist = event.assistPlayerId ? dataService.player(event.assistPlayerId) : undefined;
  const playerName = player?.name ?? event.playerName ?? 'Unknown';
  const assistName = assist?.name ?? event.assistPlayerName;

  return (
    <div
      className="flex w-full items-start py-[7px]"
      style={{ animation: 'event-row-in 600ms cubic-bezier(0.16,1,0.3,1) both' }}
    >
      {/* Left half — home events */}
      <div className="flex min-w-0 flex-1 items-start justify-end gap-2 pr-7">
        {isHome && (
          <>
            <div className="min-w-0 text-right" style={{ color }}>
              <div className="text-[13px] font-semibold leading-[17px]">{playerName}</div>
              {assistName && (
                <div className="text-[11px] font-medium leading-[15px]" style={{ opacity: 0.65 }}>
                  ↳ {assistName}
                </div>
              )}
            </div>
            <EventIcon type={event.type} />
          </>
        )}
      </div>

      {/* Centre — minute pill */}
      <div className="flex w-10 shrink-0 justify-center pt-[2px]">
        <MinutePill minute={event.minute} />
      </div>

      {/* Right half — away events */}
      <div className="flex min-w-0 flex-1 items-start gap-2 pl-7">
        {!isHome && (
          <>
            <EventIcon type={event.type} />
            <div className="min-w-0" style={{ color }}>
              <div className="text-[13px] font-semibold leading-[17px]">{playerName}</div>
              {assistName && (
                <div className="text-[11px] font-medium leading-[15px]" style={{ opacity: 0.65 }}>
                  ↳ {assistName}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'yellow') return <span className="mt-0.5 block h-3.5 w-2.5 rounded-[2px] border border-white/60 bg-[#FFDF00]" />;
  if (type === 'red')    return <span className="mt-0.5 block h-3.5 w-2.5 rounded-[2px] border border-white/60 bg-[#E31B23]" />;
  return <span className="text-[14px] font-semibold leading-[14px] text-white">⚽</span>;
}

function MinutePill({ minute }: { minute: number }) {
  return (
    <span className="flex h-3 w-7 items-center justify-center rounded-full bg-white px-[5px] py-0.5 text-[10px] font-semibold leading-none text-black">
      {minute}'
    </span>
  );
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

function InfoRow({ label, value, color, align = 'left' }: {
  label: string; value: string; color: string; align?: 'left' | 'right';
}) {
  const right = align === 'right';
  return (
    <div
      className={['flex min-h-[49px] flex-col justify-center border-t py-2', right ? 'items-end text-right' : 'items-start text-left'].join(' ')}
      style={{ borderColor: color, color }}
    >
      <div className="w-full text-[12px] font-semibold leading-tight">{label}</div>
      <div className="w-full text-[12px] font-normal leading-tight">{value}</div>
    </div>
  );
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
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      <span className="text-[14px] font-semibold leading-none">Share the result</span>
      <span className="text-[18px] font-semibold leading-none">🎉</span>
    </button>
  );
}

function liveDemoRows(): GroupTableRow[] {
  const teams = ['BRA', 'NOR', 'CIV', 'POR'].map(id => dataService.team(id)).filter(Boolean);
  return teams.map((team, index) => ({
    team: team!,
    played: index === 0 || index === 3 ? 1 : 0,
    won:  index === 0 ? 1 : 0,
    drawn: 0,
    lost: index === 3 ? 1 : 0,
    goalsFor: index === 0 ? 3 : 0,
    goalsAgainst: index === 0 ? 2 : index === 3 ? 3 : 0,
    goalDiff: index === 0 ? 1 : index === 3 ? -1 : 0,
    points: index === 0 ? 3 : 0,
  }));
}
