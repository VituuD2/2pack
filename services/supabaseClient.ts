import { createClient } from '@supabase/supabase-js';

// Helper to access environment variables across different bundlers (Vite, CRA, etc.)
const getEnv = (key: string, viteKey: string) => {
  // Check process.env (Standard/CRA)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Check import.meta.env (Vite)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
      // @ts-ignore
      return import.meta.env[viteKey];
    }
  } catch (e) {
    // Ignore execution environment errors
  }
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl) {
  console.error('⚠️ Supabase URL is missing. Please check your .env file.');
}

// We rely on the environment variables. 
// If they are missing, createClient might throw 'supabaseUrl is required', 
// which is preferable to fetching a dead placeholder URL which causes 'Failed to fetch'.
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');