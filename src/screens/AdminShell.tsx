import { useState, useEffect } from 'react';
import { Outlet, NavLink, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../data/supabase';
import type { User } from '@supabase/supabase-js';

const NAV = [
  { to: '/admin/teams',    label: 'Teams' },
  { to: '/admin/fixtures', label: 'Fixtures' },
  { to: '/admin/insights', label: 'Insights' },
  { to: '/admin/news',     label: 'News' },
  { to: '/admin/stickers', label: 'Stickers' },
  { to: '/admin/textures', label: 'Textures' },
  { to: '/admin/sync',     label: 'Sync' },
];

export default function AdminShell() {
  const [user, setUser]     = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [signInErr, setSignInErr] = useState('');
  const [busy, setBusy]     = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setSignInErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setSignInErr(error.message);
    setBusy(false);
  }

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Supabase not configured.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-300">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14161a]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xs">
          <h1 className="text-base font-bold text-[#14161a] mb-1">The Beautiful Game</h1>
          <p className="text-xs text-gray-400 mb-6">Admin</p>
          <form onSubmit={handleSignIn} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
            />
            {signInErr && <p className="text-red-500 text-xs">{signInErr}</p>}
            <button
              type="submit"
              disabled={busy}
              className="bg-[#14161a] text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 mt-1"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    return <Navigate to="/admin/teams" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#14161a] text-white px-5 h-12 flex items-center gap-1 shrink-0">
        <span className="text-[10px] font-bold tracking-widest uppercase text-white/30 mr-5">
          The Beautiful Game
        </span>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[11px] text-white/30">{user.email}</span>
          <button
            onClick={() => supabase!.auth.signOut()}
            className="text-[11px] text-white/40 hover:text-white/70"
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="flex-1 p-6 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
