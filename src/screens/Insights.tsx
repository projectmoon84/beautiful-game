import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import {
  ALL_TIME_AGE_AND_SPEED_RECORDS,
  ALL_TIME_APPEARANCES,
  ALL_TIME_ASSISTS,
  ALL_TIME_GOALS,
  SINGLE_TOURNAMENT_RECORDS,
  type AllTimeRecordRow,
  type AllTimeRecordTable,
  type WCRecord,
  type WCRankedRecord,
} from '../data/wcRecords';
import type { Fixture, InsightCard, Player, PlayerStat, Team } from '../data/types';
import { contrastRatio, readableOn } from '../theme/contrast';

type InsightsView = '2026' | 'records';
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
const LEADERBOARD_LIMIT = 10;
const PLAYER_NAME_ALIASES: Record<string, string[]> = {
  'cristiano ronaldo': ['Ronaldo'],
  'kylian mbappe': ['Kylian Mbappé', 'Mbappé'],
  'lionel messi': ['Messi'],
  'pele': ['Pelé'],
  'thomas muller': ['Thomas Müller', 'Müller'],
};

export default function Insights() {
  const navigate = useNavigate();
  const [view, setView] = useState<InsightsView>('2026');
  const stats = useMemo(() => dataService.playerStats(), []);
  const pulse = useMemo(() => tournamentPulse(stats), [stats]);
  const goals = useMemo(() => topRowsForMetric(stats, 'goals'), [stats]);
  const assists = useMemo(() => topRowsForMetric(stats, 'assists'), [stats]);
  const involvement = useMemo(() => topInvolvementRows(stats), [stats]);

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
        <RecordsView stats={stats} />
      )}
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function TournamentHero({ pulse }: { pulse: ReturnType<typeof tournamentPulse> }) {
  const hasLive = dataService.allFixtures().some(f => f.status === 'live');
  const gpm = pulse.matches > 0 ? (pulse.goals / pulse.matches).toFixed(2) : '—';
  const [gpmWhole, gpmDec] = String(gpm).includes('.') ? String(gpm).split('.') : [String(gpm), undefined];

  return (
    <div className="bg-black text-white">
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="flex-1 text-[24px] font-bold uppercase leading-none" style={{ color: PAPER }}>
          FIFA World Cup 2026
        </span>
        {hasLive && (
          <div className="flex items-center gap-1.5 rounded-full bg-[#5EE9B5]/15 px-3 py-1.5 ring-1 ring-[#5EE9B5]/40">
            <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-[#5EE9B5]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5EE9B5]">Live</span>
          </div>
        )}
      </div>

      <div className="flex border-t border-white/10 pb-2">
        <HeroCell label="Matches" value={String(pulse.matches)} />
        <HeroCell label="Goals" value={String(pulse.goals)} />
        <div className="flex flex-1 flex-col gap-2 px-4 py-2">
          <span className="text-[9px] font-medium uppercase tracking-[0.04em] text-white/50">Per game</span>
          <div className="flex h-[39px] items-end">
            <span className="font-bold leading-none">
              <span className="text-[24px]">{gpmWhole}</span>
              {gpmDec && <span className="text-[16px]">.{gpmDec}</span>}
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 px-4 py-2">
          <span className="text-[9px] font-medium uppercase tracking-[0.04em] text-white/50">Cards</span>
          <div className="flex h-[39px] items-end gap-3">
            <CardCount value={pulse.reds} color="#D20101" />
            <CardCount value={pulse.yellows} color="#FFDF00" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col gap-2 px-4 py-2">
      <span className="text-[9px] font-medium uppercase tracking-[0.04em] text-white/50">{label}</span>
      <div className="flex h-[39px] items-end">
        <span className="text-[24px] font-bold leading-none tabular-nums">{value}</span>
      </div>
    </div>
  );
}

function CardCount({ value, color }: { value: number; color: string }) {
  return (
    <div className="relative flex items-end">
      <span className="text-[24px] font-bold leading-none">{value}</span>
      <span
        className="absolute -right-[8px] top-[5px] h-[7px] w-[5px] rounded-[1px]"
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
                ? 'bg-[var(--surface)] text-black'
                : 'bg-black text-[var(--surface)] ring-[6px] ring-inset ring-[var(--surface)]',
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
  const insights = useMemo(() => dataService.insights(), []);

  return (
    <>
      {insights.length > 0 && (
        <InsightCardsBlock insights={insights} onTeamClick={onTeamClick} />
      )}

      <LiveLeaderboard
        title="Goals"
        record={SINGLE_TOURNAMENT_RECORDS.goals}
        rows={goals}
        emptyLabel="No goals yet this tournament"
        onTeamClick={onTeamClick}
      />

      <LiveLeaderboard
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

// ─── Insight cards ────────────────────────────────────────────────────────────

// Deterministic hue from a string so every distinct `kind` always gets
// the same accent colour across renders, with no hard-coded list required.
function kindHue(kind: string): number {
  let hash = 0;
  for (let i = 0; i < kind.length; i++) hash = (hash * 31 + kind.charCodeAt(i)) >>> 0;
  return hash % 360;
}

function kindAccent(kind: string): { badge: string; glow: string } {
  const h = kindHue(kind);
  return {
    badge: `hsl(${h}, 80%, 62%)`,
    glow:  `hsla(${h}, 80%, 62%, 0.12)`,
  };
}

function InsightCardsBlock({
  insights,
  onTeamClick,
}: {
  insights: InsightCard[];
  onTeamClick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[1px]" style={{ background: 'var(--surface)' }}>
      {insights.map(card => (
        <InsightCardView key={card.kind + card.teamId} card={card} onTeamClick={onTeamClick} />
      ))}
    </div>
  );
}

function InsightCardView({
  card,
  onTeamClick,
}: {
  card: InsightCard;
  onTeamClick: (id: string) => void;
}) {
  const team = dataService.team(card.teamId);
  const accent = kindAccent(card.kind);
  const bg    = team?.primaryHex ?? '#1c1917';
  const fg    = team ? rowTextColor(team) : '#ffffff';
  const hairline = team ? needsHairline(team.primaryHex) : false;
  const hasValue = card.value && card.value !== '-';

  const inner = (
    <div
      className="flex w-full flex-col gap-2 px-4 py-4"
      style={{
        background: bg,
        color: fg,
        boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
      }}
    >
      {/* Kind badge */}
      <div className="flex items-center gap-2">
        <span
          className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest leading-none"
          style={{ background: accent.glow, color: accent.badge, border: `1px solid ${accent.badge}` }}
        >
          {card.kind}
        </span>
        {team && (
          <span className="text-[12px] font-semibold leading-none" style={{ color: withAlpha(fg, 0.55) }}>
            {team.flagEmoji} {team.name}
          </span>
        )}
      </div>

      {/* Value — only shown when meaningful */}
      {hasValue && (
        <span className="text-[28px] font-bold leading-none tabular-nums" style={{ color: fg }}>
          {card.value}
        </span>
      )}

      {/* Blurb */}
      <p className="text-[13px] font-medium leading-snug" style={{ color: withAlpha(fg, 0.78) }}>
        {card.blurb}
      </p>
    </div>
  );

  return team ? (
    <button type="button" onClick={() => onTeamClick(team.id)} className="block w-full text-left active:brightness-95">
      {inner}
    </button>
  ) : (
    <div>{inner}</div>
  );
}

function LiveLeaderboard({
  title,
  record,
  rows,
  emptyLabel,
  onTeamClick,
}: {
  title: string;
  record: WCRecord;
  rows: LeaderRow[];
  emptyLabel: string;
  onTeamClick: (id: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 px-4 pb-5 pt-5" style={{ background: PAPER }}>
        <span className="text-[24px] font-bold uppercase leading-none text-black">{title}</span>
        <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-black/40">Record</span>
          <span className="text-[12px] font-medium leading-none text-black">
            {record.flag} {record.player}
          </span>
          {record.year ? <span className="text-[12px] italic font-medium text-black/40">{record.year}</span> : null}
          <span className="ml-auto text-[15px] font-bold leading-none tabular-nums text-black">{record.value}</span>
        </div>
      </div>

      {rows.length > 0 ? (
        rows.map(row => (
          <LiveRow
            key={row.stat.playerId}
            row={row}
            onClick={() => onTeamClick(row.team.id)}
          />
        ))
      ) : (
        <div className="flex h-[76px] items-center px-4 text-[13px] font-semibold text-black/35" style={{ background: PAPER }}>
          {emptyLabel}
        </div>
      )}
    </>
  );
}

function LiveRow({ row, onClick }: { row: LeaderRow; onClick: () => void }) {
  const fg = rowTextColor(row.team);
  const hairline = needsHairline(row.team.primaryHex);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[76px] w-full items-center gap-2 px-4 text-left active:brightness-95"
      style={{
        background: row.team.primaryHex,
        color: fg,
        boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
      }}
    >
      <span className="flex-1 truncate text-[15px] font-medium leading-none">
        {row.team.flagEmoji} {row.stat.playerName}
      </span>
      <span className="text-[32px] font-bold leading-none tabular-nums">{row.value}</span>
    </button>
  );
}

function InvolvementBlock({ rows, onTeamClick }: { rows: InvolvementRow[]; onTeamClick: (id: string) => void }) {
  const record = SINGLE_TOURNAMENT_RECORDS.involvement[0];
  return (
    <>
      <div className="flex flex-col gap-4 px-4 pb-5 pt-5" style={{ background: PAPER }}>
        <span className="text-[24px] font-bold uppercase leading-none text-black">Goal Involvement</span>
        <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-black/40">Record</span>
          <span className="text-[12px] font-medium leading-none text-black">
            {record.flag} {record.player}
          </span>
          {record.year ? <span className="text-[12px] italic font-medium text-black/40">{record.year}</span> : null}
          <span className="ml-auto text-[15px] font-bold leading-none tabular-nums text-black">{record.value}</span>
        </div>
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
        <div className="flex h-[76px] items-center px-4 text-[13px] font-semibold text-black/35" style={{ background: PAPER }}>
          No goal involvements yet
        </div>
      )}
    </>
  );
}

function FullInvolvementRow({ row, onClick }: { row: InvolvementRow; onClick: () => void }) {
  const fg = rowTextColor(row.team);
  const hairline = needsHairline(row.team.primaryHex);
  const isLightBg = needsHairline(row.team.primaryHex) || contrastRatio('#000000', row.team.primaryHex) > contrastRatio('#ffffff', row.team.primaryHex);
  const pillBg = isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.10)';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[76px] w-full items-center gap-2 px-4 text-left active:brightness-95"
      style={{
        background: row.team.primaryHex,
        color: fg,
        boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
      }}
    >
      <span className="flex-1 truncate text-[15px] font-medium leading-none">
        {row.team.flagEmoji} {row.stat.playerName}
      </span>
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-1 px-1 py-2" style={{ background: pillBg }}>
          <span className="flex items-end gap-px">
            <span className="text-[11px] font-bold leading-none">{row.goals}</span>
            <span className="text-[10px] font-bold leading-none">G</span>
          </span>
          <span className="flex items-end gap-px">
            <span className="text-[11px] font-bold leading-none">{row.assists}</span>
            <span className="text-[10px] font-bold leading-none">A</span>
          </span>
        </div>
        <span className="text-[32px] font-bold leading-none tabular-nums">{row.total}</span>
      </div>
    </button>
  );
}

