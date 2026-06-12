import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { MESSI_RONALDO, SINGLE_TOURNAMENT_RECORDS, type WCRecord } from '../data/wcRecords';
import type { PlayerStat, Team } from '../data/types';
import { contrastRatio, readableOn } from '../theme/contrast';

type LeaderboardMetric = 'goals' | 'assists';

interface LeaderRow {
  stat: PlayerStat;
  team: Team;
  value: number;
}

interface InvolvementRow {
  stat: PlayerStat;
  team: Team;
  goals: number;
  assists: number;
  total: number;
}

const PAPER = '#F5F1E4';
const LEADERBOARD_LIMIT = 4;

export default function Insights() {
  const navigate = useNavigate();
  const stats = useMemo(() => dataService.playerStats(), []);
  const pulse = useMemo(() => tournamentPulse(stats), [stats]);
  const goals = useMemo(() => topRowsForMetric(stats, 'goals'), [stats]);
  const assists = useMemo(() => topRowsForMetric(stats, 'assists'), [stats]);
  const involvement = useMemo(() => topInvolvementRows(stats), [stats]);

  return (
    <div className="min-h-full bg-[var(--surface)] pb-8 text-[var(--black)]">
      <PulseStrip
        matches={pulse.matches}
        goals={pulse.goals}
        yellows={pulse.yellows}
        reds={pulse.reds}
      />
      <InsightsTabs />

      <LeaderboardSection
        title="Goals"
        records={[SINGLE_TOURNAMENT_RECORDS.goals]}
        caption="All-time record · the bar to beat"
        rows={goals}
        emptyLabel="No goals yet"
        onTeamClick={teamId => navigate(`/team/${teamId}`)}
      />

      <LeaderboardSection
        title="Assists"
        records={[SINGLE_TOURNAMENT_RECORDS.assists]}
        caption="All-time record · since 1966"
        rows={assists}
        emptyLabel="No assists yet"
        onTeamClick={teamId => navigate(`/team/${teamId}`)}
      />

      <InvolvementSection
        rows={involvement}
        onTeamClick={teamId => navigate(`/team/${teamId}`)}
      />

      <RivalryBlock />
    </div>
  );
}

function PulseStrip({
  matches,
  goals,
  yellows,
  reds,
}: {
  matches: number;
  goals: number;
  yellows: number;
  reds: number;
}) {
  return (
    <div className="flex h-[101px] bg-black text-white">
      <PulseCell label="Matches" value={matches} />
      <PulseCell label="Goals" value={goals} />
      <div className="flex flex-1 flex-col justify-center gap-2 bg-black p-4">
        <div className="text-[12px] font-medium leading-none">Cards</div>
        <div className="flex flex-1 items-end gap-4">
          <CardCount value={reds} color="#D20101" />
          <CardCount value={yellows} color="#FFDF00" />
        </div>
      </div>
    </div>
  );
}

function PulseCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-2 bg-black p-4">
      <div className="text-[12px] font-medium leading-none">{label}</div>
      <div className="flex flex-1 items-end">
        <div className="text-[40px] font-bold uppercase leading-none">{value}</div>
      </div>
    </div>
  );
}

function CardCount({ value, color }: { value: number; color: string }) {
  return (
    <div className="relative flex items-end">
      <div className="text-[40px] font-bold leading-none">{value}</div>
      <span
        className="absolute right-[-11px] top-[3px] h-2.5 w-[7px] rounded-[2px]"
        style={{ background: color }}
      />
    </div>
  );
}

function InsightsTabs() {
  return (
    <div className="flex h-[46px]">
      <button
        type="button"
        className="flex flex-1 items-center justify-center text-[12px] font-semibold leading-none text-black outline outline-[6px] -outline-offset-[6px] outline-black"
      >
        Stats
      </button>
      <button
        type="button"
        className="flex flex-1 items-center justify-center bg-black text-[12px] font-semibold leading-none text-[var(--surface)]"
      >
        Insights
      </button>
    </div>
  );
}

function SectionHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="px-4 pb-1.5 pt-[22px]">
      <h2 className="text-[24px] font-bold uppercase leading-none">{title}</h2>
      {children}
    </section>
  );
}

