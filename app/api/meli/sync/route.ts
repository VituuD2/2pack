import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/utils/meliServer';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // 1. Verify Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) {
      console.error('Auth Error in sync:', authError);
       // Debug cookies
       const { cookies } = await import('next/headers');
       const cookieStore = cookies();
       console.log('Cookies present:', cookieStore.getAll().map(c => c.name));
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const organizationId = body.organizationId;

    if (!organizationId) {
       return NextResponse.json({ message: 'Organization ID required' }, { status: 400 });
    }

    // 2. Fetch Meli Credentials for this organization
    const { data: meliAccount, error: accountError } = await supabase
      .from('meli_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (accountError || !meliAccount) {
      return NextResponse.json({ message: 'Meli account not connected' }, { status: 400 });
    }

    // 3. Get Valid Access Token (Refresh if needed)
    const accessToken = await getValidAccessToken(organizationId, meliAccount);
    
    // 3.1 Verify Connection / User Data (Connection Test)
    // Ensures the token is valid and we can access user data
    const userCheckResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!userCheckResponse.ok) {
      const userErr = await userCheckResponse.json();
      console.error('Connection verification failed:', userErr);
      return NextResponse.json({ message: 'Connection to Mercado Livre failed. Please reconnect.', details: userErr }, { status: 401 });
    }
    
    const userData = await userCheckResponse.json();
    // Optional: Update user info in DB if needed (e.g. nickname)
    // const sellerId = userData.id; // We can use this instead of stored one

    const sellerId = meliAccount.meli_user_id;

    // --- OUTBOUND SYNC (ORDERS) ---
    // 4. Fetch Recent Orders from Meli
    const ordersUrl = `https://api.mercadolibre.com/orders/search?seller=${sellerId}&order.status=paid&sort=date_desc&limit=20`;
    
    const ordersResponse = await fetch(ordersUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!ordersResponse.ok) {
        const err = await ordersResponse.json();
        console.error('Meli API Error (Orders):', err);
        // Don't fail the whole request if orders fail, try inbounds
    } else {
      const ordersData = await ordersResponse.json();
      const orders = ordersData.results || [];
      console.log(`Found ${orders.length} orders for sync.`);

      // 5. Upsert Shipments and Items (Outbound)
      for (const order of orders) {
        const shipmentData = {
          organization_id: organizationId,
          meli_id: order.id.toString(),
          status: 'pending',
          type: 'outbound', 
          created_at: new Date(order.date_created).toISOString(),
        };

        const { data: existingShipment } = await supabaseAdmin
          .from('shipments')
          .select('id')
          .eq('meli_id', shipmentData.meli_id)
          .maybeSingle();

        let shipmentId = existingShipment?.id;

        if (!shipmentId) {
          const { data: newShipment, error: createError } = await supabaseAdmin
            .from('shipments')
            .insert(shipmentData)
            .select()
            .single();

          if (createError) {
              console.error('Error creating outbound shipment:', createError);
              continue; 
          }
          shipmentId = newShipment.id;
        }

        const items = order.order_items || [];
        for (const item of items) {
            const meliProductId = item.item.id;
            const sku = item.item.seller_sku;
            let productId: string | null = null;
            
            if (sku) {
               const { data: prod } = await supabaseAdmin
                  .from('products')
                  .select('id')
                  .eq('organization_id', organizationId)
                  .eq('sku', sku)
                  .maybeSingle();
               productId = prod?.id || null;
            }

            if (!productId) {
                 const { data: newProd, error: prodError } = await supabaseAdmin
                     .from('products')
                     .insert({
                         organization_id: organizationId,
                         sku: sku || `MELI-${meliProductId}`,
                         title: item.item.title,
                         barcode: 'UNKNOWN',
                         unit_weight_kg: 0,
                         image_url: '',
                     })
                     .select()
                     .single();
                     
                 if (!prodError) productId = newProd.id;
            }

            if (productId) {
               await supabaseAdmin.from('shipment_items').upsert({
                   shipment_id: shipmentId,
                   product_id: productId,
                   expected_qty: item.quantity,
                   scanned_qty: 0, 
               }, { onConflict: 'shipment_id, product_id' });
            }
        }
      }
    }

    // --- INBOUND SYNC (DIRECT ENDPOINT) ---
    console.log('Starting Inbound Sync (Direct API)...');
    let inboundCount = 0;

    try {
      // Try the standard fulfillment inbounds search endpoint
      // Fetching last 50 inbound shipments
      const inboundUrl = `https://api.mercadolibre.com/fulfillment/inbounds/search?seller_id=${sellerId}&limit=50&sort=date_created_desc`;
      
      const inboundRes = await fetch(inboundUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (inboundRes.ok) {
        const inboundData = await inboundRes.json();
        const inbounds = inboundData.results || [];
        console.log(`Found ${inbounds.length} inbound shipments via Direct API.`);

        for (const inbound of inbounds) {
          // Map Meli Inbound to Shipment
          const shipmentData = {
            organization_id: organizationId,
            meli_id: inbound.id.toString(),
            status: inbound.status === 'finished' ? 'completed' : 'pending', // Map statuses
            type: 'inbound',
            created_at: inbound.date_created,
          };

          // Upsert Shipment
          const { data: existingShipment } = await supabaseAdmin
            .from('shipments')
            .select('id')
            .eq('meli_id', shipmentData.meli_id)
            .maybeSingle();

          let shipmentId = existingShipment?.id;

          if (!shipmentId) {
             const { data: newShipment, error: createErr } = await supabaseAdmin
               .from('shipments')
               .insert(shipmentData)
               .select()
               .single();
             
             if (!createErr) {
               shipmentId = newShipment.id;
               inboundCount++;
               // console.log(`Created inbound shipment: ${shipmentData.meli_id}`);
             } else {
               console.error(`Error creating inbound ${shipmentData.meli_id}:`, createErr);
             }
          }

          // Optional: Sync Items for this inbound
          // We might need to call /fulfillment/inbounds/{id}/items to get details if not present in list
          // For now, let's just create the header to ensure visibility. 
          // If 'items' or 'lines' are in the response, we can sync them.
        }
      } else {
        const errText = await inboundRes.text();
        console.error('Inbound Direct API Failed:', inboundRes.status, errText);
      }

    } catch (inboundError) {
      console.error('Error syncing inbounds:', inboundError);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Synced outbound orders and ${inboundCount} inbound shipments.`,
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
