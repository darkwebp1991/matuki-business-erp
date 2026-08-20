import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ScrollText, Layers, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { Recipe, RecipeItem, Product, RawMaterial } from '../../types';
import { Modal } from '../common/Modal';

interface RecipeDetailModalProps {
  isOpen: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  isOpen,
  recipe,
  onClose,
  onSuccess
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    product_id: '',
    batch_size: '10',
    batch_unit: 'KG',
    description: '',
    expected_yield: '9.6',
    expected_wastage_pct: '4.0',
    labour_cost_type: 'PER_BATCH',
    labour_cost_rate: '500',
    overhead_cost_type: 'PER_BATCH',
    overhead_cost_rate: '200',
    packaging_cost: '100',
    notes: ''
  });

  const [items, setItems] = useState<Array<{
    item_type: 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'PACKAGING';
    raw_material_id?: number | null;
    semi_finished_product_id?: number | null;
    quantity: number;
    unit: string;
    notes: string;
  }>>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProducts().then(setProducts).catch(console.error);
    api.getRawMaterials().then(setRawMaterials).catch(console.error);
    api.getUnits().then(setUnits).catch(console.error);

    if (recipe) {
      const v = recipe.activeVersion || (recipe.versions && recipe.versions[0]) || null;
      setFormData({
        code: recipe.code || '',
        name: recipe.name || '',
        product_id: String(recipe.product_id || ''),
        batch_size: String(recipe.batch_size || 10),
        batch_unit: recipe.batch_unit || 'KG',
        description: recipe.description || '',
        expected_yield: String(v?.expected_yield || recipe.batch_size || 10),
        expected_wastage_pct: String(v?.expected_wastage_pct || 4),
        labour_cost_type: v?.labour_cost_type || 'PER_BATCH',
        labour_cost_rate: String(v?.labour_cost_rate || 500),
        overhead_cost_type: v?.overhead_cost_type || 'PER_BATCH',
        overhead_cost_rate: String(v?.overhead_cost_rate || 200),
        packaging_cost: String(v?.packaging_cost || 100),
        notes: v?.notes || ''
      });

      if (recipe.items) {
        setItems(recipe.items.map(i => ({
          item_type: i.item_type,
          raw_material_id: i.raw_material_id,
          semi_finished_product_id: i.semi_finished_product_id,
          quantity: Number(i.quantity) || 1,
          unit: i.unit || 'KG',
          notes: i.notes || ''
        })));
      }
    } else {
      // Default initial items
      setItems([
        { item_type: 'RAW_MATERIAL', raw_material_id: null, quantity: 8, unit: 'KG', notes: '' },
        { item_type: 'RAW_MATERIAL', raw_material_id: null, quantity: 4, unit: 'KG', notes: '' }
      ]);
    }
  }, [recipe]);

  const handleAddItem = () => {
    setItems([...items, { item_type: 'RAW_MATERIAL', raw_material_id: null, quantity: 1, unit: 'KG', notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.product_id) {
      setError('Recipe Name and Target Finished Sweet are required');
      return;
    }
    if (items.length === 0) {
      setError('At least one ingredient must be added to the recipe');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload: any = {
        ...formData,
        product_id: Number(formData.product_id),
        batch_size: Number(formData.batch_size) || 10,
        expected_yield: Number(formData.expected_yield) || Number(formData.batch_size) || 10,
        expected_wastage_pct: Number(formData.expected_wastage_pct) || 0,
        labour_cost_rate: Number(formData.labour_cost_rate) || 0,
        overhead_cost_rate: Number(formData.overhead_cost_rate) || 0,
        packaging_cost: Number(formData.packaging_cost) || 0,
        items
      };

      if (recipe) {
        // Create new version for existing recipe to preserve history!
        await api.createRecipeVersion(recipe.id, payload);
      } else {
        await api.createRecipe(payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={recipe ? `Update Recipe Version: ${recipe.name}` : 'Create New Sweets Recipe Formula'}
      subtitle={recipe ? 'Creating a new version archives the current version and preserves past batch history' : 'Define batch size, ingredients, labour wages & overhead allocation'}
      maxWidth="840px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : recipe ? 'Save New Recipe Version' : 'Create Recipe'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', borderRadius: 'var(--radius-sm)', color: '#fb7185', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Recipe Formula Name *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Standard Pure Kaju Katli Batch (10 KG)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Target Finished Product Sweet *</label>
            <select
              className="form-select"
              required
              disabled={!!recipe}
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
            >
              <option value="">Select Target Sweet</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Base Batch Size & Unit</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={formData.batch_size}
                onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })}
              />
              <select
                className="form-select"
                style={{ width: '90px' }}
                value={formData.batch_unit}
                onChange={(e) => setFormData({ ...formData, batch_unit: e.target.value })}
              >
                <option value="KG">KG</option>
                <option value="GM">GM</option>
                <option value="LTR">LTR</option>
                <option value="PCS">PCS</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Expected Net Yield ({formData.batch_unit})</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={formData.expected_yield}
              onChange={(e) => setFormData({ ...formData, expected_yield: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Expected Process Wastage (%)</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={formData.expected_wastage_pct}
              onChange={(e) => setFormData({ ...formData, expected_wastage_pct: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Karigar Wages (Labour ₹)</label>
            <input
              type="number"
              step="10"
              className="form-input"
              placeholder="e.g. 500"
              value={formData.labour_cost_rate}
              onChange={(e) => setFormData({ ...formData, labour_cost_rate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Gas / Overhead Cost (₹)</label>
            <input
              type="number"
              step="10"
              className="form-input"
              placeholder="e.g. 200"
              value={formData.overhead_cost_rate}
              onChange={(e) => setFormData({ ...formData, overhead_cost_rate: e.target.value })}
            />
          </div>
        </div>

        {/* Bill of Materials Items */}
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', margin: 0 }}>
              Ingredients & Materials (Bill of Materials)
            </h4>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
              <Plus size={14} /> Add Ingredient
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '130px 1fr 100px 90px 40px',
                  gap: '8px',
                  alignItems: 'center',
                  background: '#090e1a',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <select
                  className="form-select"
                  style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                  value={item.item_type}
                  onChange={(e) => handleItemChange(idx, 'item_type', e.target.value)}
                >
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="SEMI_FINISHED">Semi-Finished</option>
                  <option value="PACKAGING">Packaging</option>
                </select>

                {item.item_type === 'SEMI_FINISHED' ? (
                  <select
                    className="form-select"
                    style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                    value={item.semi_finished_product_id || ''}
                    onChange={(e) => handleItemChange(idx, 'semi_finished_product_id', Number(e.target.value))}
                  >
                    <option value="">Select Semi-Finished Base</option>
                    {products.filter(p => p.product_type === 'SEMI_FINISHED_PRODUCT').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="form-select"
                    style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                    value={item.raw_material_id || ''}
                    onChange={(e) => handleItemChange(idx, 'raw_material_id', Number(e.target.value))}
                  >
                    <option value="">Select Raw Material</option>
                    {rawMaterials.map(rm => (
                      <option key={rm.id} value={rm.id}>{rm.name} (Stock: {rm.current_stock} {rm.unit})</option>
                    ))}
                  </select>
                )}

                <input
                  type="number"
                  step="0.001"
                  className="form-input"
                  style={{ padding: '6px 8px', fontSize: '0.8rem', textAlign: 'right' }}
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                />

                <select
                  className="form-select"
                  style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                  value={item.unit}
                  onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                >
                  {units.map(u => (
                    <option key={u.id} value={u.symbol}>{u.symbol}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '4px' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};
