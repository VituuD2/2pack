'use server'

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function createUser(email: string, password: string, role: 'admin' | 'operator' = 'operator') {
  const supabase = createClient();
  
  // 1. Verifica se quem está tentando criar o usuário está logado
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { error: 'Você precisa estar logado para criar um usuário.' };
  }

  // 2. IMPORTANTE: Buscamos a organização do ADMIN que está criando o usuário
  // Isso garante que o novo funcionário pertença à mesma loja (SoulBM)
  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('user_profiles')
    .select('organization_id')
    .eq('id', session.user.id)
    .single();

  if (adminError || !adminProfile) {
    return { error: 'Perfil do administrador não encontrado. Não foi possível vincular a organização.' };
  }

  // 3. Criar o usuário no Supabase Auth (Usando Admin API para pular confirmação de e-mail)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { error: `Erro no Supabase Auth: ${authError?.message || 'Usuário não retornado'}` };
  }

  // 4. Inserir o perfil correspondente na tabela 'user_profiles' (A tabela correta!)
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .insert([
      { 
        id: authData.user.id, 
        email: email,
        role: role, 
        organization_id: adminProfile.organization_id // Vinculamos à SoulBM
      }
    ]);

  if (profileError) {
    // Rollback: Deleta o usuário da autenticação se o perfil falhar
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: `Erro ao criar perfil no banco: ${profileError.message}` };
  }

  return { data: authData.user };
}