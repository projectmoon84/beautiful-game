import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../../data/dataService';
import { supabase } from '../../data/supabase';
import type { Team, Fixture } from '../../data/types';

interface NewsRow {
  id: string;
  headline: string;
  url: string | null;
  teamId: string | null;
  fixtureId: string | null;
  publishedAt: string;
}

interface NewForm {
  headline: string;
  url: string;
  teamId: string;
  fixtureId: string;
}

const blank = (): NewForm => ({ headline: '', url: '', teamId: '', fixtureId: '' });
const inp = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white w-full';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminNews() {
  const [items,    setItems]    = useState<NewsRow[]>([]);
  const [teams,    setTeams]    = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [form,     setForm]     = useState<NewForm>(blank());
  const [adding,   setAdding]   = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('news').select('*').order('published_at', { ascending: false });
    if (data) setItems(data.map(r => ({
      id: r.id, headline: r.headline, url: r.url,
      teamId: r.team_id, fixtureId: r.fixture_id, publishedAt: r.published_at,
    })));
  }, []);

  useEffect(() => {
    setTeams(dataService.allTeams());
    setFixtures(dataService.allFixtures());
    load();
  }, [load]);

  async function addItem() {
    if (!supabase || !form.headline) return;
    setAdding(true);
    const { data } = await supabase.from('news').insert({
      headline:   form.headline,
      url:        form.url      || null,
      team_id:    form.teamId   || null,
      fixture_id: form.fixtureId || null,
    }).select().single();
    if (data) {
      setItems(prev => [{
        id: data.id, headline: data.headline, url: data.url,
        teamId: data.team_id, fixtureId: data.fixture_id, publishedAt: data.published_at,
      }, ...prev]);
      setForm(blank());
    }
    setAdding(false);
  }

  async function deleteItem(id: string) {
    if (!supabase) return;
    await supabase.from('news').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const teamMap = new Map(teams.map(t => [t.id, t]));
  const fixMap  = new Map(fixtures.map(f => [f.id, f]));

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold text-[#14161a] mb-5">News</h2>

      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Add news item</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Headline *</label>
            <input value={form.headline} placeholder="England beat Spain 2–1"
              onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
              className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">URL (optional)</label>
            <input type="url" value={form.url} placeholder="https://…"
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Team (optional)</label>
              <select value={form.teamId} onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))} className={inp}>
                <option value="">None</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.flagEmoji} {t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fixture (optional)</label>
              <select value={form.fixtureId} onChange={e => setForm(f => ({ ...f, fixtureId: e.target.value }))} className={inp}>
                <option value="">None</option>
                {fixtures.map(f => {
                  const ht = teamMap.get(f.homeTeamId);
                  const at = teamMap.get(f.awayTeamId);
                  return <option key={f.id} value={f.id}>{ht?.shortCode} vs {at?.shortCode}</option>;
                })}
              </select>
            </div>
          </div>
        </div>
        <button onClick={addItem} disabled={adding || !form.headline}
          className="mt-3 px-4 py-2 bg-[#14161a] text-white rounded-lg text-sm font-semibold disabled:opacity-40">
          {adding ? 'Adding…' : '+ Add'}
        </button>
      </div>

      {/* Items list */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {items.length === 0 && <p className="text-sm text-gray-300 p-4">No news items.</p>}
        {items.map(item => {
          const team = item.teamId ? teamMap.get(item.teamId) : undefined;
          const fix  = item.fixtureId ? fixMap.get(item.fixtureId) : undefined;
          const ht   = fix ? teamMap.get(fix.homeTeamId) : undefined;
          const at   = fix ? teamMap.get(fix.awayTeamId) : undefined;
          return (
            <div key={item.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#14161a]">{item.headline}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {team && <span className="text-xs text-gray-400">{team.flagEmoji} {team.shortCode}</span>}
                  {fix  && <span className="text-xs text-gray-400">{ht?.shortCode} vs {at?.shortCode}</span>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate max-w-xs">{item.url}</a>
                  )}
                  <span className="text-[10px] text-gray-300">{fmtDate(item.publishedAt)}</span>
                </div>
              </div>
              <button onClick={() => deleteItem(item.id)}
                className="text-gray-300 hover:text-red-400 text-sm shrink-0 px-1">×</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
