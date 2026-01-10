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

  // Criar o usuário na autenticação
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Pula o e-mail de confirmação
  });

  if (authError) {
    return {
      error: `Error creating user: ${authError.message}`,
    };
  }

  if (!authData.user) {
      return {
          error: 'User could not be created.'
      }
  }

  // Inserir o perfil correspondente na tabela 'profiles'
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([
      { 
        id: authData.user.id, 
        email: email,
        role: 'user' // Define uma role padrão
      }
    ]);

  if (profileError) {
    // Opcional: Tentar deletar o usuário da autenticação se a criação do perfil falhar
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return {
      error: `Error creating profile: ${profileError.message}`,
    };
  }

  return {
    data: authData,
  };
}
