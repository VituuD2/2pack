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
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;
    let loadingTimeout: NodeJS.Timeout;

    const fetchProfile = async (userId: string) => {
      try {
        console.log('📝 Fetching profile for user ID:', userId);
        const profile = await db.auth.getUserProfile(userId);
        
        if (mounted) {
          if (profile) {
            console.log('✅ Profile loaded:', profile.email);
            setUserProfile(profile);
          } else {
            console.warn('⚠️ No profile found for user');
            setUserProfile(null);
          }
        }
      } catch (error) {
        console.error('❌ Profile fetch failed:', error);
        if (mounted) {
          setUserProfile(null);
        }
      }
    };

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
          await fetchProfile(initialSession.user.id);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
        if (mounted) {
          setSession(null);
          setUserProfile(null);
        }
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete, setting loading = false');
          setLoading(false);
        }
      }
    };

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log('🔔 Auth Event:', event);
        
        if (!mounted) return;

        // For any auth event, update session immediately
        setSession(currentSession);

        // If we're still in the loading phase, let initializeAuth handle it
        if (loading && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          console.log('⏭️ Skipping event during initialization, will be handled by initializeAuth');
          return;
        }

        // For post-initialization events, handle them
        if (currentSession) {
          await fetchProfile(currentSession.user.id);
        } else {
          setUserProfile(null);
        }

        // Ensure loading is false after any auth event (safety net)
        if (loading) {
          console.log('🔓 Setting loading = false from auth event');
          setLoading(false);
        }
      }
    );

    // Safety timeout - if loading is still true after 3 seconds, force it to false
    loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Loading timeout reached, forcing loading = false');
        setLoading(false);
      }
    }, 3000);

    // Initialize after setting up subscription
    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once

  return (
    <AuthContext.Provider value={{ session, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);