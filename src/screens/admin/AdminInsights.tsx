import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../../data/dataService';
import { supabase } from '../../data/supabase';
import type { Team } from '../../data/types';

interface InsightRow {
  id: string;
  kind: string;
  teamId: string;
  value: string;
  blurb: string;
  isPublished: boolean;
}

interface NewForm {
  kind: string; teamId: string; value: string; blurb: string;
}

const blank = (): NewForm => ({ kind: '', teamId: '', value: '', blurb: '' });
const inp = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white';

export default function AdminInsights() {
  const [rows,    setRows]    = useState<InsightRow[]>([]);
  const [teams,   setTeams]   = useState<Team[]>([]);
  const [editing, setEditing] = useState<InsightRow | null>(null);
  const [newForm, setNewForm] = useState<NewForm>(blank());
  const [adding,  setAdding]  = useState(false);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('insights').select('*').order('kind');
    if (data) setRows(data.map(r => ({
      id: r.id, kind: r.kind, teamId: r.team_id ?? '',
      value: r.value, blurb: r.blurb, isPublished: r.is_published,
    })));
  }, []);

  useEffect(() => {
    setTeams(dataService.allTeams());
    load();
  }, [load]);

  async function saveEdit() {
    if (!supabase || !editing) return;
    setSaving(true);
    await supabase.from('insights').update({
      kind: editing.kind, team_id: editing.teamId || null,
      value: editing.value, blurb: editing.blurb, is_published: editing.isPublished,
    }).eq('id', editing.id);
    setSaving(false);
    setEditing(null);
    load();
  }

  async function togglePublished(row: InsightRow) {
    if (!supabase) return;
    await supabase.from('insights').update({ is_published: !row.isPublished }).eq('id', row.id);
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, isPublished: !r.isPublished } : r));
  }

  async function deleteRow(id: string) {
    if (!supabase) return;
    await supabase.from('insights').delete().eq('id', id);
    setRows(prev => prev.filter(r => r.id !== id));
  }

  async function addInsight() {
    if (!supabase || !newForm.kind || !newForm.value) return;
    setAdding(true);
    const { data } = await supabase.from('insights').insert({
      kind: newForm.kind, team_id: newForm.teamId || null,
      value: newForm.value, blurb: newForm.blurb,
    }).select().single();
    if (data) {
      setRows(prev => [...prev, {
        id: data.id, kind: data.kind, teamId: data.team_id ?? '',
        value: data.value, blurb: data.blurb, isPublished: data.is_published,
      }]);
      setNewForm(blank());
    }
    setAdding(false);
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-bold text-[#14161a] mb-5">Insights</h2>

      {/* Existing rows */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 mb-6">
        {rows.length === 0 && (
          <p className="text-sm text-gray-300 p-4">No insights yet.</p>
        )}
        {rows.map(row => {
          const team = teams.find(t => t.id === row.teamId);
          const isEdit = editing?.id === row.id;
          return (
            <div key={row.id} className="p-4">
              {isEdit ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kind</label>
                    <input value={editing.kind} onChange={e => setEditing({ ...editing, kind: e.target.value })} className={inp} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Team</label>
                    <select value={editing.teamId} onChange={e => setEditing({ ...editing, teamId: e.target.value })} className={inp}>
                      <option value="">None</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.flagEmoji} {t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Value</label>
                    <input value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })} className={inp} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Published</label>
                    <label className="flex items-center gap-2 h-10">
                      <input type="checkbox" checked={editing.isPublished}
                        onChange={e => setEditing({ ...editing, isPublished: e.target.checked })} />
                      <span className="text-sm text-gray-600">{editing.isPublished ? 'Published' : 'Draft'}</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Blurb</label>
                    <input value={editing.blurb} onChange={e => setEditing({ ...editing, blurb: e.target.value })} className={`${inp} w-full`} />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <button onClick={saveEdit} disabled={saving}
                      className="px-4 py-1.5 bg-[#14161a] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-gray-500">{row.kind}</span>
                      {team && <span className="text-xs">{team.flagEmoji} {team.shortCode}</span>}
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${row.isPublished ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                      >
                        {row.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#14161a]">{row.value}</p>
                    <p className="text-xs text-gray-500">{row.blurb}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => togglePublished(row)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50">
                      {row.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => setEditing({ ...row })}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-50">
                      Edit
                    </button>
                    <button onClick={() => deleteRow(row.id)}
                      className="text-xs text-gray-300 hover:text-red-400 px-2 py-1 rounded hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new insight */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Add insight</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kind</label>
            <input value={newForm.kind} placeholder="e.g. Dark horse"
              onChange={e => setNewForm(f => ({ ...f, kind: e.target.value }))}
              className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Team</label>
            <select value={newForm.teamId} onChange={e => setNewForm(f => ({ ...f, teamId: e.target.value }))} className={inp}>
              <option value="">None</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.flagEmoji} {t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Value</label>
            <input value={newForm.value} placeholder="e.g. 12/1"
              onChange={e => setNewForm(f => ({ ...f, value: e.target.value }))}
              className={inp} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Blurb</label>
            <input value={newForm.blurb} placeholder="One-liner description"
              onChange={e => setNewForm(f => ({ ...f, blurb: e.target.value }))}
              className={inp} />
          </div>
        </div>
        <button onClick={addInsight} disabled={adding || !newForm.kind || !newForm.value}
          className="px-4 py-2 bg-[#14161a] text-white rounded-lg text-sm font-semibold disabled:opacity-40">
          {adding ? 'Adding…' : '+ Add insight'}
        </button>
      </div>
    </div>
  );
}
