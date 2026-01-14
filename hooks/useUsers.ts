'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { AppUser } from '@/types';
import { useAuth } from '@/hooks/useAuth';

type UseUsersReturn = {
  users: AppUser[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export const useUsers = (): UseUsersReturn => {
  const { userProfile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    // If auth is still loading, wait
    if (authLoading) return;

    // Check admin role from DB profile
    if (userProfile?.role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Use the secure function to get all user profiles
      const { data, error: rpcError } = await supabase.rpc('get_all_user_profiles');
      
      if (rpcError) {
        console.error('Error fetching users:', rpcError);
        setError(rpcError.message);
        setUsers([]);
      } else {
        // Map database user_profiles to AppUser format
        const formattedUsers: AppUser[] = (data || []).map((user: any) => ({
          id: user.id,
          email: user.email,
          last_sign_in_at: user.last_sign_in_at || '',
          last_active_at: user.last_active_at || null,
          full_name: user.full_name || '',
          avatar_url: user.avatar_url || '',
          app_metadata: {
            roles: user.role === 'admin' ? ['admin'] : ['operator']
          },
        }));
        setUsers(formattedUsers);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [userProfile, authLoading]); // Re-run when auth profile is loaded

  return { users, loading, error, refetch: fetchUsers };
};