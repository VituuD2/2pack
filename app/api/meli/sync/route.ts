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
    const sellerId = meliAccount.meli_user_id;

    // Store user nickname for display purposes
    const meliNickname = userData.nickname || null;
    if (meliNickname && meliNickname !== meliAccount.nickname) {
      await supabaseAdmin
        .from('meli_accounts')
        .update({ nickname: meliNickname })
        .eq('organization_id', organizationId);
    }

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
                   quantity_expected: item.quantity,
                   quantity_scanned: 0, 
               }, { onConflict: 'shipment_id, product_id' });
            }
        }
      }
    }

    // --- INBOUND SYNC (FULFILLMENT SHIPMENTS) ---
    console.log('Starting Inbound Sync (Fulfillment)...');
    let inboundCount = 0;
    let stockSyncCount = 0;

    try {
      // A. Try multiple FBM/Fulfillment inbound endpoints
      // Endpoint 1: /shipments/fulfillment/inbounds
      const inboundEndpoints = [
        `https://api.mercadolibre.com/shipments/fulfillment/inbounds?seller_id=${sellerId}`,
        `https://api.mercadolibre.com/users/${sellerId}/shipping_preferences/fulfillment/inbounds`,
        `https://api.mercadolibre.com/users/${sellerId}/fbm_inbounds/search?limit=50`,
      ];

      let fbmShipments: any[] = [];

      for (const endpoint of inboundEndpoints) {
        console.log(`Trying FBM endpoint: ${endpoint}`);
        const fbmRes = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (fbmRes.ok) {
          const fbmData = await fbmRes.json();
          const results = fbmData.results || fbmData.inbounds || fbmData || [];
          if (Array.isArray(results) && results.length > 0) {
            fbmShipments = results;
            console.log(`Found ${fbmShipments.length} FBM inbound shipments from ${endpoint}`);
            break;
          } else {
            console.log(`Endpoint ${endpoint} returned empty or non-array: ${JSON.stringify(fbmData).substring(0, 200)}`);
          }
        } else {
          const errText = await fbmRes.text();
          console.log(`Endpoint ${endpoint} failed (${fbmRes.status}): ${errText.substring(0, 200)}`);
        }
      }

      if (fbmShipments.length > 0) {
        console.log(`Processing ${fbmShipments.length} FBM inbound shipments.`);

        for (const fbm of fbmShipments) {
          const meliInboundId = `FBM-${fbm.id}`;

          // Map FBM status to our status
          let status: 'pending' | 'completed' | 'draft' | 'picking' | 'weighing' = 'pending';
          if (['finished', 'delivered', 'in_warehouse'].includes(fbm.status)) {
            status = 'completed';
          } else if (['processing'].includes(fbm.status)) {
            status = 'picking';
          }

          const shipmentData = {
            organization_id: organizationId,
            meli_id: meliInboundId,
            status,
            type: 'inbound' as const,
            created_at: fbm.date_created || new Date().toISOString(),
          };

          const { data: existingShipment } = await supabaseAdmin
            .from('shipments')
            .select('id')
            .eq('meli_id', meliInboundId)
            .maybeSingle();

          let shipmentId = existingShipment?.id;

          if (!shipmentId) {
            const { data: newShipment, error: createErr } = await supabaseAdmin
              .from('shipments')
              .insert(shipmentData)
              .select()
              .single();

            if (!createErr && newShipment) {
              shipmentId = newShipment.id;
              inboundCount++;
              console.log(`Created FBM Inbound shipment: ${meliInboundId} (status: ${status})`);
            }
          } else {
            // Update status
            await supabaseAdmin
              .from('shipments')
              .update({ status })
              .eq('id', shipmentId);
          }

          // Try to get shipment details for items
          if (shipmentId && fbm.id) {
            try {
              const detailsUrl = `https://api.mercadolibre.com/fbm_inbounds/${fbm.id}`;
              const detailsRes = await fetch(detailsUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });

              if (detailsRes.ok) {
                const details = await detailsRes.json();
                const items = details.inventory_items || details.items || [];

                for (const item of items) {
                  const sku = item.seller_sku || item.sku;
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
                    const { data: newProd } = await supabaseAdmin.from('products').insert({
                      organization_id: organizationId,
                      sku: sku || `FBM-${fbm.id}-${item.inventory_id || 'unknown'}`,
                      title: item.title || item.name || 'FBM Item',
                      barcode: 'UNKNOWN',
                      unit_weight_kg: 0,
                      image_url: item.picture || '',
                    }).select().single();
                    if (newProd) productId = newProd.id;
                  }

                  if (productId) {
                    await supabaseAdmin.from('shipment_items').upsert({
                      shipment_id: shipmentId,
                      product_id: productId,
                      quantity_expected: item.quantity || item.declared_quantity || 0,
                      quantity_scanned: item.received_quantity || item.quantity || 0,
                    }, { onConflict: 'shipment_id, product_id' });
                  }
                }
              }
            } catch (detailErr) {
              console.error(`Error fetching FBM details for ${fbm.id}:`, detailErr);
            }
          }
        }
      } else {
        console.log('No FBM inbound shipments found from any endpoint.');
      }

      // B. Get Seller's Items to find Inventory IDs for stock data
      const itemsSearchRes = await fetch(`https://api.mercadolibre.com/users/${sellerId}/items/search?limit=100`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (itemsSearchRes.ok) {
        const itemsData = await itemsSearchRes.json();
        const itemIds = itemsData.results || [];
        console.log(`Found ${itemIds.length} items to check for inventory.`);

        if (itemIds.length > 0) {
          // Get Item Details (batch in groups of 20 - API limit)
          const allItemDetails: any[] = [];
          for (let i = 0; i < itemIds.length; i += 20) {
            const batch = itemIds.slice(i, i + 20);
            const itemDetailsRes = await fetch(`https://api.mercadolibre.com/items?ids=${batch.join(',')}`, {
               headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (itemDetailsRes.ok) {
              const batchDetails = await itemDetailsRes.json();
              allItemDetails.push(...batchDetails);
            }
          }

          // Log sample item to debug
          if (allItemDetails.length > 0) {
            const sampleItem = allItemDetails[0]?.body;
            console.log(`Sample item: id=${sampleItem?.id}, inventory_id=${sampleItem?.inventory_id}, shipping.logistic_type=${sampleItem?.shipping?.logistic_type}`);
          }

          // Map inventory_id to item details for later use
          const inventoryToItem = new Map<string, any>();
          const inventoryIds = new Set<string>();

          // Collect unique inventory_ids (including from variations)
          for (const itemWrapper of allItemDetails) {
            const item = itemWrapper.body;
            if (!item) continue;

            // Check main item inventory_id
            if (item.inventory_id) {
              inventoryIds.add(item.inventory_id);
              inventoryToItem.set(item.inventory_id, item);
            }

            // Check variations for inventory_ids (fulfillment items often have variations)
            if (item.variations && Array.isArray(item.variations)) {
              for (const variation of item.variations) {
                if (variation.inventory_id) {
                  inventoryIds.add(variation.inventory_id);
                  inventoryToItem.set(variation.inventory_id, {
                    ...item,
                    variation_id: variation.id,
                    seller_sku: variation.seller_custom_field || item.seller_sku
                  });
                }
              }
            }
          }

          console.log(`Found ${inventoryIds.size} unique inventory IDs (including variations).`);

          // C. NEW: Fetch current FULL stock status for each inventory
          // This is the critical endpoint that retrieves actual fulfillment data
          for (const invId of Array.from(inventoryIds)) {
            try {
              const stockUrl = `https://api.mercadolibre.com/inventories/${invId}/stock/fulfillment`;
              const stockRes = await fetch(stockUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });

              if (stockRes.ok) {
                const stockData = await stockRes.json();
                console.log(`Stock for ${invId}: total=${stockData.total}, available=${stockData.available_quantity}`);

                // Only create inbound record if there's actual stock in fulfillment
                if (stockData.total > 0) {
                  const matchingItem = inventoryToItem.get(invId);

                  // Create/update a "FULL Stock" shipment for this inventory
                  const meliInboundId = `FULL-${invId}`;

                  const shipmentData = {
                    organization_id: organizationId,
                    meli_id: meliInboundId,
                    status: 'completed' as const, // FULL stock is already received
                    type: 'inbound' as const,
                    created_at: new Date().toISOString(),
                  };

                  // Upsert the shipment
                  const { data: existingShipment } = await supabaseAdmin
                    .from('shipments')
                    .select('id')
                    .eq('meli_id', meliInboundId)
                    .maybeSingle();

                  let shipmentId = existingShipment?.id;

                  if (!shipmentId) {
                    const { data: newShipment, error: createErr } = await supabaseAdmin
                      .from('shipments')
                      .insert(shipmentData)
                      .select()
                      .single();

                    if (!createErr && newShipment) {
                      shipmentId = newShipment.id;
                      stockSyncCount++;
                      console.log(`Created FULL Stock shipment: ${meliInboundId}`);
                    }
                  } else {
                    // Update existing shipment status
                    await supabaseAdmin
                      .from('shipments')
                      .update({ status: 'completed' })
                      .eq('id', shipmentId);
                  }

                  // Link Product to shipment
                  if (shipmentId && matchingItem) {
                    const sku = matchingItem.seller_sku || matchingItem.seller_custom_field;
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
                      const { data: newProd } = await supabaseAdmin.from('products').insert({
                        organization_id: organizationId,
                        sku: sku || `MELI-${matchingItem.id}`,
                        title: matchingItem.title,
                        barcode: 'UNKNOWN',
                        unit_weight_kg: 0,
                        image_url: matchingItem.thumbnail || '',
                      }).select().single();
                      if (newProd) productId = newProd.id;
                    }

                    if (productId) {
                      await supabaseAdmin.from('shipment_items').upsert({
                        shipment_id: shipmentId,
                        product_id: productId,
                        quantity_expected: stockData.total,
                        quantity_scanned: stockData.available_quantity,
                      }, { onConflict: 'shipment_id, product_id' });
                    }
                  }
                }
              } else {
                // Log but don't fail - item may not be in fulfillment
                const errText = await stockRes.text();
                console.log(`Stock fetch for ${invId} failed (may not be in FULL): ${stockRes.status}`);
              }
            } catch (stockErr) {
              console.error(`Error fetching stock for ${invId}:`, stockErr);
            }
          }

          // D. Also fetch operations history for the last 60 days (recent activity)
          // This captures actual inbound receptions that happened recently
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 60);

          const dateTo = endDate.toISOString().split('T')[0];
          const dateFrom = startDate.toISOString().split('T')[0];

          for (const invId of Array.from(inventoryIds)) {
            try {
              // Query ALL operation types (not just INBOUND_RECEPTION)
              const opsUrl = `https://api.mercadolibre.com/stock/fulfillment/operations/search?seller_id=${sellerId}&inventory_id=${invId}&date_from=${dateFrom}&date_to=${dateTo}`;

              const opsRes = await fetch(opsUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });

              if (opsRes.ok) {
                const opsData = await opsRes.json();
                const operations = opsData.results || [];

                // Filter for INBOUND_RECEPTION operations specifically
                const inboundOps = operations.filter((op: any) => op.type === 'INBOUND_RECEPTION');

                if (inboundOps.length > 0) {
                  console.log(`Found ${inboundOps.length} inbound operations for ${invId}`);
                }

                for (const op of inboundOps) {
                  const inboundRef = op.external_references?.find((ref: any) => ref.type === 'inbound_id');
                  const meliInboundId = inboundRef ? `INB-${inboundRef.value}` : `OP-${op.id}`;

                  const shipmentData = {
                    organization_id: organizationId,
                    meli_id: meliInboundId,
                    status: 'completed' as const,
                    type: 'inbound' as const,
                    created_at: op.date_created,
                  };

                  const { data: existingInbound } = await supabaseAdmin
                    .from('shipments')
                    .select('id')
                    .eq('meli_id', meliInboundId)
                    .maybeSingle();

                  let shipmentId = existingInbound?.id;

                  if (!shipmentId) {
                    const { data: newInbound, error: createErr } = await supabaseAdmin
                      .from('shipments')
                      .insert(shipmentData)
                      .select()
                      .single();

                    if (!createErr && newInbound) {
                      shipmentId = newInbound.id;
                      inboundCount++;
                      console.log(`Created Inbound from operation: ${meliInboundId}`);
                    }
                  }

                  if (shipmentId) {
                    const matchingItem = inventoryToItem.get(invId);

                    if (matchingItem) {
                      const sku = matchingItem.seller_sku || matchingItem.seller_custom_field;
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
                        const { data: newProd } = await supabaseAdmin.from('products').insert({
                          organization_id: organizationId,
                          sku: sku || `MELI-${matchingItem.id}`,
                          title: matchingItem.title,
                          barcode: 'UNKNOWN',
                          unit_weight_kg: 0,
                          image_url: matchingItem.thumbnail || '',
                        }).select().single();
                        if (newProd) productId = newProd.id;
                      }

                      if (productId) {
                        await supabaseAdmin.from('shipment_items').upsert({
                          shipment_id: shipmentId,
                          product_id: productId,
                          quantity_expected: op.detail?.available_quantity || op.result?.total || 0,
                          quantity_scanned: op.result?.available_quantity || 0,
                        }, { onConflict: 'shipment_id, product_id' });
                      }
                    }
                  }
                }
              }
            } catch (opsErr) {
              console.error(`Error fetching operations for ${invId}:`, opsErr);
            }
          }
        }
      } else {
        console.error('Items search failed:', itemsSearchRes.status);
      }
    } catch (inboundError) {
      console.error('Error syncing inbounds:', inboundError);
    }

    return NextResponse.json({
      success: true,
      message: `Synced outbound orders, ${stockSyncCount} FULL stock items, and ${inboundCount} inbound operations.`,
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
