interface Tab {
  id: string;
  label: string;
}

interface SubTabsProps {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
  /** Colour used for active text. Defaults to #14161a. */
  activeColor?: string;
  /** Colour used for the active underline. Defaults to activeColor. */
  activeLineColor?: string;
  /** Inactive text colour. Defaults to #14161a at 35% opacity. */
  inactiveColor?: string;
  /** Background of the tab bar. Defaults to transparent. */
  bg?: string;
}

/**
 * SubTabs — underline-style horizontal tab switcher.
 * Used in Standings (Groups/Knockouts) and TeamPage (Standings/Matches/Squad).
 */
export default function SubTabs({
  tabs,
  activeId,
  onChange,
  activeColor = '#14161a',
  activeLineColor,
  inactiveColor,
  bg,
}: SubTabsProps) {
  const lineColor = activeLineColor ?? activeColor;
  const inactive = inactiveColor ?? `${activeColor}59`; // 35% opacity fallback

  return (
    <div
      className="flex border-b"
      style={{
        background: bg ?? 'transparent',
        borderColor: `${activeColor}22`,
      }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="relative flex-1 py-3 text-[13px] font-semibold tracking-wide transition-opacity"
            style={{ color: isActive ? activeColor : inactive }}
          >
            {tab.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-10 rounded-full"
                style={{ background: lineColor }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
