-- Add reserved_party_id & reserved_at columns to phones table for tracking party consignments
-- Run this in Supabase SQL Editor

ALTER TABLE phones
  ADD COLUMN IF NOT EXISTS reserved_party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ;

-- Index for querying reserved phones by party
CREATE INDEX IF NOT EXISTS idx_phones_reserved_party ON phones(reserved_party_id);
