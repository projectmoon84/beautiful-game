import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import GroupTable from '../components/GroupTable';
import ShareComposer from '../components/ShareComposer';
import MatchControlBar, { type MatchTab, type MatchControlBarStatus } from '../components/MatchControlBar';
import MatchStats from '../components/MatchStats';
import MatchLineups from '../components/MatchLineups';
import { LIVE_DEMO_EVENTS, LIVE_DEMO_FIXTURE } from '../data/liveDemo';
import { markFixtureSeen } from '../utils/seenFixtures';
import { formatDate, formatTime } from '../utils/format';
import { randomTeamFact } from '../utils/facts';
import { isFinishedKnockoutDraw, isScoringEvent, isShootoutEvent, timelineMinuteLabel } from '../utils/matchResult';
import type { Fixture, GroupTableRow, MatchEvent, Team } from '../data/types';


// PitchMarkings geometry: the 896×896 ring container sits at top:−342px
// relative to wherever it's anchored, so its geometric centre is at y=106px
// from the anchor's top edge. We pin the score row to this same y offset
// so the numbers sit exactly on the centre spot.
const CENTRE_SPOT_Y = 106;
const SECTION_H = 212;

// Each minute of match time maps to this many ms in the reveal timeline.
const MS_PER_MINUTE = 150;
const EVENT_BREATH_MS = 1100;        // breathing room between consecutive events
const GOAL_BREATH_MS = 1600;         // extra theatre after a goal
const SAME_MINUTE_EXTRA_MS = 300;    // bonus gap after a same-minute cluster
const TIMELINE_EASE = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // smooth ease-out for push-downs
const ENTRY_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';           // gentle spring for new event entry
const ENTRY_DELAY_MS = 280;   // let space clear before the new event slides in
const ENTRY_DURATION_MS = 680;

type RevealPhase = 'enter' | 'rings' | 'colours' | 'score' | 'events' | 'done';
type TimelineMarkerKind = 'HT' | 'FT' | 'AET' | 'PEN_START';
type ShootoutAttempt = {
  teamId: string;
  outcome: 'scored' | 'missed';
  label: string;
  playerId?: string;
  playerName?: string;
};
type TimelineItem =
  | { kind: 'event'; id: string; event: MatchEvent; sortValue: number; replayMinute: number }
  | { kind: 'marker'; id: string; marker: TimelineMarkerKind; label: string; sortValue: number; replayMinute: number }
  | { kind: 'shootout_round'; id: string; round: number; scoreline: string; homeAttempt?: ShootoutAttempt; awayAttempt?: ShootoutAttempt; sortValue: number; replayMinute: number };

function isTimelineEvent(event: MatchEvent): boolean {
  return (
    event.type === 'goal' ||
    event.type === 'own_goal' ||
    event.type === 'var_goal' ||
    event.type === 'var_cancelled' ||
    event.type === 'penalty' ||
    event.type === 'penalty_missed' ||
    event.type === 'yellow' ||
    event.type === 'second_yellow' ||
    event.type === 'red' ||
    event.type === 'sub' ||
    event.type === 'shootout_goal' ||
    event.type === 'shootout_miss' ||
    event.type === 'shootout_saved'
  );
}

function eventSortValue(event: MatchEvent, index = 0): number {
  return isShootoutEvent(event) ? 200 + index : event.minute;
}

function eventReplayMinute(event: MatchEvent, index: number): number {
  return isShootoutEvent(event) ? 121 + index : event.minute;
}

function buildTimelineItems(events: MatchEvent[], fixture: Fixture): TimelineItem[] {
  const sortedEvents = [...events]
    .filter(isTimelineEvent)
    .sort((a, b) => eventSortValue(a) - eventSortValue(b) || a.minute - b.minute);
  const regularEvents = sortedEvents.filter(event => !isShootoutEvent(event));
  const shootoutEvents = sortedEvents.filter(isShootoutEvent);
  const hasExtraTime = regularEvents.some(event => event.minute > 90);
  const hasShootout = shootoutEvents.length > 0 || isFinishedKnockoutDraw(fixture);
  const currentMinute = fixture.minute ?? 0;
  const reachedHt = fixture.status === 'finished' || currentMinute >= 45 || regularEvents.some(event => event.minute >= 45);
  const reachedFt = fixture.status === 'finished' || currentMinute >= 90 || hasExtraTime || hasShootout;

  const items: TimelineItem[] = regularEvents.map((event, index) => ({
    kind: 'event',
    id: event.id,
    event,
    sortValue: eventSortValue(event, index),
    replayMinute: eventReplayMinute(event, index),
  }));

  if (reachedHt) {
    items.push({ kind: 'marker', id: `${fixture.id}-marker-ht`, marker: 'HT', label: 'HT', sortValue: 45, replayMinute: 45 });
  }

  if (reachedFt) {
    items.push({ kind: 'marker', id: `${fixture.id}-marker-ft`, marker: 'FT', label: hasExtraTime || hasShootout ? 'FT' : 'FT', sortValue: 90, replayMinute: 90 });
  }

  if (hasExtraTime || hasShootout) {
    items.push({ kind: 'marker', id: `${fixture.id}-marker-aet`, marker: 'AET', label: 'AET', sortValue: 120, replayMinute: 120 });
  }

  if (hasShootout) {
    items.push({
      kind: 'marker',
      id: `${fixture.id}-marker-pens`,
      marker: 'PEN_START',
      label: 'Penalty shootout',
      sortValue: 199,
      replayMinute: 121,
    });
    items.push(
      ...(shootoutEvents.length > 0
        ? buildShootoutEventRoundItems(shootoutEvents, fixture)
        : buildShootoutSummaryItems(fixture)
      ),
    );
  }

  return items.sort((a, b) => a.sortValue - b.sortValue);
}

