'use server'

import { supabaseAdmin } from "@/utils/supabase/admin";

export async function createUser(email: string, password: string) {
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
