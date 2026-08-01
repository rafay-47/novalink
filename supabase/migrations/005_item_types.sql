-- Add item_type column to phones table to support Adapters & Cables alongside Phones
-- Run this in Supabase SQL Editor

ALTER TABLE phones
  ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'Phone' CHECK (item_type IN ('Phone', 'Adapter', 'Cable'));

-- Index for filtering items by item_type
CREATE INDEX IF NOT EXISTS idx_phones_item_type ON phones(item_type);
