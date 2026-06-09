import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import BigType from '../components/BigType';
import { formatDate, formatTime } from '../utils/format';

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const fixture = id ? dataService.fixture(id) : undefined;
  const home = fixture ? dataService.team(fixture.homeTeamId) : undefined;
  const away = fixture ? dataService.team(fixture.awayTeamId) : undefined;

  if (!fixture || !home || !away) {
    return (
      <div className="flex items-center justify-center h-full opacity-40 p-8 text-center">
        <p>Match not found.</p>
      </div>
    );
  }

  const showScore = fixture.status === 'finished' || fixture.status === 'live';

  return (
    <div className="min-h-full flex flex-col">

      {/* Split-kit hero */}
      <div className="relative flex" style={{ minHeight: 220 }}>

        {/* Home half */}
        <div
          className="flex-1 flex flex-col justify-end p-5 pb-8 overflow-hidden"
          style={{ background: home.secondaryHex }}
        >
          <div className="text-[10px] font-semibold mb-3" style={{ color: home.primaryHex, opacity: 0.7 }}>
            {formatDate(fixture.kickoffUtc)} · {formatTime(fixture.kickoffUtc)} · Group {fixture.groupId}
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl">{home.flagEmoji}</span>
            <BigType size="xl" color={home.primaryHex}>{home.shortCode}</BigType>
            {showScore && (
              <BigType size="lg" color={home.primaryHex} style={{ marginLeft: 'auto', lineHeight: 1 }}>
                {fixture.homeScore}
              </BigType>
            )}
          </div>
        </div>

        {/* Divider */}
        <div
          className="absolute inset-y-0 left-1/2 w-px"
          style={{ background: 'rgba(255,255,255,0.85)' }}
        />

        {/* Away half */}
        <div
          className="flex-1 flex flex-col justify-end items-end p-5 pb-8 overflow-hidden"
          style={{ background: away.secondaryHex }}
        >
          <div className="text-[10px] font-semibold mb-3" style={{ color: away.tertiaryHex, opacity: 0.7 }}>
            {fixture.status === 'live'
              ? `${fixture.minute}'`
              : fixture.status === 'finished'
              ? 'FT'
              : 'KO'}
          </div>
          <div className="flex items-baseline gap-3">
            {showScore && (
              <BigType size="lg" color={away.tertiaryHex} style={{ marginRight: 'auto', lineHeight: 1 }}>
                {fixture.awayScore}
              </BigType>
            )}
            <BigType size="xl" color={away.tertiaryHex}>{away.shortCode}</BigType>
            <span className="text-2xl">{away.flagEmoji}</span>
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-opacity hover:opacity-70"
          style={{ background: 'rgba(255,255,255,0.85)', color: '#14161a' }}
          aria-label="Back"
        >
          ‹
        </button>
      </div>

      {/* Phase 4 placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 opacity-40">
        <span className="text-4xl">⚽</span>
        <p className="text-sm font-medium text-center">
          Full match page — event timeline, replay &amp; fact panels — arriving in Phase 4.
        </p>
      </div>
    </div>
  );
}
