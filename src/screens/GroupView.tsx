import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import GroupTable from '../components/GroupTable';
import FixtureCard from '../components/FixtureCard';
import SubTabs from '../components/SubTabs';

const TABS = [
  { id: 'groups', label: 'Groups' },
  { id: 'knockouts', label: 'Knockouts' },
];

export default function GroupView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const group = id ? dataService.group(id) : undefined;

  if (!group) {
    return (
      <div className="flex items-center justify-center h-full opacity-40 p-8 text-center">
        <p>Group not found.</p>
      </div>
    );
  }

  const rows = dataService.standingsForGroup(group.id);
  const fixtures = dataService.allFixtures()
    .filter(f => f.groupId === group.id)
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));

  return (
    <div className="flex min-h-full flex-col" style={{ background: 'var(--surface)' }}>

      <div className="sticky top-0 z-20" style={{ background: 'var(--surface)' }}>
        <SubTabs
          tabs={TABS}
          activeId="groups"
          onChange={tab => navigate(tab === 'knockouts' ? '/standings' : '/standings')}
        />
      </div>

      <div className="flex flex-col pb-8">
        <GroupTable
          label={group.label}
          rows={rows}
          onTeamClick={teamId => navigate(`/team/${teamId}`)}
        />

        {fixtures.length > 0 && (
          <div className="mt-2 flex flex-col">
            {fixtures.map(f => {
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
        )}
      </div>
    </div>
  );
}
