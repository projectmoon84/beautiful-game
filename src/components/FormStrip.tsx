import type { FormResult } from '../data/types';

// Semantic colours — not team colours; same across all teams.
const RESULT_STYLE: Record<FormResult, { bg: string; label: string }> = {
  W: { bg: '#1db954', label: 'Win' },
  D: { bg: '#c9a227', label: 'Draw' },
  L: { bg: '#e23b3b', label: 'Loss' },
};

interface FormStripProps {
  /** Up to 5 results, most recent first */
  results: FormResult[];
  className?: string;
}

/**
 * FormStrip — a row of W/D/L squares showing recent form.
 * Uses semantic colours (green/amber/red) — independent of team theming.
 */
export default function FormStrip({ results, className = '' }: FormStripProps) {
  return (
    <div className={['flex gap-1', className].join(' ')} role="list" aria-label="Recent form">
      {results.map((r, i) => (
        <span
          key={i}
          role="listitem"
          aria-label={RESULT_STYLE[r].label}
          className="flex items-center justify-center rounded-[6px] text-[11px] font-bold text-white"
          style={{ width: 22, height: 22, background: RESULT_STYLE[r].bg }}
        >
          {r}
        </span>
      ))}
    </div>
  );
}
