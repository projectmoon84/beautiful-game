import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import {
  ALL_TIME_ASSISTS,
  ALL_TIME_GOALS,
  ALL_TIME_INVOLVEMENTS,
  MESSI_RONALDO,
  RECORDS_AND_FIRSTS,
  SINGLE_TOURNAMENT_ASSISTS,
  SINGLE_TOURNAMENT_CLEAN_SHEETS,
  SINGLE_TOURNAMENT_GOALS,
  SINGLE_TOURNAMENT_INVOLVEMENTS,
  SINGLE_TOURNAMENT_RECORDS,
  TEAM_TOURNAMENT_RECORDS,
  type WCRecord,
  type WCRecordFact,
  type WCRankedRecord,
  type WCTeamRecord,
} from '../data/wcRecords';
import type { PlayerStat, Team } from '../data/types';
import { contrastRatio, readableOn } from '../theme/contrast';

type InsightsView = '2026' | 'records';
type LeaderboardMetric = 'goals' | 'assists';
type HistoricMetric = 'goals' | 'assists' | 'involvements' | 'cleanSheets';

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

interface HistoricRow extends WCRankedRecord {
  value: number;
  delta?: number;
}

interface LiveDelta {
  goals: number;
  assists: number;
  involvements: number;
  matches: number;
}

const PAPER = '#F5F1E4';
const LEADERBOARD_LIMIT = 8;
const HISTORIC_LIMIT = 7;

const PLAYER_ALIASES: Record<string, string[]> = {
  'Lionel Messi': ['Lionel Messi', 'Messi'],
  'Cristiano Ronaldo': ['Cristiano Ronaldo', 'Ronaldo'],
  'Kylian Mbappe': ['Kylian Mbappe', 'Kylian Mbappé', 'Mbappe', 'Mbappé'],
  'Thomas Muller': ['Thomas Muller', 'Thomas Müller'],
  Pele: ['Pele', 'Pelé'],
};

