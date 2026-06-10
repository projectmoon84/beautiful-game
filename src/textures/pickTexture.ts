import { TEXTURES } from './textures.config';

/**
 * Returns a stable texture ID for a given seed string (fixture id, team id, etc.).
 * djb2 hash — same seed always returns the same texture; varied across entities.
 */
export function pickTexture(seed: string): string {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    hash >>>= 0; // uint32
  }
  return TEXTURES[hash % TEXTURES.length].id;
}
