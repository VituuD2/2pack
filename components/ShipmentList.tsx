import React from 'react';
import { GlassPanel } from './GlassPanel';
import { Shipment } from '../types';
import { Truck, ChevronRight, PackageCheck, Inbox } from 'lucide-react';

interface ShipmentListProps {
  shipments: Shipment[];
  onSelect: (id: string) => void;
}

export const ShipmentList: React.FC<ShipmentListProps> = ({ shipments, onSelect }) => {
  return (
    <div className="space-y-6">
       {shipments.length === 0 ? (
          <GlassPanel className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <Inbox size={40} className="text-[var(--text-secondary)] opacity-50" />
             </div>
             <h3 className="text-xl font-bold mb-2">No Active Shipments</h3>
             <p className="text-[var(--text-secondary)] max-w-sm">
               Connect your Mercado Libre account and sync to retrieve Inbound shipments awaiting processing.
             </p>
          </GlassPanel>
       ) : (
         <div className="grid gap-4">
           {shipments.map((shp) => {
             const total = shp.items.reduce((acc, i) => acc + i.expected_qty, 0);
             const scanned = shp.items.reduce((acc, i) => acc + i.scanned_qty, 0);
             const progress = Math.round((scanned / total) * 100);

             return (
               <GlassPanel 
                  key={shp.id} 
                  className="group cursor-pointer hover:bg-white/5 transition-all flex items-center justify-between py-4"
               >
                  <div 
                    className="flex-1 flex items-center gap-4"
                    onClick={() => onSelect(shp.id)}
                  >
                     <div className={`p-3 rounded-full ${shp.status === 'completed' ? 'bg-[var(--ios-green)]/20 text-[var(--ios-green)]' : 'bg-[var(--ios-blue)]/20 text-[var(--ios-blue)]'}`}>
                        {shp.status === 'completed' ? <PackageCheck /> : <Truck />}
                     </div>
                     <div>
                        <h3 className="font-bold text-lg">#{shp.meli_id}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{new Date(shp.created_at).toLocaleDateString()}</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-8">
                     <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          shp.status === 'completed' 
                            ? 'bg-[var(--ios-green)] text-black' 
                            : 'bg-[var(--aurora-1)] text-white'
                        }`}>
                          {shp.status}
                        </span>
                     </div>
                     
                     <div className="w-32 hidden md:block">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                     </div>

                     <ChevronRight className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
                  </div>
               </GlassPanel>
             );
           })}
         </div>
       )}
    </div>
  );
};