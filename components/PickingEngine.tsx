import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GlassPanel } from './GlassPanel';
import { Shipment, ScanResult } from '../types';
import { db } from '../services/db';
import { supabase } from '../services/supabaseClient';
import { ScanBarcode, Box, AlertTriangle, Check, Scale } from 'lucide-react';

interface PickingEngineProps {
  shipment: Shipment;
  onCloseBox: (shipmentId: string) => void;
  onUpdateShipment: (updatedShipment: Shipment) => void;
}

export const PickingEngine: React.FC<PickingEngineProps> = ({ shipment, onCloseBox, onUpdateShipment }) => {
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle', message: 'Ready to scan...' });
  const [weightInput, setWeightInput] = useState<string>('');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [operatorId, setOperatorId] = useState<string>('00000000-0000-0000-0000-000000000000'); // Default/Fallback
  const inputRef = useRef<HTMLInputElement>(null);

  // USB Scanner Emulation (Buffer)
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    // Get current user for Scan Audit
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setOperatorId(data.user.id);
      }
    };
    getUser();
  }, []);

  // Focus keeper
  useEffect(() => {
    const keepFocus = () => inputRef.current?.focus();
    const interval = setInterval(keepFocus, 2000);
    return () => clearInterval(interval);
  }, []);

  const processBarcode = useCallback(async (barcode: string) => {
    setScanResult({ status: 'idle', message: 'Processing...' });

    try {
      // 1. Database Lookup (Verification Phase)
      const product = await db.products.getByBarcode(barcode);
      
      if (!product) {
        setScanResult({ status: 'error', message: `Unknown Barcode in DB: ${barcode}` });
        return;
      }

      // 2. Shipment Context Validation
      const itemIndex = shipment.items.findIndex(i => i.product.id === product.id || i.product.barcode === barcode);
      
      if (itemIndex === -1) {
        setScanResult({ status: 'error', message: `Item not in this Shipment: ${product.title || product.name}` });
        return;
      }

      const item = shipment.items[itemIndex];

      // 3. Divergence Control
      if (item.scanned_qty >= item.expected_qty) {
        setScanResult({ 
          status: 'divergence', 
          message: `OVERPICK: ${item.product.title || item.product.name}. Expected: ${item.expected_qty}` 
        });
        return;
      }

      // 4. EXECUTE TRANSACTIONS (The "Secure Bipagem" Flow)
      
      // A. Log the Scan (Audit)
      await db.scans.log(product.id);

      // B. Update Inventory (RPC)
      // Assuming Inbound = Incrementing stock
      await db.inventory.increment(product.id);

      // C. Update Shipment State (Visual/Session)
      const newItems = [...shipment.items];
      newItems[itemIndex] = {
        ...item,
        scanned_qty: item.scanned_qty + 1
      };

      const updatedShipment = { ...shipment, items: newItems };
      onUpdateShipment(updatedShipment);
      
      setScanResult({ 
        status: 'success', 
        message: `SCANNED: ${product.title || product.name}`,
        scannedSku: item.sku 
      });

    } catch (error) {
      console.error(error);
      setScanResult({ status: 'error', message: 'System Error during scan transaction' });
    }

  }, [shipment, onUpdateShipment, operatorId]);


  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentTime = Date.now();
    
    if (e.key === 'Enter') {
      if (barcodeBuffer.current.length > 0) {
        processBarcode(barcodeBuffer.current);
        barcodeBuffer.current = '';
        setWeightInput(''); 
      }
      return;
    }

    if (currentTime - lastKeyTime.current > 500) {
       barcodeBuffer.current = ''; 
    }

    lastKeyTime.current = currentTime;
    barcodeBuffer.current += e.key;
  }, [processBarcode]);

  // Derived state
  const totalExpected = shipment.items.reduce((acc, i) => acc + i.expected_qty, 0);
  const totalScanned = shipment.items.reduce((acc, i) => acc + i.scanned_qty, 0);
  const progress = Math.round((totalScanned / totalExpected) * 100);
  
  // Theoretical Weight Calculation
  const theoreticalWeight = shipment.items.reduce((acc, item) => {
    return acc + (item.scanned_qty * item.product.unit_weight_kg);
  }, 0) + shipment.box_tare_kg;

  const validateWeight = () => {
    const actualWeight = parseFloat(weightInput);
    if (isNaN(actualWeight)) return;

    const ratio = actualWeight / theoreticalWeight;
    // 5% Tolerance
    if (ratio >= 0.95 && ratio <= 1.05) {
       onCloseBox(shipment.id);
       setShowWeightModal(false);
    } else {
       setScanResult({ 
         status: 'error', 
         message: `WEIGHT DIVERGENCE! Exp: ${theoreticalWeight.toFixed(3)}kg, Act: ${actualWeight}kg` 
       });
    }
  };

  const getStatusColor = () => {
    switch(scanResult.status) {
      case 'success': return 'border-[var(--ios-green)] bg-[rgba(48,209,88,0.1)]';
      case 'error': return 'border-[var(--aurora-3)] bg-[rgba(190,24,93,0.1)]';
      case 'divergence': return 'border-yellow-500 bg-yellow-500/10';
      default: return 'border-[var(--border-color-medium)]';
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Header Info */}
      <GlassPanel className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Box className="text-[var(--aurora-1)]" />
            Shipment #{shipment.meli_id}
          </h2>
          <p className="text-[var(--text-secondary)]">Pick Items for Master Box</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-bold">{progress}%</p>
          <div className="w-32 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-[var(--ios-green)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </GlassPanel>

      {/* Main Scanner Area */}
      <GlassPanel className={`flex-1 flex flex-col items-center justify-center border-2 transition-all duration-300 ${getStatusColor()}`}>
        <div className="relative w-full max-w-md">
           <input 
              ref={inputRef}
              autoFocus
              className="w-full bg-black/20 border border-[var(--border-color-strong)] rounded-full py-4 px-6 text-center text-xl focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)] transition-all"
              placeholder="Scan Item Barcode..."
              onKeyDown={handleKeyDown}
              onChange={() => {}} 
              value={barcodeBuffer.current} 
           />
           <ScanBarcode className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
        </div>

        <div className="mt-8 text-center min-h-[100px]">
           {scanResult.status === 'success' && <Check size={64} className="mx-auto text-[var(--ios-green)] mb-2 animate-bounce" />}
           {scanResult.status === 'error' && <AlertTriangle size={64} className="mx-auto text-[var(--aurora-3)] mb-2 animate-pulse" />}
           {scanResult.status === 'divergence' && <AlertTriangle size={64} className="mx-auto text-yellow-500 mb-2 animate-pulse" />}
           
           <h3 className="text-2xl font-bold">{scanResult.message}</h3>
        </div>
      </GlassPanel>

      {/* Items List */}
      <GlassPanel className="flex-1 overflow-hidden flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Content Manifest</h3>
        <div className="overflow-y-auto pr-2 space-y-3 flex-1">
          {shipment.items.map((item) => (
            <div 
              key={item.id} 
              className={`flex items-center p-3 rounded-xl border ${item.sku === scanResult.scannedSku ? 'bg-white/10 border-[var(--ios-blue)]' : 'bg-transparent border-[var(--border-color-medium)]'}`}
            >
              <img src={item.product.image_url} alt="" className="w-12 h-12 rounded bg-black/50 object-cover" />
              <div className="ml-4 flex-1">
                <p className="font-medium">{item.product.title || item.product.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">{item.sku}</p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${item.scanned_qty === item.expected_qty ? 'text-[var(--ios-green)]' : 'text-white'}`}>
                  {item.scanned_qty} / {item.expected_qty}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">units</p>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Action Footer */}
      <div className="flex justify-end">
        <button 
          onClick={() => setShowWeightModal(true)}
          disabled={progress < 100}
          className={`
            px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 transition-all
            ${progress < 100 
              ? 'opacity-50 cursor-not-allowed bg-[var(--control-bg)] text-[var(--text-secondary)]' 
              : 'bg-[var(--ios-blue)] text-white hover:shadow-[0_0_20px_rgba(10,132,255,0.5)]'}
          `}
        >
          <Box /> Close Master Box
        </button>
      </div>

      {/* Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <GlassPanel className="w-full max-w-md animate-fade-in-up">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Scale className="text-[var(--aurora-1)]"/> Weight Check
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Place the closed box on the scale.
              <br/>Theoretical Weight: <span className="text-white font-mono">{theoreticalWeight.toFixed(3)} kg</span>
            </p>
            
            <input 
              type="number" 
              className="w-full bg-[var(--control-bg)] border border-[var(--border-color-strong)] rounded-xl p-4 text-center text-3xl font-mono mb-6 focus:outline-none focus:border-[var(--ios-blue)]"
              placeholder="0.000"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              step="0.001"
            />

            <div className="flex gap-4">
              <button 
                onClick={() => setShowWeightModal(false)}
                className="flex-1 py-3 rounded-full bg-transparent border border-[var(--border-color-strong)] hover:bg-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={validateWeight}
                className="flex-1 py-3 rounded-full bg-[var(--ios-green)] text-black font-bold hover:brightness-110"
              >
                Confirm
              </button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
};