export default function Insights() {
  const navigate = useNavigate();
  const [view, setView] = useState<InsightsView>('2026');
  const stats = useMemo(() => dataService.playerStats(), []);
  const pulse = useMemo(() => tournamentPulse(stats), [stats]);
  const goals = useMemo(() => topRowsForMetric(stats, 'goals'), [stats]);
  const assists = useMemo(() => topRowsForMetric(stats, 'assists'), [stats]);
  const involvement = useMemo(() => topInvolvementRows(stats), [stats]);
  const liveDeltas = useMemo(() => livePlayerDeltas(stats), [stats]);

  return (
    <div className="min-h-full bg-[var(--surface)] text-[var(--black)]">
      <TournamentHero pulse={pulse} />
      <ViewToggle active={view} onChange={setView} />

      {view === '2026' ? (
        <NowView
          goals={goals}
          assists={assists}
          involvement={involvement}
          onTeamClick={id => navigate(`/team/${id}`)}
        />
      ) : (
        <RecordsView
          liveDeltas={liveDeltas}
          liveGoals={goals}
          liveAssists={assists}
          liveInvolvement={involvement}
        />
      )}
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function TournamentHero({ pulse }: { pulse: ReturnType<typeof tournamentPulse> }) {
  const hasLive = dataService.allFixtures().some(f => f.status === 'live');
  const gpm = pulse.matches > 0 ? (pulse.goals / pulse.matches).toFixed(2) : '—';

  return (
    <div className="bg-black text-white">
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30">FIFA World Cup</div>
          <div className="text-[38px] font-bold uppercase leading-none tracking-tight">2026</div>
        </div>
        {hasLive && (
          <div className="mt-1.5 flex items-center gap-1.5 rounded-full bg-[#5EE9B5]/15 px-3 py-1.5 ring-1 ring-[#5EE9B5]/40">
            <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-[#5EE9B5]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5EE9B5]">Live</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10">
        <HeroCell label="Played" value={pulse.matches} />
        <HeroCell label="Goals" value={pulse.goals} />
        <HeroCell label="Per game" value={gpm} />
        <div className="flex flex-col justify-end gap-2 p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">Cards</div>
          <div className="flex items-end gap-4">
            <CardCount value={pulse.reds} color="#D20101" />
            <CardCount value={pulse.yellows} color="#FFDF00" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col justify-end gap-2 p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</div>
      <div className="text-[40px] font-bold leading-none tabular-nums">{value}</div>
    </div>
  );
}

function CardCount({ value, color }: { value: number; color: string }) {
  return (
    <div className="relative flex items-end">
      <div className="text-[36px] font-bold leading-none">{value}</div>
      <span
        className="absolute -right-[10px] top-[4px] h-2 w-[6px] rounded-[2px]"
        style={{ background: color }}
      />
    </div>
  );
}

// ─── View toggle ─────────────────────────────────────────────────────────────

function ViewToggle({ active, onChange }: { active: InsightsView; onChange: (v: InsightsView) => void }) {
  return (
    <div className="flex h-[48px]">
      {(['2026', 'records'] as const).map(v => {
        const isActive = active === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={[
              'flex flex-1 items-center justify-center text-[13px] font-bold uppercase tracking-wider leading-none',
              isActive
                ? 'bg-black text-[var(--surface)]'
                : 'bg-[var(--surface)] text-black ring-[6px] ring-inset ring-black',
            ].join(' ')}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

// ─── Now View ────────────────────────────────────────────────────────────────

function NowView({
  goals,
  assists,
  involvement,
  onTeamClick,
}: {
  goals: LeaderRow[];
  assists: LeaderRow[];
  involvement: InvolvementRow[];
  onTeamClick: (id: string) => void;
}) {
  return (
    <>
      <LiveLeaderboard
        category="2026 World Cup"
        title="Goal Scorers"
        record={SINGLE_TOURNAMENT_RECORDS.goals}
        rows={goals}
        emptyLabel="No goals yet this tournament"
        onTeamClick={onTeamClick}
      />

      <LiveLeaderboard
        category="2026 World Cup"
        title="Assists"
        record={SINGLE_TOURNAMENT_RECORDS.assists}
        rows={assists}
        emptyLabel="No assists yet this tournament"
        onTeamClick={onTeamClick}
      />

      <InvolvementBlock rows={involvement} onTeamClick={onTeamClick} />
    </>
  );
}

function LiveLeaderboard({
  category,
  title,
  record,
  rows,
  emptyLabel,
  onTeamClick,
}: {
  category: string;
  title: string;
  record: WCRecord;
  rows: LeaderRow[];
  emptyLabel: string;
  onTeamClick: (id: string) => void;
}) {
  return (
    <>
      <div className="bg-black px-5 pt-5 pb-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{category}</div>
        <div className="text-[28px] font-bold uppercase leading-none tracking-tight">{title}</div>
      </div>

      <div className="flex items-center gap-3 border-b border-black/10 bg-[var(--surface)] px-5 py-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-black/35">Record</span>
        <span className="text-[14px] font-semibold leading-none">
          {record.flag} {record.player}
          {record.year ? <span className="ml-1.5 font-normal opacity-50">{record.year}</span> : null}
        </span>
        <span className="ml-auto text-[26px] font-bold leading-none tabular-nums">{record.value}</span>
      </div>

      {rows.length > 0 ? (
        rows.map((row, i) => (
          <LiveRow
            key={row.stat.playerId}
            row={row}
            rank={i + 1}
            recordValue={record.value}
            onClick={() => onTeamClick(row.team.id)}
          />
        ))
      ) : (
        <div className="flex h-[88px] items-center px-5 text-[13px] font-semibold text-black/35">
          {emptyLabel}
        </div>
      )}
    </>
  );
}

function LiveRow({
  row,
  rank,
  recordValue,
  onClick,
}: {
  row: LeaderRow;
  rank: number;
  recordValue: number;
  onClick: () => void;
}) {
  const fg = rowTextColor(row.team);
  const hairline = needsHairline(row.team.primaryHex);
  const pct = Math.min((row.value / recordValue) * 100, 100);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-[88px] w-full items-center gap-4 overflow-hidden px-5 text-left active:brightness-95"
      style={{
        background: row.team.primaryHex,
        color: fg,
        boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
      }}
    >
      <span className="w-5 text-[13px] font-bold leading-none tabular-nums" style={{ opacity: 0.45 }}>
        {rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-bold leading-tight">
          {row.team.flagEmoji} {row.stat.playerName}
        </span>
        <span className="block text-[12px] font-semibold leading-none mt-0.5" style={{ opacity: 0.55 }}>
          {row.team.name}
        </span>
      </span>
      <span className="text-[52px] font-bold leading-none tabular-nums">{row.value}</span>

      {/* Progress bar toward record */}
      <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: 'rgba(0,0,0,0.18)' }}>
        <div className="h-full" style={{ width: `${pct}%`, background: fg, opacity: 0.5 }} />
      </div>
    </button>
  );
}

function InvolvementBlock({ rows, onTeamClick }: { rows: InvolvementRow[]; onTeamClick: (id: string) => void }) {
  return (
    <>
      <div className="bg-black px-5 pt-5 pb-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">2026 World Cup</div>
        <div className="text-[28px] font-bold uppercase leading-none tracking-tight">G+A Kings</div>
      </div>

      <div className="flex items-center justify-between border-b border-black/10 bg-[var(--surface)] px-5 py-3">
        {SINGLE_TOURNAMENT_RECORDS.involvement.slice(0, 1).map(record => (
          <div key={record.player} className="flex flex-1 items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-black/35">Record</span>
            <span className="text-[14px] font-semibold leading-none">
              {record.flag} {record.player}
              {record.year ? <span className="ml-1.5 font-normal opacity-50">{record.year}</span> : null}
            </span>
            <span className="ml-auto text-[26px] font-bold leading-none tabular-nums">{record.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-5 py-2 text-[11px] font-semibold text-black/40">
        <LegendSwatch label="Goals" opacity={1} />
        <LegendSwatch label="Assists" opacity={0.5} />
      </div>

      {rows.length > 0 ? (
        rows.map(row => (
          <FullInvolvementRow
            key={row.stat.playerId}
            row={row}
            onClick={() => onTeamClick(row.team.id)}
          />
        ))
      ) : (
        <div className="flex h-[88px] items-center px-5 text-[13px] font-semibold text-black/35">
          No goal involvements yet
        </div>
      )}
    </>
  );
}

function LegendSwatch({ label, opacity }: { label: string; opacity: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-[2px] bg-black" style={{ opacity }} />
      {label}
    </span>
  );
}

function FullInvolvementRow({ row, onClick }: { row: InvolvementRow; onClick: () => void }) {
  const fg = rowTextColor(row.team);
  const hairline = needsHairline(row.team.primaryHex);
  const assistsColor = hexToRgba(row.team.primaryHex, 0.52);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-0.5 text-left active:brightness-95"
      style={{ color: fg }}
    >
      {row.goals > 0 && (
        <span
          className="flex h-[88px] min-w-0 items-center gap-4 px-5"
          style={{
            flex: `${row.goals} 1 0`,
            background: row.team.primaryHex,
            boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
          }}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-bold leading-tight">
              {row.team.flagEmoji} {row.stat.playerName}
            </span>
            <span className="block text-[12px] font-semibold mt-0.5 opacity-55">{row.team.name}</span>
          </span>
          <span className="text-[52px] font-bold leading-none tabular-nums">{row.goals}</span>
        </span>
      )}
      {row.assists > 0 && (
        <span
          className="flex h-[88px] min-w-0 items-center justify-end px-5"
          style={{
            flex: `${row.assists} 1 0`,
            background: assistsColor,
            boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
          }}
        >
          {row.goals === 0 && (
            <span className="min-w-0 flex-1 mr-4">
              <span className="block truncate text-[17px] font-bold leading-tight">
                {row.team.flagEmoji} {row.stat.playerName}
              </span>
              <span className="block text-[12px] font-semibold mt-0.5 opacity-55">{row.team.name}</span>
            </span>
          )}
          <span className="text-[52px] font-bold leading-none tabular-nums">{row.assists}</span>
        </span>
      )}
    </button>
  );
}

// ─── Records View ────────────────────────────────────────────────────────────

function RecordsView({
  liveDeltas,
  liveGoals,
  liveAssists,
  liveInvolvement,
}: {
  liveDeltas: Map<string, LiveDelta>;
  liveGoals: LeaderRow[];
  liveAssists: LeaderRow[];
  liveInvolvement: InvolvementRow[];
}) {
  const allTimeGoals = liveAwareRows(ALL_TIME_GOALS, 'goals', liveDeltas);
  const allTimeAssists = liveAwareRows(ALL_TIME_ASSISTS, 'assists', liveDeltas);
  const allTimeInvolvement = liveAwareRows(ALL_TIME_INVOLVEMENTS, 'involvements', liveDeltas);
  const rivalryRows = liveAwareRivalryRows(liveDeltas);

  return (
    <>
      <ChaseSection
        liveGoals={liveGoals}
        liveAssists={liveAssists}
        liveInvolvement={liveInvolvement}
      />

      <HallOfFame
        title="All-time Goals"
        caption="Career World Cup goals"
        rows={allTimeGoals}
        badge2026
      />

      <HallOfFame
        title="All-time Assists"
        caption="Recorded assists from 1966 · career totals"
        rows={allTimeAssists}
        badge2026
      />

      <HallOfFame
        title="All-time Involvement"
        caption="Career World Cup goals + assists combined"
        rows={allTimeInvolvement}
        badge2026
      />

      <SingleEditionSection />

      <RivalrySection rows={rivalryRows} />

      <FactsSection />
    </>
  );
}

// ─── Chase section ───────────────────────────────────────────────────────────

function ChaseSection({
  liveGoals,
  liveAssists,
  liveInvolvement,
}: {
  liveGoals: LeaderRow[];
  liveAssists: LeaderRow[];
  liveInvolvement: InvolvementRow[];
}) {
  const involvementAsLeader: LeaderRow[] = liveInvolvement.map(r => ({
    stat: r.stat,
    team: r.team,
    value: r.total,
  }));

  return (
    <>
      <div className="bg-black px-5 pt-5 pb-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">2026 vs History</div>
        <div className="text-[28px] font-bold uppercase leading-none tracking-tight">The Chase</div>
        <div className="mt-1.5 text-[12px] font-semibold text-white/35">
          How this tournament's leaders measure against all-time records
        </div>
      </div>

      <ChaseBlock
        label="Goals — record to beat"
        record={SINGLE_TOURNAMENT_RECORDS.goals}
        rows={liveGoals}
        emptyLabel="No 2026 goals yet"
      />
      <ChaseBlock
        label="Assists — record to beat"
        record={SINGLE_TOURNAMENT_RECORDS.assists}
        rows={liveAssists}
        emptyLabel="No 2026 assists yet"
      />
      <ChaseBlock
        label="Involvement — record to beat"
        record={SINGLE_TOURNAMENT_RECORDS.involvement[0]}
        rows={involvementAsLeader}
        emptyLabel="No 2026 involvements yet"
      />
    </>
  );
}

function ChaseBlock({
  label,
  record,
  rows,
  emptyLabel,
}: {
  label: string;
  record: WCRecord;
  rows: LeaderRow[];
  emptyLabel: string;
}) {
  return (
    <div className="border-b border-black/10 bg-[var(--surface)] pb-4">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3">
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-black/35">{label}</div>
          <div className="mt-0.5 text-[15px] font-bold leading-none">
            {record.flag} {record.player}
            <span className="ml-2 text-[13px] font-normal text-black/40">{record.year}</span>
          </div>
        </div>
        <div className="text-[34px] font-bold leading-none tabular-nums">{record.value}</div>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-col gap-2 px-5">
          {rows.slice(0, 4).map(row => (
            <ChaseProgressRow key={row.stat.playerId} row={row} recordValue={record.value} />
          ))}
        </div>
      ) : (
        <div className="px-5 text-[13px] font-semibold text-black/35">{emptyLabel}</div>
      )}
    </div>
  );
}

function ChaseProgressRow({ row, recordValue }: { row: LeaderRow; recordValue: number }) {
  const pct = Math.min((row.value / recordValue) * 100, 100);
  const fg = rowTextColor(row.team);
  const hairline = needsHairline(row.team.primaryHex);

  return (
    <div className="flex items-center gap-3">
      <div className="flex w-[130px] shrink-0 items-center gap-2">
        <span className="text-[14px] leading-none">{row.team.flagEmoji}</span>
        <span className="truncate text-[13px] font-semibold">{row.stat.playerName}</span>
      </div>
      <div className="relative h-[28px] flex-1 overflow-hidden rounded-[4px] bg-black/8">
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-end rounded-[4px] px-2"
          style={{
            width: `${Math.max(pct, 8)}%`,
            background: row.team.primaryHex,
            color: fg,
            boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
          }}
        >
          <span className="text-[13px] font-bold tabular-nums">{row.value}</span>
        </div>
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-black/25"
        >
          /{recordValue}
        </div>
      </div>
    </div>
  );
}

// ─── Hall of Fame ─────────────────────────────────────────────────────────────

function HallOfFame({
  title,
  caption,
  rows,
  badge2026,
}: {
  title: string;
  caption: string;
  rows: HistoricRow[];
  badge2026?: boolean;
}) {
  const valueMax = rows[0]?.value ?? 1;

  return (
    <>
      <div className="bg-black px-5 pt-5 pb-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Hall of Fame</div>
        <div className="text-[28px] font-bold uppercase leading-none tracking-tight">{title}</div>
        <div className="mt-1 text-[12px] font-semibold text-white/35">{caption}</div>
        {badge2026 && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5EE9B5]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5EE9B5]">2026 additions shown</span>
          </div>
        )}
      </div>

      <div>
        {rows.slice(0, HISTORIC_LIMIT).map((row, i) => (
          <HallOfFameRow key={`${row.player}-${row.country}`} row={row} rank={i + 1} valueMax={valueMax} />
        ))}
      </div>
    </>
  );
}

function HallOfFameRow({
  row,
  rank,
  valueMax,
}: {
  row: HistoricRow;
  rank: number;
  valueMax: number;
}) {
  const pct = (row.value / valueMax) * 100;

  return (
    <div className="relative flex h-[72px] w-full items-center gap-4 overflow-hidden border-b border-white/5 bg-[#111] px-5 text-white">
      {/* Subtle fill bar */}
      <div
        className="absolute inset-y-0 left-0 bg-white/[0.04]"
        style={{ width: `${pct}%` }}
      />

      {/* Rank */}
      <span className="relative w-8 shrink-0 text-[26px] font-bold leading-none tabular-nums text-white/12">
        {String(rank).padStart(2, '0')}
      </span>

      {/* Player info */}
      <div className="relative min-w-0 flex-1">
        <div className="truncate text-[16px] font-bold leading-tight">{row.player}</div>
        <div className="truncate text-[11px] font-semibold leading-none text-white/40">
          {row.country}
          {row.editions ? ` · ${row.editions}` : ''}
          {row.year ? ` · ${row.year}` : ''}
          {row.games ? ` · ${row.games} games` : ''}
        </div>
      </div>

      {/* Live badge */}
      {row.delta ? (
        <span className="relative shrink-0 rounded-[3px] bg-[#F5F1E4] px-1.5 py-1 text-[10px] font-bold leading-none text-black">
          +{row.delta}
        </span>
      ) : null}

      {/* Value */}
      <span className="relative shrink-0 text-[38px] font-bold leading-none tabular-nums">{row.value}</span>
    </div>
  );
}

// ─── Single edition ───────────────────────────────────────────────────────────

function SingleEditionSection() {
  const stGoalLeader = Math.max(...SINGLE_TOURNAMENT_GOALS.map(r => r.goals ?? 0), 1);
  const stAssistLeader = Math.max(...SINGLE_TOURNAMENT_ASSISTS.map(r => r.assists ?? 0), 1);
  const stCSLeader = Math.max(...SINGLE_TOURNAMENT_CLEAN_SHEETS.map(r => r.cleanSheets ?? 0), 1);
  const stInvLeader = Math.max(...SINGLE_TOURNAMENT_INVOLVEMENTS.map(r => r.involvements ?? 0), 1);

  return (
    <>
      <div className="bg-black px-5 pt-5 pb-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Greatest single editions</div>
        <div className="text-[28px] font-bold uppercase leading-none tracking-tight">One Tournament</div>
        <div className="mt-1 text-[12px] font-semibold text-white/35">
          Best individual performances at a single World Cup
        </div>
      </div>

      <SingleEditionCategory label="Goals">
        {SINGLE_TOURNAMENT_GOALS.slice(0, 6).map(row => (
          <SingleEditionRow
            key={`${row.player}-${row.year}`}
            player={row.player}
            country={row.country}
            year={row.year}
            value={row.goals ?? 0}
            maxValue={stGoalLeader}
          />
        ))}
      </SingleEditionCategory>

      <SingleEditionCategory label="G+A combined">
        {SINGLE_TOURNAMENT_INVOLVEMENTS.slice(0, 6).map(row => {
          const goals = row.goals ?? 0;
          const assists = row.assists ?? 0;
          return (
            <SingleEditionSplitRow
              key={`${row.player}-${row.year}`}
              player={row.player}
              country={row.country}
              year={row.year}
              goals={goals}
              assists={assists}
              total={row.involvements ?? goals + assists}
              maxTotal={stInvLeader}
            />
          );
        })}
      </SingleEditionCategory>

      <SingleEditionCategory label="Assists">
        {SINGLE_TOURNAMENT_ASSISTS.slice(0, 6).map(row => (
          <SingleEditionRow
            key={`${row.player}-${row.year}`}
            player={row.player}
            country={row.country}
            year={row.year}
            value={row.assists ?? 0}
            maxValue={stAssistLeader}
          />
        ))}
      </SingleEditionCategory>

      <SingleEditionCategory label="Clean sheets (GK)">
        {SINGLE_TOURNAMENT_CLEAN_SHEETS.slice(0, 6).map(row => (
          <SingleEditionRow
            key={`${row.player}-${row.year}`}
            player={row.player}
            country={row.country}
            year={row.year}
            value={row.cleanSheets ?? 0}
            maxValue={stCSLeader}
            suffix={row.games ? `in ${row.games} games` : undefined}
          />
        ))}
      </SingleEditionCategory>
    </>
  );
}

function SingleEditionCategory({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-black/10 bg-[var(--surface)] pb-1">
      <div className="px-5 pt-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-black/35">{label}</div>
      {children}
    </div>
  );
}

function SingleEditionRow({
  player,
  country,
  year,
  value,
  maxValue,
  suffix,
}: {
  player: string;
  country: string;
  year?: number;
  value: number;
  maxValue: number;
  suffix?: string;
}) {
  const pct = (value / maxValue) * 100;

  return (
    <div className="flex items-center gap-3 px-5 py-2">
      <div className="min-w-0 flex-1">
        <span className="text-[14px] font-bold leading-none">{player}</span>
        <span className="ml-2 text-[12px] font-medium text-black/40">
          {country}{year ? ` · ${year}` : ''}{suffix ? ` · ${suffix}` : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-[6px] w-[64px] overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-black/60" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-5 text-right text-[18px] font-bold leading-none tabular-nums">{value}</span>
      </div>
    </div>
  );
}

function SingleEditionSplitRow({
  player,
  country,
  year,
  goals,
  assists,
  total,
  maxTotal,
}: {
  player: string;
  country: string;
  year?: number;
  goals: number;
  assists: number;
  total: number;
  maxTotal: number;
}) {
  const pct = (total / maxTotal) * 100;
  const goalPct = total > 0 ? (goals / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-5 py-2">
      <div className="min-w-0 flex-1">
        <span className="text-[14px] font-bold leading-none">{player}</span>
        <span className="ml-2 text-[12px] font-medium text-black/40">
          {country}{year ? ` · ${year}` : ''} · {goals}G {assists}A
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-[6px] w-[64px] overflow-hidden rounded-full bg-black/10">
          <div className="h-full bg-black" style={{ width: `${pct * (goalPct / 100)}%` }} />
          <div className="h-full bg-black/40" style={{ width: `${pct * ((100 - goalPct) / 100)}%` }} />
        </div>
        <span className="w-5 text-right text-[18px] font-bold leading-none tabular-nums">{total}</span>
      </div>
    </div>
  );
}

// ─── Rivalry ──────────────────────────────────────────────────────────────────

function RivalrySection({
  rows,
}: {
  rows: Array<{ label: string; left: number; right: number; leftDelta?: number; rightDelta?: number }>;
}) {
  return (
    <>
      {/* National colour header */}
      <div className="flex h-[80px]">
        <div
          className="flex flex-1 items-center justify-end px-5"
          style={{ background: MESSI_RONALDO.left.hex }}
        >
          <div className="text-right text-white">
            <div className="text-[11px] font-bold uppercase leading-none opacity-60">{MESSI_RONALDO.left.flag} Argentina</div>
            <div className="text-[22px] font-bold uppercase leading-tight tracking-tight">{MESSI_RONALDO.left.name}</div>
          </div>
        </div>
        <div
          className="flex flex-1 items-center justify-start px-5"
          style={{ background: MESSI_RONALDO.right.hex }}
        >
          <div className="text-white">
            <div className="text-[11px] font-bold uppercase leading-none opacity-60">{MESSI_RONALDO.right.flag} Portugal</div>
            <div className="text-[22px] font-bold uppercase leading-tight tracking-tight">{MESSI_RONALDO.right.name}</div>
          </div>
        </div>
      </div>

      <div className="border-b border-black/10 bg-[var(--surface)] px-5 py-2.5">
        <p className="text-[11px] font-semibold text-black/35">
          World Cup only · 2026 additions reflected where player matched
        </p>
      </div>

      <div className="flex flex-col">
        {rows.map(row => (
          <DivergingRow
            key={row.label}
            label={row.label}
            left={row.left}
            right={row.right}
            leftDelta={row.leftDelta}
            rightDelta={row.rightDelta}
          />
        ))}
      </div>
    </>
  );
}

function DivergingRow({
  label,
  left,
  right,
  leftDelta,
  rightDelta,
}: {
  label: string;
  left: number;
  right: number;
  leftDelta?: number;
  rightDelta?: number;
}) {
  const max = Math.max(left, right, 1);

  return (
    <div className="relative flex items-stretch">
      <div className="flex flex-1 justify-end">
        <div
          className="flex h-[60px] items-center gap-1 px-3.5 text-[26px] font-bold leading-none text-white"
          style={{ width: `${(left / max) * 100}%`, background: MESSI_RONALDO.left.hex }}
        >
          {left}
          {leftDelta ? <span className="text-[11px] font-semibold leading-none opacity-75">+{leftDelta}</span> : null}
        </div>
      </div>
      <div className="flex flex-1 justify-start">
        <div
          className="flex h-[60px] items-center justify-end gap-1 px-3.5 text-[26px] font-bold leading-none text-white"
          style={{ width: `${(right / max) * 100}%`, background: MESSI_RONALDO.right.hex }}
        >
          {rightDelta ? <span className="text-[11px] font-semibold leading-none opacity-75">+{rightDelta}</span> : null}
          {right}
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 max-w-[46%] -translate-x-1/2 -translate-y-1/2 truncate rounded-[3px] bg-[var(--surface)] px-[9px] py-[5px] text-[11px] font-bold leading-none">
        {label}
      </div>
    </div>
  );
}

// ─── Facts ────────────────────────────────────────────────────────────────────

function FactsSection() {
  return (
    <>
      <div className="bg-black px-5 pt-5 pb-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">World Cup history</div>
        <div className="text-[28px] font-bold uppercase leading-none tracking-tight">Records & Firsts</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        {RECORDS_AND_FIRSTS.map(fact => (
          <FactCard key={`${fact.record}-${fact.holder}`} fact={fact} />
        ))}
      </div>

      <div className="bg-black px-5 pt-5 pb-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">World Cup history</div>
        <div className="text-[28px] font-bold uppercase leading-none tracking-tight">Team Records</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        {TEAM_TOURNAMENT_RECORDS.map(record => (
          <TeamRecordCard key={`${record.record}-${record.detail}`} record={record} />
        ))}
      </div>
    </>
  );
}

function FactCard({ fact }: { fact: WCRecordFact }) {
  return (
    <div className="min-h-[96px] border-b border-black/10 bg-[var(--surface)] px-5 py-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-black/35">{fact.record}</div>
      <div className="mt-2 text-[26px] font-bold leading-none">{fact.figure}</div>
      <div className="mt-1.5 text-[12px] font-semibold leading-tight text-black/50">
        {fact.holder}
        {fact.country ? ` · ${fact.country}` : ''}
        {fact.detail ? ` · ${fact.detail}` : ''}
      </div>
    </div>
  );
}

function TeamRecordCard({ record }: { record: WCTeamRecord }) {
  return (
    <div className="min-h-[96px] border-b border-white/5 bg-[#111] px-5 py-4 text-white">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">{record.record}</div>
      <div className="mt-2 text-[26px] font-bold leading-none">{record.figure}</div>
      <div className="mt-1.5 text-[12px] font-semibold leading-tight text-white/50">
        {record.detail}
        {record.year ? ` · ${record.year}` : ''}
      </div>
    </div>
  );
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function topRowsForMetric(stats: PlayerStat[], metric: LeaderboardMetric): LeaderRow[] {
  return stats
    .map(stat => ({ stat, team: dataService.team(stat.teamId), value: stat[metric] }))
    .filter((row): row is LeaderRow => Boolean(row.team) && row.value > 0)
    .sort((a, b) =>
      b.value - a.value ||
      b.stat.goals - a.stat.goals ||
      b.stat.assists - a.stat.assists ||
      a.stat.playerName.localeCompare(b.stat.playerName),
    )
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
    .sort((a, b) =>
      b.total - a.total ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      a.stat.playerName.localeCompare(b.stat.playerName),
    )
    .slice(0, LEADERBOARD_LIMIT);
}

function tournamentPulse(stats: PlayerStat[]) {
  const fixtures = dataService
    .allFixtures()
    .filter(f => f.status === 'live' || f.status === 'finished');

  return {
    matches: fixtures.length,
    goals: stats.reduce((sum, s) => sum + s.goals, 0),
    yellows: stats.reduce((sum, s) => sum + s.yellowCards, 0),
    reds: stats.reduce((sum, s) => sum + s.redCards, 0),
  };
}

function livePlayerDeltas(stats: PlayerStat[]): Map<string, LiveDelta> {
  const deltas = new Map<string, LiveDelta>();
  for (const stat of stats) {
    const historicName = historicPlayerName(stat.playerName);
    if (!historicName) continue;
    const teamMatches = dataService
      .allFixtures()
      .filter(
        f =>
          (f.status === 'live' || f.status === 'finished') &&
          (f.homeTeamId === stat.teamId || f.awayTeamId === stat.teamId),
      ).length;
    deltas.set(historicName, {
      goals: stat.goals,
      assists: stat.assists,
      involvements: stat.goals + stat.assists,
      matches: teamMatches,
    });
  }
  return deltas;
}

function historicPlayerName(playerName: string): string | undefined {
  const normalized = normalizeName(playerName);
  return Object.entries(PLAYER_ALIASES).find(([, aliases]) =>
    aliases.some(alias => normalizeName(alias) === normalized),
  )?.[0];
}

function liveAwareRows(
  rows: WCRankedRecord[],
  metric: HistoricMetric,
  deltas: Map<string, LiveDelta>,
): HistoricRow[] {
  return historicRows(rows, metric)
    .map(row => {
      const delta = deltas.get(row.player)?.[metric === 'cleanSheets' ? 'goals' : metric] ?? 0;
      return {
        ...row,
        value: row.value + delta,
        delta: delta > 0 ? delta : undefined,
      };
    })
    .sort((a, b) => b.value - a.value || a.player.localeCompare(b.player));
}

function historicRows(rows: WCRankedRecord[], metric: HistoricMetric): HistoricRow[] {
  return rows
    .map(row => ({ ...row, value: metricValue(row, metric) }))
    .filter(row => Number.isFinite(row.value) && row.value > 0)
    .sort((a, b) => b.value - a.value || a.player.localeCompare(b.player));
}

function metricValue(row: WCRankedRecord, metric: HistoricMetric): number {
  if (metric === 'involvements') return row.involvements ?? (row.goals ?? 0) + (row.assists ?? 0);
  if (metric === 'cleanSheets') return row.cleanSheets ?? 0;
  return row[metric] ?? 0;
}

function liveAwareRivalryRows(deltas: Map<string, LiveDelta>) {
  const messiDelta = deltas.get(MESSI_RONALDO.left.fullName);
  const ronaldoDelta = deltas.get(MESSI_RONALDO.right.fullName);

  return MESSI_RONALDO.rows.map(row => {
    const leftDelta = rivalryDelta(row.key, messiDelta);
    const rightDelta = rivalryDelta(row.key, ronaldoDelta);
    return {
      label: row.label,
      left: row.l + leftDelta,
      right: row.r + rightDelta,
      leftDelta: leftDelta > 0 ? leftDelta : undefined,
      rightDelta: rightDelta > 0 ? rightDelta : undefined,
    };
  });
}

function rivalryDelta(key: string, delta?: LiveDelta): number {
  if (!delta) return 0;
  if (key === 'goals') return delta.goals;
  if (key === 'assists') return delta.assists;
  if (key === 'involvements') return delta.involvements;
  if (key === 'matches') return delta.matches;
  return 0;
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
