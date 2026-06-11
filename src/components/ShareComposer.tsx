import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import { dataService } from '../data/dataService';
import { FALLBACK_SHARE_STICKERS, loadShareStickers } from '../data/shareStickers';
import { formatDate, formatTime } from '../utils/format';
import type { Fixture, MatchEvent, Team } from '../data/types';
import type { ShareStickerAsset } from '../data/shareStickers';

type StickerTone = 'green' | 'yellow' | 'black' | 'white';

interface StickerState {
  id: string;
  asset: ShareStickerAsset;
  x: number;
  y: number;
  rotate: number;
}

interface ShareComposerProps {
  fixture: Fixture;
  home: Team;
  away: Team;
  events: MatchEvent[];
  onClose: () => void;
}

const stickerClasses: Record<StickerTone, string> = {
  green: 'bg-[#009739] text-[#F5C800]',
  yellow: 'bg-[#FFD100] text-[#009739]',
  black: 'bg-black text-white',
  white: 'bg-white text-black',
};

export default function ShareComposer({
  fixture,
  home,
  away,
  events,
  onClose,
}: ShareComposerProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [library, setLibrary] = useState<ShareStickerAsset[]>(FALLBACK_SHARE_STICKERS);
  const [stickers, setStickers] = useState<StickerState[]>([
    stickerFromAsset(FALLBACK_SHARE_STICKERS[0], 26, 52),
    stickerFromAsset(FALLBACK_SHARE_STICKERS[1], 260, 94),
  ]);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [previewScale, setPreviewScale] = useState(() => previewScaleForWindow());

  const sortedEvents = useMemo(
    () => events.slice().sort((a, b) => b.minute - a.minute),
    [events],
  );

  useEffect(() => {
    function updateScale() {
      setPreviewScale(previewScaleForWindow());
    }

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    let alive = true;

    loadShareStickers().then(nextLibrary => {
      if (!alive) return;
      setLibrary(nextLibrary);
      setStickers(current => {
        if (current.some(sticker => sticker.asset.imageUrl)) return current;
        return [
          stickerFromAsset(nextLibrary[0], 26, 52),
          stickerFromAsset(nextLibrary[1] ?? nextLibrary[0], 260, 94),
        ];
      });
    });

    return () => { alive = false; };
  }, []);

  function addSticker(asset: ShareStickerAsset) {
    setStickers(current => [
      ...current,
      stickerFromAsset(
        asset,
        38 + (current.length % 3) * 128,
        44 + (current.length % 2) * 78,
      ),
    ]);
  }

  function updateStickerPosition(id: string, offset: { x: number; y: number }) {
    setStickers(current => current.map(sticker => (
      sticker.id === id
        ? { ...sticker, x: sticker.x + offset.x, y: sticker.y + offset.y }
        : sticker
    )));
  }

  async function exportPng(): Promise<{ dataUrl: string; file: File }> {
    if (!cardRef.current) {
      throw new Error('Share card is not ready yet.');
    }

    const dataUrl = await toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `${home.shortCode}-${away.shortCode}-result.png`, {
      type: 'image/png',
    });

    return { dataUrl, file };
  }

  async function saveImage() {
    setExporting(true);
    setMessage('');
    try {
      const { dataUrl } = await exportPng();
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${home.shortCode}-${away.shortCode}-result.png`;
      link.click();
      setMessage('PNG saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not export image.');
    } finally {
      setExporting(false);
    }
  }

  async function shareImage() {
    setExporting(true);
    setMessage('');
    try {
      const { file } = await exportPng();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${home.shortCode} ${fixture.homeScore ?? 0}-${fixture.awayScore ?? 0} ${away.shortCode}`,
        });
        setMessage('Share sheet opened.');
      } else {
        setMessage('Native sharing is not available here. Use Save instead.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not share image.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="text-[14px] font-semibold leading-none">Share result</div>
          <div className="mt-1 text-[11px] leading-none text-white/60">
            Drag stickers on the card, then save or share.
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[20px] font-semibold active:bg-white/20"
          aria-label="Close share composer"
        >
          ×
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <div
          className="mx-auto"
          style={{ width: 540 * previewScale, height: 675 * previewScale }}
        >
          <div
            style={{
              width: 540,
              height: 675,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
            }}
          >
            <ShareCard
              ref={cardRef}
              fixture={fixture}
              home={home}
              away={away}
              events={sortedEvents}
              stickers={stickers}
              onStickerDragEnd={updateStickerPosition}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-white/15 bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {library.map(asset => (
            <button
              key={asset.id}
              type="button"
              onClick={() => addSticker(asset)}
              className={[
                'flex h-16 min-w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg px-3 py-2 text-[11px] font-bold leading-none',
                asset.imageUrl ? 'bg-white/10' : stickerClasses[asset.tone],
              ].join(' ')}
              aria-label={`Add ${asset.name} sticker`}
            >
              {asset.imageUrl ? (
                <img src={asset.imageUrl} alt="" className="max-h-full max-w-28 object-contain" />
              ) : (
                asset.text
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveImage}
            disabled={exporting}
            className="flex-1 rounded-full bg-white px-4 py-3 text-[14px] font-bold text-black disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Save PNG'}
          </button>
          <button
            type="button"
            onClick={shareImage}
            disabled={exporting}
            className="flex-1 rounded-full bg-[#5EE9B5] px-4 py-3 text-[14px] font-bold text-black disabled:opacity-50"
          >
            Share
          </button>
        </div>
        {message && <div className="mt-2 text-center text-[12px] text-white/70">{message}</div>}
      </div>
    </div>
  );
}

const ShareCard = forwardRef<HTMLDivElement, {
  fixture: Fixture;
  home: Team;
  away: Team;
  events: MatchEvent[];
  stickers: StickerState[];
  onStickerDragEnd: (id: string, offset: { x: number; y: number }) => void;
}>(function ShareCard({
  fixture,
  home,
  away,
  events,
  stickers,
  onStickerDragEnd,
}, ref) {
  const awayInk = away.secondaryHex;

  return (
    <div
      ref={ref}
      className="relative h-[675px] w-[540px] overflow-hidden bg-white font-sans"
    >
      <div className="absolute inset-0 z-0 flex">
        <div className="flex-1" style={{ background: home.primaryHex }} />
        <div className="flex-1" style={{ background: away.primaryHex }} />
      </div>

      <SharePitch events={events} home={home} away={away} minute={fixture.minute ?? 90} />

      <div className="absolute inset-0 z-20 flex">
        <div className="flex flex-1 flex-col p-4" style={{ color: home.secondaryHex }}>
          <div className="text-[12px] font-medium leading-none">
            {formatDate(fixture.kickoffUtc)} · {formatTime(fixture.kickoffUtc)}
          </div>
          <ShareScoreHeader
            align="home"
            code={home.shortCode}
            score={fixture.homeScore ?? 0}
          />
        </div>
        <div className="flex flex-1 flex-col p-4" style={{ color: awayInk }}>
          <div className="text-right text-[12px] font-medium leading-none">Group {fixture.groupId}</div>
          <ShareScoreHeader
            align="away"
            code={away.shortCode}
            score={fixture.awayScore ?? 0}
          />
        </div>
      </div>

      <div className="absolute left-3 top-[357px] z-40 h-[307px] w-[520px]">
        {stickers.map(sticker => (
          <motion.div
            key={sticker.id}
            drag
            dragMomentum
            dragElastic={0.08}
            initial={false}
            style={{
              x: sticker.x,
              y: sticker.y,
              rotate: sticker.rotate,
            }}
            onDragEnd={(_, info) => onStickerDragEnd(sticker.id, info.offset)}
            whileTap={{ scale: 0.96 }}
            className={[
              'absolute left-0 top-0 cursor-grab select-none active:cursor-grabbing',
              sticker.asset.imageUrl
                ? 'h-24 w-36'
                : [
                  'rounded-[6px] border-2 border-current px-4 py-3 text-center text-[28px] font-black leading-[0.9] shadow-[0_8px_0_rgba(0,0,0,0.2)]',
                  stickerClasses[sticker.asset.tone],
                ].join(' '),
            ].join(' ')}
          >
            {sticker.asset.imageUrl ? (
              <img
                src={sticker.asset.imageUrl}
                alt={sticker.asset.name}
                className="h-full w-full object-contain drop-shadow-[0_8px_0_rgba(0,0,0,0.22)]"
              />
            ) : (
              sticker.asset.text
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
});

function ShareScoreHeader({
  align,
  code,
  score,
}: {
  align: 'home' | 'away';
  code: string;
  score: number;
}) {
  return (
    <div className="relative h-[92px]">
      {align === 'home' ? (
        <>
          <div className="absolute left-[34px] top-[50px] max-w-[170px] truncate text-[64px] font-bold uppercase leading-[0.88]">
            {code}
          </div>
          <div className="absolute right-[-6px] top-[50px] w-12 text-center text-[58px] font-bold leading-[0.88]">{score}</div>
        </>
      ) : (
        <>
          <div className="absolute left-[-6px] top-[50px] w-12 text-center text-[58px] font-bold leading-[0.88]">{score}</div>
          <div className="absolute right-[34px] top-[50px] max-w-[170px] truncate text-right text-[64px] font-bold uppercase leading-[0.88]">
            {code}
          </div>
        </>
      )}
    </div>
  );
}

function SharePitch({
  events,
  home,
  away,
  minute,
}: {
  events: MatchEvent[];
  home: Team;
  away: Team;
  minute: number;
}) {
  const items = [
    ...events.map(event => ({ type: 'event' as const, minute: event.minute, event })),
    ...(minute >= 45 ? [{ type: 'half-time' as const, minute: 45 }] : []),
  ].sort((a, b) => b.minute - a.minute);

  return (
    <>
      <div className="pointer-events-none absolute left-1/2 top-[-342px] z-10 h-[896px] w-[896px] -translate-x-1/2">
        {[121.68, 232.3, 453.53, 674.77, 896].map((size, index) => (
          <div
            key={size}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: (896 - size) / 2,
              top: (896 - size) / 2,
              border: `${index === 0 ? 1 : 55.31}px solid rgba(255,255,255,${index === 0 ? 1 : 0.1})`,
            }}
          />
        ))}
        <div className="absolute left-1/2 top-[342px] h-[678px] w-px bg-white" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white" />
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[-342px] z-30 h-[896px] w-[896px] -translate-x-1/2">
        {items.map((item, index) => {
          const top = 342 + 170 + index * 42;

          if (item.type === 'half-time') {
            return (
              <div
                key="half-time"
                className="absolute left-1/2 -translate-x-1/2 text-[12px] font-semibold leading-none text-white"
                style={{ top: top + 6 }}
              >
                HT
              </div>
            );
          }

          const isHome = item.event.teamId === home.id;
          const player = dataService.player(item.event.playerId);
          const assist = item.event.assistPlayerId ? dataService.player(item.event.assistPlayerId) : undefined;

          return (
            <div
              key={item.event.id}
              className="absolute left-1/2 h-10 w-[300px] -translate-x-1/2"
              style={{ top }}
            >
              <div className="absolute left-1/2 top-1.5 z-10 -translate-x-1/2">
                <ShareMinute minute={item.event.minute} />
              </div>
              {isHome ? (
                <div className="absolute right-[172px] top-1.5 flex items-start justify-end gap-4">
                  <ShareEventNames player={player?.name ?? 'Unknown'} assist={assist?.name} color={home.secondaryHex} align="right" />
                  <ShareEventIcon type={item.event.type} />
                </div>
              ) : (
                <div className="absolute left-[172px] top-1.5 flex items-start justify-start gap-4">
                  <ShareEventIcon type={item.event.type} />
                  <ShareEventNames player={player?.name ?? 'Unknown'} assist={assist?.name} color={away.secondaryHex} align="left" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ShareEventNames({
  player,
  assist,
  color,
  align,
}: {
  player: string;
  assist?: string;
  color: string;
  align: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'} style={{ color }}>
      <div className="text-[14px] font-semibold leading-[14px]">{player}</div>
      {assist && <div className="mt-0.5 text-[14px] leading-[14px]">{assist}</div>}
    </div>
  );
}

function ShareEventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'yellow') {
    return <span className="mt-0.5 block h-3.5 w-2.5 rounded-[2px] border border-white/60 bg-[#FFDF00]" />;
  }

  if (type === 'red') {
    return <span className="mt-0.5 block h-3.5 w-2.5 rounded-[2px] border border-white/60 bg-[#E31B23]" />;
  }

  return <span className="text-[14px] font-semibold leading-[14px] text-white">⚽</span>;
}

function ShareMinute({ minute }: { minute: number }) {
  return (
    <span className="flex h-3 w-7 items-center justify-center rounded-full bg-white px-[5px] text-[10px] font-semibold leading-none text-black">
      {minute}'
    </span>
  );
}

function stickerFromAsset(
  asset: ShareStickerAsset,
  x: number,
  y: number,
): StickerState {
  return {
    id: crypto.randomUUID(),
    asset,
    x,
    y,
    rotate: asset.rotate,
  };
}

function previewScaleForWindow() {
  if (typeof window === 'undefined') return 1;
  return Math.max(0.62, Math.min(1, (window.innerWidth - 32) / 540));
}

export { ShareCard };
