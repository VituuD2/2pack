import React, { useState, useEffect } from 'react';
import { AuroraBackground } from './components/AuroraBackground';
import { Dashboard } from './components/Dashboard';
import { ShipmentList } from './components/ShipmentList';
import { PickingEngine } from './components/PickingEngine';
import { ProductManager } from './components/ProductManager';
import { LayoutDashboard, Box, Settings, LogOut, ScanLine, PackageSearch } from 'lucide-react';
import { ViewState, Shipment } from './types';
import { db } from './services/db';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(null);

  useEffect(() => {
    // Load real data from DB asynchronously
    const fetchShipments = async () => {
      const data = await db.shipments.getAll();
      setShipments(data);
    };
    fetchShipments();
  }, [currentView]); // Refresh when view changes

  const activeShipment = shipments.find(s => s.id === activeShipmentId);

  const handleShipmentSelect = (id: string) => {
    setActiveShipmentId(id);
    setCurrentView('picking');
  };

  const handleUpdateShipment = async (updated: Shipment) => {
    // Optimistic update locally
    setShipments(prev => prev.map(s => s.id === updated.id ? updated : s));
    
    // Persist to DB
    await db.shipments.update(updated);
  };

  const handleCloseBox = async (id: string) => {
    const shipment = shipments.find(s => s.id === id);
    if (shipment) {
      const updated = { ...shipment, status: 'completed' as const };
      
      // Update local state
      setShipments(prev => prev.map(s => s.id === id ? updated : s));
      
      // Update DB
      await db.shipments.update(updated);
      
      alert("Box Closed Successfully! Printing Label...");
      setCurrentView('dashboard');
      setActiveShipmentId(null);
    }
  };

  const NavButton: React.FC<{ view: ViewState; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button 
      onClick={() => {
        setActiveShipmentId(null);
        setCurrentView(view);
      }}
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${
        currentView === view 
        ? 'bg-[var(--glass-panel-bg)] border border-[var(--border-color-strong)] text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
        : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden text-[var(--text-primary)]">
      <AuroraBackground />

      {/* Sidebar */}
      <aside className="w-64 flex flex-col p-6 glass-panel-border m-4 mr-0 rounded-2xl z-10 bg-black/40">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="p-2 bg-[var(--aurora-1)] rounded-lg">
            <ScanLine size={24} className="text-white" />
          </div>
          <div>
             <h1 className="font-bold text-lg leading-tight">2pack</h1>
             <p className="text-xs text-[var(--text-secondary)]">WMS Lite</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavButton view="dashboard" icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          <NavButton view="shipments" icon={<Box size={20}/>} label="Inbound" />
          <NavButton view="products" icon={<PackageSearch size={20}/>} label="Products" />
        </nav>

        <div className="pt-6 border-t border-[var(--border-color-medium)] space-y-2">
          <button className="flex items-center gap-3 w-full p-3 text-[var(--text-secondary)] hover:text-white">
            <Settings size={20} /> <span>Settings</span>
          </button>
          <button className="flex items-center gap-3 w-full p-3 text-red-400 hover:text-red-300">
            <LogOut size={20} /> <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 h-full overflow-hidden flex flex-col relative z-0">
        <header className="flex justify-between items-center mb-6 px-4 pt-2">
           <div>
             <h2 className="text-2xl font-bold capitalize">{activeShipmentId ? 'Picking Session' : currentView}</h2>
             <p className="text-[var(--text-secondary)] text-sm">
                {activeShipmentId ? `Shipment: ${activeShipment?.meli_id}` : 
                 currentView === 'products' ? 'Manage your inventory master data' :
                 'Overview of your warehouse activity'}
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
           {currentView === 'dashboard' && <Dashboard />}
           {currentView === 'shipments' && <ShipmentList shipments={shipments} onSelect={handleShipmentSelect} />}
           {currentView === 'products' && <ProductManager />}
           {currentView === 'picking' && activeShipment && (
             <PickingEngine 
               shipment={activeShipment} 
               onUpdateShipment={handleUpdateShipment}
               onCloseBox={handleCloseBox} 
             />
           )}
        </div>
      </main>
    </div>
  );
};

export default App;