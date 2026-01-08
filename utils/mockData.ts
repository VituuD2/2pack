import { Product, Shipment } from '../types';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    sku: 'TEC-001',
    barcode: '789100010001',
    title: 'Wireless Gaming Mouse RGB',
    unit_weight_kg: 0.150,
    dimensions: { length: 12, width: 6, height: 4 },
    image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=150&h=150&fit=crop',
    created_at: new Date().toISOString()
  },
  {
    id: 'p2',
    sku: 'TEC-002',
    barcode: '789100010002',
    title: 'Mechanical Keyboard 60%',
    unit_weight_kg: 0.850,
    dimensions: { length: 30, width: 10, height: 4 },
    image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b91add1?w=150&h=150&fit=crop',
    created_at: new Date().toISOString()
  },
  {
    id: 'p3',
    sku: 'HOM-055',
    barcode: '789100010003',
    title: 'Smart LED Bulb E27',
    unit_weight_kg: 0.080,
    dimensions: { length: 6, width: 6, height: 12 },
    image_url: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=150&h=150&fit=crop',
    created_at: new Date().toISOString()
  }
];

export const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: 's1',
    meli_id: '41002933',
    status: 'picking',
    box_tare_kg: 0.2,
    created_at: new Date().toISOString(),
    items: [
      { id: 'i1', sku: 'TEC-001', product: MOCK_PRODUCTS[0], expected_qty: 5, scanned_qty: 0 },
      { id: 'i2', sku: 'TEC-002', product: MOCK_PRODUCTS[1], expected_qty: 2, scanned_qty: 0 }
    ]
  },
  {
    id: 's2',
    meli_id: '41002999',
    status: 'draft',
    box_tare_kg: 0.2,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    items: [
      { id: 'i3', sku: 'HOM-055', product: MOCK_PRODUCTS[2], expected_qty: 10, scanned_qty: 0 }
    ]
  }
];