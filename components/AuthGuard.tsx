'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingScreen from './LoadingScreen';

const publicRoutes = ['/login', '/forgot-password', '/reset-password'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;

    const isPublicRoute = publicRoutes.includes(pathname);

    // User not authenticated, trying to access protected route
    if (!session && !isPublicRoute) {
      setIsRedirecting(true);
      router.push('/login');
      return;
    }

    // User authenticated, trying to access public route (login, etc)
    if (session && isPublicRoute) {
      setIsRedirecting(true);
      router.push('/');
      return;
    }

    // Valid state, stop showing loading
    setIsRedirecting(false);
  }, [session, loading, pathname, router]);

  // Show loading screen while:
  // 1. Auth is loading
  // 2. We're in the process of redirecting
  if (loading || isRedirecting) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}