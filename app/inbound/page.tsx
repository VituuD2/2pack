'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShipmentList } from '@/components/ShipmentList';
import { db } from '@/services/db';
import { Shipment } from '@/types';

export default function InboundPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    const fetchShipments = async () => {
      const data = await db.shipments.getAll();
      setShipments(data);
    };
    fetchShipments();
  }, []);

  const handleSelect = (id: string) => {
    router.push(`/picking/${id}`);
  };

  return (
    <>
      <header className="flex justify-between items-center mb-6 px-4 pt-2">
         <div>
           <h2 className="text-2xl font-bold capitalize">Inbound</h2>
           <p className="text-[var(--text-secondary)] text-sm">
              Manage incoming shipments
           </p>
         </div>
         <div className="flex items-center gap-4">
             {/* Header Actions */}
         </div>
      </header>
      <div className="flex-1 overflow-auto px-2 pb-4">
        <ShipmentList shipments={shipments} onSelect={handleSelect} />
      </div>
    </>
  );
}