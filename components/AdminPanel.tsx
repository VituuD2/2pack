import React, { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { supabase } from '../lib/supabase';

const AdminPanel = () => {
  const { users, loading } = useUsers();
  const [email, setEmail] = useState('');

  const handleInvite = async () => {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
    if (error) {
      console.error('Error inviting user:', error);
    } else {
      console.log('Invited user:', data);
      setEmail('');
    }
  };

  const handleGrantAdmin = async (userId: string) => {
    const { error } = await supabase.rpc('grant_admin_role', { p_user_id: userId });
    if (error) {
      console.error('Error granting admin:', error);
    } else {
      console.log('Granted admin to user:', userId);
      // Note: You might want to refresh the user list here
    }
  };

  return (
    <div className="glass-panel p-6">
      <h2 className="text-xl font-bold mb-4">Admin Panel</h2>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Invite User</h3>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Enter user email"
            className="input flex-grow"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-primary" onClick={handleInvite}>
            Invite
          </button>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">All Users</h3>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="p-2">Email</th>
                <th className="p-2">Last Sign In</th>
                <th className="p-2">Role</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="p-2">{user.email}</td>
                  <td className="p-2">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</td>
                  <td className="p-2">{user.app_metadata?.roles?.includes('admin') ? 'Admin' : 'User'}</td>
                  <td className="p-2">
                    {!user.app_metadata?.roles?.includes('admin') && (
                      <button
                        className="btn-secondary"
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
        )}
      </div>
    </div>
  );
};

export default AdminPanel;