function buildShootoutSummaryItems(fixture: Fixture): TimelineItem[] {
  if (
    fixture.homePenaltyScore === undefined ||
    fixture.awayPenaltyScore === undefined ||
    !fixture.homeTeamId ||
    !fixture.awayTeamId
  ) {
    return [];
  }

  const items: TimelineItem[] = [];
  let homeMade = 0;
  let awayMade = 0;
  const homeTotalAttempts = fixture.homePenaltyScore < fixture.awayPenaltyScore ? 5 : Math.max(4, fixture.homePenaltyScore);
  const awayTotalAttempts = fixture.awayPenaltyScore > fixture.homePenaltyScore ? 4 : 5;
  const maxRounds = Math.max(homeTotalAttempts, awayTotalAttempts);

  const makeAttempt = (teamId: string, madeSoFar: number, targetScore: number): ShootoutAttempt => {
    const canScore = madeSoFar < targetScore;
    const outcome: 'scored' | 'missed' = canScore ? 'scored' : 'missed';
    if (teamId === fixture.homeTeamId && outcome === 'scored') homeMade++;
    if (teamId === fixture.awayTeamId && outcome === 'scored') awayMade++;
    return {
      teamId,
      label: outcome === 'scored' ? 'Penalty scored' : 'Penalty missed',
      outcome,
    };
  };

  for (let round = 1; round <= maxRounds; round++) {
    const homeAttempt = round <= homeTotalAttempts
      ? makeAttempt(fixture.homeTeamId, homeMade, fixture.homePenaltyScore)
      : undefined;
    const awayAttempt = round <= awayTotalAttempts
      ? makeAttempt(fixture.awayTeamId, awayMade, fixture.awayPenaltyScore)
      : undefined;
    items.push({
      kind: 'shootout_round',
      id: `${fixture.id}-pens-round-${round}`,
      round,
      scoreline: `${homeMade}-${awayMade}`,
      homeAttempt,
      awayAttempt,
      sortValue: 200 + round,
      replayMinute: 121 + round,
    });
  }

  return items;
}

function buildShootoutEventRoundItems(events: MatchEvent[], fixture: Fixture): TimelineItem[] {
  const rounds = new Map<number, Extract<TimelineItem, { kind: 'shootout_round' }>>();
  let homeMade = 0;
  let awayMade = 0;
  let homeAttemptCount = 0;
  let awayAttemptCount = 0;

  for (const event of events) {
    const isHome = event.teamId === fixture.homeTeamId;
    const round = isHome ? ++homeAttemptCount : ++awayAttemptCount;
    const outcome: 'scored' | 'missed' = event.type === 'shootout_goal' ? 'scored' : 'missed';
    if (isHome && outcome === 'scored') homeMade++;
    if (!isHome && outcome === 'scored') awayMade++;

    const item = rounds.get(round) ?? {
      kind: 'shootout_round',
      id: `${fixture.id}-pens-round-${round}`,
      round,
      scoreline: `${homeMade}-${awayMade}`,
      sortValue: 200 + round,
      replayMinute: 121 + round,
    };
    const attempt: ShootoutAttempt = {
      teamId: event.teamId,
      outcome,
      label: outcome === 'scored' ? 'Penalty scored' : event.type === 'shootout_saved' ? 'Penalty saved' : 'Penalty missed',
      playerId: event.playerId,
      playerName: event.playerName,
    };
    if (isHome) {
      item.homeAttempt = attempt;
    }
    if (!isHome) {
      item.awayAttempt = attempt;
    }
    item.scoreline = `${homeMade}-${awayMade}`;
    rounds.set(round, item);
  }

  return [...rounds.values()].sort((a, b) => a.round - b.round);
}

function timerLabelForItem(item: TimelineItem): string | undefined {
  if (item.kind === 'marker') return item.marker === 'PEN_START' ? 'PEN' : item.label;
  if (item.kind === 'shootout_round') return `PEN ${item.scoreline}`;
  if (isShootoutEvent(item.event)) return 'PEN';
  if (item.event.minute > 90) return 'ET';
  return undefined;
}

