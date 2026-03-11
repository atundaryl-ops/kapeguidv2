 
-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,
  email       TEXT,
  notes       TEXT,
  qr_code     TEXT NOT NULL UNIQUE,
  visit_count INTEGER DEFAULT 0,
  last_visit  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  is_active   BOOLEAN DEFAULT TRUE
);

-- Visits table
CREATE TABLE IF NOT EXISTS visits (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  visited_at  TIMESTAMPTZ DEFAULT NOW(),
  notes       TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_qr   ON customers(qr_code);
CREATE INDEX IF NOT EXISTS idx_visits_cust    ON visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_time    ON visits(visited_at DESC);

-- Auto-update visit count trigger
CREATE OR REPLACE FUNCTION update_visit_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET visit_count = visit_count + 1,
      last_visit  = NEW.visited_at
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_visit ON visits;
CREATE TRIGGER on_new_visit
  AFTER INSERT ON visits
  FOR EACH ROW EXECUTE FUNCTION update_visit_stats();

-- Row Level Security (open for demo — tighten for production)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all visits"    ON visits    FOR ALL USING (true) WITH CHECK (true);
