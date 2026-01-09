'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Settings, LogOut, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter

// Helper function to format time since last sign-in
const timeSince = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "just now";
};

export const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lastSignIn, setLastSignIn] = useState<string>('Loading...');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter(); // Initialize the router

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data) {
        setUser(data.user);
        if (data.user.last_sign_in_at) {
          setLastSignIn(timeSince(new Date(data.user.last_sign_in_at)));
        }
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); // Redirect to login page
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 text-left w-full p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-500 border-2 border-white/20 flex-shrink-0">
            <img
                src={user?.user_metadata.avatar_url || `https://api.dicebear.com/8.x/bottts/svg?seed=${user?.id}`}
                alt="User Avatar"
                className="w-full h-full object-cover"
            />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white text-sm">{user?.user_metadata.full_name || user?.email}</p>
          <p className="text-xs text-gray-400">{lastSignIn}</p>
        </div>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full bg-[var(--glass-panel-bg)] border border-[var(--border-color-strong)] rounded-xl shadow-lg z-20">
          <div className="p-2">
            <Link href="/settings" className="flex items-center gap-3 w-full p-3 text-[var(--text-secondary)] hover:text-white rounded-lg transition-colors">
              <Settings size={20} /> <span>Settings</span>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-red-400 hover:text-red-300 rounded-lg transition-colors">
              <LogOut size={20} /> <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
