'use server'

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function createUser(email: string, password: string) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return {
      error: 'You must be logged in to create a user.',
    };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Skips the confirmation email
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    data: data,
  };
}
