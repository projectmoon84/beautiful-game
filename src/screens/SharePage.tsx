import { useNavigate, useParams } from 'react-router-dom';
import ShareComposer from '../components/ShareComposer';
import { dataService } from '../data/dataService';
import { LIVE_DEMO_EVENTS, LIVE_DEMO_FIXTURE } from '../data/liveDemo';

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isLiveDemo = id === 'live-demo';
  const fixture = isLiveDemo ? LIVE_DEMO_FIXTURE : id ? dataService.fixture(id) : undefined;
  const home = fixture ? dataService.team(fixture.homeTeamId) : undefined;
  const away = fixture ? dataService.team(fixture.awayTeamId) : undefined;
  const events = fixture
    ? isLiveDemo
      ? LIVE_DEMO_EVENTS
      : dataService.matchEvents(fixture.id)
    : [];

  if (!fixture || !home || !away) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-center opacity-40">
        <p>Match not found.</p>
      </div>
    );
  }

  return (
    <ShareComposer
      fixture={fixture}
      home={home}
      away={away}
      events={events}
      onClose={() => navigate(`/match/${fixture.id}`)}
    />
  );
}
