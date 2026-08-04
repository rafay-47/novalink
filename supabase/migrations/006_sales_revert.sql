-- Add soft-delete/revert tracking to sales
-- Run this in Supabase SQL Editor after 005_item_types.sql

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'reversed')),
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversed_by TEXT,
  ADD COLUMN IF NOT EXISTS revert_reason TEXT;

-- Index for filtering active vs reversed sales
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
