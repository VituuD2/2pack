'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';
import LoginScreen from '@/components/LoginScreen';
import { Dashboard } from '@/components/Dashboard';
import { db } from '@/lib/db';
import { UserProfile } from '@/types';
import { Shipment } from '@/types';

const App: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (session) {
        setDataLoading(true);
        try {
          const profile = await db.auth.getUserProfile();
          setUserProfile(profile);
          const shipmentData = await db.shipments.getAll();
          setShipments(shipmentData);
        } finally {
          setDataLoading(false);
        }
      }
    };

    fetchData();
  }, [session]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (dataLoading && !userProfile) {
    return <LoadingScreen />;
  }

  return (
    <>
      <header className="flex justify-between items-center mb-6 px-4 pt-2">
         <div>
           <h2 className="text-2xl font-bold capitalize">Dashboard</h2>
           <p className="text-[var(--text-secondary)] text-sm">
              Overview of your warehouse activity
           </p>
         </div>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/30 rounded-full border border-[var(--border-color-medium)]">
               <div className="w-2 h-2 rounded-full bg-gray-500"></div>
               <span className="text-xs font-mono text-[var(--text-secondary)]">Meli API: Disconnected</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--aurora-1)] to-[var(--aurora-2)] flex items-center justify-center font-bold">
               OP
            </div>
         </div>
      </header>
      <div className="flex-1 overflow-auto px-2 pb-4">
        <Dashboard />
      </div>
    </>
  );
};

export default App;
