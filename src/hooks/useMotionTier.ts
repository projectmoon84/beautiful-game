import { useState, useEffect } from 'react';

export type MotionTier = 'reduced' | 'core' | 'rich';

function detectTier(): MotionTier {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'reduced';
  }
  const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (isDesktop) {
    // Down-grade rich → core if the device looks memory-constrained
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (mem !== undefined && mem < 4) return 'core';
    return 'rich';
  }
  return 'core';
}

/**
 * Returns the motion tier for the current device/preference:
 *  - 'reduced' — prefers-reduced-motion is set; no motion at all
 *  - 'core'    — mobile default; smooth but lightweight
 *  - 'rich'    — desktop with fine pointer; full showpiece animations
 *
 * Components must only use transform/opacity for anything that animates.
 */
export function useMotionTier(): MotionTier {
  const [tier, setTier] = useState<MotionTier>(() => detectTier());

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)');

    const update = () => {
      const next = detectTier();
      setTier(next);
      // Log so Phase 1 verification is easy: open DevTools and toggle OS reduce-motion
      console.debug('[motion tier]', next);
    };

    reduced.addEventListener('change', update);
    hover.addEventListener('change', update);

    // Initial log
    console.debug('[motion tier]', tier);

    return () => {
      reduced.removeEventListener('change', update);
      hover.removeEventListener('change', update);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return tier;
}
