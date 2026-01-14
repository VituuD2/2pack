import React from 'react';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabaseClient';
import { GlassPanel } from './GlassPanel';

// Helper function to format time ago and determine online status
const getLastSeenStatus = (lastActiveAt: string | null) => {
  if (!lastActiveAt) {
    return { status: 'offline', text: 'Never', color: 'text-gray-400' };
  }

  const lastSeen = new Date(lastActiveAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Consider "online" if last active was within 5 minutes
  if (diffMinutes < 5) {
    return { status: 'online', text: 'Online', color: 'text-green-400' };
  }

  // Format the time ago text
  let timeText: string;
  if (diffMinutes < 60) {
    timeText = `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    timeText = `${diffHours}h ago`;
  } else if (diffDays === 1) {
    timeText = '1 day ago';
  } else if (diffDays < 30) {
    timeText = `${diffDays} days ago`;
  } else {
    timeText = lastSeen.toLocaleDateString();
  }

  return { status: 'offline', text: timeText, color: 'text-gray-400' };
};

const AdminPanel = () => {
  const { users, loading, error, refetch } = useUsers();
  const { session, userProfile } = useAuth();

  // Check if current user is admin
  const isAdmin = userProfile?.role === 'admin';

  // If not admin, show access denied
  if (!loading && !isAdmin) {
    return (
      <GlassPanel className="p-6">
        <h2 className="text-xl font-bold mb-4 text-red-400">Access Denied</h2>
        <p className="text-[var(--text-secondary)]">
          You don't have permission to access the admin panel.
        </p>
      </GlassPanel>
    );
  }

  const handleGrantAdmin = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to grant admin privileges to ${userEmail}?`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('grant_admin_role', { p_user_id: userId });
      
      if (error) {
        console.error('Error granting admin:', error);
        alert(`Error granting admin role: ${error.message}`);
      } else {
        console.log('Granted admin to user:', userId);
        alert('Admin role granted successfully.');
        
        // Refetch the user list to show updated roles
        await refetch();
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      alert(`Failed to grant admin role: ${err.message}`);
    }
  };

  const handleRevokeAdmin = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to revoke admin privileges from ${userEmail}?`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('revoke_admin_role', { p_user_id: userId });
      
      if (error) {
        console.error('Error revoking admin:', error);
        alert(`Error revoking admin role: ${error.message}`);
      } else {
        console.log('Revoked admin from user:', userId);
        alert('Admin role revoked successfully.');
        
        // Refetch the user list to show updated roles
        await refetch();
      }
    } catch (err: any) {
      console.error('Unexpected error:', err);
      alert(`Failed to revoke admin role: ${err.message}`);
    }
  };

  return (
    <GlassPanel className="p-6">
      <h2 className="text-xl font-bold mb-4">Admin Panel</h2>
      
      {/* Show error if any */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
          <p className="font-semibold">Error loading users:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {/* All Users Section */}
      <div>
        <h3 className="text-lg font-semibold mb-2">All Users in Your Organization</h3>
        {loading ? (
          <div className="flex items-center gap-3 text-[var(--text-secondary)] py-4">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <p className="text-[var(--text-secondary)] py-4">No users found in your organization.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-[var(--border-color-medium)]">
                <tr>
                  <th className="p-3 font-semibold text-[var(--text-secondary)]">Email</th>
                  <th className="p-3 font-semibold text-[var(--text-secondary)]">Full Name</th>
                  <th className="p-3 font-semibold text-[var(--text-secondary)]">Status</th>
                  <th className="p-3 font-semibold text-[var(--text-secondary)]">Role</th>
                  <th className="p-3 font-semibold text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isUserAdmin = user.app_metadata?.roles?.includes('admin');
                  const isCurrentUser = session?.user?.id === user.id;

                  return (
                    <tr key={user.id} className="border-b border-[var(--border-color)]">
                      <td className="p-3">
                        {user.email}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-[var(--text-secondary)]">(You)</span>
                        )}
                      </td>
                      <td className="p-3 text-[var(--text-secondary)]">
                        {user.full_name || '—'}
                      </td>
                      <td className="p-3">
                        {(() => {
                          const { status, text, color } = getLastSeenStatus(user.last_active_at);
                          return (
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-400' : 'bg-gray-500'}`} />
                              <span className={color}>{text}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isUserAdmin 
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                              : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                          }`}
                        >
                          {isUserAdmin ? 'Admin' : 'Operator'}
                        </span>
                      </td>
                      <td className="p-3">
                        {!isCurrentUser && (
                          <div className="flex gap-2">
                            {!isUserAdmin ? (
                              <button
                                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold py-1 px-3 rounded-md text-sm transition-colors border border-purple-500/30"
                                onClick={() => handleGrantAdmin(user.id, user.email)}
                              >
                                Grant Admin
                              </button>
                            ) : (
                              <button
                                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold py-1 px-3 rounded-md text-sm transition-colors border border-red-500/30"
                                onClick={() => handleRevokeAdmin(user.id, user.email)}
                              >
                                Revoke Admin
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </GlassPanel>
  );
};

export default AdminPanel;