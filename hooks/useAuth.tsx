'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { db } from '@/services/db';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { UserProfile } from '@/types';

const AuthContext = createContext<{ 
  session: Session | null; 
  userProfile: UserProfile | null; 
  loading: boolean; 
}>({ session: null, userProfile: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log("Auth Event:", event);
        
        // 1. Atualizamos a sessão imediatamente
        setSession(currentSession);

        try {
          // 2. Se houver um usuário, tentamos buscar o perfil
          if (currentSession) {
            const profile = await db.auth.getUserProfile(currentSession.user.id);
            setUserProfile(profile);
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error("Erro silencioso no AuthProvider:", error);
        } finally {
          // 3. REGRA DE OURO: Esta linha DESTRAVA a tela em qualquer situação:
          // Logado, Não Logado ou Erro de Banco.
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);