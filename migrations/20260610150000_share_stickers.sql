-- ============================================================
-- Migration 005: Share stickers
-- Sticker PNGs live in a public Supabase Storage bucket and are
-- referenced by the share_stickers table.
-- ============================================================

CREATE TABLE IF NOT EXISTS share_stickers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  image_url  TEXT NOT NULL,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE share_stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read ON share_stickers
  FOR SELECT USING (enabled = true);

CREATE POLICY admin_write ON share_stickers
  FOR ALL USING (auth.uid() IS NOT NULL);

INSERT INTO storage.buckets (id, name, public)
VALUES ('stickers', 'stickers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY public_read_stickers ON storage.objects
  FOR SELECT USING (bucket_id = 'stickers');

CREATE POLICY admin_insert_stickers ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stickers' AND auth.uid() IS NOT NULL);

CREATE POLICY admin_update_stickers ON storage.objects
  FOR UPDATE USING (bucket_id = 'stickers' AND auth.uid() IS NOT NULL);

CREATE POLICY admin_delete_stickers ON storage.objects
  FOR DELETE USING (bucket_id = 'stickers' AND auth.uid() IS NOT NULL);
