'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';
import { Dashboard } from '@/components/Dashboard';
import { db } from '@/services/db';
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
          // Update last active timestamp
          await db.auth.updateLastActive();
        } finally {
          setDataLoading(false);
        }
      }
    };

    fetchData();

    // Update last active every 2 minutes while the app is open
    const activityInterval = setInterval(() => {
      if (session) {
        db.auth.updateLastActive();
      }
    }, 2 * 60 * 1000);

    return () => clearInterval(activityInterval);
  }, [session]);

  if (authLoading) {
    return <LoadingScreen />;
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--aurora-1)] to-[var(--aurora-2)] flex items-center justify-center font-bold">
               {userProfile?.username?.charAt(0)?.toUpperCase() || userProfile?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {userProfile?.username && (
              <span className="text-sm text-[var(--text-secondary)]">{userProfile.username}</span>
            )}
         </div>
      </header>
      <div className="flex-1 overflow-auto px-2 pb-4">
        <Dashboard shipments={shipments} />
      </div>
    </>
  );
};

export default App;
