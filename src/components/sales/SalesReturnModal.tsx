import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  X, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Package, 
  Truck,
  Layers,
  Camera,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../../api/client';
import { Sale, SaleItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  preselectedSaleId?: number | null;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedSaleId
}) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSaleId, setSelectedSaleId] = useState<string>(preselectedSaleId ? String(preselectedSaleId) : '');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  // Return line items
  const [returnItems, setReturnItems] = useState<Array<{
    product_id: number;
    product_name: string;
    sold_qty: number;
    return_qty: number;
    unit: string;
    rate: number;
    amount: number;
  }>>([]);

  // Return Vasan containers (e.g. 3 Choki, 2 Milton returned)
  const [vasanReturnItems, setVasanReturnItems] = useState<Array<{
    vasan_ledger_id: number;
    item_name: string;
    vasan_type: string;
    issued_qty: number;
    due_qty: number;
    return_qty: number;
  }>>([]);

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [refundMode, setRefundMode] = useState<string>('CREDIT_NOTE'); // CREDIT_NOTE, CASH
  const [reason, setReason] = useState<string>('Event Completed - Return unused sweets & Vasan');
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo size exceeds 10MB limit');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setPhotoBase64(res);
      setPhotoPreviewUrl(res);
    };
    reader.readAsDataURL(file);
  };

  const isDirty = () => {
    const hasSaleSelected = Boolean(selectedSaleId) && (!preselectedSaleId || String(preselectedSaleId) !== selectedSaleId);
    const hasSweetReturns = returnItems.some(i => i.return_qty > 0);
    return hasSaleSelected || hasSweetReturns;
  };

  const handleRequestClose = () => {
    if (isDirty()) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (showCloseConfirm) {
          setShowCloseConfirm(false);
          return;
        }
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedSaleId, returnItems, showCloseConfirm]);

  useEffect(() => {
    api.getSales({ status: 'ACTIVE' }).then(setSales).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedSaleId) {
      api.getSaleById(Number(selectedSaleId)).then((sale) => {
        setSelectedSale(sale);
        if (sale && sale.items) {
          setReturnItems(sale.items.map((i: any) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            sold_qty: Number(i.quantity),
            return_qty: 0, // start with 0 returned
            unit: i.unit || 'KG',
            rate: Number(i.rate) || 0,
            amount: 0
          })));
        }

        if (sale && (sale as any).vasanEntries) {
          setVasanReturnItems((sale as any).vasanEntries.map((v: any) => ({
            vasan_ledger_id: v.id,
            item_name: v.item_name,
            vasan_type: v.vasan_type,
            issued_qty: Number(v.issued_qty),
            due_qty: Number(v.due_qty),
            return_qty: Number(v.due_qty) // default suggest returning all pending vasan
          })));
        }
      }).catch(console.error);
    } else {
      setSelectedSale(null);
      setReturnItems([]);
      setVasanReturnItems([]);
    }
  }, [selectedSaleId]);

  const handleReturnItemQtyChange = (idx: number, qty: number) => {
    const updated = [...returnItems];
    const item = updated[idx];
    const clampedQty = Math.min(Math.max(0, qty), item.sold_qty);
    item.return_qty = clampedQty;
    item.amount = clampedQty * item.rate;
    setReturnItems(updated);
  };

  const handleVasanReturnQtyChange = (idx: number, qty: number) => {
    const updated = [...vasanReturnItems];
    const vas = updated[idx];
    const clampedQty = Math.min(Math.max(0, qty), vas.due_qty);
    vas.return_qty = clampedQty;
    setVasanReturnItems(updated);
  };

  const totalReturnAmount = returnItems.reduce((sum, i) => sum + i.amount, 0);
  const totalVasanReturning = vasanReturnItems.reduce((sum, v) => sum + v.return_qty, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) {
      setError('Please select an active Sales Bill');
      return;
    }

    const validSweetReturns = returnItems.filter(i => i.return_qty > 0);
    const validVasanReturns = vasanReturnItems.filter(v => v.return_qty > 0);

    if (validSweetReturns.length === 0 && validVasanReturns.length === 0) {
      setError('Please enter return quantity for at least one sweet item or one Vasan container');
      return;
    }

    try {
      setSaving(true);
      setError('');

      let uploadedPhotoUrl = '';
      if (photoBase64) {
        try {
          const uploadRes = await api.uploadSalesReturnPhoto({ image_base64: photoBase64 });
          if (uploadRes && uploadRes.photo_url) {
            uploadedPhotoUrl = uploadRes.photo_url;
          }
        } catch (uploadErr) {
          console.error('Error uploading return sweets weight photo:', uploadErr);
        }
      }

      const result = await api.createSalesReturn({
        sale_id: selectedSale.id,
        date,
        refund_mode: refundMode,
        reason,
        photo_url: uploadedPhotoUrl || undefined,
        return_items: validSweetReturns.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.return_qty,
          unit: i.unit,
          rate: i.rate,
          amount: i.amount
        })),
        returned_vasan: validVasanReturns.map(v => ({
          vasan_ledger_id: v.vasan_ledger_id,
          vasan_type: v.vasan_type,
          returned_qty: v.return_qty
        }))
      });

      onSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Failed to save sales return');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ padding: '8px' }}>
      <div className="modal-content" style={{ maxWidth: '920px', width: '98%', maxHeight: '96vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{
          padding: '12px 18px',
          background: '#d32f2f',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RotateCcw size={20} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              Sales Return & Vasan Return
            </h2>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Section 1: Choose Original Bill */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr',
            gap: '10px'
          }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 800 }}>Select Original Sale Bill *</label>
              <select
                className="form-select"
                required
                value={selectedSaleId}
                onChange={(e) => setSelectedSaleId(e.target.value)}
              >
                <option value="">-- Choose Sales Invoice --</option>
                {sales.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.invoice_no} ({formatDate(s.date)}) — {s.customer_name} [Total: {formatCurrency(s.grand_total)}]
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Return Date</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Refund / Adjustment Mode</label>
              <select
                className="form-select"
                value={refundMode}
                onChange={(e) => setRefundMode(e.target.value)}
              >
                <option value="CREDIT_NOTE">Credit Note (Adjust in Khata)</option>
                <option value="CASH">Cash Refund (Pay from Drawer)</option>
              </select>
            </div>

            {/* Photo Upload Section for Return Sweets Weight Proof */}
            <div style={{
              gridColumn: '1 / -1',
              marginTop: '6px',
              padding: '10px 12px',
              background: '#f0fdf4',
              border: '1.5px dashed #86efac',
              borderRadius: '6px'
            }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Camera size={16} color="#16a34a" /> 📷 Attach Returned Sweets Weight Photo (પરત આવેલા સ્વીટના વજનનો ફોટો)
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  style={{ fontSize: '0.80rem' }}
                />

                {photoPreviewUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img 
                      src={photoPreviewUrl} 
                      alt="Weight Proof" 
                      style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #22c55e' }} 
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setPhotoBase64('');
                        setPhotoPreviewUrl('');
                      }}
                      style={{ fontSize: '0.72rem', padding: '2px 6px', color: '#dc2626' }}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#15803d', display: 'block', marginTop: '4px' }}>
                💡 Snap or upload a photo of returned sweets on the weighing scale. Stored as permanent proof for customer inquiries!
              </span>
            </div>
          </div>

          {selectedSale && (
            <>
              {/* Sale Info Summary Badge */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '0.82rem',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span>Party: <strong>{selectedSale.customer_name}</strong></span>
                {selectedSale.delivery_venue && <span>Destination: <strong>{selectedSale.delivery_venue}</strong></span>}
                {selectedSale.driver_name && <span>Delivered by: <strong>{selectedSale.driver_name}</strong></span>}
                <span>Original Bill Total: <strong>{formatCurrency(selectedSale.grand_total)}</strong></span>
              </div>

              {/* Section 2: SWEETS ITEMS RETURN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  1. Sweets / Finished Goods Return
                </span>
                <div className="table-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>SWEET ITEM</th>
                        <th>SOLD QTY</th>
                        <th style={{ width: '110px' }}>RETURN QTY</th>
                        <th>UNIT</th>
                        <th>RATE (₹)</th>
                        <th style={{ textAlign: 'right' }}>CREDIT AMOUNT (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item, idx) => (
                        <tr key={idx}>
                          <td><strong>{item.product_name}</strong></td>
                          <td>{item.sold_qty} {item.unit}</td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max={item.sold_qty}
                              className="form-input font-mono"
                              style={{ padding: '3px 6px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 800 }}
                              value={item.return_qty}
                              onChange={(e) => handleReturnItemQtyChange(idx, Number(e.target.value))}
                            />
                          </td>
                          <td>{item.unit}</td>
                          <td className="font-mono">{formatCurrency(item.rate)}</td>
                          <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: VASAN (CONTAINER / MILTON / CHOKI / CARAT) RETURN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={15} />
                  2. Vasan / Containers Return (Milton / Tray / Crate)
                </span>
                
                {vasanReturnItems.length === 0 ? (
                  <div style={{ padding: '12px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', color: '#64748b' }}>
                    No Vasan / Containers were issued with this bill.
                  </div>
                ) : (
                  <div className="table-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr style={{ background: '#fef3c7', color: '#92400e' }}>
                          <th>CONTAINER / VASAN TYPE</th>
                          <th>ISSUED WITH ITEM</th>
                          <th>ORIGINAL ISSUED</th>
                          <th>PENDING DUE</th>
                          <th style={{ width: '130px', background: '#fde68a' }}>RETURN NOW</th>
                          <th>REMAINING AFTER RETURN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vasanReturnItems.map((vas, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong style={{ color: '#92400e', background: '#fffbeb', padding: '2px 8px', borderRadius: '3px', border: '1px solid #fcd34d' }}>
                                {vas.vasan_type}
                              </strong>
                            </td>
                            <td style={{ fontSize: '0.78rem' }}>{vas.item_name}</td>
                            <td className="font-mono">{vas.issued_qty}</td>
                            <td className="font-mono" style={{ fontWeight: 800, color: '#dc2626' }}>{vas.due_qty}</td>
                            <td style={{ background: '#fffbeb' }}>
                              <input
                                type="number"
                                min="0"
                                max={vas.due_qty}
                                step="1"
                                className="form-input font-mono"
                                style={{ padding: '3px 6px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 900, color: '#92400e', borderColor: '#f59e0b' }}
                                value={vas.return_qty}
                                onChange={(e) => handleVasanReturnQtyChange(idx, Number(e.target.value))}
                              />
                            </td>
                            <td className="font-mono" style={{ fontWeight: 800, color: (vas.due_qty - vas.return_qty) > 0 ? '#dc2626' : '#15803d' }}>
                              {vas.due_qty - vas.return_qty === 0 ? '0 (Fully Returned ✓)' : `${vas.due_qty - vas.return_qty} Pending`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bottom Summary */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #cbd5e1'
              }}>
                <div style={{ fontSize: '0.84rem' }}>
                  <span>Total Vasan Returning: <strong style={{ color: '#92400e' }}>{totalVasanReturning} Containers</strong></span>
                </div>

                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#15803d' }}>
                  <span>Credit Refund Amount: </span>
                  <span className="font-mono">{formatCurrency(totalReturnAmount)}</span>
                </div>
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-secondary" onClick={handleRequestClose} disabled={saving}>
              Cancel (Esc)
            </button>
            <button type="submit" className="btn btn-vyapar-red" disabled={saving || !selectedSale}>
              <Save size={15} />
              {saving ? 'Processing Return...' : 'Save Return & Update Vasan Ledger'}
            </button>
          </div>
        </form>
      </div>

      {/* Discard Confirmation Popup on ESC */}
      {showCloseConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Discard Current Sales Return?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              You have selected a bill and entered return quantities. Are you sure you want to discard and close?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCloseConfirm(false)}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
