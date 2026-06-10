-- ============================================================
-- Migration 004: Admin-override flag
-- Feed-sync functions skip rows where edited_by_admin = true,
-- so manual admin changes survive re-syncs.
-- ============================================================

ALTER TABLE teams     ADD COLUMN IF NOT EXISTS edited_by_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE fixtures  ADD COLUMN IF NOT EXISTS edited_by_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE players   ADD COLUMN IF NOT EXISTS edited_by_admin BOOLEAN NOT NULL DEFAULT false;
