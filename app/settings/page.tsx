'use client';

import React from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { supabase } from '@/lib/supabase';

const SettingsPage: React.FC = () => {

  const handleChangeAvatar = async () => {
    const { data: user } = await supabase.auth.getUser();
    const newAvatarUrl = prompt('Enter new avatar URL:');
    
    if (newAvatarUrl && user) {
      await supabase.auth.updateUser({
        data: { 
          avatar_url: newAvatarUrl,
        }
      });
      // Refresh the page to see changes
      window.location.reload();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <GlassPanel>
        <h2 className="text-xl font-semibold mb-4">User Profile</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleChangeAvatar}
            className="btn-liquid-glass"
          >
            Change Avatar
          </button>
        </div>
      </GlassPanel>
    </div>
  );
};

export default SettingsPage;