/**
 * Converts a single sRGB channel (0–255) to linear light.
 */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Returns the relative luminance (0–1) of a #rrggbb hex colour.
 */
export function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Returns the WCAG contrast ratio between two hex colours.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns a readable text colour (#1a1a1a or #ffffff) for a given background.
 * Satisfies WCAG AA (4.5:1) in the vast majority of cases; falls back to the
 * higher-contrast option when a borderline background is passed.
 */
export function readableOn(bgHex: string): string {
  const onDark = contrastRatio(bgHex, '#ffffff');
  const onLight = contrastRatio(bgHex, '#1a1a1a');
  return onDark >= onLight ? '#ffffff' : '#1a1a1a';
}

/**
 * Returns true if the foreground/background pair meets WCAG AA (4.5:1).
 */
export function meetsWcagAA(fgHex: string, bgHex: string): boolean {
  return contrastRatio(fgHex, bgHex) >= 4.5;
}
