import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { isoDay } from '../utils/format';
import { isFixtureObscured } from '../utils/seenFixtures';
import { resultQualifier } from '../utils/matchResult';
import DateScroller from '../components/DateScroller';
import FixtureCard from '../components/FixtureCard';
import KnockoutCard from '../components/KnockoutCard';
import InlineStandings from '../components/InlineStandings';

const STAGE_SHORT: Record<string, string> = {
  r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'Final',
};
const SWIPE_THRESHOLD_PX = 54;

type SlideDirection = 'left' | 'right';

function findDefaultDate(dates: string[]): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dates.includes(today)) return today;
  // Nearest date to today
  const todayMs = new Date(today).getTime();
  return dates.reduce((best, d) => {
    const diff = Math.abs(new Date(d).getTime() - todayMs);
    const bestDiff = Math.abs(new Date(best).getTime() - todayMs);
    return diff < bestDiff ? d : best;
  });
}

export default function Matches() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('left');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // All unique fixture dates sorted ascending
  const allDates = useMemo(() => {
    const days = new Set(dataService.allFixtures().map(f => isoDay(f.kickoffUtc)));
    return [...days].sort();
  }, []);

  const dateParam = searchParams.get('date');
  const selectedDate = allDates.includes(dateParam ?? '')
    ? dateParam!
    : allDates.length > 0 ? findDefaultDate(allDates) : '';

  const selectedIndex = selectedDate ? allDates.indexOf(selectedDate) : -1;

  function selectDate(date: string, direction?: SlideDirection) {
    if (date === selectedDate) return;
    const nextIndex = allDates.indexOf(date);
    if (direction) setSlideDirection(direction);
    else if (selectedIndex >= 0 && nextIndex >= 0) {
      setSlideDirection(nextIndex > selectedIndex ? 'left' : 'right');
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('date', date);
      return next;
    });
  }

  function selectAdjacentDate(offset: -1 | 1) {
    if (selectedIndex < 0) return;
    const nextDate = allDates[selectedIndex + offset];
    if (!nextDate) return;
    selectDate(nextDate, offset > 0 ? 'left' : 'right');
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    selectAdjacentDate(dx < 0 ? 1 : -1);
  }

  // Fixtures for the selected day, sorted by kickoff
  const dayFixtures = useMemo(() => {
    return dataService
      .allFixtures()
      .filter(f => isoDay(f.kickoffUtc) === selectedDate)
      .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  }, [selectedDate]);

  // Unique group IDs for today's fixtures (for inline standings)
  const dayGroupIds = useMemo(() => {
    return [...new Set(dayFixtures.map(f => f.groupId).filter(Boolean))];
  }, [dayFixtures]);

  return (
    <div className="flex min-h-full flex-col">

      {allDates.length > 0 && (
        <DateScroller
          dates={allDates}
          selectedDate={selectedDate}
          onSelect={selectDate}
        />
      )}

      <div
        className="relative flex-1 overflow-x-hidden pb-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          key={selectedDate}
          className={[
            slideDirection === 'left' ? 'animate-day-slide-right' : 'animate-day-slide-left',
          ].join(' ')}
        >
          {dayFixtures.length > 0 ? (
            <div className="flex flex-col">
              {dayFixtures.map(f => {
                const home = dataService.team(f.homeTeamId) ?? null;
                const away = dataService.team(f.awayTeamId) ?? null;
                const events = dataService.matchEvents(f.id);
                const obscured = isFixtureObscured(f.id, f.status, f.homeScore ?? 0, f.awayScore ?? 0);
                const qualifier = resultQualifier(f, events);

                if (f.stage !== 'group') {
                  const stageLabel = STAGE_SHORT[f.stage] ?? f.stage.toUpperCase();
                  return (
                    <KnockoutCard
                      key={f.id}
                      fixture={f}
                      homeTeam={home}
                      awayTeam={away}
                      homePlaceholder={f.homePlaceholder}
                      awayPlaceholder={f.awayPlaceholder}
                      stageLabel={stageLabel}
                      obscured={obscured}
                      resultQualifier={qualifier}
                      onClick={home && away ? () => navigate(`/match/${f.id}`) : undefined}
                    />
                  );
                }

                if (!home || !away) return null;
                return (
                  <FixtureCard
                    key={f.id}
                    fixture={f}
                    homeTeam={home}
                    awayTeam={away}
                    obscured={obscured}
                    resultQualifier={qualifier}
                    onClick={() => navigate(`/match/${f.id}`)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[390px] flex-col items-center justify-center bg-[var(--black)] px-6 text-center text-[var(--surface)] opacity-100">
              <span className="text-4xl mb-3">⚽</span>
              <p className="text-sm font-medium">No fixtures on this date</p>
            </div>
          )}

          {dayGroupIds.length > 0 && (
            <div className="w-full">
              {dayGroupIds.map((groupId, i) => (
                <div
                  key={groupId}
                  className={i > 0 ? 'border-t-8 border-[var(--surface)]' : ''}
                >
                  <InlineStandings groupId={groupId} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
