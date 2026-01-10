'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { db } from '@/services/db';
import { Session } from '@supabase/supabase-js';
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
    // O listener onAuthStateChange é a forma mais segura de gerenciar o ciclo de vida
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth Event Triggered:", event);
      setSession(currentSession);

      // Tratamos todos os estados onde o usuário está presente
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (currentSession) {
          try {
            const profile = await db.auth.getUserProfile(currentSession.user.id);
            setUserProfile(profile);
          } catch (e) {
            console.error("Erro ao carregar perfil:", e);
          }
        }
        // Destrava a tela idependente de erro no perfil
        setLoading(false); 
      }

      // Tratamos a saída ou falha de sessão
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);