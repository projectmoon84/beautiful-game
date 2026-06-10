import { useEffect, useState } from 'react';
import { supabase } from '../../data/supabase';

interface StickerRow {
  id: string;
  name: string;
  imageUrl: string;
  enabled: boolean;
  sortOrder: number;
}

const inputClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white w-full';

export default function AdminStickers() {
  const [stickers, setStickers] = useState<StickerRow[]>([]);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    if (!supabase) return;
    const { data } = await (supabase as any)
      .from('share_stickers')
      .select('*')
      .order('sort_order')
      .order('created_at');

    if (data) {
      setStickers(data.map((row: any) => ({
        id: row.id,
        name: row.name,
        imageUrl: row.image_url,
        enabled: row.enabled,
        sortOrder: row.sort_order,
      })));
    }
  }

  async function uploadSticker() {
    if (!supabase || !file) return;
    setBusy(true);
    setMessage('');

    const label = name.trim() || file.name.replace(/\.[^.]+$/, '');
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
    const path = `${Date.now()}-${safeName}`;
    const upload = await supabase.storage.from('stickers').upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    });

    if (upload.error) {
      setMessage(upload.error.message);
      setBusy(false);
      return;
    }

    const { data: publicUrl } = supabase.storage.from('stickers').getPublicUrl(path);
    const { data, error } = await (supabase as any)
      .from('share_stickers')
      .insert({
        name: label,
        image_url: publicUrl.publicUrl,
        enabled: true,
        sort_order: stickers.length,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
    } else if (data) {
      setStickers(current => [...current, {
        id: data.id,
        name: data.name,
        imageUrl: data.image_url,
        enabled: data.enabled,
        sortOrder: data.sort_order,
      }]);
      setName('');
      setFile(null);
      setMessage('Sticker uploaded.');
    }

    setBusy(false);
  }

  async function toggleEnabled(sticker: StickerRow) {
    if (!supabase) return;
    const { error } = await (supabase as any)
      .from('share_stickers')
      .update({ enabled: !sticker.enabled })
      .eq('id', sticker.id);

    if (!error) {
      setStickers(current => current.map(item => (
        item.id === sticker.id ? { ...item, enabled: !item.enabled } : item
      )));
    }
  }

  async function deleteSticker(sticker: StickerRow) {
    if (!supabase) return;
    await (supabase as any).from('share_stickers').delete().eq('id', sticker.id);
    setStickers(current => current.filter(item => item.id !== sticker.id));
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold text-[#14161a] mb-2">Stickers</h2>
      <p className="text-sm text-gray-400 mb-5">
        Upload transparent PNG stickers for the share composer. Enabled stickers appear in the horizontal sticker library.
      </p>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Upload sticker</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Name</label>
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Great game"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">PNG file</label>
            <input
              type="file"
              accept="image/png"
              onChange={event => setFile(event.target.files?.[0] ?? null)}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={uploadSticker}
          disabled={busy || !file}
          className="mt-3 px-4 py-2 bg-[#14161a] text-white rounded-lg text-sm font-semibold disabled:opacity-40"
        >
          {busy ? 'Uploading...' : '+ Upload sticker'}
        </button>
        {message && <p className="mt-2 text-xs text-gray-400">{message}</p>}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {stickers.length === 0 && <p className="text-sm text-gray-300 p-4">No stickers uploaded yet.</p>}
        {stickers.map(sticker => (
          <div key={sticker.id} className="flex items-center gap-4 px-4 py-4">
            <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 p-2">
              <img src={sticker.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-[#14161a]">{sticker.name}</p>
              <p className="truncate text-xs text-gray-400">{sticker.imageUrl}</p>
              <p className="text-xs mt-0.5">
                <span className={`font-semibold ${sticker.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  {sticker.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleEnabled(sticker)}
              className={[
                'px-4 py-2 rounded-lg text-sm font-semibold shrink-0 transition-colors',
                sticker.enabled
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-[#14161a] text-white hover:opacity-90',
              ].join(' ')}
            >
              {sticker.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              type="button"
              onClick={() => deleteSticker(sticker)}
              className="px-2 text-xl leading-none text-gray-300 hover:text-red-400"
              aria-label={`Delete ${sticker.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