function RecordHeader({
  records,
  caption,
}: {
  records: WCRecord[];
  caption?: string;
}) {
  return (
    <div className="mt-3.5">
      {records.map(record => (
        <div key={`${record.player}-${record.year}`} className="mt-1.5 flex items-center gap-2 first:mt-0">
          <span className="text-[15px] font-medium leading-none">
            {record.flag} {record.player}
          </span>
          <span className="text-[14px] font-medium italic leading-none opacity-40">{record.year}</span>
          {record.note && (
            <span className="text-[13px] font-medium italic leading-none opacity-40">{record.note}</span>
          )}
          <span className="ml-auto text-right text-[15px] font-bold leading-none">{record.value}</span>
        </div>
      ))}
      {caption && (
        <div className="mt-[3px] text-[11px] font-semibold leading-tight opacity-40">{caption}</div>
      )}
    </div>
  );
}

function LeaderboardSection({
  title,
  records,
  caption,
  rows,
  emptyLabel,
  onTeamClick,
}: {
  title: string;
  records: WCRecord[];
  caption: string;
  rows: LeaderRow[];
  emptyLabel: string;
  onTeamClick: (teamId: string) => void;
}) {
  const leaderValue = rows[0]?.value ?? 0;

  return (
    <>
      <SectionHeader title={title}>
        <RecordHeader records={records} caption={caption} />
      </SectionHeader>
      <div className="mt-2">
        {leaderValue > 0 ? rows.map(row => (
          <ProportionalRow
            key={`${title}-${row.stat.playerId}`}
            row={row}
            widthPct={(row.value / leaderValue) * 100}
            onClick={() => onTeamClick(row.team.id)}
          />
        )) : (
          <EmptyRow label={emptyLabel} />
        )}
      </div>
    </>
  );
}

function ProportionalRow({
  row,
  widthPct,
  onClick,
}: {
  row: LeaderRow;
  widthPct: number;
  onClick: () => void;
}) {
  const fg = rowTextColor(row.team);
  const hairline = needsHairline(row.team.primaryHex);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[76px] items-center gap-2 px-4 text-left active:brightness-95"
      style={{
        width: `${widthPct}%`,
        background: row.team.primaryHex,
        color: fg,
        boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
      }}
    >
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
        {row.team.flagEmoji} {row.stat.playerName}
      </span>
      <span className="text-[32px] font-bold leading-none">{row.value}</span>
    </button>
  );
}

function InvolvementSection({
  rows,
  onTeamClick,
}: {
  rows: InvolvementRow[];
  onTeamClick: (teamId: string) => void;
}) {
  const leaderTotal = rows[0]?.total ?? 0;

  return (
    <>
      <SectionHeader title="Goals + Assists">
        <RecordHeader records={SINGLE_TOURNAMENT_RECORDS.involvement} />
        <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold leading-none">
          <span>
            <span className="mr-[5px] inline-block h-3 w-3 rounded-[2px] bg-black align-[-1px]" />
            Goals
          </span>
          <span>
            <span className="mr-[5px] inline-block h-3 w-3 rounded-[2px] bg-black/50 align-[-1px]" />
            Assists
          </span>
        </div>
      </SectionHeader>

      <div className="mt-2 flex flex-col gap-1.5">
        {leaderTotal > 0 ? rows.map(row => (
          <SplitRow
            key={`involvement-${row.stat.playerId}`}
            row={row}
            widthPct={(row.total / leaderTotal) * 100}
            onClick={() => onTeamClick(row.team.id)}
          />
        )) : (
          <EmptyRow label="No goal involvements yet" />
        )}
      </div>
    </>
  );
}

function SplitRow({
  row,
  widthPct,
  onClick,
}: {
  row: InvolvementRow;
  widthPct: number;
  onClick: () => void;
}) {
  const fg = rowTextColor(row.team);
  const hairline = needsHairline(row.team.primaryHex);
  const assistsColor = hexToRgba(row.team.primaryHex, 0.55);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex gap-0.5 text-left active:brightness-95"
      style={{ width: `${widthPct}%`, color: fg }}
    >
      {row.goals > 0 && (
        <span
          className="flex h-[76px] min-w-0 items-center gap-2 px-4"
          style={{
            flex: `${row.goals} 1 0`,
            background: row.team.primaryHex,
            boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
          }}
        >
          <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
            {row.team.flagEmoji} {row.stat.playerName}
          </span>
          <span className="text-[32px] font-bold leading-none">{row.goals}</span>
        </span>
      )}
      {row.assists > 0 && (
        <span
          className="flex h-[76px] min-w-0 items-center justify-end px-4"
          style={{
            flex: `${row.assists} 1 0`,
            background: assistsColor,
            boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
          }}
        >
          {row.goals === 0 && (
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
              {row.team.flagEmoji} {row.stat.playerName}
            </span>
          )}
          <span className="text-[32px] font-bold leading-none">{row.assists}</span>
        </span>
      )}
    </button>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="flex h-[76px] items-center px-4 text-[12px] font-semibold text-black/40">
      {label}
    </div>
  );
}

