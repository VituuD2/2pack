import { createClient } from '@supabase/supabase-js';

// In Next.js, environment variables prefixed with NEXT_PUBLIC_ are exposed to the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if configured (and not just empty strings if the user created the file but left it empty)
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  !supabaseUrl.includes('placeholder');

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase not configured. App running in DEMO MODE with mock data.');
}

// Use placeholders if variables are missing to prevent "supabaseUrl is required" crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);