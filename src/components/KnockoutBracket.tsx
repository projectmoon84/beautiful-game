import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Fixture, Stage, Team } from '../data/types';
import { dataService } from '../data/dataService';
import { formatDate, formatTime } from '../utils/format';

type KnockoutStage = Exclude<Stage, 'group'>;

const STAGE_ORDER: KnockoutStage[] = ['r32', 'r16', 'qf', 'sf', 'final'];

const STAGE_SHORT: Record<KnockoutStage, string> = {
  r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'Final',
};

const STAGE_FULL: Record<KnockoutStage, string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  final: 'Final',
};

// Neutral palette for TBD team slots — dark, clearly placeholder
const TBD_BG  = '#14161a';
const TBD_INK = 'rgba(255,255,255,0.22)';

export default function KnockoutBracket() {
  const navigate = useNavigate();

  const allFixtures = dataService.allFixtures();

  const byStage = useMemo(() => {
    const map = new Map<KnockoutStage, Fixture[]>(STAGE_ORDER.map(s => [s, []]));
    for (const f of allFixtures) {
      if (f.stage === 'group') continue;
      map.get(f.stage as KnockoutStage)?.push(f);
    }
    for (const [stage, fixtures] of map) {
      map.set(stage, [...fixtures].sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc)));
    }
    return map;
  }, [allFixtures]);

  // Map match number → fixture so "Winner · Match 73" can be resolved to real team codes.
  const fixtureByMatchNum = useMemo(() => {
    const map = new Map<number, Fixture>();
    for (const f of allFixtures) {
      const m = f.id.match(/^OF-(\d+)$/);
      if (m) map.set(Number(m[1]), f);
    }
    return map;
  }, [allFixtures]);

  function resolveLabel(label: string | undefined): string | undefined {
    if (!label) return undefined;
    const ref = label.match(/^Winner · Match (\d+)$/);
    if (!ref) return label;
    const refFixture = fixtureByMatchNum.get(Number(ref[1]));
    if (!refFixture) return label;
    const home = dataService.team(refFixture.homeTeamId) ?? null;
    const away = dataService.team(refFixture.awayTeamId) ?? null;
    if (!home && !away) return label;
    return `Winner · ${home?.shortCode ?? '?'} / ${away?.shortCode ?? '?'}`;
  }

  const availableStages = STAGE_ORDER.filter(s => (byStage.get(s)?.length ?? 0) > 0);

  // Default to the earliest stage that still has live or upcoming fixtures.
  const initialStage = useMemo<KnockoutStage | undefined>(() => {
    for (const s of STAGE_ORDER) {
      const fixtures = byStage.get(s) ?? [];
      if (fixtures.some(f => f.status === 'live' || f.status === 'scheduled')) return s;
    }
    return availableStages[0];
  }, [byStage, availableStages]);

  const [activeStage, setActiveStage] = useState<KnockoutStage | undefined>(initialStage);

  if (availableStages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center opacity-40">
        <span className="text-4xl mb-3">🏆</span>
        <p className="text-sm font-semibold">Knockout bracket</p>
        <p className="text-xs mt-1 opacity-70">Unlocks after the group stage</p>
      </div>
    );
  }

  const currentStage = activeStage ?? availableStages[0];
  const fixtures = byStage.get(currentStage) ?? [];

  return (
    <div className="flex flex-col">

      {/* Round tab bar — same visual language as SubTabs but slimmer */}
      <div
        className="flex"
        style={{ background: '#14161a', borderBottom: '8px solid var(--surface)' }}
      >
        {availableStages.map(stage => {
          const isActive = stage === currentStage;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setActiveStage(stage)}
              className="flex h-[44px] flex-1 items-center justify-center text-[12px] font-semibold leading-none transition-none"
              style={{
                background:    isActive ? 'var(--surface)' : '#14161a',
                color:         isActive ? '#14161a'        : 'rgba(255,255,255,0.38)',
                borderTop:     isActive ? 'none'           : '3px solid #14161a',
                outline:       isActive ? '6px solid #14161a' : 'none',
                outlineOffset: isActive ? '-6px'           : undefined,
              }}
            >
              {STAGE_SHORT[stage]}
            </button>
          );
        })}
      </div>

      {/* Stage heading */}
      <div
        className="px-4 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-widest"
        style={{ color: 'rgba(0,0,0,0.32)' }}
      >
        {STAGE_FULL[currentStage]}
      </div>

      {/* Fixture list */}
      <div className="flex flex-col gap-[1px]" style={{ background: 'var(--surface)' }}>
        {fixtures.map(f => {
          const home = dataService.team(f.homeTeamId) ?? null;
          const away = dataService.team(f.awayTeamId) ?? null;
          return (
            <KnockoutCard
              key={f.id}
              fixture={f}
              homeTeam={home}
              awayTeam={away}
              homePlaceholder={resolveLabel(f.homePlaceholder)}
              awayPlaceholder={resolveLabel(f.awayPlaceholder)}
              stageLabel={STAGE_SHORT[currentStage]}
              onClick={home && away ? () => navigate(`/match/${f.id}`) : undefined}
            />
          );
        })}
      </div>

    </div>
  );
}

// ── KnockoutCard ─────────────────────────────────────────────────────────────
// Renders a single knockout fixture. Known teams use their real kit colors;
// TBD slots use a dark neutral background with ghost text.

interface KnockoutCardProps {
  fixture: Fixture;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  stageLabel: string;
  onClick?: () => void;
}

function KnockoutCard({ fixture: f, homeTeam, awayTeam, homePlaceholder, awayPlaceholder, stageLabel, onClick }: KnockoutCardProps) {
  const isLive     = f.status === 'live';
  const isFinished = f.status === 'finished';
  const showScore  = isLive || isFinished;

  const homeBg   = homeTeam?.primaryHex   ?? TBD_BG;
  const homeInk  = homeTeam?.secondaryHex ?? TBD_INK;

  const awayBg   = awayTeam?.primaryHex   ?? TBD_BG;
  const awayInk  = awayTeam?.secondaryHex ?? TBD_INK;

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

        {/* Home side */}
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

        {/* Away side */}
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

// ── PlaceholderSlot ───────────────────────────────────────────────────────────
// Renders the "Winner · Group A" or "Best 3rd · A/B/C/D" label for TBD slots.
// Splits on " · " so qualifier type and group info stack on two lines.

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
