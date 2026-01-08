'use client';

import { ProductManager } from '@/components/ProductManager';

export default function ProductsPage() {
  return (
    <>
      <header className="flex justify-between items-center mb-6 px-4 pt-2">
         <div>
           <h2 className="text-2xl font-bold capitalize">Products</h2>
           <p className="text-[var(--text-secondary)] text-sm">
              Manage your inventory master data
           </p>
         </div>
      </header>
      <div className="flex-1 overflow-auto px-2 pb-4">
        <ProductManager />
      </div>
    </>
  );
}