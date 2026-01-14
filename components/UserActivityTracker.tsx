'use client';

import { useEffect } from 'react';
import { db } from '@/services/db';
import { useAuth } from '@/hooks/useAuth';

export const UserActivityTracker = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update immediately on mount
    db.auth.updateLastActive();

    // Set up interval to update every minute
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        db.auth.updateLastActive();
      }
    }, 60 * 1000); // 1 minute

    // Update on visibility change (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        db.auth.updateLastActive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  return null;
};
