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
      const { data, error } = await supabase
        .from('shipments')
        .select('*, items:shipment_items(*)')
        .order('created_at', { ascending: false });
        
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
    },
    updateLastActive: async (): Promise<void> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('user_profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', user.id);

        if (error) {
          console.error('Failed to update last_active_at:', error);
        }
      } catch (error) {
        // Silently fail - don't break the app if this fails
        console.error('Failed to update last active:', error);
      }
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
    getAuthUrl: (organizationId: string, codeChallenge?: string) => {
      // Fallback: Se a variável de ambiente falhar, usa o ID fixo
      const envAppId = process.env.NEXT_PUBLIC_MELI_APP_ID;
      const appId = (envAppId && String(envAppId).trim() !== 'undefined' && String(envAppId).trim() !== '') 
        ? String(envAppId).trim() 
        : '8074300052363571'; 

      // Fallback: Se a URI de ambiente falhar, usa a URI fixa
      const envRedirectUri = process.env.NEXT_PUBLIC_MELI_REDIRECT_URI;
      const redirectUri = (envRedirectUri && String(envRedirectUri).trim() !== 'undefined' && String(envRedirectUri).trim() !== '')
        ? String(envRedirectUri).trim()
        : 'https://2pack-pearl.vercel.app/api/auth/meli/callback';

      console.log(`[${new Date().toLocaleTimeString()}] Meli Auth Config (Active):`, { appId, redirectUri });

      const state = organizationId;
      let url = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      if (codeChallenge) {
        url += `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
      }
      return url;
    },
    checkConnection: async (): Promise<boolean> => {
      const account = await getMeliAccount();
      return !!account;
    },

    getConnectionDetails: async () => {
      const account = await getMeliAccount();
      if (!account) return { isConnected: false };

      return {
        isConnected: true,
        sellerId: account.meli_user_id,
        nickname: account.nickname || null,
      };
    },

    syncShipments: async (): Promise<void> => {
      const profile = await getCurrentUserProfile();
      if (!profile) throw new Error("User profile not found.");

      // Chama a API Route do Next.js (Server-side) para evitar erro de CORS
      // Added credentials: 'include' to pass cookies (Supabase auth) to the server route
      const response = await fetch('/api/meli/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId: profile.organization_id }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync shipments');
      }
      
      const result = await response.json();
      console.log('Sync successful:', result);
    },

    disconnect: async (): Promise<void> => {
      const profile = await getCurrentUserProfile();
      if (!profile) throw new Error("User profile not found.");

      const response = await fetch('/api/meli/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId: profile.organization_id }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to disconnect Meli account');
      }
    },

    createTestUser: async (siteId: string = 'MLB'): Promise<any> => {
      const profile = await getCurrentUserProfile();
      if (!profile) throw new Error("User profile not found.");

      const response = await fetch('/api/meli/test-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          organizationId: profile.organization_id,
          siteId 
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create test user');
      }
      
      return await response.json();
    }
  }
};
