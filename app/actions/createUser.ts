'use server'

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function createUser(email: string, password: string, role: 'admin' | 'operator' = 'operator') {
  const supabase = createClient();

  // 1. Verify the requester is logged in
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'You must be logged in to create a user.' };
  }

  // 2. Get the admin's organization
  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', session.user.id)
    .single();

  if (adminError || !adminProfile) {
    return { error: 'Admin profile not found.' };
  }

  // 3. Verify the requester is an admin
  if (adminProfile.role !== 'admin') {
    return { error: 'Only admins can create users.' };
  }

  // 4. Check if user already exists in user_profiles
  const { data: existingProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    return { error: 'A user with this email already exists in your organization.' };
  }

  // 5. Try to create the user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
  });

  let userId: string;

  if (authError) {
    // If user already exists in Auth, try to find them and create their profile
    if (authError.message.includes('already been registered')) {
      // Find the existing auth user by email
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        return { error: `Error finding existing user: ${listError.message}` };
      }

      const existingAuthUser = users.find(u => u.email === email);

      if (!existingAuthUser) {
        return { error: 'User exists in Auth but could not be found.' };
      }

      userId = existingAuthUser.id;
    } else {
      return { error: `Supabase Auth error: ${authError.message}` };
    }
  } else if (!authData.user) {
    return { error: 'User was not returned from Auth.' };
  } else {
    userId = authData.user.id;
  }

  // 6. Insert the profile into user_profiles
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert([
      {
        id: userId,
        email: email,
        role: role,
        organization_id: adminProfile.organization_id
      }
    ]);

  if (profileError) {
    // Only rollback (delete auth user) if we created them in this request
    if (authData?.user) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
    return { error: `Error creating profile: ${profileError.message}` };
  }

  return { data: { id: userId, email } };
}