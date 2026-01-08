import React, { useState, useEffect } from 'react';
import { GlassPanel } from './GlassPanel';
import { Product } from '../types';
import { db } from '../services/db';
import { Package, Plus, Trash2, Search, Save, X, Barcode, Ruler, Scale, ImageIcon } from 'lucide-react';

export const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Product> & { dimL: string, dimW: string, dimH: string }>({
    title: '',
    sku: '',
    barcode: '',
    unit_weight_kg: 0,
    image_url: '',
    dimL: '',
    dimW: '',
    dimH: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await db.products.getAll();
    setProducts(data);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await db.products.delete(id);
      loadProducts();
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.sku || !formData.barcode) {
      alert('Please fill in required fields');
      return;
    }

    const newProduct: Product = {
      id: crypto.randomUUID(),
      title: formData.title || '',
      sku: formData.sku || '',
      barcode: formData.barcode || '',
      unit_weight_kg: Number(formData.unit_weight_kg),
      image_url: formData.image_url || 'https://via.placeholder.com/150',
      created_at: new Date().toISOString(),
      dimensions: {
        length: Number(formData.dimL),
        width: Number(formData.dimW),
        height: Number(formData.dimH)
      }
    };

    await db.products.add(newProduct);
    await loadProducts();
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '', sku: '', barcode: '', unit_weight_kg: 0, image_url: '',
      dimL: '', dimW: '', dimH: ''
    });
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.includes(searchTerm)
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
           Product Catalog
        </h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-full bg-[var(--ios-blue)] text-white font-semibold flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_0_15px_rgba(10,132,255,0.3)]"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      <GlassPanel className="flex-1 flex flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="mb-6 relative">
           <input 
             type="text" 
             placeholder="Search by SKU, Name or Barcode..." 
             className="w-full bg-black/20 border border-[var(--border-color-medium)] rounded-full py-3 px-12 focus:outline-none focus:border-[var(--ios-blue)] transition-all"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={20} />
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-[var(--border-color-medium)] text-[var(--text-secondary)] font-medium text-sm">
           <div className="col-span-1">Image</div>
           <div className="col-span-4">Product Info</div>
           <div className="col-span-2">SKU / Barcode</div>
           <div className="col-span-2">Dimensions (cm)</div>
           <div className="col-span-2">Weight</div>
           <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto">
           {filteredProducts.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                <Package size={48} className="mb-4 opacity-50" />
                <p>No products found. Add your first item!</p>
             </div>
           ) : (
             filteredProducts.map(product => (
               <div key={product.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center border-b border-[var(--border-color)] hover:bg-white/5 transition-colors group">
                  <div className="col-span-1">
                    <img src={product.image_url} alt="Product" className="w-12 h-12 rounded-lg bg-black/40 object-cover border border-[var(--border-color-medium)]" />
                  </div>
                  <div className="col-span-4">
                    <h4 className="font-semibold text-white">{product.title}</h4>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <div className="text-xs bg-white/10 w-fit px-2 py-0.5 rounded text-[var(--text-secondary)]">{product.sku}</div>
                    <div className="text-xs font-mono">{product.barcode}</div>
                  </div>
                  <div className="col-span-2 text-sm text-[var(--text-secondary)]">
                    {product.dimensions?.length} x {product.dimensions?.width} x {product.dimensions?.height}
                  </div>
                  <div className="col-span-2 text-sm">
                    {product.unit_weight_kg.toFixed(3)} kg
                  </div>
                  <div className="col-span-1 text-right">
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="p-2 rounded-full hover:bg-red-500/20 hover:text-red-400 text-[var(--text-secondary)] transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
               </div>
             ))
           )}
        </div>
      </GlassPanel>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <GlassPanel className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-[var(--border-color-medium)]">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Plus className="text-[var(--ios-green)]" /> New Product
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-secondary)] hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Basic Info */}
                 <div className="space-y-4">
                    <label className="block text-sm text-[var(--text-secondary)]">Product Title *</label>
                    <input 
                      className="w-full bg-[var(--control-bg)] border border-[var(--border-color-medium)] rounded-xl p-3 focus:border-[var(--ios-blue)] outline-none" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Wireless Gaming Mouse"
                    />
                 </div>
                 <div className="space-y-4">
                    <label className="block text-sm text-[var(--text-secondary)]">Internal SKU *</label>
                    <input 
                      className="w-full bg-[var(--control-bg)] border border-[var(--border-color-medium)] rounded-xl p-3 focus:border-[var(--ios-blue)] outline-none font-mono" 
                      value={formData.sku}
                      onChange={e => setFormData({...formData, sku: e.target.value})}
                      placeholder="e.g. GAM-MSE-001"
                    />
                 </div>

                 {/* Barcode & Weight */}
                 <div className="space-y-4">
                    <label className="block text-sm text-[var(--text-secondary)] flex items-center gap-2"><Barcode size={14}/> EAN/GTIN Barcode *</label>
                    <input 
                      className="w-full bg-[var(--control-bg)] border border-[var(--border-color-medium)] rounded-xl p-3 focus:border-[var(--ios-blue)] outline-none font-mono" 
                      value={formData.barcode}
                      onChange={e => setFormData({...formData, barcode: e.target.value})}
                      placeholder="789..."
                    />
                 </div>
                 <div className="space-y-4">
                    <label className="block text-sm text-[var(--text-secondary)] flex items-center gap-2"><Scale size={14}/> Unit Weight (kg)</label>
                    <input 
                      type="number"
                      step="0.001"
                      className="w-full bg-[var(--control-bg)] border border-[var(--border-color-medium)] rounded-xl p-3 focus:border-[var(--ios-blue)] outline-none font-mono" 
                      value={formData.unit_weight_kg}
                      onChange={e => setFormData({...formData, unit_weight_kg: Number(e.target.value)})}
                    />
                 </div>

                 {/* Dimensions Group */}
                 <div className="md:col-span-2 grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                       <label className="block text-xs text-[var(--text-secondary)] flex items-center gap-1"><Ruler size={12}/> Length (cm)</label>
                       <input 
                         type="number"
                         className="w-full bg-[var(--control-bg)] border border-[var(--border-color-medium)] rounded-xl p-3 text-center outline-none"
                         value={formData.dimL}
                         onChange={e => setFormData({...formData, dimL: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-xs text-[var(--text-secondary)] flex items-center gap-1"><Ruler size={12}/> Width (cm)</label>
                       <input 
                         type="number"
                         className="w-full bg-[var(--control-bg)] border border-[var(--border-color-medium)] rounded-xl p-3 text-center outline-none"
                         value={formData.dimW}
                         onChange={e => setFormData({...formData, dimW: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-xs text-[var(--text-secondary)] flex items-center gap-1"><Ruler size={12}/> Height (cm)</label>
                       <input 
                         type="number"
                         className="w-full bg-[var(--control-bg)] border border-[var(--border-color-medium)] rounded-xl p-3 text-center outline-none"
                         value={formData.dimH}
                         onChange={e => setFormData({...formData, dimH: e.target.value})}
                       />
                    </div>
                 </div>

                 {/* Image URL */}
                 <div className="md:col-span-2 space-y-4">
                    <label className="block text-sm text-[var(--text-secondary)] flex items-center gap-2"><ImageIcon size={14}/> Image URL</label>
                    <div className="flex gap-4">
                       <input 
                         className="flex-1 bg-[var(--control-bg)] border border-[var(--border-color-medium)] rounded-xl p-3 focus:border-[var(--ios-blue)] outline-none" 
                         value={formData.image_url}
                         onChange={e => setFormData({...formData, image_url: e.target.value})}
                         placeholder="https://..."
                       />
                       <div className="w-12 h-12 rounded-lg bg-black/40 border border-[var(--border-color-medium)] overflow-hidden">
                          {formData.image_url && <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="px-6 py-3 rounded-full text-[var(--text-secondary)] hover:bg-white/5 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleSave}
                   className="px-8 py-3 rounded-full bg-[var(--ios-blue)] text-white font-bold hover:shadow-[0_0_20px_rgba(10,132,255,0.4)] transition-all flex items-center gap-2"
                 >
                   <Save size={18} /> Save Product
                 </button>
              </div>
           </GlassPanel>
        </div>
      )}
    </div>
  );
};