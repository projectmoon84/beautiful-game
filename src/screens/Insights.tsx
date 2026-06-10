import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import type { InsightCard as InsightCardType, PlayerStat, Team } from '../data/types';
import { readableOn } from '../theme/contrast';

type LeaderboardMetric = 'goals' | 'assists' | 'cards';

interface LeaderboardConfig {
  id: LeaderboardMetric;
  label: string;
  caption: string;
}

interface InsightDisplayCard extends InsightCardType {
  detail: string;
}

const LEADERBOARDS: LeaderboardConfig[] = [
  { id: 'goals', label: 'Goals', caption: 'Top scorers' },
  { id: 'assists', label: 'Assists', caption: 'Creators' },
  { id: 'cards', label: 'Cards', caption: 'Discipline watch' },
];

const INSIGHT_ORDER = ['Highest scoring', 'Meanest defence', 'Dark horse', 'Defying the odds'];

export default function Insights() {
  const navigate = useNavigate();
  const stats = useMemo(() => dataService.playerStats(), []);
  const insights = useMemo(() => buildInsightCards(), []);
  const totalGoals = stats.reduce((sum, stat) => sum + stat.goals, 0);
  const totalAssists = stats.reduce((sum, stat) => sum + stat.assists, 0);
  const totalCards = stats.reduce((sum, stat) => sum + stat.yellowCards + stat.redCards, 0);

  return (
    <div className="min-h-full bg-[var(--surface)] pb-8">
      <header className="relative overflow-hidden bg-[var(--black)] px-4 pb-6 pt-5 text-[var(--surface)]">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[42px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full border-[56px] border-white/5" />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-white/50">
            Tournament pulse
          </div>
          <h1 className="mt-3 text-[48px] font-black uppercase leading-[0.85] tracking-normal">
            Insights
          </h1>
          <div className="mt-5 grid grid-cols-3 overflow-hidden border-y border-white/20">
            <MetricCell label="Goals" value={totalGoals} />
            <MetricCell label="Assists" value={totalAssists} />
            <MetricCell label="Cards" value={totalCards} />
          </div>
        </div>
      </header>

      <section className="px-4 py-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-[22px] font-black uppercase leading-none">Leaderboards</h2>
            <p className="mt-1 text-[12px] font-medium text-black/50">
              Built from goals, assists and card events.
            </p>
          </div>
          <span className="rounded-full bg-black px-3 py-1 text-[10px] font-bold uppercase text-white">
            Live
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {LEADERBOARDS.map(config => (
            <StatLeaderboard
              key={config.id}
              config={config}
              stats={stats}
              onTeamClick={teamId => navigate(`/team/${teamId}`)}
            />
          ))}
        </div>
      </section>

      <section className="px-4 pb-5">
        <div className="mb-3">
          <h2 className="text-[22px] font-black uppercase leading-none">Storylines</h2>
          <p className="mt-1 text-[12px] font-medium text-black/50">
            Curated cards with query-based fallbacks.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map(card => {
            const team = dataService.team(card.teamId);
            if (!team) return null;
            return (
              <InsightCard
                key={card.kind}
                card={card}
                team={team}
                onClick={() => navigate(`/team/${team.id}`)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-white/20 py-3 last:border-r-0">
      <div className="text-[28px] font-black leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase leading-none text-white/50">{label}</div>
    </div>
  );
}

function StatLeaderboard({
  config,
  stats,
  onTeamClick,
}: {
  config: LeaderboardConfig;
  stats: PlayerStat[];
  onTeamClick: (teamId: string) => void;
}) {
  const rows = topRowsForMetric(stats, config.id);
  const maxValue = Math.max(...rows.map(row => row.value), 1);

  return (
    <article className="overflow-hidden rounded-lg bg-white shadow-[0_1px_0_rgba(0,0,0,0.08)]">
      <div className="border-b border-black/10 px-3 py-3">
        <div className="text-[10px] font-bold uppercase leading-none text-black/40">{config.caption}</div>
        <h3 className="mt-1 text-[24px] font-black uppercase leading-none">{config.label}</h3>
      </div>

      <div>
        {rows.length > 0 ? rows.map((row, index) => {
          const team = dataService.team(row.stat.teamId);
          const teamColor = team?.primaryHex ?? '#1a1a1a';
          const teamText = team?.secondaryHex ?? '#ffffff';
          const isMostlyFilled = row.value / maxValue >= 0.7;
          const width = `${Math.max(18, (row.value / maxValue) * 100)}%`;

          return (
            <button
              key={`${config.id}-${row.stat.playerId}`}
              type="button"
              onClick={() => onTeamClick(row.stat.teamId)}
              className="relative block w-full border-b border-black/10 px-3 py-3 text-left last:border-b-0 active:opacity-80"
            >
              <div
                className="absolute bottom-0 left-0 top-0 opacity-95"
                style={{ width, backgroundColor: teamColor }}
                aria-hidden="true"
              />
              <div
                className="relative flex items-center gap-3"
                style={{ color: isMostlyFilled ? teamText : '#1a1a1a' }}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-black"
                  style={{ backgroundColor: teamColor, color: teamText }}
                >
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-black leading-none">{row.stat.playerName}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase leading-none opacity-60">
                    {team?.shortCode ?? row.stat.teamId}
                  </div>
                </div>
                <div className="text-[28px] font-black leading-none">{row.value}</div>
              </div>
            </button>
          );
        }) : (
          <div className="px-3 py-8 text-center text-[12px] font-semibold text-black/40">
            No events yet.
          </div>
        )}
      </div>
    </article>
  );
}

function InsightCard({
  card,
  team,
  onClick,
}: {
  card: InsightDisplayCard;
  team: Team;
  onClick: () => void;
}) {
  const bg = team.primaryHex;
  const fg = team.secondaryHex;
  const accent = team.tertiaryHex;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative min-h-[176px] overflow-hidden rounded-lg p-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.08)] active:opacity-90"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full border-[42px] border-white/15" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full border-[52px] border-white/10" />
      <div className="relative flex h-full min-h-[144px] flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase leading-none opacity-70">{card.kind}</div>
            <div className="mt-2 text-[46px] font-black uppercase leading-[0.82]">{team.shortCode}</div>
          </div>
          <div
            className="shrink-0 rounded-full px-3 py-2 text-[13px] font-black leading-none"
            style={{ backgroundColor: accent, color: readableOn(accent) }}
          >
            {card.value}
          </div>
        </div>
        <div className="mt-auto pt-5">
          <div className="text-[15px] font-bold leading-[17px]">{card.blurb}</div>
          <div className="mt-2 text-[11px] font-bold uppercase leading-none opacity-60">{card.detail}</div>
        </div>
      </div>
    </button>
  );
}

function topRowsForMetric(stats: PlayerStat[], metric: LeaderboardMetric) {
  return stats
    .map(stat => ({
      stat,
      value: metric === 'cards' ? stat.yellowCards + stat.redCards : stat[metric],
    }))
    .filter(row => row.value > 0)
    .sort((a, b) => (
      b.value - a.value ||
      b.stat.goals - a.stat.goals ||
      b.stat.assists - a.stat.assists ||
      a.stat.playerName.localeCompare(b.stat.playerName)
    ))
    .slice(0, 5);
}

function buildInsightCards(): InsightDisplayCard[] {
  const defaults = new Map<string, InsightDisplayCard>(
    buildDefaultInsights().map(card => [card.kind, card]),
  );

  for (const card of dataService.insights()) {
    if (!INSIGHT_ORDER.includes(card.kind) || !dataService.team(card.teamId)) continue;
    const fallback = defaults.get(card.kind);
    defaults.set(card.kind, {
      ...card,
      detail: fallback?.detail ?? 'Editorial pick',
    });
  }

  return INSIGHT_ORDER
    .map(kind => defaults.get(kind))
    .filter((card): card is InsightDisplayCard => Boolean(card));
}

function buildDefaultInsights(): InsightDisplayCard[] {
  const teams = dataService.allTeams();
  const standings = dataService
    .allGroups()
    .flatMap(group => dataService.standingsForGroup(group.id));

  const highestScoringRow = standings
    .filter(row => row.goalsFor > 0 || row.played > 0)
    .sort((a, b) => (
      b.goalsFor - a.goalsFor ||
      b.goalDiff - a.goalDiff ||
      b.points - a.points ||
      a.team.seed - b.team.seed
    ))[0];

  const meanestDefenceRow = standings
    .filter(row => row.played > 0)
    .sort((a, b) => (
      a.goalsAgainst - b.goalsAgainst ||
      b.goalDiff - a.goalDiff ||
      b.points - a.points ||
      a.team.seed - b.team.seed
    ))[0];

  const darkHorseRow = standings
    .filter(row => row.team.seed >= 10 && row.played > 0)
    .sort(compareStandingOutperformance)[0]
    ?? standings.filter(row => row.team.seed >= 10).sort((a, b) => a.team.seed - b.team.seed)[0];

  const defyingOddsRow = standings
    .filter(row => row.played > 0)
    .sort(compareOddsOutperformance)[0]
    ?? standings.filter(row => oddsLongness(row.team.titleOdds) > 0).sort((a, b) => (
      oddsLongness(b.team.titleOdds) - oddsLongness(a.team.titleOdds) ||
      a.team.seed - b.team.seed
    ))[0];

  const highestScoring = highestScoringRow?.team ?? teams[0];
  const meanestDefence = meanestDefenceRow?.team ?? teams[0];
  const darkHorse = darkHorseRow?.team ?? teams.find(team => team.seed >= 10) ?? highestScoring;
  const defyingOdds = defyingOddsRow?.team ?? darkHorse;
  const highestScoringGoals = highestScoringRow?.goalsFor ?? 0;
  const meanestGoalsAgainst = meanestDefenceRow?.goalsAgainst ?? 0;

  return [
    {
      kind: 'Highest scoring',
      teamId: highestScoring.id,
      value: `${highestScoringGoals} goals`,
      blurb: `${highestScoring.name} are setting the attacking pace.`,
      detail: 'From standings goals for',
    },
    {
      kind: 'Meanest defence',
      teamId: meanestDefence.id,
      value: `${meanestGoalsAgainst} conceded`,
      blurb: `${meanestDefence.name} have been the hardest side to breach.`,
      detail: 'From standings goals against',
    },
    {
      kind: 'Dark horse',
      teamId: darkHorse.id,
      value: darkHorseRow && darkHorseRow.played > 0 ? `${darkHorseRow.points} pts` : `Seed ${darkHorse.seed}`,
      blurb: `${darkHorse.name} look dangerous outside the top seeds.`,
      detail: 'Points vs lower seed profile',
    },
    {
      kind: 'Defying the odds',
      teamId: defyingOdds.id,
      value: defyingOddsRow && defyingOddsRow.played > 0 ? `${defyingOddsRow.points} pts` : defyingOdds.titleOdds,
      blurb: `${defyingOdds.name} are outperforming their pre-tournament profile.`,
      detail: 'Points vs title odds',
    },
  ];
}

function compareStandingOutperformance(
  a: ReturnType<typeof dataService.standingsForGroup>[number],
  b: ReturnType<typeof dataService.standingsForGroup>[number],
): number {
  return (
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    b.team.seed - a.team.seed
  );
}

function compareOddsOutperformance(
  a: ReturnType<typeof dataService.standingsForGroup>[number],
  b: ReturnType<typeof dataService.standingsForGroup>[number],
): number {
  const aLongness = oddsLongness(a.team.titleOdds);
  const bLongness = oddsLongness(b.team.titleOdds);

  return (
    b.points - a.points ||
    bLongness - aLongness ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    b.team.seed - a.team.seed
  );
}

function oddsLongness(value: string): number {
  const fraction = value.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);

  const decimal = Number(value);
  return Number.isFinite(decimal) ? decimal - 1 : 0;
}
