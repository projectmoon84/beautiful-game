import { useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import GroupTable from './GroupTable';

interface InlineStandingsProps {
  groupId: string;
}

export default function InlineStandings({ groupId }: InlineStandingsProps) {
  const navigate = useNavigate();
  const rows = dataService.standingsForGroup(groupId);

  return (
    <GroupTable
      label={`Group ${groupId}`}
      rows={rows}
      onTeamClick={teamId => navigate(`/team/${teamId}`)}
    />
  );
}
