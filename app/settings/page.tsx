'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useNotification } from '@/components/NotificationContext';
import { createUser } from '@/app/actions/createUser';
import { db } from '@/services/db';

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isMeliConnected, setIsMeliConnected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchUserAndMeliStatus = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data) {
        setUser(data.user);
      }
      const isConnected = await db.meli.checkConnection();
      setIsMeliConnected(isConnected);
    };
    fetchUserAndMeliStatus();
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
      setTimeout(() => window.location.reload(), 1000);

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      showNotification(error.message || 'Failed to upload new avatar.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) return;

    setIsCreatingUser(true);
    const result = await createUser(newUserEmail, newUserPassword);

    if (result.error) {
      showNotification(result.error, 'error');
    } else {
      showNotification('User created successfully!', 'success');
      setNewUserEmail('');
      setNewUserPassword('');
    }
    setIsCreatingUser(false);
  };
  
  const handleMeliConnect = async () => {
    const userProfile = await db.auth.getUserProfile();
    if (!userProfile) {
        showNotification('Could not identify your organization. Please log in again.', 'error');
        return;
    }

    // PKCE Generation
    const generateRandomString = (length: number) => {
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let text = '';
      for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    };

    const codeVerifier = generateRandomString(128);
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    const codeChallenge = btoa(String.fromCharCode(...Array.from(new Uint8Array(hash))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Store verifier in cookie for the callback route to access
    document.cookie = `meli_code_verifier=${codeVerifier}; path=/; max-age=600; SameSite=Lax`;

    const authUrl = db.meli.getAuthUrl(userProfile.organization_id, codeChallenge);
    window.location.href = authUrl;
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
                className="font-bold bg-[var(--ios-blue)] text-white py-2 px-5 rounded-lg hover:brightness-110 transition-all"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </button>
              <p className="text-xs text-gray-400 mt-2">PNG, JPG, or WEBP.</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <h2 className="text-xl font-semibold mb-4">Create New User</h2>
          <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-lg px-3 py-2 bg-[var(--control-bg)] border border-[var(--border-color-medium)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-1 focus:ring-[var(--ios-blue)] focus:outline-none"
              required
            />
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Temporary Password"
              className="w-full rounded-lg px-3 py-2 bg-[var(--control-bg)] border border-[var(--border-color-medium)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-1 focus:ring-[var(--ios-blue)] focus:outline-none"
              required
            />
            <button type="submit" className="font-bold bg-[var(--ios-blue)] text-white py-2 px-5 rounded-lg hover:brightness-110 transition-all" disabled={isCreatingUser}>
              {isCreatingUser ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </GlassPanel>
        
        <GlassPanel>
            <h2 className="text-xl font-semibold mb-4">Mercado Livre Integration</h2>
            <p className="text-gray-400 mb-4">
              {isMeliConnected
                ? 'Your Mercado Livre account is connected.'
                : 'Connect your Mercado Livre account to sync shipments and streamline your logistics.'}
            </p>
            <button 
              onClick={handleMeliConnect} 
              className="font-bold bg-yellow-400 text-black py-2 px-5 rounded-lg hover:brightness-110 transition-all"
              disabled={isMeliConnected}
            >
              {isMeliConnected ? 'Connected' : 'Connect to Mercado Livre'}
            </button>
        </GlassPanel>
      </div>
    </div>
  );
};

export default SettingsPage;