function finishedTimerLabel(fixture: Fixture): string | undefined {
  if (fixture.homePenaltyScore !== undefined && fixture.awayPenaltyScore !== undefined) {
    return `PEN ${fixture.homePenaltyScore}-${fixture.awayPenaltyScore}`;
  }
  if (fixture.stage !== 'group' && (fixture.minute ?? 0) > 90) return 'AET';
  return undefined;
}

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

  // Mark fixture seen whenever we land on (or update) this page.
  // For live matches this re-stamps the current score so the card re-obscures
  // only when the score advances after the user has left the page.
  useEffect(() => {
    if (!fixture || isLiveDemo) return;
    if (fixture.status === 'live' || fixture.status === 'finished') {
      markFixtureSeen(fixture.id, fixture.homeScore ?? 0, fixture.awayScore ?? 0, fixture.status);
    }
  }, [fixture?.id, fixture?.homeScore, fixture?.awayScore, fixture?.status, isLiveDemo]);

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
  const hasTimeline = isScored && (allEvents.length > 0 || fixture.status === 'finished');
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
      isLiveDemo={isLiveDemo}
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
  isLiveDemo, isScored, isLive, isUpcoming, hasTimeline,
  homeFact, awayFact,
  onBack, shareOpen, setShareOpen,
}: {
  fixture: Fixture;
  home: Team;
  away: Team;
  awayInk: string;
  allEvents: MatchEvent[];
  rows: GroupTableRow[];
  isLiveDemo: boolean;
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

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<MatchTab>('timeline');

  // ── Reveal animation state ─────────────────────────────────────────────────
  const [phase, setPhase] = useState<RevealPhase>('enter');
  const [revealedCount, setRevealedCount] = useState(0);
  const [replayMinute, setReplayMinute] = useState(0);
  const [replayLabel, setReplayLabel] = useState<string | undefined>();
  const [confettiItems, setConfettiItems] = useState<Array<{ key: string; colors: string[] }>>([]);
  const revealTimerIdsRef = useRef<number[]>([]);

  // Timeline items include real match events plus phase markers such as HT, FT,
  // AET, and penalties. Keep them reactive so the post-mount match refresh can
  // pull in late extra-time rows without leaving the timeline stuck on stale data.
  const playableItems = useMemo(
    () => buildTimelineItems(allEvents, fixture),
    [allEvents, fixture],
  );
  const isDone = phase === 'done';

  const controlBarStatus = useMemo<MatchControlBarStatus>(() => {
    if (isLive) return { kind: 'live', minute: fixture.minute ?? 0 };
    if (isUpcoming) {
      return {
        kind: 'upcoming',
        date: formatDate(fixture.kickoffUtc),
        time: formatTime(fixture.kickoffUtc),
      };
    }
    if (phase === 'events') return { kind: 'replaying', minute: replayMinute, label: replayLabel };
    return { kind: 'finished', label: finishedTimerLabel(fixture) };
  }, [
    isLive,
    isUpcoming,
    phase,
    replayMinute,
    replayLabel,
    fixture.minute,
    fixture.kickoffUtc,
    fixture.stage,
    fixture.homePenaltyScore,
    fixture.awayPenaltyScore,
  ]);

  const clearRevealTimers = useCallback(() => {
    revealTimerIdsRef.current.forEach(timerId => window.clearTimeout(timerId));
    revealTimerIdsRef.current = [];
  }, []);

  const skipReveal = useCallback(() => {
    if (!hasTimeline || isDone) return;
    clearRevealTimers();
    setRevealedCount(playableItems.length);
    setPhase('done');
  }, [clearRevealTimers, hasTimeline, isDone, playableItems.length]);

  const handleReplayTap = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('button, a, input, select, textarea, [role="button"]')) return;
    skipReveal();
  }, [skipReveal]);

  // ── FLIP: smooth push-down of bottom section when a new event appears ─────
  const bottomRef = useRef<HTMLDivElement>(null);

  const flipBottom = (el: HTMLDivElement, offset: number, duration = 480) => {
    el.style.transition = 'none';
    el.style.transform = `translateY(-${offset}px)`;
    el.getBoundingClientRect();
    el.style.transition = `transform ${duration}ms ${TIMELINE_EASE}`;
    el.style.transform = '';
  };

  useLayoutEffect(() => {
    if (revealedCount === 0) return;
    const el = bottomRef.current;
    if (!el) return;
    const newEvent = playableItems[revealedCount - 1];
    const rowH = newEvent?.kind === 'event' && newEvent.event.assistPlayerId ? 58 : 46;
    flipBottom(el, rowH);
  }, [playableItems, revealedCount]);

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

    if (!hasTimeline || playableItems.length === 0) {
      schedule(() => setPhase('done'), 1100);
      return () => {
        timers.forEach(timerId => window.clearTimeout(timerId));
        revealTimerIdsRef.current = revealTimerIdsRef.current.filter(timerId => !timers.includes(timerId));
      };
    }

    schedule(() => setPhase('events'), 1200);

    const GOAL_TYPES = new Set<string>(['goal', 'own_goal', 'var_goal', 'penalty']);

    let bonusMs = 0;
    let lastFireTime = 1200;
    let prevMinute = 0;     // tracks the last minute the clock showed
    let lastBreath = EVENT_BREATH_MS;

    playableItems.forEach((item, i) => {
      const replayMinute = item.replayMinute;
      const fireAt = 1200 + replayMinute * MS_PER_MINUTE + bonusMs;
      lastFireTime = fireAt;

      // Tick minutes between prevMinute and this event (clock ticks naturally up to the event).
      for (let m = prevMinute + 1; m < replayMinute; m++) {
        const tickAt = fireAt - (replayMinute - m) * MS_PER_MINUTE;
        schedule(() => {
          setReplayMinute(m);
          setReplayLabel(m > 120 ? 'PEN' : m > 90 ? 'ET' : undefined);
        }, tickAt);
      }

      // At the event's own minute: clock reaches the event's minute AND the event reveals.
      schedule(() => {
        setReplayMinute(replayMinute);
        setReplayLabel(timerLabelForItem(item));
        setRevealedCount(i + 1);
        if (item.kind === 'event' && GOAL_TYPES.has(item.event.type)) {
          const team = item.event.teamId === home.id ? home : away;
          setConfettiItems(prev => [
            ...prev,
            { key: `${item.event.id}-${i}`, colors: [team.primaryHex, team.secondaryHex, '#ffffff'] },
          ]);
        }
      }, fireAt);

      prevMinute = replayMinute;

      // Same-minute events get a bonus gap so the cluster feels intentionally staggered.
      const isSameMinuteAsPrev = i > 0 && playableItems[i - 1].replayMinute === item.replayMinute;
      lastBreath = EVENT_BREATH_MS
        + (item.kind === 'event' && GOAL_TYPES.has(item.event.type) ? GOAL_BREATH_MS : 0)
        + (isSameMinuteAsPrev ? SAME_MINUTE_EXTRA_MS : 0);
      bonusMs += lastBreath;
    });

    // After the last event's breathing pause, tick the clock to 90 (or to the ET
    // minute if the last event was in extra time).
    const maxMinute = Math.max(90, prevMinute);
    let lastScheduledTime = lastFireTime;
    for (let m = prevMinute + 1; m <= maxMinute; m++) {
      const tickAt = lastFireTime + lastBreath + (m - prevMinute) * MS_PER_MINUTE;
      lastScheduledTime = tickAt;
      schedule(() => {
        setReplayMinute(m);
        setReplayLabel(m > 120 ? 'PEN' : m > 90 ? 'ET' : undefined);
      }, tickAt);
    }

    // Settle once the clock finishes.
    schedule(() => setPhase('done'), lastScheduledTime + 800);
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
      : playableItems
          .slice(0, revealedCount)
          .filter(item => item.kind === 'event' && isScoringEvent(item.event) && item.event.teamId === home.id)
          .length
    : null;
  const displayAwayScore = isScored
    ? isDone || !hasTimeline
      ? (fixture.awayScore ?? 0)
      : playableItems
          .slice(0, revealedCount)
          .filter(item => item.kind === 'event' && isScoringEvent(item.event) && item.event.teamId === away.id)
          .length
    : null;

  // The timeline shows the events revealed so far; once done, use the live array.
  const shownItems: TimelineItem[] = isDone
    ? playableItems
    : playableItems.slice(0, revealedCount);

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

      {/* ── Score hero — rings clipped to this section ───────────────────────── */}
      <div className="relative overflow-hidden">
        <PitchRings reveal={ringsVisible} />

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
        </section>
      </div>{/* end rings-clipped wrapper */}

      {/* ── Control bar ──────────────────────────────────────────────────────── */}
      <div className="relative z-20">
        <MatchControlBar
          activeTab={tab}
          onTab={setTab}
          status={controlBarStatus}
        />
      </div>

      {/* ── Body — swaps with active tab ─────────────────────────────────────── */}
      {tab === 'timeline' && (
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto">
          {/* Split team colour bg */}
          <div className="absolute inset-0 z-0 flex">
            <div className="flex-1" style={{ background: home.primaryHex }} />
            <div className="flex-1" style={{ background: away.primaryHex }} />
          </div>
          {/* Progressive event timeline — renders only revealed events */}
          {shownItems.length > 0 && (
            <EventTimeline
              items={shownItems}
              homeTeamId={home.id}
              homeColor={home.secondaryHex}
              awayColor={awayInk}
            />
          )}

          {/* Info rows */}
          <div ref={bottomRef} className="relative z-20 mt-auto flex pt-32">
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
      )}

      {tab === 'lineups' && (
        <MatchLineups
          home={home}
          away={away}
          homeLineup={isLiveDemo ? null : dataService.matchLineup(fixture.id, home.id)}
          awayLineup={isLiveDemo ? null : dataService.matchLineup(fixture.id, away.id)}
          homeSquad={dataService.squad(home.id)}
          awaySquad={dataService.squad(away.id)}
        />
      )}

      {tab === 'stats' && (
        <div className="relative z-20">
          <MatchStats
            home={home}
            away={away}
            homeStats={isLiveDemo ? null : dataService.matchTeamStats(fixture.id, home.id)}
            awayStats={isLiveDemo ? null : dataService.matchTeamStats(fixture.id, away.id)}
          />
        </div>
      )}

      <div className="relative z-20">
        <GroupTable
          label={`Group ${fixture.groupId}`}
          rows={rows}
          onTeamClick={teamId => navigate(`/team/${teamId}`)}
        />
      </div>

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
// The SVG pattern is scaled so its centre circle sits around the score group.
// Its centre remains pinned to y=106px = CENTRE_SPOT_Y.