// ─── Records View ────────────────────────────────────────────────────────────

function RecordsView({ stats }: { stats: PlayerStat[] }) {
  const tables = useMemo<AllTimeRecordTable[]>(() => [
    liveRankedTable('goals', 'Goals', ALL_TIME_GOALS, row => row.goals ?? 0, row => liveDeltaFor(row, stats, 'goals')),
    liveRankedTable('assists', 'Assists', ALL_TIME_ASSISTS, row => row.assists ?? 0, row => liveDeltaFor(row, stats, 'assists')),
    liveRankedTable('appearances', 'Appearances', ALL_TIME_APPEARANCES, row => row.games ?? 0, row => currentAppearancesFor(row)),
    ...liveAgeAndSpeedTables(),
  ], [stats]);

  return (
    <div style={{ background: PAPER }}>
      {tables.map(table => (
        <RecordTable key={table.id} table={table} />
      ))}
    </div>
  );
}

function RecordTable({ table }: { table: AllTimeRecordTable }) {
  return (
    <section>
      <div className="flex flex-col gap-4 px-4 pb-5 pt-5" style={{ background: PAPER }}>
        <span className="text-[24px] font-bold uppercase leading-none text-black">{table.title}</span>
      </div>

      {table.rows.map(row => (
        <AllTimeRecordRowView key={`${table.id}-${row.rank}-${row.player}`} row={row} />
      ))}
    </section>
  );
}

