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

    // --- INBOUND SYNC (FULFILLMENT OPERATIONS) ---
    console.log('Starting Inbound Sync...');
    let inboundCount = 0;

    try {
      // A. Get Seller's Items to find Inventory IDs
      // Limit to 50 items for now to avoid timeout
      const itemsSearchRes = await fetch(`https://api.mercadolibre.com/users/${sellerId}/items/search?limit=50&status=active`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (itemsSearchRes.ok) {
        const itemsData = await itemsSearchRes.json();
        const itemIds = itemsData.results || [];
        
        if (itemIds.length > 0) {
          // B. Get Item Details (Chunked in 20s as per Meli API limits for multiget usually)
          // But here we need to call /items/{id} or /items?ids=...
          const itemDetailsRes = await fetch(`https://api.mercadolibre.com/items?ids=${itemIds.join(',')}`, {
             headers: { 'Authorization': `Bearer ${accessToken}` }
          });

          if (itemDetailsRes.ok) {
            const itemDetails = await itemDetailsRes.json();
            const inventoryIds = new Set<string>();

            // Collect unique inventory_ids
            for (const itemWrapper of itemDetails) {
              const item = itemWrapper.body;
              if (item.inventory_id) {
                inventoryIds.add(item.inventory_id);
              }
            }

            console.log(`Found ${inventoryIds.size} unique inventory IDs to check for inbounds.`);

            // C. Check Operations for each Inventory ID
            for (const invId of Array.from(inventoryIds)) {
               console.log(`Checking operations for Inventory ID: ${invId}`);
               
               // Fetch operations for 2 periods of 60 days (Current + Previous)
               for (let i = 0; i < 2; i++) {
                 const endDate = new Date();
                 endDate.setDate(endDate.getDate() - (i * 60)); // 0 or -60 days
                 
                 const startDate = new Date(endDate);
                 startDate.setDate(startDate.getDate() - 60); // -60 or -120 days
                 
                 const dateTo = endDate.toISOString().split('T')[0];
                 const dateFrom = startDate.toISOString().split('T')[0];

                 console.log(`  > Period ${i+1}: ${dateFrom} to ${dateTo}`);

                 const opsUrl = `https://api.mercadolibre.com/stock/fulfillment/operations/search?seller_id=${sellerId}&inventory_id=${invId}&date_from=${dateFrom}&date_to=${dateTo}&type=INBOUND_RECEPTION`;
                 
                 const opsRes = await fetch(opsUrl, {
                   headers: { 'Authorization': `Bearer ${accessToken}` }
                 });

                 if (opsRes.ok) {
                   const opsData = await opsRes.json();
                   const operations = opsData.results || [];
                   console.log(`    Found ${operations.length} operations.`);

                   for (const op of operations) {
                     // Map INBOUND_RECEPTION to Shipment
                     // External reference usually contains 'inbound_id'
                     const inboundRef = op.external_references?.find((ref: any) => ref.type === 'inbound_id');
                     const meliInboundId = inboundRef ? inboundRef.value : `OP-${op.id}`; // Fallback to Op ID

                     const shipmentData = {
                       organization_id: organizationId,
                       meli_id: meliInboundId,
                       status: 'pending', // You might want to map Meli status if available, but for inbound reception it's usually 'received' or 'processing'
                       type: 'inbound',
                       created_at: op.date_created,
                     };

                     // Upsert Inbound Shipment
                     const { data: existingInbound } = await supabaseAdmin
                       .from('shipments')
                       .select('id')
                       .eq('meli_id', shipmentData.meli_id)
                       .maybeSingle();

                     let shipmentId = existingInbound?.id;

                     if (!shipmentId) {
                        const { data: newInbound, error: createErr } = await supabaseAdmin
                          .from('shipments')
                          .insert(shipmentData)
                          .select()
                          .single();
                        
                        if (!createErr) {
                          shipmentId = newInbound.id;
                          inboundCount++;
                          console.log(`      Created new inbound shipment: ${shipmentData.meli_id}`);
                        } else {
                          console.error('      Error creating inbound shipment:', createErr);
                        }
                     } else {
                        // console.log(`      Shipment ${shipmentData.meli_id} already exists.`);
                     }

                     if (shipmentId) {
                       // Find Product for this Inventory ID (We need to map Inventory ID back to Product ID in our DB)
                       // We can try to find the product by the 'item_id' linked to this inventory from the previous step?
                       // Or search DB by 'meli_id' (item id) if we stored it?
                       // Currently our products table has 'sku'. Meli Item has 'seller_sku'.
                       
                       // Helper: Find product by inventory_id logic is tricky because we iterate by inventory_id here.
                       // We know the inventory_id belongs to the items we fetched earlier.
                       // Let's find the matching item from 'itemDetails' list
                       const matchingItemWrapper = itemDetails.find((w: any) => w.body.inventory_id === invId);
                       const matchingItem = matchingItemWrapper?.body;

                       if (matchingItem) {
                          const sku = matchingItem.seller_sku;
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
                          
                          // Create product if missing (Inbound usually implies we know the product)
                          if (!productId) {
                             const { data: newProd } = await supabaseAdmin.from('products').insert({
                                 organization_id: organizationId,
                                 sku: sku || `MELI-${matchingItem.id}`,
                                 title: matchingItem.title,
                                 barcode: 'UNKNOWN',
                                 unit_weight_kg: 0,
                                 image_url: '',
                             }).select().single();
                             if (newProd) productId = newProd.id;
                          }

                          if (productId) {
                             await supabaseAdmin.from('shipment_items').upsert({
                                 shipment_id: shipmentId,
                                 product_id: productId,
                                 expected_qty: op.result?.total || 0, // Total items in this operation
                                 scanned_qty: op.result?.available_quantity || 0,
                             }, { onConflict: 'shipment_id, product_id' });
                          }
                       }
                     }
                   }
                 } else {
                   console.warn(`    Failed to fetch ops for ${invId}: ${opsRes.status}`);
                 }
               } // End Date Loop
            }
          }
        }
      }
    } catch (inboundError) {
      console.error('Error syncing inbounds:', inboundError);
      // Continue without crashing
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
