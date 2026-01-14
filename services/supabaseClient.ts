import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Usamos o globalThis para persistir a instância mesmo em Fast Refresh do React
const globalSupabase = globalThis as any;

export const supabase = globalSupabase.supabaseInstance || createBrowserClient(supabaseUrl!, supabaseKey!);

if (!globalSupabase.supabaseInstance) {
  globalSupabase.supabaseInstance = supabase;
}