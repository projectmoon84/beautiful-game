/**
 * Texture registry.
 *
 * To add a new texture:
 *  1. Author an SVG in /public/textures/ following the template:
 *       - viewBox 0 0 480 480
 *       - White shapes on transparent background
 *       - Used as CSS mask-image — backgroundColor on the overlay div provides the tint
 *       - File: texture-<name>.svg
 *  2. Add an entry below and the texture is live.
 */

export interface TextureConfig {
  id: string;
  label: string;
  file: string;      // relative to /public/textures/
  opacity: number;   // suggested default opacity (0–1)
}

export const TEXTURES: TextureConfig[] = [
  { id: 'stripes', label: 'Stripes',  file: 'texture-stripes.svg', opacity: 0.12 },
  { id: 'dots',    label: 'Dots',     file: 'texture-dots.svg',    opacity: 0.14 },
  { id: 'weave',   label: 'Weave',    file: 'texture-weave.svg',   opacity: 0.10 },
];

export const textureMap = new Map<string, TextureConfig>(
  TEXTURES.map(t => [t.id, t])
);
