'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShipmentList } from '@/components/ShipmentList';
import { db } from '@/services/db';
import { Shipment } from '@/types';
import { CheckCircle2, Link as LinkIcon, AlertCircle } from 'lucide-react';

export default function InboundPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [activeTab, setActiveTab] = useState<'open' | 'history'>('open');
  const [meliConnection, setMeliConnection] = useState<{ isConnected: boolean; sellerId?: string; nickname?: string | null } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Fetch Shipments
      const data = await db.shipments.getAll();
      setShipments(data);

      // Fetch Meli Status
      const connection = await db.meli.getConnectionDetails();
      setMeliConnection(connection);
    };
    loadData();
  }, []);

  const handleSelect = (id: string) => {
    router.push(`/picking/${id}`);
  };

  // Filter only Inbound shipments for this page
  const inboundShipments = shipments.filter(s => s.type === 'inbound');
  const openShipments = inboundShipments.filter(s => s.status !== 'completed');
  const historyShipments = inboundShipments.filter(s => s.status === 'completed');

  return (
    <>
      <header className="mb-6 px-4 pt-2">
         <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold capitalize">Inbound Management</h2>
              <p className="text-[var(--text-secondary)] text-sm">
                  Manage your fulfillment inbound shipments
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {meliConnection?.isConnected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFE600]/10 border border-[#FFE600]/20 text-[#FFE600] text-xs font-medium">
                   <div className="w-2 h-2 rounded-full bg-[#FFE600] animate-pulse" />
                   <span className="hidden sm:inline">Connected:</span>
                   <span className="font-bold">{meliConnection.nickname || meliConnection.sellerId || 'Meli Account'}</span>
                   {meliConnection.nickname && meliConnection.sellerId && (
                     <span className="text-[#FFE600]/60 text-[10px]">({meliConnection.sellerId})</span>
                   )}
                   <CheckCircle2 size={14} />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[var(--text-secondary)] text-xs">
                   <LinkIcon size={14} />
                   <span>Not Connected</span>
                </div>
              )}
            </div>
         </div>

         <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg w-fit">
            <button 
              onClick={() => setActiveTab('open')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'open' 
                  ? 'bg-[var(--button-primary-bg)] text-white shadow-lg' 
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
               Open ({openShipments.length})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'history' 
                  ? 'bg-[var(--button-primary-bg)] text-white shadow-lg' 
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
               History ({historyShipments.length})
            </button>
         </div>
      </header>

      <div className="flex-1 overflow-auto px-2 pb-4">
        {activeTab === 'open' ? (
           <ShipmentList shipments={openShipments} onSelect={handleSelect} />
        ) : (
           <ShipmentList shipments={historyShipments} onSelect={handleSelect} />
        )}
      </div>
    </>
  );
}