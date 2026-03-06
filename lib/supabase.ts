import { createClient } from "@supabase/supabase-js";



const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Customer = {
  id: string;
  // Legacy full name (existing customers)
  name: string;
  // New split name fields
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
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
  payment_status: string | null;
  payment_screenshot: string | null;
  birthdate: string | null;
  gender: string | null;
};

export type Visit = {
  id: string;
  customer_id: string;
  visited_at: string;
  notes: string | null;
  customers?: Customer;
};

// Returns display name: "Juan A. Dela Cruz" or falls back to legacy name
export function getDisplayName(c: Customer): string {
  if (c.first_name) {
    const mid = c.middle_name ? ` ${c.middle_name.charAt(0).toUpperCase()}.` : "";
    const last = c.last_name ? ` ${c.last_name}` : "";
    return `${c.first_name}${mid}${last}`.trim();
  }
  return c.name ?? "";
}

// Returns initials for avatar
export function getInitial(c: Customer): string {
  if (c.first_name) return c.first_name.charAt(0).toUpperCase();
  return (c.name ?? "?").charAt(0).toUpperCase();
}
