import { useState, useEffect } from 'react';
import { supabase } from '../../data/supabase';

interface TextureRow {
  id: string;
  name: string;
  filePath: string;
  enabled: boolean;
}

export default function AdminTextures() {
  const [textures, setTextures] = useState<TextureRow[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    // Fetch all textures regardless of enabled state (admin needs to see disabled ones too)
    supabase.from('textures').select('*').order('name').then(({ data }) => {
      if (data) setTextures(data.map(r => ({
        id: r.id, name: r.name, filePath: r.file_path, enabled: r.enabled,
      })));
    });
  }, []);

  async function toggleEnabled(t: TextureRow) {
    if (!supabase) return;
    setToggling(t.id);
    const { error } = await supabase.from('textures').update({ enabled: !t.enabled }).eq('id', t.id);
    if (!error) setTextures(prev => prev.map(x => x.id === t.id ? { ...x, enabled: !x.enabled } : x));
    setToggling(null);
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold text-[#14161a] mb-2">Textures</h2>
      <p className="text-sm text-gray-400 mb-5">
        Enable or disable texture patterns. Disabled textures won't appear in the public app or admin picker.
      </p>

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {textures.length === 0 && <p className="text-sm text-gray-300 p-4">No textures loaded.</p>}
        {textures.map(t => (
          <div key={t.id} className="flex items-center gap-4 px-4 py-4">
            {/* Preview thumbnail */}
            <div
              className="w-16 h-16 rounded-lg shrink-0 border border-gray-100 flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: `url(${t.filePath})`,
                backgroundRepeat: 'repeat',
                backgroundSize: '40px 40px',
                opacity: t.enabled ? 1 : 0.35,
              }}
            />

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[#14161a] capitalize">{t.name}</p>
              <p className="text-xs text-gray-400 font-mono">{t.filePath}</p>
              <p className="text-xs mt-0.5">
                <span className={`font-semibold ${t.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {t.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </p>
            </div>

            <button
              onClick={() => toggleEnabled(t)}
              disabled={toggling === t.id}
              className={[
                'px-4 py-2 rounded-lg text-sm font-semibold shrink-0 transition-colors disabled:opacity-50',
                t.enabled
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-[#14161a] text-white hover:opacity-90',
              ].join(' ')}
            >
              {toggling === t.id ? '…' : t.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        To add new textures, drop a new SVG into <code className="font-mono bg-gray-100 px-1 rounded">public/textures/</code> and insert a row into the <code className="font-mono bg-gray-100 px-1 rounded">textures</code> table.
      </p>
    </div>
  );
}
