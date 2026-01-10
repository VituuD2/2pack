import { Product, Shipment, UserProfile, UserInvite } from '@/types';
import { supabase } from '@/services/supabaseClient';

export const db = {
  products: {
    getAll: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    },
    
    getByBarcode: async (barcode: string): Promise<Product | null> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },

    add: async (product: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    delete: async (id: string): Promise<void> => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    }
  },

  inventory: {
    increment: async (productId: string): Promise<void> => {
      const { error } = await supabase.rpc('increment_inventory', { p_product_id: productId });
      if (error) throw error;
    }
  },

  scans: {
    log: async (productId: string): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      const { error } = await supabase.from('scans').insert([{
          product_id: productId,
          operator_id: user.id,
      }]);
      if (error) throw error;
    },
    logWeightDivergence: async (shipmentId: string, theoreticalWeight: number, actualWeight: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('scans').insert([{
            operator_id: user.id,
            scan_type: 'WEIGHT_DIVERGENCE',
            metadata: { shipmentId, theoreticalWeight, actualWeight }
        }]);
        if (error) console.error("Falha ao logar divergência:", error);
    }
  },

  shipments: {
    getAll: async (): Promise<Shipment[]> => {
      const { data, error } = await supabase.from('shipments').select('*');
      if (error) throw error;
      return data as Shipment[];
    },
    update: async (shipment: Partial<Shipment> & { id: string }): Promise<void> => {
      const { error } = await supabase.from('shipments').update(shipment).eq('id', shipment.id);
      if (error) throw error;
    }
  },
  
  auth: {
    // Agora aceita um userId opcional
    getUserProfile: async (userId?: string): Promise<UserProfile | null> => {
      let id = userId;
      
      // Se não passamos o ID, buscamos o usuário atual (fallback)
      if (!id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        id = user.id;
      }
  
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.warn('Perfil não encontrado para o usuário:', id);
        return null;
      }
      return data;
    },
    signOut: () => supabase.auth.signOut()
  },

  invites: {
    getAll: async () => {
        const profile = await db.auth.getUserProfile();
        if (!profile) return { data: [], error: 'Sem perfil.' };

        return await supabase
            .from('user_invites')
            .select('*')
            .eq('organization_id', profile.organization_id);
    },
    delete: async (inviteId: string) => {
        return await supabase.from('user_invites').delete().eq('id', inviteId);
    }
  }
};