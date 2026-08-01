-- Parties & Party Transactions
-- Run this in Supabase SQL Editor after 001_schema.sql

-- Parties table (dealer/shopkeeper accounts)
CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  opening_balance DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Party transactions (ledger entries)
CREATE TABLE IF NOT EXISTS party_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('credit_sale', 'credit_purchase', 'receipt', 'payment', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  reference_id UUID,
  reference_type TEXT CHECK (reference_type IN ('sale', 'purchase')),
  payment_method TEXT,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View for computed party balances
CREATE OR REPLACE VIEW party_balances AS
SELECT
  p.id AS party_id,
  p.name AS party_name,
  COALESCE(p.opening_balance, 0) +
    COALESCE(SUM(CASE
      WHEN t.type IN ('credit_sale', 'payment') THEN t.amount
      WHEN t.type IN ('credit_purchase', 'receipt') THEN -t.amount
      WHEN t.type = 'adjustment' THEN -t.amount
      ELSE 0
    END), 0) AS balance
FROM parties p
LEFT JOIN party_transactions t ON t.party_id = p.id
GROUP BY p.id, p.name, p.opening_balance;

-- Enable RLS
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (authenticated users can do all)
CREATE POLICY "Authenticated users can view parties" ON parties FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert parties" ON parties FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update parties" ON parties FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete parties" ON parties FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view party_transactions" ON party_transactions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert party_transactions" ON party_transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update party_transactions" ON party_transactions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete party_transactions" ON party_transactions FOR DELETE USING (auth.role() = 'authenticated');

-- Update timestamp trigger for parties
CREATE OR REPLACE TRIGGER update_parties_updated_at
  BEFORE UPDATE ON parties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_party_transactions_party_id ON party_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_party_transactions_type ON party_transactions(type);
CREATE INDEX IF NOT EXISTS idx_party_transactions_created_at ON party_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_party_transactions_reference ON party_transactions(reference_id, reference_type);
