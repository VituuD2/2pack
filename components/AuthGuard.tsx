'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import LoadingScreen from './LoadingScreen';

const publicRoutes = ['/login', '/forgot-password', '/reset-password'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    console.log('🛡️ AuthGuard check:', { loading, hasSession: !!session, pathname });

    // Don't do anything while auth is loading
    if (loading) {
      console.log('⏳ Still loading auth...');
      return;
    }

    // Skip redirect logic on initial mount if we're already on the correct route
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const isPublicRoute = publicRoutes.includes(pathname);
      const isCorrectRoute = (session && !isPublicRoute) || (!session && isPublicRoute);
      
      if (isCorrectRoute) {
        console.log('✅ Already on correct route, skipping redirect');
        return;
      }
    }

    const isPublicRoute = publicRoutes.includes(pathname);

    // Prevent multiple redirects
    if (hasRedirected.current) {
      console.log('🚫 Already redirected, skipping...');
      return;
    }

    // User not authenticated, trying to access protected route
    if (!session && !isPublicRoute) {
      console.log('🔒 No session, redirecting to login');
      hasRedirected.current = true;
      router.replace('/login');
      return;
    }

    // User authenticated, trying to access public route
    if (session && isPublicRoute) {
      console.log('✅ Has session, redirecting to dashboard');
      hasRedirected.current = true;
      router.replace('/');
      return;
    }
  }, [session, loading, pathname, router]);

  // Show loading only while auth is initializing
  if (loading) {
    return <LoadingScreen />;
  }

  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Show loading if we need to redirect
  if ((!session && !isPublicRoute) || (session && isPublicRoute)) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}