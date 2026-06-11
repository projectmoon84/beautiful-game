import type { Team } from '../data/types';

export function teamFacts(team: Team): string[] {
  const facts = [...(team.triviaFacts ?? []), team.funFact]
    .map(fact => fact.trim())
    .filter(Boolean);

  return [...new Set(facts)];
}

export function randomTeamFact(team: Team): string {
  const facts = teamFacts(team);
  if (facts.length === 0) return team.funFact;
  return facts[Math.floor(Math.random() * facts.length)];
}
