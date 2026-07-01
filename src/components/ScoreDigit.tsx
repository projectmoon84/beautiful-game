import { useEffect, useRef } from 'react';

const GRID = 5;
const CANVAS_W = 54;
const CANVAS_H = 54;

export default function ScoreDigit({
  value,
  ink,
  obscured,
}: {
  value: number;
  ink: string;
  obscured: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const off = document.createElement('canvas');
    off.width = GRID;
    off.height = GRID;
    const octx = off.getContext('2d');
    if (!octx) return;

    octx.fillStyle = ink;
    octx.font = `700 ${Math.round(GRID * 0.88)}px system-ui, sans-serif`;
    octx.textBaseline = 'middle';
    octx.textAlign = 'center';
    octx.fillText(String(value), GRID / 2, GRID / 2);

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, GRID, GRID, 0, 0, CANVAS_W, CANVAS_H);
  }, [value, ink]);

  if (!obscured) {
    return (
      <span className="shrink-0 text-[40px] font-bold leading-[0.9]" style={{ color: ink }}>
        {value}
      </span>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="shrink-0"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