const RINGS_SIZE = 2920;
const RINGS_VIEWBOX = 5020;
const RINGS_CENTRE = 2510;

// Viewport scale: 2920/5020 ≈ 0.582 screen px per SVG unit.
// vectorEffect="non-scaling-stroke" → strokeWidth is always in screen pixels.
//
// Thin circle: r=70px screen → 120 SVG.
// Bands: 60px wide (screen), 0px gap, alternating white 10% / black 8%.
// 10 bands each colour = 20 bands total.
// band-centre-svg = (70 + 30 + band_index * 60) / 0.582
const RING_DATA: { r: number; color: string; strokeWidth: number; opacity: number }[] = [
  { r: 120,  color: 'white', strokeWidth: 1.5, opacity: 0.80 },  // thin centre circle
  { r: 172,  color: 'white', strokeWidth: 60,  opacity: 0.10 },  // band  1  ( 70–130px)
  { r: 275,  color: 'black', strokeWidth: 60,  opacity: 0.08 },  // band  2  (130–190px)
  { r: 378,  color: 'white', strokeWidth: 60,  opacity: 0.10 },  // band  3  (190–250px)
  { r: 481,  color: 'black', strokeWidth: 60,  opacity: 0.08 },  // band  4  (250–310px)
  { r: 584,  color: 'white', strokeWidth: 60,  opacity: 0.10 },  // band  5  (310–370px)
  { r: 687,  color: 'black', strokeWidth: 60,  opacity: 0.08 },  // band  6  (370–430px)
  { r: 790,  color: 'white', strokeWidth: 60,  opacity: 0.10 },  // band  7  (430–490px)
  { r: 894,  color: 'black', strokeWidth: 60,  opacity: 0.08 },  // band  8  (490–550px)
  { r: 997,  color: 'white', strokeWidth: 60,  opacity: 0.10 },  // band  9  (550–610px)
  { r: 1100, color: 'black', strokeWidth: 60,  opacity: 0.08 },  // band 10  (610–670px)
  { r: 1203, color: 'white', strokeWidth: 60,  opacity: 0.10 },  // band 11  (670–730px)
  { r: 1306, color: 'black', strokeWidth: 60,  opacity: 0.08 },  // band 12  (730–790px)
  { r: 1409, color: 'white', strokeWidth: 60,  opacity: 0.10 },  // band 13  (790–850px)
  { r: 1512, color: 'black', strokeWidth: 60,  opacity: 0.08 },  // band 14  (850–910px)
  { r: 1615, color: 'white', strokeWidth: 60,  opacity: 0.10 },  // band 15  (910–970px)
  { r: 1718, color: 'black', strokeWidth: 60,  opacity: 0.08 },  // band 16  (970–1030px)
  { r: 1821, color: 'white', strokeWidth: 60,  opacity: 0.10 },  // band 17  (1030–1090px)
  { r: 1925, color: 'black', strokeWidth: 60,  opacity: 0.08 },  // band 18  (1090–1150px)
  { r: 2028, color: 'white', strokeWidth: 60,  opacity: 0.10 },  // band 19  (1150–1210px)
  { r: 2131, color: 'black', strokeWidth: 60,  opacity: 0.08 },  // band 20  (1210–1270px)
];

