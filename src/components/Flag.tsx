type FlagSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<FlagSize, string> = {
  sm: 'text-base',
  md: 'text-[22px]',
  lg: 'text-[30px]',
};

interface FlagProps {
  emoji: string;
  /** Optional text label (e.g. team name or country) */
  label?: string;
  size?: FlagSize;
  className?: string;
}

/**
 * Flag — renders a flag emoji with an optional label.
 * Purely presentational; colours come from the parent context.
 */
export default function Flag({ emoji, label, size = 'md', className = '' }: FlagProps) {
  return (
    <span className={['inline-flex items-center gap-1.5', className].join(' ')}>
      <span className={SIZE_CLASS[size]} role="img" aria-label={label}>
        {emoji}
      </span>
      {label && (
        <span className="text-sm font-semibold">{label}</span>
      )}
    </span>
  );
}
