import type { CSSProperties, ElementType, ReactNode } from 'react';

// Sizes match the prototype's usage: 88px team name, 64px match codes,
// 34px screen title, 30px fixture card, 24px bracket, 20px rank.
const SIZE_PX: Record<string, number> = {
  'xs':  20,
  'sm':  24,
  'md':  30,
  'lg':  40,
  'xl':  64,
  '2xl': 88,
};

interface BigTypeProps {
  /** Semantic element to render — defaults to span */
  as?: ElementType;
  size?: keyof typeof SIZE_PX;
  /** CSS color value. Defaults to currentColor (inherits from parent). */
  color?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * BigType — the app's display typeface.
 * Bold, uppercase, tight leading, slightly tracked-in.
 * Always reads theme tokens or currentColor — never a hard-coded hex.
 */
export default function BigType({
  as: Tag = 'span',
  size = 'md',
  color,
  className = '',
  style,
  children,
}: BigTypeProps) {
  return (
    <Tag
      className={className}
      style={{
        fontFamily: '"Instrument Sans", system-ui, sans-serif',
        fontWeight: 700,
        textTransform: 'uppercase',
        lineHeight: 0.82,
        letterSpacing: '-0.02em',
        fontSize: SIZE_PX[size],
        color: color ?? 'currentColor',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
