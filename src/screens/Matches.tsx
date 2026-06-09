import { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useMotionTier } from '../hooks/useMotionTier';
import { readableOn, meetsWcagAA } from '../theme/contrast';

// Demo teams for Phase 1 theming verification
const DEMO_TEAMS = [
  { name: 'Brazil',   primary: '#009739', secondary: '#F5C800', tertiary: '#F5C800' },
  { name: 'Portugal', primary: '#FFD100', secondary: '#DA291C', tertiary: '#FFD100' },
  { name: 'France',   primary: '#002395', secondary: '#ED2939', tertiary: '#FFFFFF' },
  { name: 'Argentina',primary: '#74ACDF', secondary: '#FFFFFF', tertiary: '#74ACDF' },
  { name: 'England',  primary: '#FFFFFF', secondary: '#CF081F', tertiary: '#012169' },
  { name: 'Germany',  primary: '#000000', secondary: '#DD0000', tertiary: '#FFCE00' },
];

export default function Matches() {
  const { tokens, setTeam } = useTheme();
  const tier = useMotionTier();

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  function handleSelect(team: typeof DEMO_TEAMS[number]) {
    setSelectedTeam(team.name);
    setTeam({ primary: team.primary, secondary: team.secondary, tertiary: team.tertiary });
  }

  const primaryText = readableOn(tokens.primary);
  const secondaryText = readableOn(tokens.secondary);
  const primaryPass = meetsWcagAA(primaryText, tokens.primary);
  const secondaryPass = meetsWcagAA(secondaryText, tokens.secondary);

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Matches</h1>
      <p className="text-sm opacity-50 mb-8">Full fixture list arrives in Phase 3.</p>

      {/* ── Phase 1 demo: theming verification ── */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold tracking-widest uppercase opacity-40 mb-3">
          Phase 1 — theme token demo
        </h2>
        <div className="flex flex-wrap gap-2 mb-5">
          {DEMO_TEAMS.map(team => (
            <button
              key={team.name}
              onClick={() => handleSelect(team)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-opacity"
              style={{
                background: team.primary,
                color: readableOn(team.primary),
                borderColor: team.secondary,
                opacity: selectedTeam === team.name ? 1 : 0.7,
              }}
            >
              {team.name}
            </button>
          ))}
        </div>

        {/* Live token swatches */}
        <div className="rounded-xl overflow-hidden border border-black/10">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'var(--team-primary)', color: 'var(--team-on-primary)' }}
          >
            <span className="text-sm font-semibold">--team-primary</span>
            <span className="font-mono text-xs opacity-70">{tokens.primary}</span>
            <span className="text-xs ml-2">{primaryPass ? '✓ AA' : '✗ AA'}</span>
          </div>
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'var(--team-secondary)', color: 'var(--team-on-secondary)' }}
          >
            <span className="text-sm font-semibold">--team-secondary</span>
            <span className="font-mono text-xs opacity-70">{tokens.secondary}</span>
            <span className="text-xs ml-2">{secondaryPass ? '✓ AA' : '✗ AA'}</span>
          </div>
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'var(--team-tertiary)', color: 'var(--team-on-primary)' }}
          >
            <span className="text-sm font-semibold">--team-tertiary</span>
            <span className="font-mono text-xs opacity-70">{tokens.tertiary}</span>
          </div>
        </div>

        <p className="mt-3 text-xs opacity-40">
          Motion tier: <strong>{tier}</strong> — enable OS reduce-motion to see it switch to{' '}
          <code>reduced</code>.
        </p>
      </section>
    </div>
  );
}
