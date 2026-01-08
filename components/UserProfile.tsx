'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data) {
        setUser(data.user);
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="flex items-center gap-3">
      <img
        src={user?.user_metadata.avatar_url}
        alt="User Avatar"
        className="w-10 h-10 rounded-full bg-gray-500 border-2 border-white/20"
      />
      <div>
        <p className="font-semibold text-white">{user?.user_metadata.full_name}</p>
        <p className="text-sm text-gray-400">{user?.email}</p>
      </div>
    </div>
  );
};