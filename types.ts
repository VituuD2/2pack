export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  title: string;
  unit_weight_kg: number;
  dimensions: Dimensions;
  image_url: string;
  created_at: string;
}

export interface ShipmentItem {
  id: string;
  sku: string;
  product: Product;
  expected_qty: number;
  scanned_qty: number;
}

export interface Shipment {
  id: string;
  meli_id: string;
  status: 'draft' | 'picking' | 'weighing' | 'completed';
  items: ShipmentItem[];
  box_tare_kg: number;
  created_at: string;
}

export type ViewState = 'dashboard' | 'picking' | 'shipments' | 'products';

export type ScanStatus = 'idle' | 'success' | 'error' | 'divergence';

export interface ScanResult {
  status: ScanStatus;
  message: string;
  scannedSku?: string;
}