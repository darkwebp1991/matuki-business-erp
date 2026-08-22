import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  RotateCcw, 
  Camera, 
  Calendar, 
  User, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  Package, 
  ExternalLink,
  Trash2,
  Upload
} from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface CreditNoteDetailsModalProps {
  isOpen: boolean;
  returnId: number | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export const CreditNoteDetailsModal: React.FC<CreditNoteDetailsModalProps> = ({
  isOpen,
  returnId,
  onClose,
  onRefresh
}) => {
  const [creditNote, setCreditNote] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState<boolean>(false);

  const fetchDetails = async () => {
    if (!returnId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.getSalesReturnById(returnId);
      const data = (res as any).data || res;
      setCreditNote(data);
    } catch (err: any) {
      console.error('Error loading credit note:', err);
      setError('Failed to load Credit Note details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && returnId) {
      fetchDetails();
    }
  }, [isOpen, returnId]);

  if (!isOpen || !returnId) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        setUploading(true);
        const res = await api.uploadSalesReturnPhoto({ return_id: returnId, image_base64: base64 });
        if (res && res.photo_url) {
          setCreditNote((prev: any) => ({ ...prev, photo_url: res.photo_url }));
          if (onRefresh) onRefresh();
        }
      } catch (err: any) {
        alert(err.message || 'Failed to upload photo proof');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePrintProof = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '12px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '92vh',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1.5px solid #dc2626'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          color: '#ffffff',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <RotateCcw size={22} color="#ffffff" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>
                Credit Note #{creditNote?.return_no || returnId}
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#fca5a5' }}>
                Return Sweets & Weight Proof Slip
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrintProof}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Printer size={14} /> Print Proof
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading Credit Note details...
            </div>
          ) : error ? (
            <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px' }}>
              ⚠️ {error}
            </div>
          ) : creditNote && (
            <>
              {/* Summary Cards */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1.2fr',
                gap: '12px',
                fontSize: '0.84rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, display: 'block' }}>PARTY / CUSTOMER</span>
                  <strong style={{ color: '#0f172a', fontSize: '0.96rem' }}>{creditNote.customer?.name || creditNote.customer_name || 'Customer'}</strong>
                  {creditNote.customer?.mobile && <div style={{ fontSize: '0.75rem', color: '#475569' }}>📞 {creditNote.customer.mobile}</div>}
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, display: 'block' }}>RETURN DATE & BILL</span>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>📅 {formatDate(creditNote.date)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>Against Bill #{creditNote.invoice_no}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, display: 'block' }}>TOTAL CREDIT REFUND</span>
                  <strong style={{ color: '#dc2626', fontSize: '1.25rem', fontFamily: 'monospace' }}>
                    {formatCurrency(creditNote.total_amount)}
                  </strong>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 800 }}>Mode: {creditNote.refund_mode}</div>
                </div>
              </div>

              {/* 📷 RETURN SWEETS WEIGHT PHOTO PROOF SECTION */}
              <div style={{
                background: '#f0fdf4',
                border: '2px solid #86efac',
                borderRadius: '8px',
                padding: '12px 16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 900, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={18} color="#16a34a" /> 📷 Returned Sweets Weight Photo Proof (પરત આવેલા સ્વીટના વજનનો ફોટો)
                  </h4>

                  <label style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Upload size={13} /> {creditNote.photo_url ? 'Change Photo' : '+ Attach Weight Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                  </label>
                </div>

                {uploading && (
                  <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, padding: '4px 0' }}>
                    Uploading photo proof...
                  </div>
                )}

                {creditNote.photo_url ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img 
                      src={creditNote.photo_url} 
                      alt="Returned Sweets Weight Proof"
                      onClick={() => setIsPhotoExpanded(true)}
                      style={{ 
                        width: '120px', 
                        height: '90px', 
                        objectFit: 'cover', 
                        borderRadius: '8px', 
                        border: '2.5px solid #22c55e',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803d', display: 'block' }}>
                        ✓ Photo Proof Attached & Verified
                      </span>
                      <p style={{ margin: '2px 0 6px 0', fontSize: '0.74rem', color: '#475569' }}>
                        Uploaded for Credit Note #{creditNote.return_no}. Click image to expand full-screen proof.
                      </p>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setIsPhotoExpanded(true)}
                        style={{ fontSize: '0.74rem', padding: '3px 8px', fontWeight: 800 }}
                      >
                        <ExternalLink size={12} /> View Full Photo Proof
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    background: '#ffffff',
                    border: '1px dashed #a7f3d0',
                    borderRadius: '6px',
                    color: '#64748b',
                    fontSize: '0.80rem'
                  }}>
                    📷 No photo proof attached yet. Click <strong>&quot;+ Attach Weight Photo&quot;</strong> to snap or upload returned sweets weight picture!
                  </div>
                )}
              </div>

              {/* Returned Items Breakdown */}
              {creditNote.items && creditNote.items.length > 0 && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                    RETURNED SWEETS BREAKDOWN
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 800 }}>
                        <th style={{ textAlign: 'left', padding: '6px 10px' }}>Item Name</th>
                        <th style={{ textAlign: 'center', padding: '6px' }}>Returned Qty</th>
                        <th style={{ textAlign: 'right', padding: '6px' }}>Rate (₹)</th>
                        <th style={{ textAlign: 'right', padding: '6px 12px' }}>Total Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditNote.items.map((it: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: '#0f172a' }}>{it.product_name}</td>
                          <td style={{ textAlign: 'center', padding: '6px', fontWeight: 800, fontFamily: 'monospace', color: '#dc2626' }}>
                            {it.quantity} {it.unit}
                          </td>
                          <td style={{ textAlign: 'right', padding: '6px', fontFamily: 'monospace' }}>₹{it.rate}</td>
                          <td style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                            ₹{it.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* High Resolution Photo Lightbox Modal */}
      {isPhotoExpanded && creditNote?.photo_url && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          zIndex: 9999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              type="button"
              onClick={() => setIsPhotoExpanded(false)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
              }}
            >
              <X size={20} color="#000000" />
            </button>
            <img 
              src={creditNote.photo_url} 
              alt="Full Resolution Returned Sweets Weight Proof"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', border: '3px solid #ffffff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} 
            />
            <div style={{ textAlign: 'center', color: '#ffffff', marginTop: '10px', fontSize: '0.85rem', fontWeight: 800 }}>
              📷 Credit Note #{creditNote.return_no} — Returned Sweets Weight Photo Proof
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
