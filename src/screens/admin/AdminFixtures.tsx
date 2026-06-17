import { useState, useEffect } from 'react';
import { dataService } from '../../data/dataService';
import { supabase } from '../../data/supabase';
import type { Team, Player, Fixture, MatchEvent, FixtureStatus, EventType, Position } from '../../data/types';

const STATUS_OPTS: FixtureStatus[] = ['scheduled', 'live', 'finished'];
const EVENT_TYPES: EventType[] = ['goal', 'own_goal', 'penalty', 'penalty_missed', 'var_goal', 'var_cancelled', 'yellow', 'second_yellow', 'red', 'sub'];
const ICON: Record<EventType, string> = {
  goal: '⚽', own_goal: '↩⚽', penalty: '⚽(P)', penalty_missed: '⚽(M)', var_goal: '⚽(V)', var_cancelled: '⚽(X)', yellow: '🟨', second_yellow: '🟨🟥', red: '🟥', sub: '🔄',
};
const SHOW_ASSIST: Set<EventType> = new Set(['goal', 'own_goal', 'penalty']);

interface FixForm {
  status:             FixtureStatus;
  homeScore:          string;
  awayScore:          string;
  minute:             string;
  manOfMatchPlayerId: string;
}

interface EvForm {
  minute: string; type: EventType; teamId: string; playerId: string; assistPlayerId: string;
}

const blankEv = (): EvForm => ({ minute: '', type: 'goal', teamId: '', playerId: '', assistPlayerId: '' });

function toFixForm(f: Fixture): FixForm {
  return {
    status:             f.status,
    homeScore:          f.homeScore !== undefined ? String(f.homeScore) : '',
    awayScore:          f.awayScore !== undefined ? String(f.awayScore) : '',
    minute:             f.minute    !== undefined ? String(f.minute)    : '',
    manOfMatchPlayerId: f.manOfMatchPlayerId ?? '',
  };
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC';
}

const cls = {
  input: 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white w-full',
  label: 'block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1',
};

