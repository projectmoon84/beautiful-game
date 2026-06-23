import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { isoDay } from '../utils/format';
import { isFixtureObscured } from '../utils/seenFixtures';
import DateScroller from '../components/DateScroller';
import FixtureCard from '../components/FixtureCard';
import InlineStandings from '../components/InlineStandings';

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

  // All unique fixture dates sorted ascending
  const allDates = useMemo(() => {
    const days = new Set(dataService.allFixtures().map(f => isoDay(f.kickoffUtc)));
    return [...days].sort();
  }, []);

  const dateParam = searchParams.get('date');
  const selectedDate = allDates.includes(dateParam ?? '')
    ? dateParam!
    : allDates.length > 0 ? findDefaultDate(allDates) : '';

  function selectDate(date: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('date', date);
      return next;
    });
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
    return [...new Set(dayFixtures.map(f => f.groupId))];
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

      <div className="flex-1 pb-8">
        {dayFixtures.length > 0 ? (
          <div className="flex flex-col">
            {dayFixtures.map(f => {
              const home = dataService.team(f.homeTeamId);
              const away = dataService.team(f.awayTeamId);
              if (!home || !away) return null;
              return (
                <FixtureCard
                  key={f.id}
                  fixture={f}
                  homeTeam={home}
                  awayTeam={away}
                  obscured={isFixtureObscured(f.id, f.status, f.homeScore ?? 0, f.awayScore ?? 0)}
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
  );
}
