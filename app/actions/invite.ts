'use server'

import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function inviteUser(email: string) {
  // Log the environment variable to Vercel's runtime logs
  console.log("Attempting to read SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Key Found" : "Key NOT Found");

  const supabase = createServerClient();

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      organization_id: profile.organization_id,
    },
  });

  if (inviteError) {
    // Also log the error here for more context
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
