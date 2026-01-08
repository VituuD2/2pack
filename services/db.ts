import { Product, Shipment, Scan } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { MOCK_PRODUCTS, MOCK_SHIPMENTS } from '../utils/mockData';

// In-memory storage for Demo Mode
let localProducts = [...MOCK_PRODUCTS];
let localShipments = JSON.parse(JSON.stringify(MOCK_SHIPMENTS)); // Deep copy for mutable state

export const db = {
  products: {
    getAll: async (): Promise<Product[]> => {
      if (!isSupabaseConfigured) return new Promise(resolve => setTimeout(() => resolve([...localProducts]), 500));

      const { data, error } = await supabase.from('products').select('*');
      
      if (error) {
        console.error('Error fetching products:', error.message || JSON.stringify(error));
        return [];
      }
      return data as Product[];
    },
    
    getByBarcode: async (barcode: string): Promise<Product | null> => {
      if (!isSupabaseConfigured) {
        return localProducts.find(p => p.barcode === barcode) || null;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') {
           console.error('Error searching barcode:', error.message || JSON.stringify(error));
        }
        return null;
      }
      return data as Product;
    },

    add: async (product: Product): Promise<void> => {
      if (!isSupabaseConfigured) {
        localProducts.push(product);
        return;
      }

      const payload = {
        sku: product.sku,
        name: product.title || product.name,
        barcode: product.barcode,
        unit_weight_kg: product.unit_weight_kg,
        image_url: product.image_url
      };

      const { error } = await supabase.from('products').insert([payload]);
      if (error) {
        console.error('Error adding product:', error.message || JSON.stringify(error));
        throw error;
      }
    },

    delete: async (id: string): Promise<void> => {
      if (!isSupabaseConfigured) {
        localProducts = localProducts.filter(p => p.id !== id);
        return;
      }

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        console.error('Error deleting product:', error.message || JSON.stringify(error));
        throw error;
      }
    }
  },

  inventory: {
    increment: async (productId: string): Promise<void> => {
      if (!isSupabaseConfigured) {
        console.log(`[Demo] Inventory incremented for product ${productId}`);
        return;
      }

      const { error } = await supabase.rpc('increment_inventory', { p_product_id: productId });
      if (error) {
        console.error('Error incrementing inventory:', error.message || JSON.stringify(error));
        throw error;
      }
    }
  },

  scans: {
    log: async (productId: string, operatorId: string): Promise<void> => {
      if (!isSupabaseConfigured) {
        console.log(`[Demo] Scan logged for product ${productId} by ${operatorId}`);
        return;
      }

      const { error } = await supabase.from('scans').insert([{
          product_id: productId,
          operator_id: operatorId,
          scanned_at: new Date().toISOString()
      }]);

      if (error) {
        console.error('Error logging scan:', error.message || JSON.stringify(error));
      }
    }
  },

  shipments: {
    getAll: async (): Promise<Shipment[]> => {
      if (!isSupabaseConfigured) return new Promise(resolve => setTimeout(() => resolve([...localShipments]), 500));

      const { data, error } = await supabase.from('shipments').select('*');
      if (error) {
        console.warn('Error fetching shipments:', error.message || JSON.stringify(error));
        return [];
      }
      return data as Shipment[];
    },
    update: async (shipment: Shipment): Promise<void> => {
      if (!isSupabaseConfigured) {
        const index = localShipments.findIndex(s => s.id === shipment.id);
        if (index !== -1) localShipments[index] = shipment;
        return;
      }

      const { error } = await supabase.from('shipments').update(shipment).eq('id', shipment.id);
      if (error) {
         console.error('Error updating shipment:', error.message || JSON.stringify(error));
      }
    }
  }
};