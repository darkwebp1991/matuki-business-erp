import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Check, AlertTriangle, ShieldCheck, Box, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { VasanMasterItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface VasanMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const VasanMasterModal: React.FC<VasanMasterModalProps> = ({
  isOpen,
  onClose,
  onUpdated
}) => {
  const [vasans, setVasans] = useState<VasanMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    gujarati_name: '',
    unit: 'PCS',
    replacement_price: '500',
    default_deposit: '0',
    total_inventory_qty: '100',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVasans = async () => {
    try {
      setLoading(true);
      const list = await api.getVasanMasterList(true);
      setVasans(list);
    } catch (err: any) {
      console.error('Error fetching Vasan list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVasans();
      handleResetForm();
    }
  }, [isOpen]);

  const handleResetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      gujarati_name: '',
      unit: 'PCS',
      replacement_price: '500',
      default_deposit: '0',
      total_inventory_qty: '100',
      notes: ''
    });
    setError(null);
  };

  const handleStartEdit = (v: VasanMasterItem) => {
    setEditingId(v.id);
    setFormData({
      name: v.name,
      gujarati_name: v.gujarati_name || '',
      unit: v.unit || 'PCS',
      replacement_price: String(v.replacement_price || 0),
      default_deposit: String(v.default_deposit || 0),
      total_inventory_qty: String(v.total_inventory_qty || 0),
      notes: v.notes || ''
    });
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter a container/vasan name in English or Gujarati');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: formData.name.trim(),
        gujarati_name: formData.gujarati_name.trim(),
        unit: formData.unit.trim(),
        replacement_price: Number(formData.replacement_price) || 0,
        default_deposit: Number(formData.default_deposit) || 0,
        total_inventory_qty: Number(formData.total_inventory_qty) || 0,
        notes: formData.notes.trim()
      };

      if (editingId) {
        await api.updateVasanMasterItem(editingId, payload);
      } else {
        await api.createVasanMasterItem(payload);
      }

      handleResetForm();
      fetchVasans();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to save Vasan details');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the Vasan price master?`)) {
      return;
    }

    try {
      await api.deleteVasanMasterItem(id);
      fetchVasans();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete Vasan item');
    }
  };

  if (!isOpen) return null;

  const filteredVasans = vasans.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    (v.gujarati_name && v.gujarati_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box size={20} color="#38bdf8" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                🥣 Utensil & Container Price Master (વાસણ કિંમત અને ડેપોઝીટ માસ્ટર)
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#cbd5e1' }}>
                Set replacement rates & missing charges for Milton boxes, trays, tapelis, and kadhais
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Split Form + Master Table */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top Form to Add / Edit */}
          <form onSubmit={handleSave} style={{
            background: editingId ? '#eff6ff' : '#f8fafc',
            border: `1.5px solid ${editingId ? '#93c5fd' : '#e2e8f0'}`,
            borderRadius: '10px',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 900, color: editingId ? '#1e40af' : '#0f172a' }}>
                {editingId ? '✏️ Edit Vasan / Container Item' : '➕ Add New Utensil / Container Type'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '10px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Item Name (English) *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sweet Tray / Kundi"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  ગુજરાતી નામ (Gujarati Name)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="દા.ત. સ્વીટ ટ્રે / કુંડી"
                  value={formData.gujarati_name}
                  onChange={e => setFormData({ ...formData, gujarati_name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Replacement / Missing Price (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  className="form-input font-mono"
                  placeholder="450"
                  value={formData.replacement_price}
                  onChange={e => setFormData({ ...formData, replacement_price: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                  Total Shop Inventory (Qty)
                </label>
                <input
                  type="number"
                  className="form-input font-mono"
                  placeholder="100"
                  value={formData.total_inventory_qty}
                  onChange={e => setFormData({ ...formData, total_inventory_qty: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={saving}
                style={{ fontWeight: 800, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {saving ? 'Saving...' : editingId ? '💾 Update Vasan' : '➕ Add to Price Master'}
              </button>
            </div>
          </form>

          {/* Search & List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#334155' }}>
                Configured Vasan Master Rates ({filteredVasans.length} Items)
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="Search container..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ maxWidth: '240px', padding: '4px 10px', fontSize: '0.76rem' }}
              />
            </div>

            <div className="table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Container Name (English)</th>
                    <th>ગુજરાતી નામ</th>
                    <th style={{ textAlign: 'right' }}>Missing / Replacement Rate (₹)</th>
                    <th style={{ textAlign: 'right' }}>Total Inventory</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        Loading Vasan rates...
                      </td>
                    </tr>
                  ) : filteredVasans.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        No Vasan containers found matching "{search}".
                      </td>
                    </tr>
                  ) : (
                    filteredVasans.map((v, idx) => (
                      <tr key={v.id} style={{ background: editingId === v.id ? '#eff6ff' : undefined }}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.76rem' }}>{idx + 1}</td>
                        <td>
                          <strong>{v.name}</strong>
                          {v.notes && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{v.notes}</div>}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{v.gujarati_name || '-'}</td>
                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 900, color: '#d32f2f' }}>
                          {formatCurrency(v.replacement_price)}
                        </td>
                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                          {v.total_inventory_qty} {v.unit}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: v.active ? '#dcfce7' : '#fee2e2',
                            color: v.active ? '#15803d' : '#dc2626'
                          }}>
                            {v.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(v)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 6px', fontSize: '0.72rem', color: '#2563eb' }}
                              title="Edit Rate"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(v.id, v.name)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 6px', fontSize: '0.72rem', color: '#dc2626' }}
                              title="Delete Item"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
            💡 Configured rates automatically appear in Wholesale Sale Bills & Missing Vasan Recovery
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
