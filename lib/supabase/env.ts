/** Whether Supabase credentials are present. Lets the app run (and public
 * pages render normally) before a real project is connected — see .env.example. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
