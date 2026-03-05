import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  qr_code: string;
  visit_count: number;
  last_visit: string | null;
  created_at: string;
  is_active: boolean;
  card_issue_date: string | null;
  expiry_date: string | null;
  access_code: string | null;
  free_coffee: boolean | null;
};

export type Visit = {
  id: string;
  customer_id: string;
  visited_at: string;
  notes: string | null;
  customers?: Customer;
};