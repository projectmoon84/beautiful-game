import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppShell() {
  return (
    <div
      className="flex min-h-dvh flex-col overflow-x-hidden"
      style={{
        background: '#000',
        color: 'var(--black)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <main
        className="flex-1"
        style={{
          background: 'var(--surface)',
          paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
        }}
      >
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
