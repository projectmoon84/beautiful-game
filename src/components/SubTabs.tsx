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
  /** @deprecated Block tabs use activeColor for the active outline. */
  activeLineColor?: string;
  /** Inactive text colour. Defaults to #14161a at 35% opacity. */
  inactiveColor?: string;
  /** Background of the tab bar. Defaults to transparent. */
  bg?: string;
}

/**
 * SubTabs — block-style horizontal tab switcher.
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
  const outlineColor = activeLineColor ?? activeColor;
  const surface = bg ?? 'var(--surface)';
  const inactive = inactiveColor ?? surface;

  return (
    <div
      className="flex h-[76px] overflow-hidden"
      style={{ background: surface }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="flex h-full flex-1 items-center justify-center px-3 text-center text-[12px] font-semibold leading-none transition-opacity"
            style={{
              background: isActive ? surface : activeColor,
              borderTop: isActive ? 'none' : `3px solid ${activeColor}`,
              color: isActive ? activeColor : inactive,
              outline: isActive ? `6px solid ${outlineColor}` : 'none',
              outlineOffset: isActive ? '-6px' : undefined,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
