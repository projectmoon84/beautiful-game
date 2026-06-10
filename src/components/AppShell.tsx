import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppShell() {
  return (
    <div
      className="flex min-h-dvh flex-col overflow-x-hidden"
      style={{ background: 'var(--surface)', color: 'var(--black)' }}
    >
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
