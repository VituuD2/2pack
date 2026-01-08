import React, { useState, useEffect, useCallback } from 'react';
import { GlassPanel } from './GlassPanel';
import { db } from '../services/db';
import { UserInvite } from '../types';
import { MailPlus, User, X } from 'lucide-react';

export const InviteManager: React.FC = () => {
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInvites = useCallback(async () => {
    const { data, error } = await db.invites.getAll();
    if (error) {
      setError('Could not load invites.');
    } else {
      setInvites(data || []);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      await db.invites.create(email);
      setEmail('');
      await fetchInvites(); // Refresh the list
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (inviteId: string) => {
    try {
      await db.invites.delete(inviteId);
      await fetchInvites(); // Refresh the list
    } catch (error: any) {
      setError('Failed to delete invite.');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <GlassPanel>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MailPlus className="text-[var(--aurora-1)]" />
          Manage User Invites
        </h2>
        <p className="text-[var(--text-secondary)] mt-1">Invite new operators to your organization.</p>
        
        <form onSubmit={handleInvite} className="flex gap-2 mt-4">
          <input 
            type="email"
            placeholder="Enter user email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-white/10 border border-[var(--border-color-strong)] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--border-color-strong)]"
          />
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-full font-semibold text-white bg-white/10 border border-[var(--border-color-medium)] backdrop-blur-md hover:bg-white/20 transition-all duration-300">
            {loading ? 'Sending...' : 'Invite'}
          </button>
        </form>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </GlassPanel>

      <GlassPanel className="flex-1 overflow-hidden flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Pending Invitations</h3>
        <div className="overflow-y-auto pr-2 space-y-3 flex-1">
          {invites.length === 0 && (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              <p>No pending invites.</p>
            </div>
          )}
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between p-3 rounded-xl bg-transparent border border-[var(--border-color-medium)]">
              <div className="flex items-center gap-3">
                <User size={18} className="text-[var(--text-secondary)]"/>
                <p className="font-mono text-sm">{invite.email}</p>
              </div>
              <button onClick={() => handleDelete(invite.id)} className="text-[var(--text-secondary)] hover:text-red-400">
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
};
