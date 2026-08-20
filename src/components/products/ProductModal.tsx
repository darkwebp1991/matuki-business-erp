import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Product } from '../../types';
import { X, Plus, Trash2, Save, Factory, DollarSign, Package, ChefHat } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { getGujaratiName } from '../../utils/gujaratiTranslation';

interface ProductModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  product,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'pricing' | 'stock' | 'manufacturing'>('pricing');

  const [formData, setFormData] = useState({
    code: '',
    barcode: '',
    name: '',
    category_id: '',
    product_type: 'FINISHED_PRODUCT',
    unit: 'KILOGRAMS (KG)',
    purchase_rate: '',
    selling_rate: '',
    wholesale_rate: '',
    min_stock: '5',
    max_stock: '200',
    gst_rate: '5',
    hsn_code: '21069099',
    opening_stock: '0',
    opening_stock_rate: '0',
    available_online: true,
    active: true
  });

  // Manufacturing Recipe BOM state
  const [loadedRecipeId, setLoadedRecipeId] = useState<number | null>(null);
  const [recipeBatchSize, setRecipeBatchSize] = useState<number>(1);
  const [recipeBatchUnit, setRecipeBatchUnit] = useState<string>('KG');
  const [rawMaterials, setRawMaterials] = useState<Array<{
    raw_material_id?: number | null;
    name: string;
    quantity: number;
    unit: string;
    rate: number;
    cost: number;
  }>>([]);

  const [additionalCosts, setAdditionalCosts] = useState<Array<{
    name: string;
    cost: number;
  }>>([]);

  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [availableRMs, setAvailableRMs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    api.getCategories().then(setCategories).catch(console.error);
    api.getUnits().then(setUnits).catch(console.error);
    api.getRawMaterials().then(setAvailableRMs).catch(console.error);

    if (product) {
      setFormData({
        code: product.code || '',
        barcode: product.barcode || '',
        name: product.name || '',
        category_id: product.category_id ? String(product.category_id) : '',
        product_type: product.product_type || 'FINISHED_PRODUCT',
        unit: product.unit || 'KILOGRAMS (KG)',
        purchase_rate: String(product.purchase_rate || 0),
        selling_rate: String(product.selling_rate || 0),
        wholesale_rate: String(product.wholesale_rate || 0),
        min_stock: String(product.min_stock || 5),
        max_stock: String(product.max_stock || 200),
        gst_rate: String(product.gst_rate || 5),
        hsn_code: product.hsn_code || '21069099',
        opening_stock: String(product.opening_stock || 0),
        opening_stock_rate: String(product.opening_stock_rate || 0),
        available_online: product.available_online !== undefined ? (product.available_online === 1 || (product.available_online as any) === true) : true,
        active: product.active === 1
      });

      // Load linked recipe for this product
      setLoadingRecipe(true);
      const fetchItemRecipe = async () => {
        try {
          let recId = product.recipe_id;
          if (!recId) {
            const allRecs = await api.getRecipes({ search: product.name });
            const match = allRecs.find((r: any) => 
              r.product_id === product.id || 
              r.name.toLowerCase().includes(product.name.toLowerCase()) ||
              product.name.toLowerCase().includes((r.product_name || '').toLowerCase())
            );
            if (match) recId = match.id;
          }

          if (recId) {
            const detail = await api.getRecipeById(recId);
            setLoadedRecipeId(detail.id);
            setRecipeBatchSize(Number(detail.batch_size) || 1);
            setRecipeBatchUnit(detail.batch_unit || 'KG');
            if (detail.items && detail.items.length > 0) {
              setRawMaterials(detail.items.map((i: any) => {
                const rate = Number(i.current_purchase_rate || i.standard_rate || i.average_purchase_rate || 0);
                const qty = Number(i.quantity) || 0;
                return {
                  raw_material_id: i.raw_material_id || null,
                  name: i.item_name || '',
                  quantity: qty,
                  unit: i.unit || 'KG',
                  rate: rate,
                  cost: Math.round(qty * rate * 100) / 100
                };
              }));
            } else {
              setRawMaterials([]);
            }
          } else {
            setLoadedRecipeId(null);
            setRawMaterials([]);
          }
        } catch (err) {
          console.error('Error fetching item recipe:', err);
          setLoadedRecipeId(null);
          setRawMaterials([]);
        } finally {
          setLoadingRecipe(false);
        }
      };

      fetchItemRecipe();
    } else {
      setLoadedRecipeId(null);
      setRecipeBatchSize(1);
      setRecipeBatchUnit('KG');
      setRawMaterials([]);
      setAdditionalCosts([]);
      setFormData({
        code: '',
        barcode: '',
        name: '',
        category_id: '',
        product_type: 'FINISHED_PRODUCT',
        unit: 'KILOGRAMS (KG)',
        purchase_rate: '',
        selling_rate: '',
        wholesale_rate: '',
        min_stock: '5',
        max_stock: '200',
        gst_rate: '5',
        hsn_code: '21069099',
        opening_stock: '0',
        opening_stock_rate: '0',
        available_online: true,
        active: true
      });
    }
  }, [product, isOpen]);

  const handleRawChange = (index: number, field: string, value: any) => {
    const updated = [...rawMaterials];
    const item = { ...updated[index], [field]: value };
    
    // If selected an existing raw material from suggestions/matching
    if (field === 'name') {
      const match = availableRMs.find(rm => rm.name.toLowerCase() === String(value).toLowerCase());
      if (match) {
        item.raw_material_id = match.id;
        item.unit = match.unit || item.unit;
        item.rate = Number(match.current_purchase_rate || match.standard_rate || 0);
      }
    }

    item.cost = Math.round(Number(item.quantity || 0) * Number(item.rate || 0) * 100) / 100;
    updated[index] = item;
    setRawMaterials(updated);
  };

  const handleAddRaw = () => {
    setRawMaterials([...rawMaterials, { name: '', quantity: 1, unit: 'KG', rate: 0, cost: 0 }]);
  };

  const handleRemoveRaw = (index: number) => {
    setRawMaterials(rawMaterials.filter((_, i) => i !== index));
  };

  const handleAddCost = () => {
    setAdditionalCosts([...additionalCosts, { name: 'Electricity / Gas Cost', cost: 20 }]);
  };

  const handleRemoveCost = (index: number) => {
    setAdditionalCosts(additionalCosts.filter((_, i) => i !== index));
  };

  // Calculations for Manufacturing BOM tab
  const totalRawCost = rawMaterials.reduce((sum, r) => sum + Number(r.cost || 0), 0);
  const totalAddCost = additionalCosts.reduce((sum, c) => sum + Number(c.cost || 0), 0);
  const totalBOMCost = totalRawCost + totalAddCost;
  const bomCostPerKg = recipeBatchSize > 0 ? totalBOMCost / recipeBatchSize : totalBOMCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Item Name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const calculatedPurchase = bomCostPerKg > 0 ? Math.round(bomCostPerKg * 100) / 100 : (Number(formData.purchase_rate) || 0);

      const payload: any = {
        ...formData,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        purchase_rate: calculatedPurchase,
        selling_rate: Number(formData.selling_rate) || 0,
        wholesale_rate: Number(formData.wholesale_rate) || 0,
        min_stock: Number(formData.min_stock) || 5,
        max_stock: Number(formData.max_stock) || 200,
        gst_rate: Number(formData.gst_rate) || 5,
        opening_stock: Number(formData.opening_stock) || 0,
        opening_stock_rate: Number(formData.opening_stock_rate) || calculatedPurchase
      };

      let targetProduct = product;
      if (product) {
        targetProduct = await api.updateProduct(product.id, payload);
      } else {
        targetProduct = await api.createProduct(payload);
      }

      // Save / Update Recipe Formulation in Database permanently
      if (rawMaterials.length > 0 && targetProduct) {
        const recipePayload = {
          name: `${formData.name} Recipe`,
          product_id: targetProduct.id,
          batch_size: recipeBatchSize || 1,
          batch_unit: recipeBatchUnit || 'KG',
          items: rawMaterials.map(rm => ({
            raw_material_id: rm.raw_material_id || null,
            name: rm.name,
            quantity: Number(rm.quantity) || 0,
            unit: rm.unit || 'KG',
            rate: Number(rm.rate) || 0
          }))
        };

        if (loadedRecipeId) {
          await api.updateRecipe(loadedRecipeId, recipePayload);
        } else {
          await api.createRecipe(recipePayload);
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!window.confirm(`Are you sure you want to delete item "${product.name}" (${product.code})?`)) return;

    try {
      setSaving(true);
      await api.deleteProduct(product.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ padding: '8px' }}>
      <div className="modal-content" style={{ maxWidth: '850px', width: '96%', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          padding: '12px 18px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {product ? `Edit Item: ${product.name}` : 'Add New Item'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto' }}>
            {error && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#dc2626', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            {/* Top Item Main Details */}
            <div style={{
              background: '#f8fafc',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #e2e8f0',
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
              gap: '10px'
            }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. AFGHANI MEVA / MOTICHUR LAADU"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Item Code / Chaski</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. AFG-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Unit</label>
                <select
                  className="form-select"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '8px' }}>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
                onClick={() => setActiveTab('pricing')}
                style={{
                  padding: '8px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'pricing' ? '2.5px solid #2563eb' : 'none',
                  color: activeTab === 'pricing' ? '#2563eb' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <DollarSign size={14} /> Pricing & Taxes
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
                onClick={() => setActiveTab('stock')}
                style={{
                  padding: '8px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'stock' ? '2.5px solid #2563eb' : 'none',
                  color: activeTab === 'stock' ? '#2563eb' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Package size={14} /> Stock & Limits
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'manufacturing' ? 'active' : ''}`}
                onClick={() => setActiveTab('manufacturing')}
                style={{
                  padding: '8px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'manufacturing' ? '2.5px solid #d97706' : 'none',
                  color: activeTab === 'manufacturing' ? '#d97706' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Factory size={14} /> 🥣 Manufacturing & Recipe ({rawMaterials.length})
              </button>
            </div>

            {/* TAB 1: PRICING & TAXES */}
            {activeTab === 'pricing' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Sales Price (MRP/KG) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input font-mono"
                    required
                    style={{ fontWeight: 800, fontSize: '1rem', color: '#15803d' }}
                    value={formData.selling_rate}
                    onChange={(e) => setFormData({ ...formData, selling_rate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Wholesale / Special Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input font-mono"
                    value={formData.wholesale_rate}
                    onChange={(e) => setFormData({ ...formData, wholesale_rate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Purchase / Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input font-mono"
                    value={totalBOMCost > 0 ? bomCostPerKg.toFixed(2) : formData.purchase_rate}
                    onChange={(e) => setFormData({ ...formData, purchase_rate: e.target.value })}
                  />
                  {totalBOMCost > 0 && (
                    <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700 }}>
                      ⚡ Auto-calculated from Recipe BOM ({formatCurrency(bomCostPerKg)}/KG)
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">GST Rate (%)</label>
                  <select
                    className="form-select"
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                  >
                    <option value="0">0% (Nil / Excluded)</option>
                    <option value="5">5% (Sweets / Snacks Standard)</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">HSN Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Barcode</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Scan or enter barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: STOCK & LIMITS */}
            {activeTab === 'stock' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Opening Stock Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input font-mono"
                    value={formData.opening_stock}
                    onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Minimum Stock Alert</label>
                  <input
                    type="number"
                    step="1"
                    className="form-input font-mono"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Maximum Stock Capacity</label>
                  <input
                    type="number"
                    step="1"
                    className="form-input font-mono"
                    value={formData.max_stock}
                    onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: MANUFACTURING RECIPE BOM */}
            {activeTab === 'manufacturing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loadingRecipe ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    Loading recipe ingredients from database...
                  </div>
                ) : (
                  <>
                    {/* Header info banner */}
                    <div style={{
                      background: '#fffbeb',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #fde68a',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.86rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ChefHat size={16} />
                          🥣 Recipe BOM Formula (કાચી સામગ્રીનું માપ)
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '2px' }}>
                          {loadedRecipeId ? `Formula linked: Recipe #${loadedRecipeId}. Changes here will permanently update manufacturing!` : 'No recipe linked yet. Add ingredients below to create permanent formula.'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#92400e' }}>Base Batch Yield:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          className="form-input"
                          style={{ width: '70px', padding: '3px 6px', textAlign: 'center', fontWeight: 800 }}
                          value={recipeBatchSize}
                          onChange={(e) => setRecipeBatchSize(Math.max(0.1, Number(e.target.value) || 1))}
                        />
                        <select
                          className="form-select"
                          style={{ width: '90px', padding: '3px 6px', fontSize: '0.8rem', fontWeight: 800, color: '#92400e' }}
                          value={recipeBatchUnit}
                          onChange={(e) => setRecipeBatchUnit(e.target.value)}
                        >
                          {units.map((u: any) => (
                            <option key={u.id} value={u.symbol || u.name}>
                              {u.symbol || u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ingredients Table */}
                    <div className="table-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30px' }}>#</th>
                            <th style={{ width: '40%' }}>RAW MATERIAL (કાચો માલ)</th>
                            <th style={{ width: '90px' }}>QTY (માપ)</th>
                            <th style={{ width: '95px' }}>UNIT (એકમ)</th>
                            <th style={{ width: '100px' }}>RATE (₹)</th>
                            <th style={{ textAlign: 'right' }}>COST (₹)</th>
                            <th style={{ width: '35px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rawMaterials.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                                No ingredients added yet. Click "+ Add Ingredient" below.
                              </td>
                            </tr>
                          ) : (
                            rawMaterials.map((r, idx) => (
                              <tr key={idx}>
                                <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{idx + 1}</td>
                                <td>
                                  <input
                                    type="text"
                                    list={`raw-list-${idx}`}
                                    className="form-input"
                                    style={{ padding: '3px 6px', fontSize: '0.8rem', fontWeight: 700 }}
                                    placeholder="e.g. KHAJUR VIP / KAJU TUKDI"
                                    value={r.name}
                                    onChange={(e) => handleRawChange(idx, 'name', e.target.value)}
                                  />
                                  <datalist id={`raw-list-${idx}`}>
                                    {availableRMs.map(rm => (
                                      <option key={rm.id} value={rm.name}>
                                        {rm.name} ({getGujaratiName(rm.name)}) - ₹{rm.current_purchase_rate || 0}
                                      </option>
                                    ))}
                                  </datalist>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                    {getGujaratiName(r.name)}
                                  </div>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    className="form-input font-mono"
                                    style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 800 }}
                                    value={r.quantity}
                                    onChange={(e) => handleRawChange(idx, 'quantity', Number(e.target.value))}
                                  />
                                </td>
                                <td>
                                  <select
                                    className="form-select"
                                    style={{ padding: '3px 6px', fontSize: '0.8rem', fontWeight: 700 }}
                                    value={r.unit || 'KG'}
                                    onChange={(e) => handleRawChange(idx, 'unit', e.target.value)}
                                  >
                                    {units.map((u: any) => {
                                      const sym = u.symbol || u.name;
                                      return (
                                        <option key={u.id} value={sym}>
                                          {sym} {u.name !== sym ? `(${u.name})` : ''}
                                        </option>
                                      );
                                    })}
                                    {!units.some((u: any) => (u.symbol || u.name).toUpperCase() === (r.unit || '').toUpperCase()) && r.unit && (
                                      <option value={r.unit}>{r.unit}</option>
                                    )}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    className="form-input font-mono"
                                    style={{ padding: '3px 6px', textAlign: 'right' }}
                                    value={r.rate}
                                    onChange={(e) => handleRawChange(idx, 'rate', Number(e.target.value))}
                                  />
                                </td>
                                <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                                  {formatCurrency(r.cost)}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRaw(idx)}
                                    style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                                    title="Delete row"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleAddRaw}
                        style={{ borderStyle: 'dashed', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={14} /> + Add Ingredient (નવી સામગ્રી ઉમેરો)
                      </button>

                      <div style={{
                        background: '#f8fafc',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.82rem',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'center'
                      }}>
                        <span>Total Raw Material Cost ({recipeBatchSize} {recipeBatchUnit}): <strong style={{ color: '#0f172a' }}>{formatCurrency(totalRawCost)}</strong></span>
                        <span>Cost / KG: <strong style={{ color: '#15803d', fontSize: '0.95rem' }}>{formatCurrency(bomCostPerKg)} / KG</strong></span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              {product && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleDelete}
                  disabled={saving}
                  style={{
                    background: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Delete this item"
                >
                  <Trash2 size={14} /> Delete Item
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-vyapar-blue"
              disabled={saving}
              style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={15} /> {saving ? 'Saving...' : product ? 'Update Item & Recipe' : 'Save & New'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
