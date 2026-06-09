import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppShell() {
  return (
    <div
      className="flex flex-col min-h-full"
      style={{ background: 'var(--surface)', color: 'var(--black)' }}
    >
      {/* Page content — padded so it clears the fixed nav */}
      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
