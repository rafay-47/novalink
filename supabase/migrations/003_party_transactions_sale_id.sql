-- Add proper FK columns to party_transactions
-- Run this in Supabase SQL Editor

-- Add sale_id column with foreign key to sales
ALTER TABLE party_transactions
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE SET NULL;

-- Add purchase_id column with foreign key to purchases (for future use)
ALTER TABLE party_transactions
  ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL;

-- Migrate existing data: set sale_id from reference_id where reference_type = 'sale'
UPDATE party_transactions
SET sale_id = reference_id
WHERE reference_type = 'sale' AND reference_id IS NOT NULL AND sale_id IS NULL;

-- Migrate existing data: set purchase_id from reference_id where reference_type = 'purchase'
UPDATE party_transactions
SET purchase_id = reference_id
WHERE reference_type = 'purchase' AND reference_id IS NOT NULL AND purchase_id IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_party_transactions_sale_id ON party_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_party_transactions_purchase_id ON party_transactions(purchase_id);
