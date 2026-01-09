'use server'

import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function inviteUser(email: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "You must be logged in to invite users.",
    };
  }

  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

  if (inviteError) {
    console.error("Supabase invite error:", inviteError);
    return {
      error: inviteError.message,
    };
  }

  revalidatePath("/settings");
  return {
    data: inviteData,
  };
}
