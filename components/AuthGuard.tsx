'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingScreen from './LoadingScreen'; // Import the new LoadingScreen

const publicRoutes = ['/login', '/forgot-password', '/reset-password'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait for the session to be loaded

    const isPublicRoute = publicRoutes.includes(pathname);

    if (!session && !isPublicRoute) {
      router.push('/login');
    }

    if (session && isPublicRoute) {
      router.push('/');
    }
  }, [session, loading, router, pathname]);

  const isPublicRoute = publicRoutes.includes(pathname);
  if (loading || (!session && !isPublicRoute) || (session && isPublicRoute)) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
