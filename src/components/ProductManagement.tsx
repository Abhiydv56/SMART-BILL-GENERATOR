import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Barcode,
  Package,
  Layers,
  Sparkles,
  X,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Product, GSTRate, Department, Language, ShopMode } from '../types';
import { formatINR } from '../utils/formatters';
import { translations, getTranslation } from '../utils/translations';

interface ProductManagementProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  departments: Department[];
  shopMode: ShopMode;
  lang: Language;
}

export const ProductManagement: React.FC<ProductManagementProps> = ({
  products,
  setProducts,
  departments,
  shopMode,
  lang,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [category, setCategory] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [price, setPrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [gstRate, setGstRate] = useState<GSTRate>(18);
  const [stock, setStock] = useState<string>('20');
  const [minStockAlert, setMinStockAlert] = useState<string>('5');
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState<Product['unit']>('Pcs');
  const [hsnCode, setHsnCode] = useState('');
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const t = (key: keyof typeof translations['en']) => getTranslation(lang, key);

  const categories = Array.from(new Set(products.map(p => p.category)));

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCat;
    return (
      matchesCat &&
      (p.name.toLowerCase().includes(q) ||
        (p.nameHi && p.nameHi.toLowerCase().includes(q)) ||
        p.barcode.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q))
    );
  });

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setNameHi('');
    setCategory(categories[0] || 'Groceries');
    setDepartmentId(departments[0]?.id || '');
    setPrice('');
    setCostPrice('');
    setGstRate(18);
    setStock('20');
    setMinStockAlert('5');
    setBarcode(`890${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setUnit('Pcs');
    setHsnCode('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setNameHi(product.nameHi || '');
    setCategory(product.category);
    setDepartmentId(product.departmentId || departments[0]?.id || '');
    setPrice(String(product.price));
    setCostPrice(product.costPrice ? String(product.costPrice) : '');
    setGstRate(product.gstRate);
    setStock(String(product.stock));
    setMinStockAlert(String(product.minStockAlert));
    setBarcode(product.barcode);
    setSku(product.sku);
    setUnit(product.unit);
    setHsnCode(product.hsnCode || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Generate random Indian EAN-13 barcode
  const handleGenerateBarcode = () => {
    const randomEAN = `890${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    setBarcode(randomEAN);
  };

  // Save product (Add or Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setFormError('Please enter a valid selling price greater than 0.');
      return;
    }

    const numStock = parseInt(stock, 10);
    const numMinStock = parseInt(minStockAlert, 10);

    if (editingProduct) {
      // Update existing
      const updated: Product = {
        ...editingProduct,
        name: name.trim(),
        nameHi: nameHi.trim() || undefined,
        category: category.trim() || 'General',
        departmentId: shopMode === 'mall' ? departmentId : undefined,
        price: numPrice,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        gstRate,
        stock: isNaN(numStock) ? 0 : numStock,
        minStockAlert: isNaN(numMinStock) ? 5 : numMinStock,
        barcode: barcode.trim() || editingProduct.barcode,
        sku: sku.trim() || editingProduct.sku,
        unit,
        hsnCode: hsnCode.trim() || undefined,
      };

      setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
      setToastMessage(`Updated ${updated.name}`);
    } else {
      // Create new
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        name: name.trim(),
        nameHi: nameHi.trim() || undefined,
        category: category.trim() || 'General',
        departmentId: shopMode === 'mall' ? departmentId : undefined,
        price: numPrice,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        gstRate,
        stock: isNaN(numStock) ? 0 : numStock,
        minStockAlert: isNaN(numMinStock) ? 5 : numMinStock,
        barcode: barcode.trim() || `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        sku: sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        unit,
        hsnCode: hsnCode.trim() || undefined,
      };

      setProducts(prev => [newProduct, ...prev]);
      setToastMessage(`Added ${newProduct.name}`);
    }

    setIsModalOpen(false);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Delete product
  const handleDeleteProduct = (productId: string, productName: string) => {
    if (window.confirm(`${t('confirmDelete')} (${productName})`)) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      setToastMessage(`Deleted ${productName}`);
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  // Quick Restock +10
  const handleQuickRestock = (productId: string) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, stock: p.stock + 10 } : p))
    );
    setToastMessage(`Restocked +10 units`);
    setTimeout(() => setToastMessage(''), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            {t('productManagement')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your retail catalog, stock levels, GST tax rates, and barcodes
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addProduct')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={t('searchProducts')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All ({products.length})
            </button>
            {categories.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === c
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Category</th>
                {shopMode === 'mall' && <th className="py-3 px-4">Department</th>}
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">GST Rate</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 font-mono">Barcode / SKU</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredProducts.map(prod => {
                const isLow = prod.stock > 0 && prod.stock <= prod.minStockAlert;
                const isOut = prod.stock <= 0;
                const dept = departments.find(d => d.id === prod.departmentId);

                return (
                  <tr key={prod.id} className="hover:bg-neutral-50/50 transition-colors">
                    
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">{prod.name}</div>
                      {prod.nameHi && (
                        <div className="text-[11px] text-neutral-500 font-hindi">{prod.nameHi}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-neutral-600">
                      {prod.category}
                    </td>

                    {/* Department (Mall mode) */}
                    {shopMode === 'mall' && (
                      <td className="py-3 px-4 text-neutral-600">
                        {dept ? dept.name : 'General'}
                      </td>
                    )}

                    {/* Price */}
                    <td className="py-3 px-4 text-right font-bold text-neutral-900 tabular-nums">
                      {formatINR(prod.price)}
                    </td>

                    {/* GST Rate */}
                    <td className="py-3 px-4 text-center tabular-nums font-semibold text-neutral-700">
                      {prod.gstRate}%
                    </td>

                    {/* Stock & Quick Restock */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={`font-bold tabular-nums ${
                            isOut
                              ? 'text-red-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-neutral-700'
                          }`}
                        >
                          {prod.stock} {prod.unit}
                        </span>
                        {isLow && (
                          <button
                            type="button"
                            onClick={() => handleQuickRestock(prod.id)}
                            className="px-1.5 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded transition-colors"
                            title="Quick Restock +10"
                          >
                            +10
                          </button>
                        )}
                        {isOut && (
                          <button
                            type="button"
                            onClick={() => handleQuickRestock(prod.id)}
                            className="px-1.5 py-0.5 text-[10px] font-bold text-red-800 bg-red-100 hover:bg-red-200 rounded transition-colors"
                            title="Restock +10"
                          >
                            +10
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Barcode & SKU */}
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                      <div>{prod.barcode}</div>
                      <div className="text-[10px] text-neutral-400">{prod.sku}</div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(prod)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
                          title={t('editProduct')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id, prod.name)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title={t('deleteProduct')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-neutral-200 overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-semibold text-neutral-900">
                  {editingProduct ? t('editProduct') : t('addProduct')}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('productName')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Parle-G Gold Biscuits 1kg"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('productNameHi')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. पार्ले-जी बिस्कुट"
                    value={nameHi}
                    onChange={e => setNameHi(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('category')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Groceries"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('sellingPrice')} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="₹ 150.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('costPrice')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="₹ 120.00"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    GST Rate % (Indian GST Slab) *
                  </label>
                  <select
                    value={gstRate}
                    onChange={e => setGstRate(parseInt(e.target.value, 10) as GSTRate)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                  >
                    <option value={0}>0% (Exempt / Nil Rated)</option>
                    <option value={5}>5% (Essential Commodities)</option>
                    <option value={12}>12% (Standard Low)</option>
                    <option value={18}>18% (Standard Retail / Electronics)</option>
                    <option value={28}>28% (Luxury / De-merit Goods)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('stockQty')} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('minStockAlert')} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minStockAlert}
                    onChange={e => setMinStockAlert(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    {t('unit')}
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as Product['unit'])}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Pcs">Pcs (Pieces)</option>
                    <option value="Kg">Kg (Kilograms)</option>
                    <option value="Gram">Gram</option>
                    <option value="Ltr">Ltr (Liters)</option>
                    <option value="Pack">Pack</option>
                    <option value="Box">Box</option>
                    <option value="Meter">Meter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    HSN Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1905, 1101"
                    value={hsnCode}
                    onChange={e => setHsnCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {shopMode === 'mall' && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      {t('department')}
                    </label>
                    <select
                      value={departmentId}
                      onChange={e => setDepartmentId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Barcode & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-neutral-700">
                      {t('barcodeSku')} *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      {t('generateBarcode')}
                    </button>
                  </div>
                  <div className="relative">
                    <Barcode className="w-4 h-4 text-neutral-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      required
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Internal SKU
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors"
                >
                  {t('saveProduct')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
