import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../common/Modal';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [adjustmentQty, setAdjustmentQty] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('Physical stock count audit reconciliation');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getInventoryItems().then(setItems).catch(console.error);
  }, []);

  const selectedItem = items.find(i => `${i.item_type}:${i.id}` === selectedKey);
  const currentStock = selectedItem ? Number(selectedItem.current_stock) : 0;
  const newStock = selectedItem && adjustmentQty !== '' ? currentStock + Number(adjustmentQty) : currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKey || !selectedItem) {
      setError('Please select an item to adjust');
      return;
    }
    if (adjustmentQty === '' || Number(adjustmentQty) === 0) {
      setError('Adjustment quantity cannot be 0');
      return;
    }
    if (!reason) {
      setError('A mandatory reason is required for auditing stock adjustments');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await api.adjustStock({
        item_type: selectedItem.item_type,
        item_id: selectedItem.id,
        adjustment_qty: Number(adjustmentQty),
        reason
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audited Stock Adjustment"
      subtitle="Manual physical stock reconciliation with mandatory reason and immutable audit log"
      maxWidth="600px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Adjusting...' : 'Confirm Stock Adjustment'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', borderRadius: 'var(--radius-sm)', color: '#fb7185', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Select Item (Raw Material or Finished Sweet) *</label>
          <select
            className="form-select"
            required
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
          >
            <option value="">-- Choose Stock Item to Adjust --</option>
            {items.map(i => (
              <option key={`${i.item_type}:${i.id}`} value={`${i.item_type}:${i.id}`}>
                [{i.item_type}] {i.name} ({i.code}) — Current: {i.current_stock} {i.unit}
              </option>
            ))}
          </select>
        </div>

        {selectedItem && (
          <div className="glass-panel" style={{ padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Book Stock</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {currentStock} {selectedItem.unit}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>New Adjusted Stock</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                {newStock} {selectedItem.unit}
              </div>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Adjustment Quantity (+ to Add / - to Deduct) *</label>
          <input
            type="number"
            step="0.1"
            required
            className="form-input"
            placeholder="e.g. +5.0 or -2.5"
            value={adjustmentQty}
            onChange={(e) => setAdjustmentQty(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mandatory Reason / Notes for Audit Log *</label>
          <input
            type="text"
            required
            className="form-input"
            placeholder="e.g. Physical inventory variance after Diwali rush / Bag damage"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
