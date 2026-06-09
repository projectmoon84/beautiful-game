import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { isoDay } from '../utils/format';
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

  // All unique fixture dates sorted ascending
  const allDates = useMemo(() => {
    const days = new Set(dataService.allFixtures().map(f => isoDay(f.kickoffUtc)));
    return [...days].sort();
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(
    allDates.length > 0 ? findDefaultDate(allDates) : ''
  );

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
    <div className="flex flex-col min-h-full">

      {/* Date scroller — sticky at top */}
      {allDates.length > 0 && (
        <DateScroller
          dates={allDates}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
      )}

      {/* Scrollable content */}
      <div className="flex-1 px-4 pt-4 pb-8">

        {/* Fixture cards */}
        {dayFixtures.length > 0 ? (
          <div className="flex flex-col gap-3 mb-6">
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
                  onClick={() => navigate(`/match/${f.id}`)}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
            <span className="text-4xl mb-3">⚽</span>
            <p className="text-sm font-medium">No fixtures on this date</p>
          </div>
        )}

        {/* Inline standings — one section per group with fixtures today */}
        {dayGroupIds.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
          >
            {dayGroupIds.map((groupId, i) => (
              <div
                key={groupId}
                className={i > 0 ? 'border-t-8 border-[#f3efe3]' : ''}
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
