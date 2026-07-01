import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Fixture, Stage } from '../data/types';
import { dataService } from '../data/dataService';
import { resultQualifier } from '../utils/matchResult';
import { isFixtureObscured } from '../utils/seenFixtures';
import KnockoutCard from './KnockoutCard';

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
              obscured={isFixtureObscured(f.id, f.status, f.homeScore ?? 0, f.awayScore ?? 0)}
              resultQualifier={resultQualifier(f, dataService.matchEvents(f.id))}
              onClick={home && away ? () => navigate(`/match/${f.id}`) : undefined}
            />
          );
        })}
      </div>

    </div>
  );
}
