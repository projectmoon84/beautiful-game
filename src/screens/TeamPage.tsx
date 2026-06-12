import { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { dataService } from '../data/dataService';
import GroupTable from '../components/GroupTable';
import FixtureCard from '../components/FixtureCard';
import SquadList from '../components/SquadList';
import SubTabs from '../components/SubTabs';
import PitchTexture from '../textures/PitchTexture';
import { pickTexture } from '../textures/pickTexture';
import { randomTeamFact } from '../utils/facts';

const TEAM_TABS = [
  { id: 'standings', label: 'Standings' },
  { id: 'matches', label: 'Matches' },
  { id: 'squad', label: 'Squad' },
];

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = TEAM_TABS.some(tab => tab.id === tabParam) ? tabParam! : 'standings';

  const team = id ? dataService.team(id) : undefined;

  if (!team) {
    return (
      <div className="flex items-center justify-center h-full opacity-40 p-8 text-center">
        <p>Team not found.</p>
      </div>
    );
  }

  const players = dataService.squad(team.id);
  const teamFixtures = dataService.teamFixtures(team.id)
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
  const standings = dataService.standingsForGroup(team.groupId);

  // Venue from the team's first home fixture, fallback to first fixture
  const homeFixture = teamFixtures.find(f => f.homeTeamId === team.id) ?? teamFixtures[0];
  const venue = homeFixture ? dataService.venue(homeFixture.venueId) : undefined;

  const displayFact = useMemo(
    () => randomTeamFact(team),
    [team.id], // re-pick when team changes, stable within a visit
  );

  const bg = team.primaryHex;
  const ink = team.secondaryHex;
  const accent = team.tertiaryHex;
  const textureId = pickTexture(team.id);
  const dividerColor = accent;

  function setActiveTab(tabId: string) {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (tabId === 'standings') next.delete('tab');
        else next.set('tab', tabId);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="min-h-full flex flex-col relative" style={{ background: bg }}>

      {/* Full-bleed diagonal pitch texture */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" style={{ background: bg }}>
        <PitchTexture
          textureId={textureId}
          variant="full"
          color={ink}
          bgHex={bg}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-full">

        <div className="absolute left-4 top-4 z-20 flex h-8 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold active:opacity-70"
            style={{ background: `${ink}22`, color: ink }}
            aria-label="Back"
          >
            ‹
          </button>
          <span className="text-[24px] font-semibold leading-none" style={{ color: ink }}>
            {team.flagEmoji}
          </span>
        </div>

        {/* ── Header ── */}
        <div className="flex flex-col items-start gap-2 px-4 pb-10 pt-14">
          <div className="flex w-full flex-col items-start justify-center">
            <div className="flex w-full items-end gap-2 pt-1">
              <TeamTitle name={team.name} color={ink} />
            </div>

            <div className="flex w-full flex-col items-center gap-0.5 pt-6">
              <div className="flex w-full items-start gap-2">
                <TeamMetaItem label="Seed" value={String(team.seed)} color={ink} ruleColor={dividerColor} />
                <TeamMetaItem label="Title odds" value={team.titleOdds} color={ink} ruleColor={dividerColor} />
              </div>

              <TeamMetaItem
                label="That’s a fact"
                value={displayFact}
                color={ink}
                ruleColor={dividerColor}
                fullWidth
              />

              {venue && (
                <TeamMetaItem
                  label="Venue"
                  value={`${venue.stadium}, ${venue.city}`}
                  color={ink}
                  ruleColor={dividerColor}
                  fullWidth
                />
              )}
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <SubTabs
          tabs={TEAM_TABS}
          activeId={activeTab}
          onChange={setActiveTab}
          activeColor={ink}
          activeLineColor={ink}
          bg={bg}
        />

        {/* ── Tab content ── */}

        {activeTab === 'standings' && (
          <div className="pt-5 pb-8">
            <GroupTable
              label={`Group ${team.groupId}`}
              rows={standings}
              tint={ink}
              onTeamClick={teamId => navigate(`/team/${teamId}`)}
            />
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="flex flex-col pb-8">
            {teamFixtures.length === 0 ? (
              <div className="flex flex-col items-center px-8 py-16 opacity-40 text-center">
                <span className="text-4xl mb-3">⚽</span>
                <p className="text-sm font-medium" style={{ color: ink }}>No fixtures yet</p>
              </div>
            ) : (
              teamFixtures.map(f => {
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
              })
            )}
          </div>
        )}

        {activeTab === 'squad' && (
          players.length === 0 ? (
            <div className="flex flex-col items-center py-16 opacity-40 text-center px-8">
              <span className="text-4xl mb-3">👕</span>
              <p className="text-sm font-medium" style={{ color: ink }}>Squad data not yet available</p>
            </div>
          ) : (
            <SquadList players={players} primaryColor={ink} />
          )
        )}

      </div>
    </div>
  );
}

function TeamTitle({ name, color }: { name: string; color: string }) {
  const longestWordLength = Math.max(
    ...name
      .split(/\s+/)
      .map(word => word.replace(/[^A-Za-z0-9]/g, '').length),
    1,
  );
  const mobileFitSize = `calc((100vw - 32px) / ${Math.max(1, longestWordLength * 0.68)})`;

  return (
    <h1
      className="min-w-0 flex-1 whitespace-normal break-normal font-bold uppercase leading-[0.9]"
      style={{
        color,
        fontFamily: '"Instrument Sans", system-ui, sans-serif',
        fontSize: `clamp(24px, min(64px, ${mobileFitSize}), 64px)`,
        overflowWrap: 'normal',
      }}
    >
      {name}
    </h1>
  );
}

function TeamMetaItem({
  label,
  value,
  color,
  ruleColor,
  fullWidth = false,
}: {
  label: string;
  value: string;
  color: string;
  ruleColor: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={[
        'flex items-center gap-4 border-t py-2',
        fullWidth ? 'w-full' : 'min-w-0 flex-1',
      ].join(' ')}
      style={{ borderColor: ruleColor }}
    >
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5">
        <div className="w-full text-[12px] font-semibold leading-normal" style={{ color }}>
          {label}
        </div>
        <div className="w-full text-[12px] font-normal leading-normal" style={{ color }}>
          {value}
        </div>
      </div>
    </div>
  );
}
