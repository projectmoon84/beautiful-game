/**
 * /sandbox — Phase 2 verification screen.
 * Renders one of every primitive with real mock data.
 * Not linked from the nav; access via http://localhost:5173/sandbox
 */

import { useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import BigType from '../components/BigType';
import Pill from '../components/Pill';
import Flag from '../components/Flag';
import FormStrip from '../components/FormStrip';
import FixtureCard from '../components/FixtureCard';
import GroupTable from '../components/GroupTable';

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#999] mb-3 mt-6 first:mt-0">
      {title}
    </h2>
  );
}

export default function Sandbox() {
  const navigate = useNavigate();
  const bra = dataService.team('BRA')!;
  const por = dataService.team('POR')!;
  const arg = dataService.team('ARG')!;
  const fra = dataService.team('FRA')!;
  const ger = dataService.team('GER')!;
  const ned = dataService.team('NED')!;
  const esp = dataService.team('ESP')!;
  const eng = dataService.team('ENG')!;

  const f1 = dataService.fixture('F1')!; // finished
  const f2 = dataService.fixture('F2')!; // live
  const f3 = dataService.fixture('F3')!; // scheduled
  const f4 = dataService.fixture('F4')!; // finished

  const groupCStandings = dataService.standingsForGroup('C');
  const groupAStandings = dataService.standingsForGroup('A');
  const stats = dataService.playerStats();

  return (
    <div className="p-5 max-w-lg mx-auto pb-24">
      <BigType as="h1" size="lg" style={{ color: 'var(--black)' }} className="mb-1">
        Sandbox
      </BigType>
      <p className="text-sm opacity-40 mb-8">Phase 2 primitives — one of each.</p>

      {/* ── BigType ── */}
      <SectionHeader title="BigType" />
      <div className="flex flex-col gap-2">
        {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map(size => (
          <BigType key={size} size={size} color={bra.primaryHex}>
            BRA {size}
          </BigType>
        ))}
      </div>

      {/* ── Pill ── */}
      <SectionHeader title="Pill" />
      <div className="flex gap-3 flex-wrap items-center bg-[#333] rounded-xl p-4">
        <Pill variant="default">23'</Pill>
        <Pill variant="minute">87'</Pill>
        <Pill variant="live">LIVE</Pill>
        <Pill>Group C</Pill>
      </div>

      {/* ── Flag ── */}
      <SectionHeader title="Flag" />
      <div className="flex gap-4 flex-wrap items-center">
        <Flag emoji={bra.flagEmoji} size="sm" />
        <Flag emoji={por.flagEmoji} size="md" />
        <Flag emoji={arg.flagEmoji} size="lg" />
        <Flag emoji={fra.flagEmoji} label="France" size="md" />
        <Flag emoji={ger.flagEmoji} label="Germany" size="sm" />
      </div>

      {/* ── FormStrip ── */}
      <SectionHeader title="FormStrip" />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Flag emoji={bra.flagEmoji} size="sm" />
          <FormStrip results={bra.form} />
        </div>
        <div className="flex items-center gap-3">
          <Flag emoji={por.flagEmoji} size="sm" />
          <FormStrip results={por.form} />
        </div>
        <div className="flex items-center gap-3">
          <Flag emoji={ned.flagEmoji} size="sm" />
          <FormStrip results={ned.form} />
        </div>
      </div>

      {/* ── FixtureCard: scheduled ── */}
      <SectionHeader title="FixtureCard — scheduled" />
      <FixtureCard fixture={f3} homeTeam={esp} awayTeam={eng} />

      {/* ── FixtureCard: live ── */}
      <SectionHeader title="FixtureCard — live" />
      <FixtureCard fixture={f2} homeTeam={arg} awayTeam={fra} />

      {/* ── FixtureCard: finished ── */}
      <SectionHeader title="FixtureCard — finished" />
      <FixtureCard fixture={f1} homeTeam={bra} awayTeam={por} />
      <FixtureCard fixture={f4} homeTeam={ger} awayTeam={ned} />

      {/* ── GroupTable: full ── */}
      <SectionHeader title="GroupTable — full (Group C)" />
      <GroupTable label="Group C" rows={groupCStandings} onTeamClick={teamId => navigate(`/team/${teamId}`)} />

      {/* ── GroupTable: compact ── */}
      <SectionHeader title="GroupTable — compact (Group A)" />
      <GroupTable label="Group A" rows={groupAStandings} compact onTeamClick={teamId => navigate(`/team/${teamId}`)} />

      {/* ── Player stats (dataService check) ── */}
      <SectionHeader title="Player stats (dataService.playerStats)" />
      <div className="bg-white rounded-xl overflow-hidden shadow-sm">
        {stats.map((s, i) => {
          const team = dataService.team(s.teamId);
          return (
            <div
              key={s.playerId}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f5f5f5] last:border-0 text-sm"
            >
              <span className="text-[#ccc] font-bold w-5 text-right">{i + 1}</span>
              <span className="text-base">{team?.flagEmoji}</span>
              <span className="flex-1 font-medium">{s.playerName}</span>
              <span className="font-bold">{s.goals}⚽</span>
              <span className="text-[#999]">{s.assists} ast</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
