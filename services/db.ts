import { Product } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { MOCK_PRODUCTS } from '../utils/mockData';

// In-memory storage for Demo Mode
let localProducts = [...MOCK_PRODUCTS];

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

      // Create a payload that matches the DB schema from your diagram
      const payload = {
        sku: product.sku,
        name: product.name,
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
        // In demo mode, we don't have a real user, so we'll use a placeholder.
        console.log(`[Demo] Scan logged for product ${productId} by demo_user`);
        return;
      }

      // When integrated with auth, the operator_id should come from the logged-in user.
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
  }
};
