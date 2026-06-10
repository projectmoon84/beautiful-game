import { NavLink } from 'react-router-dom';

const TABS = [
  {
    to: '/',
    label: 'Matches',
    end: true,
    icon: (
      <path d="M13.333 2.5v3.333M6.667 2.5v3.333M3.333 9.167h13.334M3.333 5.833c0-.442.176-.866.489-1.178.312-.313.736-.488 1.178-.488h10c.442 0 .866.175 1.179.488.312.312.488.736.488 1.178v10c0 .442-.176.866-.488 1.179-.313.312-.737.488-1.179.488H5c-.442 0-.866-.176-1.178-.488a1.667 1.667 0 0 1-.489-1.179v-10Zm5.834 7.5c0 .221.088.433.244.589.156.157.368.245.589.245s.433-.088.589-.245a.833.833 0 0 0 .244-.589.833.833 0 0 0-.244-.589A.833.833 0 0 0 10 12.5a.833.833 0 0 0-.589.244.833.833 0 0 0-.244.589Z" />
    ),
  },
  {
    to: '/standings',
    label: 'Standings',
    end: false,
    icon: (
      <path d="M10.833 4.167H17.5M10.833 7.5H15m-4.167 5H17.5m-6.667 3.333H15M2.5 4.167c0-.221.088-.433.244-.589a.833.833 0 0 1 .589-.245h3.334c.221 0 .433.088.589.245.156.156.244.368.244.589V7.5a.833.833 0 0 1-.244.589.833.833 0 0 1-.589.244H3.333a.833.833 0 0 1-.589-.244A.833.833 0 0 1 2.5 7.5V4.167Zm0 8.333c0-.221.088-.433.244-.589a.833.833 0 0 1 .589-.244h3.334c.221 0 .433.088.589.244.156.156.244.368.244.589v3.333a.833.833 0 0 1-.244.589.833.833 0 0 1-.589.245H3.333a.833.833 0 0 1-.589-.245.833.833 0 0 1-.244-.589V12.5Z" />
    ),
  },
  {
    to: '/insights',
    label: 'Insights',
    end: false,
    icon: (
      <path d="M2.5 10h15M10 17.5v-15M6.25 6.25l7.5 7.5m-7.5 0 7.5-7.5" />
    ),
  },
] as const;

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-24 items-start justify-between px-10 pb-6 pt-2"
      style={{ background: 'var(--black)', color: 'var(--surface)' }}
    >
      {TABS.map(({ to, label, end, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            [
              'flex h-16 w-20 flex-col items-center justify-center gap-[9px]',
              'text-[12px] font-medium leading-[0.8] select-none',
              'transition-opacity duration-150',
              isActive ? 'opacity-100' : 'opacity-60 hover:opacity-75',
            ].join(' ')
          }
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="shrink-0"
          >
            <g
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {icon}
            </g>
          </svg>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
