'use client';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const isInitialMount = useRef(true); // Evita duplicidade no StrictMode

  useEffect(() => {
    const initialize = async () => {
      try {
        // 1. Tenta pegar a sessão de forma limpa
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          setSession(initialSession);
          const profile = await db.auth.getUserProfile(initialSession.user.id);
          setUserProfile(profile);
        }
      } catch (err) {
        console.error("Erro ao inicializar auth:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isInitialMount.current) {
      initialize();
      isInitialMount.current = false;
    }

    // 2. Listener para mudanças (Login/Logout/Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      // Se a sessão mudar, atualizamos tudo
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        const profile = await db.auth.getUserProfile(currentSession?.user.id);
        setUserProfile(profile);
        setLoading(false);
      }
      
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