import type { ReactNode } from 'react';

type PillVariant = 'default' | 'live' | 'minute';

interface PillProps {
  variant?: PillVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<PillVariant, string> = {
  default: 'bg-white text-black',
  // Live: red pill with a subtle pulse ring
  live:    'bg-[#e23b3b] text-white',
  // Minute: same white pill but slightly larger padding for timeline use
  minute:  'bg-white text-black',
};

/**
 * Pill — the app's badge / chip primitive.
 * Used for minute markers on the timeline, live status badges, and group labels.
 */
export default function Pill({ variant = 'default', children, className = '' }: PillProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        'rounded-full px-[7px] py-[2px]',
        'text-[11px] font-semibold leading-[1.3] whitespace-nowrap',
        VARIANT_STYLES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
