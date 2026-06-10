import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import GroupTable from '../components/GroupTable';
import KnockoutBracket from '../components/KnockoutBracket';
import SubTabs from '../components/SubTabs';

const TABS = [
  { id: 'groups', label: 'Groups' },
  { id: 'knockouts', label: 'Knockouts' },
];

export default function Standings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('groups');
  const allGroups = dataService.allGroups();

  return (
    <div className="flex min-h-full flex-col" style={{ background: 'var(--surface)' }}>

      <div className="sticky top-0 z-20" style={{ background: 'var(--surface)' }}>
        <SubTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'groups' && (
        <div className="flex flex-col pb-8">
          {allGroups.map(group => {
            const rows = dataService.standingsForGroup(group.id);
            return (
              <div key={group.id} className="border-b-8 border-[var(--surface)] last:border-b-0">
                <GroupTable
                  label={group.label}
                  rows={rows}
                  onGroupClick={() => navigate(`/group/${group.id}`)}
                  onTeamClick={teamId => navigate(`/team/${teamId}`)}
                />
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'knockouts' && <KnockoutBracket />}
    </div>
  );
}
