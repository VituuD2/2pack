// context/AuthContext.tsx
'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/services/supabaseClient'; // USE SEMPRE ESTE
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
    const initializeAuth = async () => {
      // 1. Pega a sessão inicial
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);

      if (initialSession) {
        const profile = await db.auth.getUserProfile();
        setUserProfile(profile);
      }
      setLoading(false); // Libera o app apenas após ter certeza de tudo
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        const profile = await db.auth.getUserProfile();
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
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