import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Matches', end: true },
  { to: '/standings', label: 'Standings', end: false },
  { to: '/insights', label: 'Insights', end: false },
] as const;

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around safe-area-inset-bottom"
      style={{ background: 'var(--nav)', color: 'var(--white)' }}
    >
      {TABS.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            [
              'flex flex-col items-center justify-center gap-0.5 px-6 h-full',
              'text-xs font-semibold tracking-widest uppercase select-none',
              'transition-opacity duration-150',
              isActive ? 'opacity-100' : 'opacity-40 hover:opacity-60',
            ].join(' ')
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
