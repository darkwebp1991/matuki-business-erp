import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { RawMaterial } from '../../types';
import { Modal } from '../common/Modal';

interface RawMaterialModalProps {
  isOpen: boolean;
  rawMaterial: RawMaterial | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RawMaterialModal: React.FC<RawMaterialModalProps> = ({
  isOpen,
  rawMaterial,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category_id: '',
    unit: 'KG',
    current_purchase_rate: '',
    standard_rate: '',
    min_stock: '10',
    opening_stock: '0',
    default_supplier_id: '',
    gst_rate: '5',
    hsn_code: '08013210',
    active: true
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCategories('RAW_MATERIAL').then(setCategories).catch(console.error);
    api.getSuppliers().then(setSuppliers).catch(console.error);
    api.getUnits().then(setUnits).catch(console.error);

    if (rawMaterial) {
      setFormData({
        code: rawMaterial.code || '',
        name: rawMaterial.name || '',
        category_id: rawMaterial.category_id ? String(rawMaterial.category_id) : '',
        unit: rawMaterial.unit || 'KG',
        current_purchase_rate: String(rawMaterial.current_purchase_rate || 0),
        standard_rate: String(rawMaterial.standard_rate || 0),
        min_stock: String(rawMaterial.min_stock || 10),
        opening_stock: String(rawMaterial.opening_stock || 0),
        default_supplier_id: rawMaterial.default_supplier_id ? String(rawMaterial.default_supplier_id) : '',
        gst_rate: String(rawMaterial.gst_rate || 5),
        hsn_code: rawMaterial.hsn_code || '08013210',
        active: rawMaterial.active === 1
      });
    }
  }, [rawMaterial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Material Name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload: any = {
        ...formData,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        default_supplier_id: formData.default_supplier_id ? Number(formData.default_supplier_id) : null,
        current_purchase_rate: Number(formData.current_purchase_rate) || 0,
        standard_rate: Number(formData.standard_rate) || Number(formData.current_purchase_rate) || 0,
        min_stock: Number(formData.min_stock) || 10,
        opening_stock: Number(formData.opening_stock) || 0,
        gst_rate: Number(formData.gst_rate) || 5
      };

      if (rawMaterial) {
        await api.updateRawMaterial(rawMaterial.id, payload);
      } else {
        await api.createRawMaterial(payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save raw material');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={rawMaterial ? `Edit Material: ${rawMaterial.name}` : 'Add Raw Material'}
      subtitle="Raw materials are tracked with weighted average costing & price history"
      maxWidth="640px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : rawMaterial ? 'Update Material' : 'Save Material'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', borderRadius: 'var(--radius-sm)', color: '#fb7185', fontSize: '0.85rem', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Material Name *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Cashew Nut W320 Whole"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Material Code (SKU)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Leave blank for auto (RM-001)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Base Unit</label>
            <select
              className="form-select"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            >
              {units.map((u) => (
                <option key={u.id} value={u.symbol}>{u.name} ({u.symbol})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Current Purchase Rate (₹)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="e.g. 800.00"
              value={formData.current_purchase_rate}
              onChange={(e) => setFormData({ ...formData, current_purchase_rate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Standard Budget Rate (₹)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="e.g. 780.00"
              value={formData.standard_rate}
              onChange={(e) => setFormData({ ...formData, standard_rate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Default Supplier</label>
            <select
              className="form-select"
              value={formData.default_supplier_id}
              onChange={(e) => setFormData({ ...formData, default_supplier_id: e.target.value })}
            >
              <option value="">Select Preferred Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Minimum Stock Alert Threshold</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={formData.min_stock}
              onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
            />
          </div>

          {!rawMaterial && (
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Opening Stock Quantity</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={formData.opening_stock}
                onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
