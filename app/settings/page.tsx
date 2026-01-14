'use client';

import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { useNotification } from '@/components/NotificationContext';
import { db } from '@/services/db';
import { ConfirmationModal } from '@/components/ConfirmationModal';

// PKCE helper functions
const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const SettingsPage: React.FC = () => {
  const [isMeliConnected, setIsMeliConnected] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [testUser, setTestUser] = useState<any>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    const checkMeliConnection = async () => {
      try {
        const isConnected = await db.meli.checkConnection();
        setIsMeliConnected(isConnected);
      } catch (error) {
        console.error('Error checking Meli connection:', error);
      }
    };
    checkMeliConnection();
  }, []);

  const handleCreateTestUser = async () => {
    try {
      const user = await db.meli.createTestUser();
      setTestUser(user);
      showNotification('Test user created successfully!', 'success');
    } catch (error: any) {
      showNotification(error.message || 'Failed to create test user', 'error');
    }
  };

  const handleMeliDisconnect = async () => {
    try {
      await db.meli.disconnect();
      setIsMeliConnected(false);
      showNotification('Disconnected from Mercado Livre.', 'success');
    } catch (error: any) {
      showNotification(error.message || 'Failed to disconnect.', 'error');
    }
  };

  const handleMeliConnect = async () => {
    const profile = await db.auth.getUserProfile();
    if (!profile) {
      showNotification('Please log in first', 'error');
      return;
    }

    // Generate PKCE codes
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store code_verifier in cookie (will be read by callback)
    document.cookie = `meli_code_verifier=${codeVerifier}; path=/; max-age=600; SameSite=Lax`;

    const authUrl = db.meli.getAuthUrl(profile.organization_id, codeChallenge);
    window.location.href = authUrl;
  };

  const handleMeliSyncTest = async () => {
    try {
      await db.meli.syncShipments();
      showNotification('Sync successful!', 'success');
    } catch (error: any) {
      showNotification(error.message || 'Sync failed', 'error');
    }
  };

  return (
    <div className="p-6">
      <ConfirmationModal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        onConfirm={handleMeliDisconnect}
        title="Disconnect Mercado Livre"
        message="Are you sure you want to disconnect your Mercado Livre account? This will stop automatic shipment syncing."
        confirmText="Disconnect"
        isDestructive={true}
      />
      
      {testUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Test User Created</h3>
            <div className="bg-gray-900 rounded-lg p-4 space-y-3 mb-6 font-mono text-sm border border-gray-700">
              <div>
                <span className="text-gray-400 block">ID:</span>
                <span className="text-green-400 select-all">{testUser.id}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Nickname:</span>
                <span className="text-blue-400 select-all">{testUser.nickname}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Password:</span>
                <span className="text-red-400 select-all">{testUser.password}</span>
              </div>
               <div>
                <span className="text-gray-400 block">Site Status:</span>
                <span className="text-yellow-400">{testUser.site_status}</span>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-6">
              ⚠️ Save these credentials immediately. They cannot be recovered later.
            </div>
            <button 
              onClick={() => setTestUser(null)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Close & Copy Nothing
            </button>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <GlassPanel>
            <h2 className="text-xl font-semibold mb-4">Mercado Livre Integration</h2>
            <p className="text-gray-400 mb-4">
              {isMeliConnected
                ? 'Your Mercado Livre account is connected.'
                : 'Connect your Mercado Livre account to sync shipments and streamline your logistics.'}
            </p>

            <div className="flex gap-3 flex-wrap">
              {!isMeliConnected ? (
                <button
                  onClick={handleMeliConnect}
                  className="px-5 py-2 rounded-lg font-medium transition-all duration-300 backdrop-blur-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                >
                  Connect to Mercado Livre
                </button>
              ) : (
                <>
                  <button
                    onClick={handleMeliSyncTest}
                    className="px-5 py-2 rounded-lg font-medium transition-all duration-300 backdrop-blur-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                  >
                    Sync / Test Connection
                  </button>
                  <button
                    onClick={() => setIsDisconnectModalOpen(true)}
                    className="px-5 py-2 rounded-lg font-medium transition-all duration-300 backdrop-blur-md bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>

            {isMeliConnected && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-semibold mb-2">Meli Test Users</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Create test users for Mercado Livre sandbox testing. These are temporary accounts
                  provided by Meli API for development (max 10 users, expire after 60 days of inactivity).
                </p>
                <button
                  onClick={handleCreateTestUser}
                  className="px-5 py-2 rounded-lg font-medium transition-all duration-300 backdrop-blur-md bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                >
                  Create Meli Test User
                </button>
                <p className="text-gray-500 text-xs mt-2">
                  You'll receive an ID, nickname, and password. Save them immediately - they cannot be recovered!
                </p>
              </div>
            )}
        </GlassPanel>
      </div>
    </div>
  );
};

export default SettingsPage;
