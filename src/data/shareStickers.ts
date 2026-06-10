import { supabase } from './supabase';

export interface ShareStickerAsset {
  id: string;
  name: string;
  imageUrl?: string;
  text?: string;
  tone: 'green' | 'yellow' | 'black' | 'white';
  rotate: number;
}

interface StickerRow {
  id: string;
  name: string;
  image_url: string;
  enabled: boolean;
  sort_order: number;
}

export const FALLBACK_SHARE_STICKERS: ShareStickerAsset[] = [
  { id: 'great-game', name: 'Great game', text: 'GREAT GAME', tone: 'green', rotate: -5 },
  { id: 'crazy-game', name: 'Crazy game', text: 'CRAZY GAME', tone: 'yellow', rotate: 4 },
  { id: 'what-a-finish', name: 'What a finish', text: 'WHAT A FINISH', tone: 'black', rotate: -2 },
  { id: 'instant-classic', name: 'Instant classic', text: 'INSTANT CLASSIC', tone: 'white', rotate: 3 },
];

export async function loadShareStickers(): Promise<ShareStickerAsset[]> {
  if (!supabase) return FALLBACK_SHARE_STICKERS;

  const { data, error } = await (supabase as any)
    .from('share_stickers')
    .select('*')
    .eq('enabled', true)
    .order('sort_order')
    .order('created_at');

  if (error || !data?.length) return FALLBACK_SHARE_STICKERS;

  return (data as StickerRow[]).map((row, index) => ({
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    tone: index % 2 === 0 ? 'green' : 'yellow',
    rotate: index % 2 === 0 ? -4 : 4,
  }));
}
