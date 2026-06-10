import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import BigType from '../components/BigType';
import GroupTable from '../components/GroupTable';
import FixtureCard from '../components/FixtureCard';
import SquadList from '../components/SquadList';
import SubTabs from '../components/SubTabs';
import PitchTexture from '../textures/PitchTexture';
import { pickTexture } from '../textures/pickTexture';

const TEAM_TABS = [
  { id: 'standings', label: 'Standings' },
  { id: 'matches', label: 'Matches' },
  { id: 'squad', label: 'Squad' },
];

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('standings');

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

  const bg = team.secondaryHex;
  const ink = team.primaryHex;
  const textureId = pickTexture(team.id);
  const dividerColor = `${ink}30`;

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

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ background: `${ink}22`, color: ink }}
          aria-label="Back"
        >
          ‹
        </button>

        {/* ── Header ── */}
        <div className="px-5 pt-14 pb-0">

          {/* Flag */}
          <span className="text-2xl leading-none">{team.flagEmoji}</span>

          {/* Team name */}
          <div className="mt-2 mb-4">
            <BigType size="2xl" color={ink}>{team.name}</BigType>
          </div>

          {/* Facts grid */}
          <div
            className="flex py-3 gap-8"
            style={{ borderTop: `1px solid ${dividerColor}`, borderBottom: `1px solid ${dividerColor}` }}
          >
            <div>
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase mb-0.5" style={{ color: ink, opacity: 0.55 }}>
                Seed
              </p>
              <p className="text-[18px] font-bold leading-none" style={{ color: ink, fontFamily: '"Instrument Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}>
                {team.seed}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase mb-0.5" style={{ color: ink, opacity: 0.55 }}>
                Title odds
              </p>
              <p className="text-[18px] font-bold leading-none" style={{ color: ink, fontFamily: '"Instrument Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}>
                {team.titleOdds}
              </p>
            </div>
          </div>

          {/* Fun fact */}
          <div className="py-3" style={{ borderBottom: `1px solid ${dividerColor}` }}>
            <p className="text-[10px] font-bold tracking-[0.08em] uppercase mb-1" style={{ color: ink, opacity: 0.55 }}>
              That's a fact
            </p>
            <p className="text-[13px] leading-snug" style={{ color: ink, opacity: 0.85 }}>
              {team.funFact}
            </p>
          </div>

          {/* Venue */}
          {venue && (
            <div className="py-3" style={{ borderBottom: `1px solid ${dividerColor}` }}>
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase mb-1" style={{ color: ink, opacity: 0.55 }}>
                Venue
              </p>
              <p className="text-[13px] leading-none font-medium" style={{ color: ink, opacity: 0.85 }}>
                {venue.stadium}, {venue.city}
              </p>
            </div>
          )}
        </div>

        {/* Sub-tabs */}
        <SubTabs
          tabs={TEAM_TABS}
          activeId={activeTab}
          onChange={setActiveTab}
          activeColor={ink}
          bg={bg}
        />

        {/* ── Tab content ── */}

        {activeTab === 'standings' && (
          <div className="px-4 pt-5 pb-8">
            <GroupTable
              label={`Group ${team.groupId}`}
              rows={standings}
              tint={ink}
              onTeamClick={teamId => {
                if (teamId !== team.id) navigate(`/team/${teamId}`);
              }}
            />
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="px-4 pt-5 pb-8 flex flex-col gap-3">
            {teamFixtures.length === 0 ? (
              <div className="flex flex-col items-center py-16 opacity-40 text-center">
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
