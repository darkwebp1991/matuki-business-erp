import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Truck, 
  Calendar, 
  FileText, 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  Layers,
  MapPin,
  Phone
} from 'lucide-react';
import { api } from '../../api/client';
import { Purchase } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ImageLightboxModal } from '../common/ImageLightboxModal';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  purchaseId: number | null;
  onClose: () => void;
  onPrint?: (id: number) => void;
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  isOpen,
  purchaseId,
  onClose,
  onPrint
}) => {
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string>('');

  useEffect(() => {
    if (purchaseId && isOpen) {
      setLoading(true);
      api.getPurchaseById(purchaseId)
        .then(setPurchase)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [purchaseId, isOpen]);

  if (!isOpen || !purchaseId) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ffffff', color: '#0284c7', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Truck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                Purchase Voucher #{purchase?.purchase_no || '...'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', opacity: 0.9 }}>
                Date: {purchase ? formatDate(purchase.date) : ''} | Supplier: {purchase?.supplier_name}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.78rem'
              }}
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 800
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading voucher details...
            </div>
          ) : !purchase ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
              Voucher not found.
            </div>
          ) : (
            <>
              {/* Supplier & Voucher Meta */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gap: '12px'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Supplier Details</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {purchase.supplier_name}
                  </div>
                  {purchase.supplier_mobile && (
                    <div style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Phone size={12} color="#0284c7" /> {purchase.supplier_mobile}
                    </div>
                  )}
                  {(purchase as any).supplier_gstin && (
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                      GSTIN: <strong>{(purchase as any).supplier_gstin}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Supplier Bill Info</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
                    Bill #: {purchase.supplier_invoice_no || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                    Bill Date: {purchase.supplier_invoice_date ? formatDate(purchase.supplier_invoice_date) : '-'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Payment Mode</span>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      background: purchase.payment_mode === 'CREDIT' ? '#fef2f2' : '#f0fdf4',
                      color: purchase.payment_mode === 'CREDIT' ? '#b91c1c' : '#15803d',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${purchase.payment_mode === 'CREDIT' ? '#fca5a5' : '#86efac'}`
                    }}>
                      {purchase.payment_mode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontWeight: 800, color: '#334155' }}>
                      <th style={{ padding: '8px 10px', width: '35px' }}>#</th>
                      <th style={{ padding: '8px 10px' }}>Item Description</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Unit</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>GST %</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(purchase.items || []).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                          {item.item_name}
                          {item.item_code && <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '6px' }}>({item.item_code})</span>}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace' }}>
                          {item.quantity}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>
                          {item.unit}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {formatCurrency(item.rate)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {item.gst_rate || 0}%
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px', alignItems: 'start' }}>
                {purchase.notes && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 12px', fontSize: '0.78rem', color: '#92400e' }}>
                    <strong>Notes / Transport:</strong> {purchase.notes}
                  </div>
                )}
                {!purchase.notes && <div />}

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(purchase.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>GST Tax:</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(purchase.tax_amount)}</span>
                  </div>
                  {purchase.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Discount:</span>
                      <span style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'monospace' }}>-{formatCurrency(purchase.discount_amount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #cbd5e1', paddingTop: '6px', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                    <span>Grand Total:</span>
                    <span style={{ fontFamily: 'monospace', color: '#0284c7' }}>{formatCurrency(purchase.grand_total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, color: purchase.due_amount > 0 ? '#dc2626' : '#16a34a' }}>
                    <span>Due Payable:</span>
                    <span style={{ fontFamily: 'monospace' }}>{formatCurrency(purchase.due_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Attached Bill Photo Preview */}
              {(purchase as any).bill_photo_url && (
                <div style={{
                  padding: '12px 14px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={(purchase as any).bill_photo_url.startsWith('http') ? (purchase as any).bill_photo_url : `http://${window.location.hostname}:4321${(purchase as any).bill_photo_url}`}
                      alt="Attached Bill"
                      style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                      onClick={() => setLightboxUrl((purchase as any).bill_photo_url)}
                    />
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#166534' }}>
                        📎 Attached Supplier Bill / Invoice Photo
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#4ade80' }}>
                        Photo recorded during voucher entry
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#16a34a', color: '#ffffff', fontWeight: 800, padding: '6px 14px', fontSize: '0.78rem' }}
                    onClick={() => setLightboxUrl((purchase as any).bill_photo_url)}
                  >
                    🔍 Zoom Bill
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <ImageLightboxModal
          isOpen={!!lightboxUrl}
          imageUrl={lightboxUrl}
          title={`Supplier Bill #${purchase?.supplier_invoice_no || purchase?.purchase_no}`}
          onClose={() => setLightboxUrl('')}
        />
      )}
    </div>
  );
};
