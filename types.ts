export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface Product {
  id: string; // uuid
  sku: string;
  barcode: string;
  title: string; // mapped to 'name' in DB if necessary, keeping title for frontend consistency
  name?: string; 
  unit_weight_kg: number;
  dimensions?: Dimensions;
  image_url: string;
  created_at?: string;
  organization_id?: string; // Added for multi-tenancy
}

export interface Inventory {
  id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
}

export interface Scan {
  id: string;
  product_id: string;
  operator_id: string;
  scanned_at: string;
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
  organization_id?: string; // Added for multi-tenancy
}

export interface UserProfile {
  id: string; // Corresponds to auth.users.id
  organization_id: string;
  role: 'admin' | 'operator';
  email: string;
}

export interface UserInvite {
  id: string;
  email: string;
  organization_id: string;
  invited_by: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  email: string;
  last_sign_in_at: string;
  full_name: string;
  avatar_url: string;
  app_metadata: {
    roles?: string[];
  };
}

export type ViewState = 'dashboard' | 'shipments' | 'picking' | 'products' | 'invites' | 'admin';

export type ScanStatus = 'idle' | 'success' | 'error' | 'divergence';

export interface ScanResult {
  status: ScanStatus;
  message: string;
  scannedSku?: string;
}
