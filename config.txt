/**
 * config.js — NoteVerse Configuration
 *
 * Fill in your values from the Supabase dashboard:
 *   Project Settings → API → Project URL & anon/public key
 *
 * These are SAFE to commit — the anon key is meant to be public.
 * Row Level Security (RLS) on Supabase is what keeps data private.
 */
const CONFIG = {
  SUPABASE_URL:     'https://zxmpihftwiqqvkjtbhsm.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_TESTXgCwj04cdwv85bZ0-w_Q8gyMnyJ',

  // Supabase Edge Function URL — deployed with `supabase functions deploy claude-proxy`
  // Format: https://YOUR_PROJECT_REF.supabase.co/functions/v1/claude-proxy
  CLAUDE_PROXY_URL: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/claude-proxy',
};
