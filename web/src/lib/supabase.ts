import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase is OPTIONAL for the MVP. When the env vars are absent the app falls
// back to seeded data (see lib/data.ts) so it runs with zero configuration.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** Browser/anon client. Returns null when Supabase isn't configured. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

/** Server-side client using the service role key for privileged writes
 *  (admin import, report generation). Never import this into client code. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
