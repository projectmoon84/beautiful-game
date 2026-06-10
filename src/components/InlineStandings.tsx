import { dataService } from '../data/dataService';
import GroupTable from './GroupTable';

interface InlineStandingsProps {
  groupId: string;
}

export default function InlineStandings({ groupId }: InlineStandingsProps) {
  const rows = dataService.standingsForGroup(groupId);

  return (
    <GroupTable
      label={`Group ${groupId}`}
      rows={rows}
    />
  );
}
