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
    <div
      className="sticky top-0 z-30"
      style={{ background: 'var(--surface)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
    >
      {/* Scrollable strip */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto"
        style={{
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          // Padding lets first/last items reach centre
          paddingLeft: 'calc(100% / 3)',
          paddingRight: 'calc(100% / 3)',
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
              }}
              className={[
                'flex flex-col items-center justify-center py-3 gap-1.5 transition-colors',
                selected ? 'text-black' : 'text-[#999]',
              ].join(' ')}
            >
              <span
                className={[
                  'text-[13px] leading-none',
                  selected ? 'font-bold' : 'font-medium',
                  today && !selected ? 'text-[#555]' : '',
                ].join(' ')}
              >
                {label}
              </span>

              {/* Underline indicator */}
              <span
                className="h-[2px] rounded-full transition-all duration-200"
                style={{
                  width: selected ? '24px' : '0px',
                  background: 'var(--black)',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
