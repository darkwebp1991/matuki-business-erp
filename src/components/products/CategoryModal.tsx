import React, { useState, useEffect } from 'react';
import { X, Save, FolderPlus, Tag } from 'lucide-react';
import { api } from '../../api/client';
import { Category } from '../../types';

interface CategoryModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  category,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'FINISHED_PRODUCT',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        type: category.type || 'FINISHED_PRODUCT',
        description: category.description || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'FINISHED_PRODUCT',
        description: ''
      });
    }
    setError('');
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Category name is required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      if (category) {
        await api.updateCategory(category.id, {
          name: trimmedName,
          type: formData.type,
          description: formData.description.trim()
        });
      } else {
        await api.createCategory({
          name: trimmedName,
          type: formData.type,
          description: formData.description.trim()
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ padding: '12px' }}>
      <div className="modal-content" style={{ maxWidth: '480px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Modal Header */}
        <div style={{
          padding: '14px 18px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d32f2f' }}>
              <Tag size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {category ? '✏️ Edit Category (કેટેગરી સુધારો)' : '➕ Add New Category (નવી કેટેગરી ઉમેરો)'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                Organize sweets, snacks, raw materials & packaging
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px', background: '#f8fafc' }}>
          {error && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.8rem', fontWeight: 700 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Category Name */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
              Category Name * (કેટેગરીનું નામ)
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. Kaju Sweets (કાજુ મીઠાઈ) or Dry Fruits"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ fontSize: '0.86rem', padding: '8px 10px', background: '#ffffff' }}
              autoFocus
            />
          </div>

          {/* Category Type */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
              Category Classification (પ્રકાર)
            </label>
            <select
              className="form-select"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{ fontSize: '0.84rem', padding: '8px 10px', background: '#ffffff' }}
            >
              <option value="FINISHED_PRODUCT">🍬 Finished Sweet / Snack (તૈયાર મીઠાઈ / ફરસાણ)</option>
              <option value="RAW_MATERIAL">🌾 Raw Material (કાચો માલ - કાજુ, ઘી, માવો, ખાંડ)</option>
              <option value="SEMI_FINISHED">🥣 Semi-Finished Base (અર્ધ-તૈયાર માલ / પેસ્ટ / માવો)</option>
              <option value="PACKAGING">📦 Packaging & Boxes (બોક્સ / કવર / વરખ)</option>
              <option value="EXPENSE">⚡ Factory Overhead / Expense (ખર્ચ / મજૂરી / ભાડું)</option>
            </select>
          </div>

          {/* Description */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
              Description / Notes (વિગત - વૈકલ્પિક)
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="e.g. Premium Cashew based traditional sweets"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ fontSize: '0.82rem', padding: '8px 10px', background: '#ffffff', resize: 'vertical' }}
            />
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '7px 16px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Cancel (રદ કરો)
            </button>
            <button
              type="submit"
              className="btn btn-vyapar-red"
              disabled={saving}
              style={{ padding: '7px 18px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={15} />
              {saving ? 'Saving...' : category ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
