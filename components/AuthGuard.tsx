'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

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

  // While loading, or if we are going to redirect, show a loading screen.
  const isPublicRoute = publicRoutes.includes(pathname);
  if (loading || (!session && !isPublicRoute) || (session && isPublicRoute)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[var(--aurora-1)]"></div>
      </div>
    );
  }

  // If we are in a valid state, render the children.
  return <>{children}</>;
}
