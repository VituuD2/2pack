'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session && pathname !== '/login') {
      router.push('/login');
    }
  }, [session, loading, router, pathname]);

  if (loading || (!session && pathname !== '/login')) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  return <>{children}</>;
}