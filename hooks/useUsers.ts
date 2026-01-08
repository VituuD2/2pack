'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
        setUsers(data);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  return { users, loading };
};