export default function AdminFixtures() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [teams,    setTeams]    = useState<Map<string, Team>>(new Map());
  const [players,  setPlayers]  = useState<Player[]>([]);
  const [selId,    setSelId]    = useState<string | null>(null);
  const [fixForm,  setFixForm]  = useState<FixForm | null>(null);
  const [events,   setEvents]   = useState<MatchEvent[]>([]);
  const [evForm,   setEvForm]   = useState<EvForm>(blankEv());
  const [saving,   setSaving]   = useState(false);
  const [addingEv, setAddingEv] = useState(false);
  const [saveMsg,  setSaveMsg]  = useState('');

  useEffect(() => {
    setTeams(new Map(dataService.allTeams().map(t => [t.id, t])));
    if (!supabase) { setFixtures(dataService.allFixtures()); return; }
    supabase.from('fixtures').select('*').order('kickoff_utc').then(({ data }) => {
      if (!data) return;
      setFixtures(data.map(r => ({
        id: r.id, homeTeamId: r.home_team_id, awayTeamId: r.away_team_id,
        venueId: r.venue_id, groupId: r.group_id ?? '',
        kickoffUtc: r.kickoff_utc, stage: r.stage as Fixture['stage'],
        status: r.status as FixtureStatus,
        minute: r.minute ?? undefined, homeScore: r.home_score ?? undefined,
        awayScore: r.away_score ?? undefined,
        manOfMatchPlayerId: r.man_of_match_player_id ?? undefined,
      })));
    });
    supabase.from('players').select('*').then(({ data }) => {
      if (!data) return;
      setPlayers(data.map(r => ({
        id: r.id, teamId: r.team_id, name: r.name,
        shirtNumber: r.shirt_number, position: r.position as Position,
      })));
    });
  }, []);

  useEffect(() => {
    if (!selId || !supabase) { setEvents([]); return; }
    supabase.from('match_events').select('*').eq('fixture_id', selId).order('minute')
      .then(({ data }) => {
        if (!data) return;
        setEvents(data.map(r => ({
          id: r.id, fixtureId: r.fixture_id, minute: r.minute,
          type: r.type as EventType, teamId: r.team_id,
          playerId: r.player_id, assistPlayerId: r.assist_player_id ?? undefined,
        })));
      });
  }, [selId]);

  function openFixture(f: Fixture) {
    setSelId(f.id);
    setFixForm(toFixForm(f));
    setEvForm(blankEv());
    setSaveMsg('');
  }

  async function saveFixture() {
    if (!supabase || !fixForm || !selId) return;
    setSaving(true); setSaveMsg('');
    const { error } = await supabase.from('fixtures').update({
      status:                 fixForm.status,
      home_score:             fixForm.homeScore !== '' ? parseInt(fixForm.homeScore) : null,
      away_score:             fixForm.awayScore !== '' ? parseInt(fixForm.awayScore) : null,
      minute:                 fixForm.minute    !== '' ? parseInt(fixForm.minute)    : null,
      man_of_match_player_id: fixForm.manOfMatchPlayerId || null,
      edited_by_admin:        true,
    }).eq('id', selId);
    if (error) {
      setSaveMsg(`Error: ${error.message}`);
    } else {
      setSaveMsg('Saved ✓');
      setFixtures(prev => prev.map(f => f.id !== selId ? f : {
        ...f,
        status:             fixForm.status,
        homeScore:          fixForm.homeScore !== '' ? parseInt(fixForm.homeScore) : undefined,
        awayScore:          fixForm.awayScore !== '' ? parseInt(fixForm.awayScore) : undefined,
        minute:             fixForm.minute    !== '' ? parseInt(fixForm.minute)    : undefined,
        manOfMatchPlayerId: fixForm.manOfMatchPlayerId || undefined,
      }));
    }
    setSaving(false);
  }

  async function deleteEvent(id: string) {
    if (!supabase) return;
    await supabase.from('match_events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  async function addEvent() {
    if (!supabase || !selId || !evForm.playerId || !evForm.minute) return;
    setAddingEv(true);
    const id = crypto.randomUUID();
    const { error, data } = await supabase.from('match_events').insert({
      id, fixture_id: selId,
      minute:           parseInt(evForm.minute),
      type:             evForm.type,
      team_id:          evForm.teamId,
      player_id:        evForm.playerId,
      assist_player_id: SHOW_ASSIST.has(evForm.type) && evForm.assistPlayerId ? evForm.assistPlayerId : null,
    }).select().single();
    if (!error && data) {
      setEvents(prev => [...prev, {
        id: data.id, fixtureId: data.fixture_id, minute: data.minute,
        type: data.type as EventType, teamId: data.team_id,
        playerId: data.player_id, assistPlayerId: data.assist_player_id ?? undefined,
      }].sort((a, b) => a.minute - b.minute));
      setEvForm(blankEv());
    }
    setAddingEv(false);
  }

  const sel       = fixtures.find(f => f.id === selId);
  const home      = sel ? teams.get(sel.homeTeamId) : undefined;
  const away      = sel ? teams.get(sel.awayTeamId) : undefined;
  const allPlayers = sel ? players.filter(p => p.teamId === sel.homeTeamId || p.teamId === sel.awayTeamId) : [];
  const evOpts    = evForm.teamId
    ? players.filter(p => p.teamId === evForm.teamId).sort((a, b) => a.shirtNumber - b.shirtNumber)
    : [];

  return (
    <div className="flex gap-6 h-[calc(100vh-96px)]">

      {/* Fixture list */}
      <div className="w-64 shrink-0 overflow-y-auto space-y-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{fixtures.length} Fixtures</p>
        {fixtures.map(f => {
          const ht = teams.get(f.homeTeamId);
          const at = teams.get(f.awayTeamId);
          const active = selId === f.id;
          return (
            <button key={f.id} onClick={() => openFixture(f)}
              className={[
                'w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors',
                active
                  ? 'bg-[#14161a] border-[#14161a] text-white'
                  : 'bg-white border-gray-100 hover:border-gray-200 text-gray-700',
              ].join(' ')}
            >
              <p className={`text-[9px] mb-0.5 ${active ? 'text-white/40' : 'text-gray-400'}`}>{fmtDate(f.kickoffUtc)}</p>
              <p className="font-semibold text-xs">
                {ht?.flagEmoji} {ht?.shortCode} {f.homeScore !== undefined ? `${f.homeScore}–${f.awayScore}` : 'vs'} {at?.shortCode} {at?.flagEmoji}
              </p>
              <p className={`text-[9px] font-bold uppercase tracking-wide mt-0.5 ${f.status === 'live' ? 'text-red-400' : active ? 'text-white/40' : 'text-gray-400'}`}>
                {f.status}
              </p>
            </button>
          );
        })}
      </div>

      {/* Editor */}
      {fixForm && sel && home && away ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg">
            <h2 className="text-base font-bold text-[#14161a] mb-1">
              {home.flagEmoji} {home.name} vs {away.name} {away.flagEmoji}
            </h2>
            <p className="text-xs text-gray-400 mb-5">{fmtDate(sel.kickoffUtc)} · Group {sel.groupId}</p>

            {/* Fixture form */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Result</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className={cls.label}>Status</label>
                  <select
                    value={fixForm.status}
                    onChange={e => setFixForm(f => f ? { ...f, status: e.target.value as FixtureStatus } : f)}
                    className={cls.input}
                  >
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={cls.label}>{home.shortCode}</label>
                  <input type="number" min={0} value={fixForm.homeScore} placeholder="—"
                    onChange={e => setFixForm(f => f ? { ...f, homeScore: e.target.value } : f)}
                    className={cls.input} />
                </div>
                <div>
                  <label className={cls.label}>{away.shortCode}</label>
                  <input type="number" min={0} value={fixForm.awayScore} placeholder="—"
                    onChange={e => setFixForm(f => f ? { ...f, awayScore: e.target.value } : f)}
                    className={cls.input} />
                </div>
              </div>

              {fixForm.status !== 'scheduled' && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {fixForm.status === 'live' && (
                    <div>
                      <label className={cls.label}>Minute</label>
                      <input type="number" min={0} max={120} value={fixForm.minute} placeholder="67"
                        onChange={e => setFixForm(f => f ? { ...f, minute: e.target.value } : f)}
                        className={cls.input} />
                    </div>
                  )}
                  {fixForm.status === 'finished' && (
                    <div className="col-span-2">
                      <label className={cls.label}>Man of the match</label>
                      <select value={fixForm.manOfMatchPlayerId}
                        onChange={e => setFixForm(f => f ? { ...f, manOfMatchPlayerId: e.target.value } : f)}
                        className={cls.input}>
                        <option value="">None</option>
                        {allPlayers.sort((a, b) => a.shirtNumber - b.shirtNumber).map(p => (
                          <option key={p.id} value={p.id}>{p.shirtNumber}. {p.name} ({p.teamId})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={saveFixture} disabled={saving}
                  className="px-4 py-2 bg-[#14161a] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {saveMsg && (
                  <span className={`text-sm ${saveMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>{saveMsg}</span>
                )}
              </div>
            </div>

            {/* Events */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                Match events {events.length > 0 && `(${events.length})`}
              </h3>

              {events.length > 0 && (
                <div className="space-y-0 mb-4">
                  {events.map(e => {
                    const p = players.find(x => x.id === e.playerId);
                    const a = e.assistPlayerId ? players.find(x => x.id === e.assistPlayerId) : undefined;
                    return (
                      <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0 text-sm">
                        <span className="text-gray-400 font-mono w-7 text-right shrink-0">{e.minute}'</span>
                        <span className="shrink-0">{ICON[e.type]}</span>
                        <span className="flex-1 min-w-0">
                          <span className="font-medium">{p?.name ?? e.playerId}</span>
                          {a && <span className="text-gray-400"> +{a.name}</span>}
                          <span className="text-gray-400 text-xs ml-1">({e.teamId})</span>
                        </span>
                        <button onClick={() => deleteEvent(e.id)} className="text-gray-300 hover:text-red-400 px-1 shrink-0">×</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add event form */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Add event</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className={cls.label}>Minute</label>
                    <input type="number" min={0} max={120} value={evForm.minute} placeholder="45"
                      onChange={e => setEvForm(f => ({ ...f, minute: e.target.value }))}
                      className={cls.input} />
                  </div>
                  <div>
                    <label className={cls.label}>Type</label>
                    <select value={evForm.type}
                      onChange={e => setEvForm(f => ({ ...f, type: e.target.value as EventType, playerId: '', assistPlayerId: '' }))}
                      className={cls.input}>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{ICON[t]} {t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={cls.label}>Team</label>
                    <select value={evForm.teamId}
                      onChange={e => setEvForm(f => ({ ...f, teamId: e.target.value, playerId: '', assistPlayerId: '' }))}
                      className={cls.input}>
                      <option value="">Select…</option>
                      <option value={sel.homeTeamId}>{home.flagEmoji} {home.name}</option>
                      <option value={sel.awayTeamId}>{away.flagEmoji} {away.name}</option>
                    </select>
                  </div>
                  <div>
                    <label className={cls.label}>Player</label>
                    <select value={evForm.playerId} disabled={!evForm.teamId}
                      onChange={e => setEvForm(f => ({ ...f, playerId: e.target.value }))}
                      className={cls.input}>
                      <option value="">Select…</option>
                      {evOpts.map(p => <option key={p.id} value={p.id}>{p.shirtNumber}. {p.name}</option>)}
                    </select>
                  </div>
                  {SHOW_ASSIST.has(evForm.type) && (
                    <div className="col-span-2">
                      <label className={cls.label}>Assist (optional)</label>
                      <select value={evForm.assistPlayerId} disabled={!evForm.teamId}
                        onChange={e => setEvForm(f => ({ ...f, assistPlayerId: e.target.value }))}
                        className={cls.input}>
                        <option value="">None</option>
                        {evOpts.filter(p => p.id !== evForm.playerId).map(p => (
                          <option key={p.id} value={p.id}>{p.shirtNumber}. {p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <button onClick={addEvent} disabled={addingEv || !evForm.playerId || !evForm.minute}
                  className="px-4 py-2 bg-[#14161a] text-white rounded-lg text-sm font-semibold disabled:opacity-40">
                  {addingEv ? 'Adding…' : '+ Add event'}
                </button>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-300">Select a fixture to edit</p>
        </div>
      )}
    </div>
  );
}