function RivalryBlock() {
  return (
    <section className="pb-2">
      <SectionHeader title="The rivalry">
        <p className="mt-[5px] text-[12px] font-semibold leading-tight text-black/50">
          World Cup only · through Qatar 2022
        </p>
      </SectionHeader>

      <div className="flex items-center gap-3 px-3.5 pb-1 pt-3.5">
        <div className="flex-1 text-right text-[20px] font-bold uppercase leading-none">
          {MESSI_RONALDO.left.name} <span className="font-normal">{MESSI_RONALDO.left.flag}</span>
        </div>
        <div className="text-[18px] font-bold uppercase leading-none opacity-60">vs</div>
        <div className="flex-1 text-[20px] font-bold uppercase leading-none">
          <span className="font-normal">{MESSI_RONALDO.right.flag}</span> {MESSI_RONALDO.right.name}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-3.5 pb-[18px] pt-1.5">
        {MESSI_RONALDO.rows.map(row => (
          <DivergingRow key={row.label} label={row.label} left={row.l} right={row.r} />
        ))}
      </div>

      <div className="px-4 pb-2 text-[11px] font-semibold leading-normal opacity-50">
        Bars scale per row, so each metric shows the gap at a glance. Assists & involvement recorded since 1966.
      </div>
    </section>
  );
}

function DivergingRow({
  label,
  left,
  right,
}: {
  label: string;
  left: number;
  right: number;
}) {
  const max = Math.max(left, right, 1);

  return (
    <div className="relative flex items-stretch">
      <div className="flex flex-1 justify-end">
        <div
          className="flex h-[60px] items-center px-3.5 text-[26px] font-bold leading-none text-white"
          style={{ width: `${(left / max) * 100}%`, background: MESSI_RONALDO.left.hex }}
        >
          {left}
        </div>
      </div>
      <div className="flex flex-1 justify-start">
        <div
          className="flex h-[60px] items-center justify-end px-3.5 text-[26px] font-bold leading-none text-white"
          style={{ width: `${(right / max) * 100}%`, background: MESSI_RONALDO.right.hex }}
        >
          {right}
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-[3px] bg-[var(--surface)] px-[9px] py-[5px] text-[12px] font-bold leading-none">
        {label}
      </div>
    </div>
  );
}

function topRowsForMetric(stats: PlayerStat[], metric: LeaderboardMetric): LeaderRow[] {
  return stats
    .map(stat => ({ stat, team: dataService.team(stat.teamId), value: stat[metric] }))
    .filter((row): row is LeaderRow => Boolean(row.team) && row.value > 0)
    .sort((a, b) => (
      b.value - a.value ||
      b.stat.goals - a.stat.goals ||
      b.stat.assists - a.stat.assists ||
      a.stat.playerName.localeCompare(b.stat.playerName)
    ))
    .slice(0, LEADERBOARD_LIMIT);
}

function topInvolvementRows(stats: PlayerStat[]): InvolvementRow[] {
  return stats
    .map(stat => ({
      stat,
      team: dataService.team(stat.teamId),
      goals: stat.goals,
      assists: stat.assists,
      total: stat.goals + stat.assists,
    }))
    .filter((row): row is InvolvementRow => Boolean(row.team) && row.total > 0)
    .sort((a, b) => (
      b.total - a.total ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      a.stat.playerName.localeCompare(b.stat.playerName)
    ))
    .slice(0, LEADERBOARD_LIMIT);
}

function tournamentPulse(stats: PlayerStat[]) {
  const fixtures = dataService.allFixtures()
    .filter(fixture => fixture.status === 'live' || fixture.status === 'finished');

  return {
    matches: fixtures.length,
    goals: stats.reduce((sum, stat) => sum + stat.goals, 0),
    yellows: stats.reduce((sum, stat) => sum + stat.yellowCards, 0),
    reds: stats.reduce((sum, stat) => sum + stat.redCards, 0),
  };
}

function rowTextColor(team: Team): string {
  const readable = readableOn(team.primaryHex);
  const secondary = team.secondaryHex;
  return contrastRatio(secondary, team.primaryHex) >= 3 ? secondary : readable;
}

function needsHairline(hex: string): boolean {
  return contrastRatio(hex, PAPER) < 1.3;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
