import { useState, useEffect } from 'react';
import { dataService } from '../../data/dataService';
import { supabase } from '../../data/supabase';
import { contrastRatio, readableOn } from '../../theme/contrast';
import { TEXTURES } from '../../textures/textures.config';
import type { Team } from '../../data/types';

interface TeamForm {
  primaryHex:   string;
  secondaryHex: string;
  tertiaryHex:  string;
  onPrimary:    string;
  onSecondary:  string;
  funFact:      string;
  triviaFacts:  string[];
  seed:         number;
  titleOdds:    string;
  textureId:    string;
}

function initForm(t: Team, textureId: string): TeamForm {
  return {
    primaryHex:   t.primaryHex,
    secondaryHex: t.secondaryHex,
    tertiaryHex:  t.tertiaryHex,
    onPrimary:    t.onPrimary   ?? '',
    onSecondary:  t.onSecondary ?? '',
    funFact:      t.funFact,
    triviaFacts:  t.triviaFacts ?? [],
    seed:         t.seed,
    titleOdds:    t.titleOdds,
    textureId,
  };
}

function TriviaFactsEditor({
  facts,
  onChange,
}: {
  facts: string[];
  onChange: (facts: string[]) => void;
}) {
  function update(index: number, value: string) {
    const next = [...facts];
    next[index] = value;
    onChange(next);
  }

  function remove(index: number) {
    onChange(facts.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...facts, '']);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Trivia facts
        </label>
        <span className="text-[10px] text-gray-400">{facts.length} fact{facts.length !== 1 ? 's' : ''} · shown at random</span>
      </div>
      <div className="flex flex-col gap-2">
        {facts.map((fact, i) => (
          <div key={i} className="flex gap-2 items-start">
            <textarea
              value={fact}
              onChange={e => update(i, e.target.value)}
              rows={2}
              placeholder={`Fact ${i + 1}`}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-gray-400"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="mt-1 text-gray-300 hover:text-red-400 text-lg leading-none"
              aria-label="Remove fact"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="self-start text-[11px] font-semibold text-gray-400 hover:text-gray-700 border border-dashed border-gray-200 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-colors"
        >
          + Add fact
        </button>
      </div>
    </div>
  );
}

const isHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);

function HexInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          value={isHex(value) ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
          placeholder="#000000"
          className="font-mono text-sm border border-gray-200 rounded-lg px-3 py-2 w-28 uppercase focus:outline-none focus:border-gray-400"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function ContrastBadge({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  if (!isHex(fg) || !isHex(bg)) return null;
  const ratio = contrastRatio(fg, bg);
  const ok = ratio >= 4.5;
  return (
    <div className={`flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
      <span>{ok ? '✓' : '⚠'}</span>
      <span className="font-medium">{label}</span>
      <span className="font-mono opacity-60">{ratio.toFixed(1)}:1</span>
      {!ok && <span className="opacity-70">— WCAG AA fail</span>}
    </div>
  );
}

export default function AdminTeams() {
  const [teams,    setTeams]    = useState<Team[]>([]);
  const [selId,    setSelId]    = useState<string | null>(null);
  const [baseTeam, setBaseTeam] = useState<Team | null>(null);
  const [form,     setForm]     = useState<TeamForm | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState('');

  useEffect(() => { setTeams(dataService.allTeams()); }, []);

  async function handleSelect(team: Team) {
    setSelId(team.id);
    setSaveMsg('');
    let textureId = '';
    if (supabase) {
      const { data } = await supabase.from('teams').select('texture_id').eq('id', team.id).single();
      textureId = data?.texture_id ?? '';
    }
    setBaseTeam(team);
    setForm(initForm(team, textureId));
  }

  function setField<K extends keyof TeamForm>(k: K, v: TeamForm[K]) {
    setForm(f => f ? { ...f, [k]: v } : f);
  }

  async function handleSave() {
    if (!supabase || !form || !selId || !baseTeam) return;
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase.from('teams').update({
      primary_hex:      form.primaryHex,
      secondary_hex:    form.secondaryHex,
      tertiary_hex:     form.tertiaryHex,
      on_primary:       form.onPrimary   || null,
      on_secondary:     form.onSecondary || null,
      fun_fact:         form.funFact,
      trivia_facts:     form.triviaFacts,
      seed:             form.seed,
      title_odds:       form.titleOdds,
      texture_id:       form.textureId   || null,
      edited_by_admin:  true,
    }).eq('id', selId);

    if (error) {
      setSaveMsg(`Error: ${error.message}`);
    } else {
      setSaveMsg('Saved ✓');
      const updated: Team = {
        ...baseTeam,
        primaryHex:   form.primaryHex,
        secondaryHex: form.secondaryHex,
        tertiaryHex:  form.tertiaryHex,
        onPrimary:    form.onPrimary   || undefined,
        onSecondary:  form.onSecondary || undefined,
        funFact:      form.funFact,
        triviaFacts:  form.triviaFacts,
        seed:         form.seed,
        titleOdds:    form.titleOdds,
      };
      setTeams(prev => prev.map(t => t.id === selId ? updated : t));
      setBaseTeam(updated);
    }
    setSaving(false);
  }

  const primaryText   = form ? (isHex(form.onPrimary)   ? form.onPrimary   : readableOn(form.primaryHex))   : '#ffffff';
  const secondaryText = form ? (isHex(form.onSecondary) ? form.onSecondary : readableOn(form.secondaryHex)) : '#ffffff';
  const groups = Array.from(new Set(teams.map(team => team.groupId)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return (
    <div className="flex gap-6 h-[calc(100vh-96px)]">

      {/* ── Team list ── */}
      <nav className="w-48 shrink-0 overflow-y-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
          {teams.length} Teams
        </p>
        {groups.map(g => (
          <div key={g} className="mb-4">
            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1 pl-2">Group {g}</p>
            {teams.filter(t => t.groupId === g).map(t => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                className={[
                  'w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 text-xs transition-colors',
                  selId === t.id
                    ? 'bg-[#14161a] text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                ].join(' ')}
              >
                <span className="text-base leading-none">{t.flagEmoji}</span>
                <span className="flex-1 font-medium">{t.name}</span>
                <span className="flex gap-1 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10" style={{ background: t.primaryHex }} />
                  <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10" style={{ background: t.secondaryHex }} />
                </span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Editor ── */}
      {form && baseTeam ? (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl">
            <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#14161a] mb-6">
              <span className="text-2xl">{baseTeam.flagEmoji}</span>
              {baseTeam.name}
            </h2>

            <div className="grid grid-cols-2 gap-8">

              {/* Left: colour controls */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Kit colours</h3>
                <div className="flex flex-col gap-5">
                  <HexInput label="Primary"   value={form.primaryHex}   onChange={v => setField('primaryHex', v)} />
                  <HexInput label="Secondary" value={form.secondaryHex} onChange={v => setField('secondaryHex', v)} />
                  <HexInput label="Tertiary"  value={form.tertiaryHex}  onChange={v => setField('tertiaryHex', v)} />
                </div>

                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-7 mb-1">
                  Text overrides
                </h3>
                <p className="text-[10px] text-gray-400 mb-3">Optional. Leave blank to auto-compute.</p>
                <div className="flex flex-col gap-4">
                  <HexInput label="On primary"   value={form.onPrimary}   onChange={v => setField('onPrimary', v)} />
                  <HexInput label="On secondary" value={form.onSecondary} onChange={v => setField('onSecondary', v)} />
                </div>
              </div>

              {/* Right: live preview + info */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Live preview</h3>

                {/* Split-kit preview */}
                <div className="rounded-xl overflow-hidden border border-gray-100 mb-3 shadow-sm">
                  <div className="flex h-24">
                    <div
                      className="flex-1 flex items-center justify-center text-lg font-bold tracking-wider"
                      style={{ background: form.primaryHex, color: primaryText }}
                    >
                      {baseTeam.shortCode}
                    </div>
                    <div
                      className="flex-1 flex items-center justify-center text-lg font-bold tracking-wider"
                      style={{ background: form.secondaryHex, color: secondaryText }}
                    >
                      vs
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center h-7 text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: form.tertiaryHex, color: readableOn(form.tertiaryHex) }}
                  >
                    Tertiary accent
                  </div>
                </div>

                {/* Contrast badges */}
                <div className="flex flex-col gap-1.5 mb-6">
                  <ContrastBadge label="Text on primary"   fg={primaryText}   bg={form.primaryHex} />
                  <ContrastBadge label="Text on secondary" fg={secondaryText} bg={form.secondaryHex} />
                </div>

                {/* Team info */}
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Team info</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Default fact <span className="normal-case font-normal">(from sync)</span></label>
                    <textarea
                      value={form.funFact}
                      onChange={e => setField('funFact', e.target.value)}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <TriviaFactsEditor
                    facts={form.triviaFacts ?? []}
                    onChange={v => setForm(f => f ? { ...f, triviaFacts: v } : f)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Seed</label>
                      <input
                        type="number" min={1} value={form.seed}
                        onChange={e => setField('seed', parseInt(e.target.value) || 1)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Title odds</label>
                      <input
                        type="text" value={form.titleOdds} placeholder="13/2"
                        onChange={e => setField('titleOdds', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Texture</label>
                    <select
                      value={form.textureId}
                      onChange={e => setField('textureId', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-400"
                    >
                      <option value="">Random (based on team ID)</option>
                      {TEXTURES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Save bar */}
            <div className="flex items-center gap-3 mt-8 pt-5 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-[#14161a] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={() => { setForm(initForm(baseTeam, form.textureId)); setSaveMsg(''); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600"
              >
                Reset
              </button>
              {saveMsg && (
                <span className={`text-sm ${saveMsg.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-300">Select a team to edit</p>
        </div>
      )}
    </div>
  );
}
