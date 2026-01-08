'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function inviteUser(email: string) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "You must be logged in to invite users.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      error: "Could not find your organization.",
    };
  }

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: {
      organization_id: profile.organization_id,
    },
  });

  if (inviteError) {
    return {
      error: inviteError.message,
    };
  }

  revalidatePath("/settings");
  return {
    data: inviteData,
  };
}
