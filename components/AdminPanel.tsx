import React, { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const AdminPanel = () => {
  const { users, loading } = useUsers();
  const { user: currentUser } = useAuth();

  const handleGrantAdmin = async (userId: string) => {
    if (!confirm('Are you sure you want to grant admin privileges to this user?')) {
      return;
    }

    const { error } = await supabase.rpc('grant_admin_role', { p_user_id: userId });
    if (error) {
      console.error('Error granting admin:', error);
      alert(`Error granting admin role: ${error.message}`);
    } else {
      console.log('Granted admin to user:', userId);
      alert('Admin role granted successfully.');
      // Note: You might want to refresh the user list here to see the change reflected
    }
  };

  return (
    <div className="glass-panel p-6">
      <h2 className="text-xl font-bold mb-4">Admin Panel</h2>
      
      {/* All Users Section */}
      <div>
        <h3 className="text-lg font-semibold mb-2">All Users</h3>
        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-[var(--border-color-medium)]">
                <tr>
                  <th className="p-2 font-semibold text-[var(--text-secondary)]">Email</th>
                  <th className="p-2 font-semibold text-[var(--text-secondary)]">Last Sign In</th>
                  <th className="p-2 font-semibold text-[var(--text-secondary)]">Role</th>
                  <th className="p-2 font-semibold text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--border-color)]">
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${user.app_metadata?.roles?.includes('admin') ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-500/20 text-gray-300'}`}>
                        {user.app_metadata?.roles?.includes('admin') ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="p-2">
                      {currentUser && user.id !== currentUser.id && !user.app_metadata?.roles?.includes('admin') && (
                        <button
                          className="bg-[var(--button-secondary-bg)] hover:bg-white/20 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors"
                          onClick={() => handleGrantAdmin(user.id)}
                        >
                          Grant Admin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
