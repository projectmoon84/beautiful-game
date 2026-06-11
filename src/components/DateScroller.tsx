import { useEffect, useRef } from 'react';

interface DateScrollerProps {
  /** Sorted ISO date strings, e.g. ["2026-06-08", "2026-06-09", ...] */
  dates: string[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

function formatScrollerLabel(isoDate: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (isoDate === today) return 'TODAY';
  // Use noon UTC to avoid DST edge-cases flipping the date
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

/**
 * DateScroller — horizontal date strip with snap.
 * Shows exactly 3 items at a time; selected date is centred with a bold
 * underline indicator. TODAY gets the "TODAY" label.
 *
 * Scroll behaviour: on selection change the chosen item scrolls to centre
 * imperatively (smooth). CSS scroll-snap handles drag/swipe.
 */
export default function DateScroller({ dates, selectedDate, onSelect }: DateScrollerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Centre the selected item whenever it changes
  useEffect(() => {
    const container = containerRef.current;
    const item = itemsRef.current.get(selectedDate);
    if (!container || !item) return;

    const left = item.offsetLeft - container.offsetWidth / 2 + item.offsetWidth / 2;
    container.scrollTo({ left, behavior: 'smooth' });
  }, [selectedDate]);

  const isToday = (d: string) => d === new Date().toISOString().slice(0, 10);

  return (
    <div className="sticky top-0 z-30 h-[76px]" style={{ background: 'var(--surface)' }}>
      <div
        ref={containerRef}
        className="flex h-full overflow-x-auto"
        style={{
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
        }}
      >
        {dates.map(date => {
          const selected = date === selectedDate;
          const today = isToday(date);
          const label = formatScrollerLabel(date);

          return (
            <button
              key={date}
              ref={el => {
                if (el) itemsRef.current.set(date, el);
                else itemsRef.current.delete(date);
              }}
              onClick={() => onSelect(date)}
              type="button"
              style={{
                flexShrink: 0,
                width: 'calc(100% / 3)',
                scrollSnapAlign: 'center',
                background: selected ? 'var(--surface)' : 'var(--black)',
                color: selected ? 'var(--black)' : 'var(--surface)',
                outline: selected ? '6px solid var(--black)' : 'none',
                outlineOffset: selected ? '-6px' : undefined,
                borderTop: selected ? 'none' : '3px solid var(--black)',
              }}
              className={[
                'flex h-full flex-col items-center justify-center transition-opacity',
              ].join(' ')}
            >
              <span
                className={[
                  'text-center text-[12px] font-semibold leading-none',
                  today ? 'uppercase' : '',
                ].join(' ')}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
