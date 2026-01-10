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

  useEffect(() => {
    console.log('🛡️ AuthGuard check:', { loading, hasSession: !!session, pathname });

    if (loading) {
      console.log('⏳ Still loading auth...');
      return;
    }

    const isPublicRoute = publicRoutes.includes(pathname);

    // Reset redirect flag when we're on the correct route
    if ((session && !isPublicRoute) || (!session && isPublicRoute)) {
      hasRedirected.current = false;
      return;
    }

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

  // If we're on wrong route, show loading until redirect completes
  const isPublicRoute = publicRoutes.includes(pathname);
  const needsRedirect = (!session && !isPublicRoute) || (session && isPublicRoute);
  
  if (needsRedirect) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}