import { supabase } from '@/services/supabaseClient';
import { UserProfile, Shipment, ShipmentItem, Product, Invite, MeliAccount, Inventory } from '@/types';

// Helper to get the current user's profile, including organization_id
const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  return profile;
};

// Helper to get the Meli account for the current organization
const getMeliAccount = async (): Promise<MeliAccount | null> => {
    const profile = await getCurrentUserProfile();
    if (!profile) return null;

    const { data: meliAccount, error } = await supabase
        .from('meli_accounts')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching Meli account:', error);
        return null;
    }
    return meliAccount;
};

export const db = {
  products: {
    getAll: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data as Product[];
    },
    getByBarcode: async (barcode: string): Promise<Product | null> => {
      if (!barcode) return null;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();
      if (error) return null;
      return data as Product;
    },
    update: async (product: Partial<Product> & { id: string }): Promise<void> => {
        const { error } = await supabase.from('products').update(product).eq('id', product.id);
        if (error) throw error;
    },
    add: async (product: Omit<Product, 'id' | 'created_at' | 'organization_id'>): Promise<Product> => {
        const profile = await getCurrentUserProfile();
        if (!profile) throw new Error("User profile not found for organization context.");
        
        const { data, error } = await supabase
            .from('products')
            .insert({ ...product, organization_id: profile.organization_id })
            .select()
            .single();
            
        if (error) throw error;
        return data;
    },
    delete: async (productId: string): Promise<void> => {
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) throw error;
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
    getUserProfile: async (userId?: string): Promise<UserProfile | null> => {
      try {
        let id = userId;
        
        // Fallback: se não houver ID, busca no auth do Supabase
        if (!id) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            console.error('Failed to get current user:', userError);
            return null;
          }
          id = user.id;
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*, organization:organizations(*)')
            .eq('id', id)
            .maybeSingle();
            
        if (error) throw error;
        
        return data as UserProfile;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
    },
    signOut: async (): Promise<void> => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }
  },
  
  inbound: {
    getShipmentById: async (id: string): Promise<Shipment | null> => {
        const { data, error } = await supabase
            .from('shipments')
            .select('*, items:shipment_items(*, product:products(*))')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return data as Shipment;
    },
    updateShipmentItem: async (itemId: string, updates: Partial<ShipmentItem>) => {
        return await supabase.from('shipment_items').update(updates).eq('id', itemId);
    }
  },

  invites: {
    create: async (email: string, role: 'admin' | 'operator') => {
        const profile = await db.auth.getUserProfile();
        if (!profile) throw new Error("User profile not found for organization context.");
        
        return await supabase.from('user_invites').insert({
            email,
            role,
            organization_id: profile.organization_id,
            invited_by: profile.id
        });
    },
    getAll: async () => {
        const profile = await db.auth.getUserProfile();
        if (!profile) return { data: [], error: null };
        
        return await supabase
            .from('user_invites')
            .select('*')
            .eq('organization_id', profile.organization_id);
    },
    delete: async (inviteId: string) => {
        return await supabase.from('user_invites').delete().eq('id', inviteId);
    }
  },
  
  scans: {
    log: async (productId: string) => {
        const profile = await db.auth.getUserProfile();
        if (!profile) throw new Error("User profile not found.");

        const { error } = await supabase.from('scans').insert({
            product_id: productId,
            operator_id: profile.id
        });
        if (error) throw error;
    }
  },
  
  inventory: {
    increment: async (productId: string, amount: number = 1) => {
        const { data: existing, error: fetchError } = await supabase
            .from('inventory')
            .select('*')
            .eq('product_id', productId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
            const { error } = await supabase
                .from('inventory')
                .update({ quantity: existing.quantity + amount, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('inventory')
                .insert({
                    product_id: productId,
                    quantity: amount,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
        }
    }
  },

  meli: {
    getAuthUrl: () => {
        const appId = process.env.NEXT_PUBLIC_MELI_APP_ID;
        const redirectUri = process.env.NEXT_PUBLIC_MELI_REDIRECT_URI;
        
        if (!appId || appId === 'undefined' || !redirectUri) {
            console.error("Missing NEXT_PUBLIC_MELI_APP_ID or NEXT_PUBLIC_MELI_REDIRECT_URI");
            return "#";
        }
        const state = Math.random().toString(36).substring(7);
        return `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    },
    checkConnection: async (): Promise<boolean> => {
        const account = await getMeliAccount();
        return !!account;
    },

    syncShipments: async (): Promise<void> => {
      const meliAccount = await getMeliAccount();
      if (!meliAccount) {
          console.log('No Meli account configured for this organization.');
          return;
      }

      const response = await fetch(`https://api.mercadolibre.com/users/${meliAccount.meli_user_id}/shipments/me?status=handling`, {
          headers: { 'Authorization': `Bearer ${meliAccount.access_token}` }
      });

      if (!response.ok) {
          throw new Error('Failed to fetch shipments from Mercado Livre');
      }

      const { results: meliShipments } = await response.json();
      
      if (!meliShipments || !Array.isArray(meliShipments)) return;
      
      const profile = await db.auth.getUserProfile();
      if (!profile) throw new Error("User profile not found for organization context.");
      
      for (const meliShipment of meliShipments) {
        // Map Meli items to our internal ShipmentItem structure
        const shipmentItems: Omit<ShipmentItem, 'id' | 'product'>[] = meliShipment.order_items.map((item: any) => ({
            sku: item.item.id, // Assuming Meli item_id is our SKU
            expected_qty: item.quantity,
            scanned_qty: 0, // Default to 0 on sync
            shipment_id: meliShipment.id.toString()
        }));

        // Map Meli shipment to our internal Shipment structure
        const newShipment: Omit<Shipment, 'created_at' | 'items'> = {
          id: meliShipment.id.toString(),
          status: 'pending',
          type: 'inbound', // Or determine based on context
          tracking_code: meliShipment.tracking_number,
          estimated_arrival: new Date(meliShipment.shipping_option.estimated_delivery_time.date),
          box_tare_kg: 0, 
          organization_id: profile.organization_id
        };
        
        // Upsert shipment and its items in a transaction
        // This part is complex and needs a robust transaction logic, possibly in a stored procedure.
        console.log('Syncing shipment:', newShipment, shipmentItems);
        // await supabase.rpc('upsert_shipment_with_items', { shipment_data: newShipment, items_data: shipmentItems });
      }
    },
  }
};
