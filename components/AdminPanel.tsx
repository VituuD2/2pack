import React, { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const AdminPanel = () => {
  const { users, loading } = useUsers();
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState('');

  const handleInvite = async () => {
    if (!email) return;
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
    if (error) {
      console.error('Error inviting user:', error);
      alert(`Error inviting user: ${error.message}`);
    } else {
      console.log('Invited user:', data);
      alert('Invite sent successfully!');
      setEmail('');
      // Consider refreshing the users list here
    }
  };

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
      
      {/* Invite User Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Invite User</h3>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Enter user email"
            className="flex-grow rounded-lg px-3 py-2 bg-[var(--control-bg)] border border-[var(--border-color-medium)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-1 focus:ring-[var(--ios-blue)] focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button 
            className="font-bold bg-[var(--ios-blue)] text-white py-2 px-5 rounded-lg hover:brightness-110 transition-all" 
            onClick={handleInvite}
          >
            Invite
          </button>
        </div>
      </div>
      
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