function PitchRings({ reveal }: { reveal: boolean }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 z-10"
      style={{
        top: CENTRE_SPOT_Y - RINGS_SIZE / 2,
        width: RINGS_SIZE,
        height: RINGS_SIZE,
        transform: 'translateX(-50%)',
        // Radial reveal: a growing circle clip expanding from the centre spot.
        // 75% ≈ 2190px radius — comfortably covers all 20 bands.
        clipPath: reveal ? 'circle(75% at 50% 50%)' : 'circle(0% at 50% 50%)',
        transition: reveal ? 'clip-path 900ms cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}
      aria-hidden="true"
    >
      <svg
        width={RINGS_SIZE}
        height={RINGS_SIZE}
        viewBox={`0 0 ${RINGS_VIEWBOX} ${RINGS_VIEWBOX}`}
        fill="none"
        className="h-full w-full"
      >
        {RING_DATA.map((ring) => (
          <circle
            key={ring.r}
            cx={RINGS_CENTRE}
            cy={RINGS_CENTRE}
            r={ring.r}
            stroke={ring.color}
            strokeOpacity={ring.opacity}
            strokeWidth={ring.strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Centre dot */}
        <circle
          cx={RINGS_CENTRE}
          cy={RINGS_CENTRE}
          r="10"
          fill="white"
          fillOpacity="0.9"
          style={{
            opacity: reveal ? 1 : 0,
            transition: 'opacity 180ms 200ms ease-out',
          }}
        />
      </svg>
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
  items, homeTeamId, homeColor, awayColor,
}: {
  items: TimelineItem[];
  homeTeamId: string;
  homeColor: string;
  awayColor: string;
}) {
  // Sort descending by minute. Within the same minute, put the most recently
  // revealed event first so new arrivals enter at the top (matching the FLIP).
  const indexMap = useMemo(() => new Map(items.map((item, i) => [item.id, i])), [items]);
  const sorted = useMemo(
    () => [...items].sort((a, b) => {
      const d = b.sortValue - a.sortValue;
      return d !== 0 ? d : (indexMap.get(b.id) ?? 0) - (indexMap.get(a.id) ?? 0);
    }),
    [items, indexMap],
  );

  // FLIP: track DOM positions of existing rows so we can slide them to their
  // new positions whenever a new event or subs are inserted above them.
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const prevPositions = useRef(new Map<string, number>());
  const prevLengthRef = useRef(items.length);
  const previousIdsRef = useRef(new Set(items.map(item => item.id)));
  const previousIds = previousIdsRef.current;

  // Runs first after each render where the count increased — animates existing rows.
  useLayoutEffect(() => {
    if (items.length <= prevLengthRef.current) {
      prevLengthRef.current = items.length;
      return;
    }
    prevLengthRef.current = items.length;

    rowRefs.current.forEach((el, id) => {
      const prevY = prevPositions.current.get(id);
      if (prevY === undefined || !el) return;
      const delta = prevY - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${delta}px)`;
      el.style.willChange = 'transform';
      el.getBoundingClientRect();
      el.style.transition = `transform 480ms ${TIMELINE_EASE}`;
      el.style.transform = '';
      window.setTimeout(() => {
        el.style.willChange = '';
      }, 500);
    });
  }, [items.length]);

  // Runs second after every render — captures positions for the next FLIP.
  useLayoutEffect(() => {
    rowRefs.current.forEach((el, id) => {
      if (el) prevPositions.current.set(id, el.getBoundingClientRect().top);
    });
    previousIdsRef.current = new Set(items.map(item => item.id));
  });

  return (
    <div className="relative z-20 w-full py-2 pb-8">
      {sorted.map(item => item.kind === 'marker' ? (
        <TimelineMarker
          key={item.id}
          item={item}
          isNew={!previousIds.has(item.id)}
          rowRef={el => {
            if (el) rowRefs.current.set(item.id, el);
            else rowRefs.current.delete(item.id);
          }}
        />
      ) : item.kind === 'shootout_round' ? (
        <TimelineShootoutRound
          key={item.id}
          item={item}
          homeColor={homeColor}
          awayColor={awayColor}
          isNew={!previousIds.has(item.id)}
          rowRef={el => {
            if (el) rowRefs.current.set(item.id, el);
            else rowRefs.current.delete(item.id);
          }}
        />
      ) : (
        <TimelineEvent
          key={item.id}
          event={item.event}
          isHome={item.event.teamId === homeTeamId}
          color={item.event.teamId === homeTeamId ? homeColor : awayColor}
          isNew={!previousIds.has(item.id)}
          rowRef={el => {
            if (el) rowRefs.current.set(item.id, el);
            else rowRefs.current.delete(item.id);
          }}
        />
      ))}
    </div>
  );
}

function TimelineEvent({
  event, isHome, color, isNew, rowRef,
}: {
  event: MatchEvent;
  isHome: boolean;
  color: string;
  isNew: boolean;
  rowRef?: (el: HTMLDivElement | null) => void;
}) {
  const player = dataService.player(event.playerId);
  const assist = event.assistPlayerId ? dataService.player(event.assistPlayerId) : undefined;
  const playerName = player?.name ?? event.playerName ?? 'Unknown';
  const assistName = assist?.name ?? event.assistPlayerName;
  const isSub = event.type === 'sub';
  const minuteLabel = timelineMinuteLabel(event);

  // Sub-label shown beneath the player name for certain event types
  const subLabel =
    event.type === 'var_goal'      ? 'Awarded' :
    event.type === 'var_cancelled' ? 'No goal' :
    isSub                          ? assistName :   // player going off
    assistName                     ? assistName :   // goal assist
    undefined;

  const nameBlock = (textAlign: 'left' | 'right') => (
    <div className="min-w-0" style={{ color, textAlign }}>
      <div className="text-[13px] font-semibold leading-[13px]">{playerName}</div>
      {subLabel && (
        <div className="mt-0.5 text-[13px] font-normal leading-[13px]">
          {subLabel}
        </div>
      )}
    </div>
  );

  const iconEl = isSub ? <SubIcon /> : <EventIcon type={event.type} />;

  return (
    <div
      ref={rowRef}
      className="flex w-full items-start py-1"
      style={{
        animation: isNew ? `event-row-in ${ENTRY_DURATION_MS}ms ${ENTRY_DELAY_MS}ms ${ENTRY_EASE} both` : undefined,
      }}
    >
      {/* Left half — home events */}
      <div className="flex min-w-0 flex-1 items-start justify-end gap-4 pr-7">
        {isHome && (
          <>
            {nameBlock('right')}
            {iconEl}
          </>
        )}
      </div>

      {/* Centre — minute pill */}
      <div className="flex w-10 shrink-0 justify-center pt-[2px]">
        <MinutePill minute={minuteLabel.minute} phase={minuteLabel.phase} />
      </div>

      {/* Right half — away events */}
      <div className="flex min-w-0 flex-1 items-start gap-4 pl-7">
        {!isHome && (
          <>
            {iconEl}
            {nameBlock('left')}
          </>
        )}
      </div>
    </div>
  );
}

function TimelineMarker({
  item,
  isNew,
  rowRef,
}: {
  item: Extract<TimelineItem, { kind: 'marker' }>;
  isNew: boolean;
  rowRef?: (el: HTMLDivElement | null) => void;
}) {
  const isShootoutStart = item.marker === 'PEN_START';
  return (
    <div
      ref={rowRef}
      className="flex w-full items-center py-1.5"
      style={{
        animation: isNew ? `event-row-in ${ENTRY_DURATION_MS}ms ${ENTRY_DELAY_MS}ms ${ENTRY_EASE} both` : undefined,
      }}
    >
      <div className="flex flex-1 justify-end pr-7">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
          {isShootoutStart ? 'Shootout' : ''}
        </span>
      </div>
      <div className="flex w-10 shrink-0 justify-center">
        <span className="flex min-h-4 min-w-[34px] items-center justify-center rounded-full bg-black/70 px-2 text-[9px] font-bold uppercase leading-none tracking-[0.08em] text-white outline outline-1 outline-white/25">
          {item.marker === 'PEN_START' ? 'PEN' : item.label}
        </span>
      </div>
      <div className="flex flex-1 pl-7">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
          {isShootoutStart ? 'Begins' : ''}
        </span>
      </div>
    </div>
  );
}

function TimelineShootoutRound({
  item,
  homeColor,
  awayColor,
  isNew,
  rowRef,
}: {
  item: Extract<TimelineItem, { kind: 'shootout_round' }>;
  homeColor: string;
  awayColor: string;
  isNew: boolean;
  rowRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      className="flex w-full items-center py-1.5"
      style={{
        animation: isNew ? `event-row-in ${ENTRY_DURATION_MS}ms ${ENTRY_DELAY_MS}ms ${ENTRY_EASE} both` : undefined,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center justify-end pr-6">
        <ShootoutAttemptSide attempt={item.homeAttempt} align="right" color={homeColor} />
      </div>
      <div className="flex w-16 shrink-0 justify-center">
        <ShootoutScorePill scoreline={item.scoreline} />
      </div>
      <div className="flex min-w-0 flex-1 items-center pl-6">
        <ShootoutAttemptSide attempt={item.awayAttempt} align="left" color={awayColor} />
      </div>
    </div>
  );
}

function ShootoutAttemptSide({
  attempt,
  align,
  color,
}: {
  attempt?: ShootoutAttempt;
  align: 'left' | 'right';
  color: string;
}) {
  if (!attempt) return <div className="h-6 w-full" />;

  const player = attempt.playerId ? dataService.player(attempt.playerId) : undefined;
  const label = player?.name ?? attempt.playerName ?? (attempt.outcome === 'scored' ? 'Scored' : 'Missed');
  const text = (
    <div className="flex h-4 min-w-0 items-center" style={{ color, textAlign: align }}>
      <div className="truncate text-[14px] font-semibold leading-none">{label}</div>
    </div>
  );
  const icon = <ShootoutOutcomeIcon outcome={attempt.outcome} />;

  return (
    <div className={['flex min-h-6 min-w-0 items-center gap-4', align === 'right' ? 'justify-end' : 'justify-start'].join(' ')}>
      {align === 'right' ? (
        <>
          {text}
          {icon}
        </>
      ) : (
        <>
          {icon}
          {text}
        </>
      )}
    </div>
  );
}

const BALL_PATH = 'M12.9402 2.05978C10.2191 -0.676139 5.7957 -0.688074 3.05978 2.03306C0.323861 4.7542 0.311926 9.17757 3.03306 11.9135L3.05978 11.9402C5.78086 14.6761 10.2043 14.6881 12.9402 11.9669C15.6761 9.2458 15.6881 4.82243 12.9669 2.0865L12.9402 2.05978ZM8.43673 2.41912L10.056 1.24278C11.1578 1.63907 12.1238 2.3418 12.8391 3.26914L12.221 5.1693L10.26 5.80666L8.43671 4.48191L8.43673 2.41912ZM5.94417 1.24278L7.56342 2.41912V4.48187L5.7401 5.80661L3.7791 5.16926L3.16107 3.26909C3.87689 2.34177 4.84234 1.63911 5.94417 1.24278ZM2.95586 10.4495C2.29235 9.48405 1.92221 8.34697 1.88981 7.17631L3.50849 5.99996L5.47008 6.63732L6.16598 8.78084L4.95439 10.4496L2.95586 10.4495ZM9.72063 12.8659C8.59715 13.1951 7.40259 13.1951 6.27908 12.8659L5.66049 10.9624L6.87265 9.29422H9.12636L10.3385 10.963L9.72063 12.8659ZM11.0454 10.449L9.83435 8.78086L10.5308 6.63733L12.4924 5.99998L14.1105 7.17632C14.0781 8.34755 13.708 9.48403 13.0445 10.4495L11.0454 10.449Z';

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'yellow') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="7" width="10" height="14" rx="2" fill="#FFDF00"/>
      <rect x="7.5" y="0.5" width="9" height="13" rx="1.5" stroke="white" strokeOpacity="0.6"/>
    </svg>
  );
  if (type === 'red') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="7" width="10" height="14" rx="2" fill="#E7000B"/>
      <rect x="7.5" y="0.5" width="9" height="13" rx="1.5" stroke="white" strokeOpacity="0.6"/>
    </svg>
  );
  if (type === 'second_yellow') return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="10" height="14" rx="2" fill="#FFDF00"/>
      <rect x="5.5" y="3.5" width="9" height="13" rx="1.5" stroke="white" strokeOpacity="0.6"/>
      <rect x="8" width="10" height="14" rx="2" fill="#E7000B"/>
      <rect x="8.5" y="0.5" width="9" height="13" rx="1.5" stroke="white" strokeOpacity="0.6"/>
    </svg>
  );

  const isOwnGoal  = type === 'own_goal';
  const badge      = type === 'own_goal'        ? 'OG'
                   : type === 'shootout_goal' || type === 'shootout_miss' || type === 'shootout_saved' ? 'PEN'
                   : type === 'penalty' || type === 'penalty_missed' ? 'PEN'
                   : type === 'var_goal' || type === 'var_cancelled' ? 'VAR'
                   : null;
  const isVAR      = type === 'var_goal' || type === 'var_cancelled';
  const hasCross   = type === 'penalty_missed' || type === 'var_cancelled' || type === 'shootout_miss' || type === 'shootout_saved';

  return (
    <div className="relative flex shrink-0 flex-col items-center gap-[3px]">
      <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
        <circle cx="8" cy="7" r="6" fill="white" />
        <path d={BALL_PATH} fill={isOwnGoal ? '#FB2C36' : 'black'} />
      </svg>
      {hasCross && (
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"
          className="absolute"
          style={{ right: -4, top: -2 }}
        >
          <rect width="8" height="8" rx="4" fill="#FB2C36" />
          <path d="M6 2L2 6M2 2L6 6" stroke="#FEF2F2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {badge && (
        <span
          className="rounded-[2px] bg-black p-[2px] text-[7px] font-medium leading-none tracking-[0.35px] text-white"
          style={isVAR ? { outline: '0.5px solid white' } : undefined}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function SubIcon() {
  return (
    <div className="relative shrink-0" style={{ width: 20, height: 24 }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="absolute" style={{ left: 0, top: 0 }}>
        <rect width="11.852" height="11.852" rx="5.926" fill="black" />
        <path d="M5.926 2.469V9.383M2.963 5.432L5.926 2.469L8.889 5.432" stroke="#00D492" strokeWidth="1.111" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="absolute" style={{ left: 8, top: 3.5 }}>
        <rect width="11.852" height="11.852" rx="5.926" fill="black" />
        <path d="M5.926 2.469V9.383M2.963 6.42L5.926 9.383L8.889 6.42" stroke="#FF6467" strokeWidth="1.111" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ShootoutOutcomeIcon({ outcome }: { outcome: 'scored' | 'missed' }) {
  if (outcome === 'missed') {
    return (
      <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect width="16" height="16" rx="8" fill="#FB2C36" />
          <path d="M10.5 5.5L5.5 10.5M5.5 5.5L10.5 10.5" stroke="#FEF2F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect width="16" height="16" rx="8" fill="#00D492" />
        <path d="M11 5.5L7 9.5L5 7.5" stroke="#ECFDF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ShootoutScorePill({ scoreline }: { scoreline: string }) {
  return (
    <span className="flex h-4 min-w-[34px] items-center justify-center rounded-full bg-white px-[6px] text-[10px] font-semibold leading-none text-black">
      {scoreline}
    </span>
  );
}

function MinutePill({ minute, phase }: { minute: string; phase?: 'ET' | 'PEN' }) {
  return (
    <span className="flex min-h-3 min-w-[28px] flex-col items-center justify-center rounded-full bg-white px-[5px] py-0.5 text-[10px] font-semibold leading-none text-black">
      {phase && <span className="text-[7px] leading-[7px] opacity-55">{phase}</span>}
      <span>{minute}</span>
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
    isLive: false,
    qualificationStatus: null,
  }));
}
