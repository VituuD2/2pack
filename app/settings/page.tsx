'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data) {
        setUser(data.user);
      }
    };
    fetchUser();
  }, []);

  const handleAvatarChangeClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!publicUrlData) {
        throw new Error('Could not get public URL for avatar.');
      }

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrlData.publicUrl,
        },
      });

      if (updateUserError) {
        throw updateUserError;
      }
      
      // Force a refresh to show the new avatar everywhere
      window.location.reload();

    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload new avatar.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <GlassPanel>
        <h2 className="text-xl font-semibold mb-4">User Profile</h2>
        <div className="flex items-center gap-6">
          <img
            src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/bottts/svg?seed=${user?.id}`}
            alt="User Avatar"
            className="w-24 h-24 rounded-full bg-gray-700 border-2 border-white/20 shadow-lg"
          />
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
              disabled={isUploading}
            />
            <button
              onClick={handleAvatarChangeClick}
              className="btn-liquid-glass"
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </button>
            <p className="text-xs text-gray-400 mt-2">PNG, JPG, or WEBP.</p>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default SettingsPage;