function AllTimeRecordRowView({ row }: { row: AllTimeRecordRow }) {
  const team = row.isCurrent ? teamForCountry(row.country) : undefined;
  const isNewRecord = Boolean(row.isNewRecord);
  const bg = team?.primaryHex ?? '#1C1917';
  const fg = team ? rowTextColor(team) : '#FFFFFF';
  const detailColor = team ? withAlpha(fg, 0.58) : 'rgba(255,255,255,0.40)';
  const valueColor = fg;
  const hairline = team ? needsHairline(team.primaryHex) : false;

  return (
    <div
      className="flex h-[76px] w-full items-center gap-2 px-4"
      style={{
        background: bg,
        color: fg,
        boxShadow: hairline ? 'inset 0 0 0 1px rgba(0,0,0,.10)' : undefined,
      }}
    >
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium leading-none">
        {flagForCountry(row.country)} {shortPlayerName(row.player)}
      </span>
      {row.detail ? (
        <span
          className="hidden shrink-0 text-right text-[12px] font-medium italic leading-none min-[380px]:block"
          style={{ color: detailColor }}
        >
          {row.detail}
        </span>
      ) : null}
      {row.currentDelta ? (
        <span
          className="shrink-0 text-[11px] font-bold leading-none"
          style={{ color: detailColor }}
        >
          +{row.currentDelta}
        </span>
      ) : null}
      {isNewRecord ? (
        <span className="shrink-0 text-[12px] leading-none" aria-label="New record">
          🏅
        </span>
      ) : null}
      <span
        className="shrink-0 text-right text-[32px] font-bold leading-none tabular-nums"
        style={{ color: valueColor }}
      >
        {row.value}
      </span>
    </div>
  );
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function liveRankedTable(
  id: string,
  title: string,
  rows: WCRankedRecord[],
  baseValueFor: (row: WCRankedRecord) => number,
  currentDeltaFor: (row: WCRankedRecord) => number,
): AllTimeRecordTable {
  const baseLeader = Math.max(...rows.map(baseValueFor), 0);
  const liveRows = rows
    .map(row => {
      const baseValue = baseValueFor(row);
      const currentDelta = currentDeltaFor(row);
      const value = baseValue + currentDelta;
      return {
        rank: row.rank,
        player: row.player,
        country: row.country,
        value: String(value),
        detail: row.editions ?? (row.year ? String(row.year) : undefined),
        currentDelta: currentDelta > 0 ? String(currentDelta) : undefined,
        isCurrent: currentDelta > 0 || Boolean(matchedCurrentPlayer(row.player, row.country)),
        isNewRecord: currentDelta > 0 && value >= baseLeader,
        sortValue: value,
      };
    })
    .sort((a, b) => b.sortValue - a.sortValue || a.player.localeCompare(b.player))
    .slice(0, 10)
    .map(({ sortValue: _sortValue, ...row }) => row);

  return {
    id,
    title,
    rows: liveRows,
  };
}

function liveAgeAndSpeedTables(): AllTimeRecordTable[] {
  return ALL_TIME_AGE_AND_SPEED_RECORDS.map(table => {
    const currentRows = currentRowsForRecordTable(table.id);
    if (currentRows.length === 0) return table;

    const comparator = recordComparator(table.id);
    const baseLeader = table.rows[0]?.value;
    const merged = [...table.rows, ...currentRows]
      .sort(comparator)
      .slice(0, 10)
      .map((row, index) => ({
        ...row,
        rank: index + 1,
        isNewRecord: row.isCurrent && index === 0 && baseLeader ? comparator(row, { ...row, value: baseLeader }) <= 0 : row.isNewRecord,
      }));

    return { ...table, rows: merged };
  });
}

function liveDeltaFor(row: WCRankedRecord, stats: PlayerStat[], metric: LeaderboardMetric): number {
  const player = matchedCurrentPlayer(row.player, row.country);
  if (!player) return 0;
  const stat = stats.find(s => s.playerId === player.id || (s.teamId === player.teamId && samePlayerName(s.playerName, row.player)));
  return stat?.[metric] ?? 0;
}

function currentAppearancesFor(row: WCRankedRecord): number {
  const player = matchedCurrentPlayer(row.player, row.country);
  if (!player) return 0;

  const fixtures = playedFixturesForTeam(player.teamId);
  const lineupAppearances = fixtures.filter(fixture => {
    const lineup = dataService.matchLineup(fixture.id, player.teamId);
    return lineup?.players.some(slot => slot.playerId === player.id || samePlayerName(slot.playerName, player.name));
  }).length;

  return lineupAppearances > 0 ? lineupAppearances : fixtures.length;
}

function currentRowsForRecordTable(tableId: string): AllTimeRecordRow[] {
  if (tableId === 'youngest-player') return currentAgeRows('youngest-player');
  if (tableId === 'oldest-player') return currentAgeRows('oldest-player');
  if (tableId === 'youngest-to-score') return currentScoringAgeRows('youngest-to-score');
  if (tableId === 'oldest-to-score') return currentScoringAgeRows('oldest-to-score');
  if (tableId === 'fastest-goal') return currentFastestGoalRows();
  return [];
}

function currentAgeRows(kind: 'youngest-player' | 'oldest-player'): AllTimeRecordRow[] {
  const rows = new Map<string, AllTimeRecordRow & { ageDays: number }>();
  for (const fixture of playedFixtures()) {
    for (const teamId of [fixture.homeTeamId, fixture.awayTeamId]) {
      const lineup = dataService.matchLineup(fixture.id, teamId);
      const players = lineup?.players
        .map(slot => dataService.player(slot.playerId))
        .filter((player): player is Player => Boolean(player?.dateOfBirth)) ?? [];

      for (const player of players) {
        const age = ageAt(player.dateOfBirth!, fixture.kickoffUtc);
        const existing = rows.get(player.id);
        const shouldReplace = !existing || (kind === 'youngest-player' ? age.totalDays < existing.ageDays : age.totalDays > existing.ageDays);
        if (!shouldReplace) continue;
        rows.set(player.id, {
          rank: 0,
          player: player.name,
          country: teamCountryName(player.teamId),
          value: age.label,
          detail: '2026',
          isCurrent: true,
          ageDays: age.totalDays,
        });
      }
    }
  }

  return [...rows.values()].map(({ ageDays: _ageDays, ...row }) => row);
}

function currentScoringAgeRows(kind: 'youngest-to-score' | 'oldest-to-score'): AllTimeRecordRow[] {
  const rows = new Map<string, AllTimeRecordRow & { ageDays: number }>();
  for (const fixture of playedFixtures()) {
    for (const event of dataService.matchEvents(fixture.id)) {
      if (event.type !== 'goal' && event.type !== 'penalty') continue;
      const player = dataService.player(event.playerId);
      if (!player?.dateOfBirth) continue;
      const age = ageAt(player.dateOfBirth, fixture.kickoffUtc);
      const existing = rows.get(player.id);
      const shouldReplace = !existing || (kind === 'youngest-to-score' ? age.totalDays < existing.ageDays : age.totalDays > existing.ageDays);
      if (!shouldReplace) continue;
      rows.set(player.id, {
        rank: 0,
        player: player.name,
        country: teamCountryName(player.teamId),
        value: age.label,
        detail: `v ${opponentShortCode(fixture, player.teamId)}, 2026`,
        isCurrent: true,
        ageDays: age.totalDays,
      });
    }
  }

  return [...rows.values()].map(({ ageDays: _ageDays, ...row }) => row);
}

function currentFastestGoalRows(): AllTimeRecordRow[] {
  const rows: AllTimeRecordRow[] = [];
  for (const fixture of playedFixtures()) {
    for (const event of dataService.matchEvents(fixture.id)) {
      if (event.type !== 'goal' && event.type !== 'penalty') continue;
      const player = dataService.player(event.playerId);
      if (!player) continue;
      rows.push({
        rank: 0,
        player: player.name,
        country: teamCountryName(player.teamId),
        value: `${event.minute}'`,
        detail: `v ${opponentShortCode(fixture, player.teamId)}, 2026`,
        isCurrent: true,
      });
    }
  }
  return rows;
}

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

function rowTextColor(team: Team): string {
  const readable = readableOn(team.primaryHex);
  const secondary = team.secondaryHex;
  return contrastRatio(secondary, team.primaryHex) >= 3 ? secondary : readable;
}

function needsHairline(hex: string): boolean {
  return contrastRatio(hex, PAPER) < 1.3;
}

function matchedCurrentPlayer(playerName: string, country: string): Player | undefined {
  const team = teamForCountry(country);
  if (!team) return undefined;
  return dataService.squad(team.id).find(player => samePlayerName(player.name, playerName));
}

function samePlayerName(currentName: string, historicName: string): boolean {
  const current = normalizeName(currentName);
  const historic = normalizeName(historicName);
  const historicTokens = historic.split(' ').filter(Boolean);
  const historicKey = historicTokens[historicTokens.length - 1] ?? historic;

  return (
    current === historic ||
    current.includes(historicKey) ||
    historic.includes(current) ||
    PLAYER_NAME_ALIASES[historic]?.some(alias => normalizeName(alias) === current) ||
    PLAYER_NAME_ALIASES[current]?.some(alias => normalizeName(alias) === historic)
  );
}

function playedFixtures(): Fixture[] {
  return dataService.allFixtures().filter(fixture => fixture.status === 'finished' || fixture.status === 'live');
}

function playedFixturesForTeam(teamId: string): Fixture[] {
  return playedFixtures().filter(fixture => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId);
}

function ageAt(dateOfBirth: string, at: string): { label: string; totalDays: number } {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const then = new Date(at);
  const totalDays = Math.max(0, Math.floor((then.getTime() - birth.getTime()) / 86_400_000));
  let years = then.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayThisYear = Date.UTC(then.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate());
  if (then.getTime() < birthdayThisYear) years--;
  const lastBirthday = Date.UTC(birth.getUTCFullYear() + years, birth.getUTCMonth(), birth.getUTCDate());
  const days = Math.max(0, Math.floor((then.getTime() - lastBirthday) / 86_400_000));
  return { label: `${years}y ${days}d`, totalDays };
}

function recordComparator(tableId: string): (a: AllTimeRecordRow, b: AllTimeRecordRow) => number {
  if (tableId === 'youngest-player' || tableId === 'youngest-to-score' || tableId === 'fastest-goal') {
    return (a, b) => comparableRecordValue(a.value) - comparableRecordValue(b.value);
  }
  return (a, b) => comparableRecordValue(b.value) - comparableRecordValue(a.value);
}

function comparableRecordValue(value: string): number {
  const age = value.match(/^(\d+)y\s+(\d+)d$/);
  if (age) return Number(age[1]) * 365 + Number(age[2]);

  const seconds = value.match(/^(\d+)s$/);
  if (seconds) return Number(seconds[1]);

  const minute = value.match(/^(\d+)'$/);
  if (minute) return Number(minute[1]) * 60;

  return Number(value.replace(/[^\d.]/g, '')) || 0;
}

function opponentShortCode(fixture: Fixture, teamId: string): string {
  const opponentId = fixture.homeTeamId === teamId ? fixture.awayTeamId : fixture.homeTeamId;
  return dataService.team(opponentId)?.shortCode ?? opponentId;
}

function teamCountryName(teamId: string): string {
  return dataService.team(teamId)?.name ?? teamId;
}

function teamForCountry(country: string): Team | undefined {
  const aliases: Record<string, string> = {
    Argentina: 'ARG',
    Algeria: 'ALG',
    Brazil: 'BRA',
    Cameroon: 'CMR',
    Colombia: 'COL',
    'Czech Republic': 'CZE',
    England: 'ENG',
    Egypt: 'EGY',
    France: 'FRA',
    Germany: 'GER',
    Ghana: 'GHA',
    Hungary: 'HUN',
    Italy: 'ITA',
    Mexico: 'MEX',
    'Northern Ireland': 'NIR',
    Nigeria: 'NGA',
    Poland: 'POL',
    Portugal: 'POR',
    Romania: 'ROU',
    Russia: 'RUS',
    Sweden: 'SWE',
    Turkey: 'TUR',
    Türkiye: 'TUR',
    'United States': 'USA',
    'West Germany': 'GER',
  };

  const id = aliases[country];
  return id ? dataService.team(id) : undefined;
}

function flagForCountry(country: string): string {
  const flags: Record<string, string> = {
    Argentina: '🇦🇷',
    Brazil: '🇧🇷',
    Cameroon: '🇨🇲',
    Colombia: '🇨🇴',
    'Czech Republic': '🇨🇿',
    England: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
    Egypt: '🇪🇬',
    France: '🇫🇷',
    Germany: '🇩🇪',
    Hungary: '🇭🇺',
    Italy: '🇮🇹',
    Mexico: '🇲🇽',
    Nigeria: '🇳🇬',
    'Northern Ireland': '🇬🇧',
    Poland: '🇵🇱',
    Portugal: '🇵🇹',
    Romania: '🇷🇴',
    Russia: '🇷🇺',
    Sweden: '🇸🇪',
    Turkey: '🇹🇷',
    'United States': '🇺🇸',
    'West Germany': '🇩🇪',
  };

  return flags[country] ?? '🏳';
}

function shortPlayerName(player: string): string {
  const names: Record<string, string> = {
    'Cristiano Ronaldo': 'Ronaldo',
    'Kylian Mbappe': 'Mbappe',
    'Lionel Messi': 'Messi',
  };

  return names[player] ?? player;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .toLowerCase()
    .trim();
}

function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
