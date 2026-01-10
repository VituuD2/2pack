'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PickingEngine } from '@/components/PickingEngine';
import { db } from '@/services/db';
import { Shipment } from '@/types';

export default function PickingPage() {
   const { id } = useParams();
   const router = useRouter();
   const [shipment, setShipment] = useState<Shipment | null>(null);

   useEffect(() => {
      if(id && typeof id === 'string') {
          db.shipments.getAll().then(all => {
              const s = all.find(x => x.id === id);
              setShipment(s || null);
          });
      }
   }, [id]);

   const handleUpdateShipment = async (updated: Shipment) => {
      setShipment(updated);
      await db.shipments.update(updated);
   };

   const handleCloseBox = async (sid: string) => {
     if(!shipment) return;
     const updated = { ...shipment, status: 'completed' as const };
     await db.shipments.update(updated);
     alert("Box Closed Successfully! Label sent to printer.");
     router.push('/inbound');
   };

   if (!shipment) {
     return (
       <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
         Loading Shipment...
       </div>
     );
   }

   return (
     <>
        <header className="flex justify-between items-center mb-6 px-4 pt-2">
           <div>
             <h2 className="text-2xl font-bold capitalize">Picking Session</h2>
             <p className="text-[var(--text-secondary)] text-sm">
                Shipment: {shipment.id}
             </p>
           </div>
           <button 
             onClick={() => router.back()}
             className="px-4 py-2 text-sm bg-white/10 rounded-full hover:bg-white/20"
           >
             Back to List
           </button>
        </header>
        <div className="flex-1 overflow-auto px-2 pb-4">
           <PickingEngine 
             shipment={shipment}
             onUpdateShipment={handleUpdateShipment}
             onCloseBox={handleCloseBox} 
           />
        </div>
     </>
   );
}