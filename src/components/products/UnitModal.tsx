import React, { useState, useEffect } from 'react';
import { X, Save, Scale } from 'lucide-react';
import { api } from '../../api/client';
import { Unit } from '../../types';

interface UnitModalProps {
  isOpen: boolean;
  unit: Unit | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const UnitModal: React.FC<UnitModalProps> = ({
  isOpen,
  unit,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    unit_type: 'COUNT',
    base_unit: 'PCS',
    conversion_to_base: '1',
    is_base: 0
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (unit) {
      setFormData({
        name: unit.name || '',
        symbol: unit.symbol || unit.short_name || '',
        unit_type: unit.unit_type || 'COUNT',
        base_unit: unit.base_unit || unit.symbol || 'PCS',
        conversion_to_base: String(unit.conversion_to_base || 1),
        is_base: unit.is_base || 0
      });
    } else {
      setFormData({
        name: '',
        symbol: '',
        unit_type: 'COUNT',
        base_unit: 'PCS',
        conversion_to_base: '1',
        is_base: 0
      });
    }
    setError('');
  }, [unit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    const trimmedSymbol = formData.symbol.trim().toUpperCase();

    if (!trimmedName) {
      setError('Unit Name is required (e.g. Kilogram, Box, Packet).');
      return;
    }
    if (!trimmedSymbol) {
      setError('Unit Symbol / Short Code is required (e.g. KG, BOX, PKT).');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload: any = {
        name: trimmedName,
        symbol: trimmedSymbol,
        unit_type: formData.unit_type,
        base_unit: formData.base_unit.trim().toUpperCase() || trimmedSymbol,
        conversion_to_base: Number(formData.conversion_to_base) || 1.0,
        is_base: formData.is_base ? 1 : 0
      };

      if (unit) {
        await api.updateUnit(unit.id, payload);
      } else {
        await api.createUnit(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save unit');
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
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <Scale size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {unit ? '✏️ Edit Unit (માપન એકમ સુધારો)' : '➕ Add Measurement Unit (નવો એકમ ઉમેરો)'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                Define weight, volume, or packaging count units
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

          {/* Unit Full Name & Symbol */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                Unit Full Name * (એકમનું નામ)
              </label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Kilogram, Sweet Box"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ fontSize: '0.86rem', padding: '8px 10px', background: '#ffffff' }}
                autoFocus
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                Symbol / Code * (સંજ્ઞા)
              </label>
              <input
                type="text"
                className="form-input font-mono"
                required
                placeholder="KG / BOX"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                style={{ fontSize: '0.86rem', padding: '8px 10px', background: '#ffffff', fontWeight: 800 }}
              />
            </div>
          </div>

          {/* Unit Type */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
              Unit Type (માપન પ્રકાર)
            </label>
            <select
              className="form-select"
              value={formData.unit_type}
              onChange={(e) => {
                const uType = e.target.value;
                let defBase = 'PCS';
                if (uType === 'WEIGHT') defBase = 'KG';
                if (uType === 'VOLUME') defBase = 'LTR';
                setFormData({ ...formData, unit_type: uType, base_unit: defBase });
              }}
              style={{ fontSize: '0.84rem', padding: '8px 10px', background: '#ffffff' }}
            >
              <option value="WEIGHT">⚖️ Weight (વજન - KG, Grams)</option>
              <option value="COUNT">🔢 Count / Packets (સંખ્યા - Pieces, Box, Packet, Dozen)</option>
              <option value="VOLUME">🧪 Volume / Liquid (પ્રવાહી - Litre, ML)</option>
            </select>
          </div>

          {/* Base Unit & Conversion */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                Base Unit (મૂળ એકમ)
              </label>
              <input
                type="text"
                className="form-input font-mono"
                placeholder="KG / LTR / PCS"
                value={formData.base_unit}
                onChange={(e) => setFormData({ ...formData, base_unit: e.target.value.toUpperCase() })}
                style={{ fontSize: '0.84rem', padding: '8px 10px', background: '#ffffff' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>
                Conversion Factor
              </label>
              <input
                type="number"
                step="0.0001"
                className="form-input font-mono"
                placeholder="1 (0.001 for GM)"
                value={formData.conversion_to_base}
                onChange={(e) => setFormData({ ...formData, conversion_to_base: e.target.value })}
                style={{ fontSize: '0.84rem', padding: '8px 10px', background: '#ffffff' }}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', padding: '6px 10px', borderRadius: '6px' }}>
            💡 <em>દા.ત. 1 KG = 1, 1 Gram = 0.001 (KG), 1 Dozen = 12 (PCS)</em>
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
              className="btn btn-vyapar-blue"
              disabled={saving}
              style={{ padding: '7px 18px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={15} />
              {saving ? 'Saving...' : unit ? 'Update Unit' : 'Save Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
