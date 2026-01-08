import { Product, Shipment } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { MOCK_PRODUCTS, MOCK_SHIPMENTS } from '../utils/mockData';

// In-memory storage for Demo Mode
let localProducts = [...MOCK_PRODUCTS];
let localShipments = JSON.parse(JSON.stringify(MOCK_SHIPMENTS)); // Deep copy for mutable state

export const db = {
  products: {
    getAll: async (): Promise<Product[]> => {
      if (!isSupabaseConfigured) {
        console.log('[Demo] Getting all products.');
        return new Promise(resolve => setTimeout(() => resolve([...localProducts]), 500));
      }

      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
      return data;
    },
    
    getByBarcode: async (barcode: string): Promise<Product | null> => {
      if (!isSupabaseConfigured) {
        console.log(`[Demo] Getting product by barcode: ${barcode}`);
        return localProducts.find(p => p.barcode === barcode) || null;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error here
         console.error('Error searching barcode:', error);
         throw error;
      }
      
      return data;
    },

    add: async (product: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
       if (!isSupabaseConfigured) {
        console.log('[Demo] Adding new product.');
        const newProduct = { ...product, id: new Date().toISOString(), created_at: new Date().toISOString() };
        localProducts.push(newProduct as Product);
        return newProduct as Product;
      }

      const payload = {
        sku: product.sku,
        title: product.title,
        barcode: product.barcode,
        unit_weight_kg: product.unit_weight_kg,
        image_url: product.image_url,
        dimensions: product.dimensions
      };

      const { data, error } = await supabase.from('products').insert([payload]).select().single();
      if (error) {
        console.error('Error adding product:', error);
        throw error;
      }
      return data;
    },

    delete: async (id: string): Promise<void> => {
      if (!isSupabaseConfigured) {
        console.log(`[Demo] Deleting product ${id}`);
        localProducts = localProducts.filter(p => p.id !== id);
        return;
      }

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        console.error('Error deleting product:', error);
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
        console.error('Error incrementing inventory:', error);
        throw error;
      }
    }
  },

  scans: {
    log: async (productId: string): Promise<void> => {
      if (!isSupabaseConfigured) {
        console.log(`[Demo] Scan logged for product ${productId} by demo_user`);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const operatorId = user?.id;

      if (!operatorId) {
          console.error("User not authenticated to log a scan.");
          return;
      }

      const { error } = await supabase.from('scans').insert([{
          product_id: productId,
          operator_id: operatorId
      }]);

      if (error) {
        console.error('Error logging scan:', error);
        throw error;
      }
    }
  },

  shipments: {
    getAll: async (): Promise<Shipment[]> => {
      if (!isSupabaseConfigured) {
        console.log('[Demo] Getting all shipments.');
        return new Promise(resolve => setTimeout(() => resolve([...localShipments]), 500));
      }

      const { data, error } = await supabase.from('shipments').select('*');
      if (error) {
        console.warn('Error fetching shipments:', error);
        return []; // Return empty array to avoid crashing the UI
      }
      return data as Shipment[];
    },
    update: async (shipment: Partial<Shipment> & { id: string }): Promise<void> => {
      if (!isSupabaseConfigured) {
        console.log(`[Demo] Updating shipment ${shipment.id}`);
        const index = localShipments.findIndex(s => s.id === shipment.id);
        if (index !== -1) {
            localShipments[index] = { ...localShipments[index], ...shipment };
        }
        return;
      }

      const { error } = await supabase.from('shipments').update(shipment).eq('id', shipment.id);
      if (error) {
         console.error('Error updating shipment:', error);
         throw error;
      }
    }
  }
};
