import { Product, Shipment } from '../types';

const STORAGE_KEYS = {
  PRODUCTS: '2pack_products',
  SHIPMENTS: '2pack_shipments'
};

export const db = {
  products: {
    getAll: (): Product[] => {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    },
    add: (product: Product) => {
      const products = db.products.getAll();
      products.push(product);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    },
    delete: (id: string) => {
      const products = db.products.getAll().filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
  },
  shipments: {
    getAll: (): Shipment[] => {
      const data = localStorage.getItem(STORAGE_KEYS.SHIPMENTS);
      return data ? JSON.parse(data) : [];
    }
  }
};