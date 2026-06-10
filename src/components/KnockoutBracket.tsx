/**
 * KnockoutBracket — placeholder until the knockout rounds begin.
 * Phase 6 acceptance: renders without errors; shows clear pending state.
 */
export default function KnockoutBracket() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center opacity-40">
      <span className="text-4xl mb-3">🏆</span>
      <p className="text-sm font-semibold">Knockout bracket</p>
      <p className="text-xs mt-1 opacity-70">Unlocks after the group stage</p>
    </div>
  );
}
