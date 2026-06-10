import { luminance } from '../theme/contrast';
import { textureMap } from './textures.config';

interface PitchTextureProps {
  /** ID from TEXTURES registry ('stripes', 'dots', 'weave') */
  textureId: string;
  /**
   * 'centre' — radial fade concentrated at the seam/circle.  Use on match hero halves.
   * 'full'   — full-bleed diagonal repeat. Use on team page headers.
   */
  variant?: 'centre' | 'full';
  /** Tint hex — team primary colour. */
  color: string;
  /** Background hex — selects multiply (light bg) vs screen (dark bg) blend. */
  bgHex: string;
  /** Override per-texture default opacity. */
  opacity?: number;
  /**
   * For 'centre' variant — which edge is the focal "seam".
   * 'right' = home half, 'left' = away half, 'center' = team page / scheduled hero.
   */
  anchor?: 'left' | 'right' | 'center';
}

/**
 * PitchTexture — kit-tinted low-opacity pattern overlay.
 *
 * Implementation:
 *   - backgroundColor = tint colour
 *   - CSS mask-image = SVG tile (white shapes = show, transparent = hide)
 *   - mix-blend-mode chosen by background luminance
 *   - 'centre': two-layer mask (radial-gradient ∩ texture) via mask-composite: intersect
 *
 * Must sit inside position: relative; overflow: hidden parent.
 */
export default function PitchTexture({
  textureId,
  variant = 'centre',
  color,
  bgHex,
  opacity,
  anchor = 'center',
}: PitchTextureProps) {
  const config = textureMap.get(textureId);
  if (!config) return null;

  const effectiveOpacity = opacity ?? config.opacity;
  const texUrl = `/textures/${config.file}`;

  // Light backgrounds: multiply (darkens pattern area); dark: screen (lightens).
  const blendMode = luminance(bgHex) > 0.25 ? 'multiply' : 'screen';

  const anchorPoint =
    anchor === 'left' ? '0% 50%' : anchor === 'right' ? '100% 50%' : '50% 50%';

  const radialGradient =
    variant === 'centre'
      ? `radial-gradient(ellipse 110% 140% at ${anchorPoint}, black 0%, transparent 75%)`
      : null;

  // Single-element two-layer mask avoids the stacking context / blend-mode interaction
  // that would break if we nested the radial fade and pattern in separate elements.
  // mask-composite: intersect = only show where BOTH layers are opaque.
  const style: Record<string, string | number> = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundColor: color,
    opacity: effectiveOpacity,
    mixBlendMode: blendMode,
    // Texture layer
    WebkitMaskImage: radialGradient ? `${radialGradient}, url(${texUrl})` : `url(${texUrl})`,
    maskImage: radialGradient ? `${radialGradient}, url(${texUrl})` : `url(${texUrl})`,
    WebkitMaskRepeat: radialGradient ? 'no-repeat, repeat' : 'repeat',
    maskRepeat: radialGradient ? 'no-repeat, repeat' : 'repeat',
    WebkitMaskSize: radialGradient ? 'auto, 120px 120px' : '120px 120px',
    maskSize: radialGradient ? 'auto, 120px 120px' : '120px 120px',
    // Composite: intersect = radial AND texture must both be opaque to show element
    ...(radialGradient && {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      WebkitMaskComposite: 'source-in' as any,
      maskComposite: 'intersect',
    }),
  };

  return <div style={style as React.CSSProperties} aria-hidden="true" />;
}
