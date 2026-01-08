import { Product, Shipment } from '../types';
import { supabase } from './supabaseClient';

export const db = {
  products: {
    getAll: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }
      return data as Product[];
    },
    add: async (product: Product): Promise<void> => {
      const { error } = await supabase
        .from('products')
        .insert([product]);
      
      if (error) {
        console.error('Error adding product:', error);
        alert('Failed to save product');
      }
    },
    delete: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
      }
    }
  },
  shipments: {
    getAll: async (): Promise<Shipment[]> => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*');

      if (error) {
        console.error('Error fetching shipments:', error);
        return [];
      }
      return data as Shipment[];
    },
    update: async (shipment: Shipment): Promise<void> => {
      const { error } = await supabase
        .from('shipments')
        .update(shipment)
        .eq('id', shipment.id);
        
      if (error) {
         console.error('Error updating shipment:', error);
      }
    }
  }
};