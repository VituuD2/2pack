'use server'

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function createUser(
  email: string,
  password: string,
  username: string,
  role: 'admin' | 'operator' = 'operator'
) {
  const supabase = createClient();

  // 1. Validate inputs
  if (!email || !password || !username) {
    return { error: 'Email, password, and username are required.' };
  }

  if (username.length < 3) {
    return { error: 'Username must be at least 3 characters.' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'Username can only contain letters, numbers, and underscores.' };
  }

  // 2. Verify the requester is logged in
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'You must be logged in to create a user.' };
  }

  // 3. Get the admin's organization
  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', session.user.id)
    .single();

  if (adminError || !adminProfile) {
    return { error: 'Admin profile not found.' };
  }

  // 4. Verify the requester is an admin
  if (adminProfile.role !== 'admin') {
    return { error: 'Only admins can create users.' };
  }

  // 5. Check if username is already taken (globally unique)
  const { data: existingUsername } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existingUsername) {
    return { error: 'This username is already taken. Please choose another.' };
  }

  // 6. Check if user already exists in user_profiles by email
  const { data: existingProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    return { error: 'A user with this email already exists.' };
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
        username: username,
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