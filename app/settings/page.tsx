'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useNotification } from '@/components/NotificationContext';
import { inviteUser } from '@/app/actions/invite';

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotification();

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

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!publicUrlData) throw new Error('Could not get public URL for avatar.');

      const { error: updateUserError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrlData.publicUrl },
      });

      if (updateUserError) throw updateUserError;

      showNotification('Avatar updated successfully!', 'success');
      // Give a moment for the user to see the notification
      setTimeout(() => window.location.reload(), 1000);

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      showNotification(error.message || 'Failed to upload new avatar.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    const result = await inviteUser(inviteEmail);

    if (result.error) {
      showNotification(result.error, 'error');
    } else {
      showNotification('User invited successfully!', 'success');
      setInviteEmail('');
    }
    setIsInviting(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <GlassPanel>
          <h2 className="text-xl font-semibold mb-4">Invite User</h2>
          <form onSubmit={handleInviteUser} className="flex items-center gap-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-grow rounded-lg px-3 py-2 bg-[var(--control-bg)] border border-[var(--border-color-medium)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-1 focus:ring-[var(--ios-blue)] focus:outline-none"
              required
            />
            <button type="submit" className="font-bold bg-[var(--ios-blue)] text-white py-2 px-5 rounded-lg hover:brightness-110 transition-all" disabled={isInviting}>
              {isInviting ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
        </GlassPanel>
      </div>
    </div>
  );
};

export default SettingsPage;
