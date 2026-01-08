import React, { useEffect, useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, CheckCircle, Clock, Activity, AlertTriangle } from 'lucide-react';
import { db } from '../services/db';
import AdminPanel from './AdminPanel';
import { useAuth } from '../hooks/useAuth';

export const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    itemsPerMin: 0,
    avgTime: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      const shipments = await db.shipments.getAll();
      setStats({
        pending: shipments.filter(s => s.status !== 'completed').length,
        completed: shipments.filter(s => s.status === 'completed').length,
        itemsPerMin: 0,
        avgTime: 0
      });
    };
    
    fetchStats();
  }, []);

  const isAdmin = user?.app_metadata?.roles?.includes('admin');

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassPanel className="flex items-center space-x-4">
          <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Pending Shipments</p>
            <h3 className="text-2xl font-bold text-white">{stats.pending}</h3>
          </div>
        </GlassPanel>
        
        <GlassPanel className="flex items-center space-x-4">
          <div className="p-3 rounded-full bg-green-500/20 text-green-400">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Completed Today</p>
            <h3 className="text-2xl font-bold text-white">{stats.completed}</h3>
          </div>
        </GlassPanel>

        <GlassPanel className="flex items-center space-x-4">
          <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Items / Min</p>
            <h3 className="text-2xl font-bold text-white">{stats.itemsPerMin}</h3>
          </div>
        </GlassPanel>

        <GlassPanel className="flex items-center space-x-4">
          <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Avg. Process Time</p>
            <h3 className="text-2xl font-bold text-white">{stats.avgTime}m</h3>
          </div>
        </GlassPanel>
      </div>

      {isAdmin && <AdminPanel />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassPanel className="lg:col-span-2 h-[400px] flex flex-col justify-center items-center text-center">
          <div className="bg-white/5 p-6 rounded-full mb-4">
            <Activity size={48} className="text-[var(--text-secondary)]" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Activity Data</h3>
          <p className="text-[var(--text-secondary)] max-w-md">
            The system is fresh. Once you start processing shipments from Mercado Libre, productivity trends will appear here.
          </p>
        </GlassPanel>

        <GlassPanel className="h-[400px] flex flex-col justify-center items-center text-center">
          <div className="bg-white/5 p-6 rounded-full mb-4">
             <AlertTriangle size={32} className="text-[var(--text-secondary)]" />
          </div>
           <h3 className="text-lg font-semibold mb-2">System Logs</h3>
           <p className="text-[var(--text-secondary)] text-sm">No recent activity logs found.</p>
        </GlassPanel>
      </div>
    </div>
  );
};