'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';
import { AppUser } from '../types';

export const useUsers = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_all_users');
      if (error) {
        console.error('Error fetching users:', error);
      } else {
        const formattedUsers: AppUser[] = data.map((user: any) => ({
          id: user.id,
          email: user.email,
          last_sign_in_at: user.last_sign_in_at,
          full_name: user.full_name, // This field is available from the RPC call
          avatar_url: user.avatar_url, // This field is available from the RPC call
          app_metadata: user.raw_app_meta_data, // Mapping the raw metadata to the expected property
        }));
        setUsers(formattedUsers);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  return { users, loading };
};