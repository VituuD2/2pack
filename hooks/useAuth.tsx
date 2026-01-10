'use client';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const initializingRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (initializingRef.current) return;
    initializingRef.current = true;

    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        
        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        console.log('✅ Session retrieved:', initialSession ? 'Logged in' : 'Not logged in');

        if (!mounted) return;
        
        setSession(initialSession);
        
        if (initialSession) {
          console.log('🔍 Fetching user profile for:', initialSession.user.id);
          
          try {
            const profile = await db.auth.getUserProfile(initialSession.user.id);
            
            if (!mounted) return;
            
            if (profile) {
              console.log('✅ Profile loaded:', profile.email);
              setUserProfile(profile);
            } else {
              console.warn('⚠️ No profile found for user');
              setUserProfile(null);
            }
          } catch (profileError) {
            console.error('❌ Profile fetch failed:', profileError);
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        setSession(null);
        setUserProfile(null);
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete, setting loading = false');
          setLoading(false);
        }
      }
    };

    // Subscribe to auth changes BEFORE initializing
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log('🔔 Auth Event:', event);
        
        if (!mounted) return;

        // Skip the INITIAL_SESSION event as we handle it in initializeAuth
        if (event === 'INITIAL_SESSION') {
          console.log('⏭️ Skipping INITIAL_SESSION, already handled in initialization');
          return;
        }
        
        setSession(currentSession);

        if (currentSession) {
          try {
            const profile = await db.auth.getUserProfile(currentSession.user.id);
            if (mounted) {
              setUserProfile(profile);
            }
          } catch (error) {
            console.error('❌ Profile fetch error in auth change:', error);
            if (mounted) {
              setUserProfile(null);
            }
          }
        } else {
          if (mounted) {
            setUserProfile(null);
          }
        }
      }
    );

    // Initialize after setting up subscription
    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);