import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL';

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase not configured. App running in DEMO MODE with mock data.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);
