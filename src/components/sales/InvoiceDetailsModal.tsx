import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  MapPin, 
  Truck, 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Phone,
  FileText,
  CreditCard,
  Layers,
  ArrowDownLeft,
  RotateCcw,
  Trash2,
  ExternalLink,
  Edit3,
  Copy,
  Zap
} from 'lucide-react';
import { api } from '../../api/client';
import { Sale, SaleItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { MasterPinDialog } from '../common/MasterPinDialog';

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  saleId: number | null;
  onClose: () => void;
  onPrint?: (saleId: number) => void;
  onEdit?: (sale: Sale) => void;
  onDuplicate?: (sale: Sale) => void;
  onPaymentIn?: (customerName: string, customerId?: number, dueAmount?: number) => void;
  onReturn?: (sale: Sale) => void;
  onCancelInvoice?: (saleId: number) => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  isOpen,
  saleId,
  onClose,
  onPrint,
  onEdit,
  onDuplicate,
  onPaymentIn,
  onReturn,
  onCancelInvoice
}) => {
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isPinDialogOpen, setIsPinDialogOpen] = useState<boolean>(false);
  const [waGatewayStatus, setWaGatewayStatus] = useState<any>(null);
  const [waSending, setWaSending] = useState<boolean>(false);
  const [waSuccess, setWaSuccess] = useState<string>('');

  useEffect(() => {
    api.getWhatsAppGatewayStatus().then(res => {
      setWaGatewayStatus((res as any)?.data || res);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen || !saleId) return;

    const fetchSaleDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.getSaleById(saleId);
        const data = (res as any).data || res;
        setSale(data);
      } catch (err: any) {
        console.error('Error fetching invoice details:', err);
        setError('Failed to load invoice details');
      } finally {
        setLoading(false);
      }
    };

    fetchSaleDetails();
  }, [isOpen, saleId]);

  if (!isOpen || !saleId) return null;

  const isPaid = sale ? sale.due_amount <= 0 : false;
  const isPartial = sale ? sale.paid_amount > 0 && sale.due_amount > 0 : false;
  const isCancelled = sale?.status === 'CANCELLED';

  const handleWhatsAppShare = async () => {
    if (!sale) return;
    const phone = sale.customer_mobile ? sale.customer_mobile.replace(/[^0-9]/g, '') : '';
    const itemsText = (sale.items || [])
      .map((it, idx) => `${idx + 1}. ${it.product_name} - ${it.quantity} ${it.unit} @ ₹${it.rate} = ₹${it.amount}`)
      .join('\n');

    const message = `*🧾 MATUKI SWEETS - Sale Invoice*\n` +
      `*Invoice #:* ${sale.invoice_no}\n` +
      `*Date:* ${formatDate(sale.date)}\n` +
      `*Customer:* ${sale.customer_name}\n` +
      `------------------------\n` +
      `*Items Summary:*\n${itemsText}\n` +
      `------------------------\n` +
      `*Grand Total:* ₹${sale.grand_total}\n` +
      `*Paid Amount:* ₹${sale.paid_amount}\n` +
      `*Balance Due:* ₹${sale.due_amount}\n\n` +
      `Thank you! *MATUKI SWEETS*`;

    if (waGatewayStatus?.isConnected && phone.length >= 10) {
      try {
        setWaSending(true);
        await api.sendWhatsAppGatewayMessage({
          to_mobile: phone,
          message_text: message,
          media_file_path: '/payment_qr.png'
        });
        setWaSuccess(`✓ Bill & PhonePe QR sent automatically to ${sale.customer_name} via WhatsApp!`);
        setTimeout(() => setWaSuccess(''), 5000);
      } catch (err: any) {
        alert(err.message || 'Auto-send failed');
      } finally {
        setWaSending(false);
      }
      return;
    }

    const url = phone.length >= 10 
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(3px)',
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
        maxWidth: '850px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Modal Header Bar */}
        <div style={{
          padding: '14px 20px',
          background: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#3b82f6', color: '#ffffff', padding: '6px', borderRadius: '6px' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
                  Invoice Details
                </h3>
                {sale?.invoice_no && (
                  <span style={{
                    fontFamily: 'monospace',
                    background: '#1e293b',
                    color: '#38bdf8',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    border: '1px solid #334155'
                  }}>
                    #{sale.invoice_no}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Vyapar Complete Bill Overview & Quick Actions
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sale && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onPrint ? onPrint(sale.id) : null}
                style={{
                  background: '#16a34a',
                  borderColor: '#16a34a',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 12px'
                }}
              >
                <Printer size={14} /> 🖨️ Print Bill
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#334155',
                border: 'none',
                color: '#ffffff',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', background: '#f8fafc' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Loading invoice...
            </div>
          ) : error || !sale ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#dc2626' }}>
              ⚠️ {error || 'Invoice not found'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. Status & Financial Highlights Banner */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</span>
                  <div style={{ marginTop: '3px' }}>
                    {isCancelled ? (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 900 }}>
                        ❌ CANCELLED
                      </span>
                    ) : isPaid ? (
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 900 }}>
                        ✅ FULLY PAID
                      </span>
                    ) : isPartial ? (
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 900 }}>
                        ⚠️ PARTIAL PAID
                      </span>
                    ) : (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 900 }}>
                        ⏳ UNPAID
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Grand Total</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', marginTop: '2px' }}>
                    {formatCurrency(sale.grand_total)}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>Received Amount</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16a34a', fontFamily: 'monospace', marginTop: '2px' }}>
                    {formatCurrency(sale.paid_amount)}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>Balance Due</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: sale.due_amount > 0 ? '#dc2626' : '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                    {formatCurrency(sale.due_amount)}
                  </div>
                </div>
              </div>

              {/* 2. Customer & Dispatch Details Box */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '16px'
              }}>
                {/* Left: Customer Info */}
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Customer Info
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                    {sale.customer_name}
                  </div>
                  {sale.customer_mobile && (
                    <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Phone size={13} color="#2563eb" /> {sale.customer_mobile}
                    </div>
                  )}
                  {sale.delivery_address && (
                    <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                      <MapPin size={13} color="#dc2626" /> {sale.delivery_address}
                    </div>
                  )}
                </div>

                {/* Right: Date, Venue, Driver Info */}
                <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Date:</span>
                    <strong style={{ color: '#0f172a' }}>{formatDate(sale.date)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Payment Mode:</span>
                    <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>{sale.payment_mode}</span>
                  </div>
                  {sale.delivery_venue && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Delivery Venue:</span>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: '#1e3a8a' }}>{sale.delivery_venue}</strong>
                        <span style={{
                          display: 'inline-block',
                          marginLeft: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: sale.trip_type === 'ONE_WAY' ? '#cffafe' : '#dbeafe',
                          color: sale.trip_type === 'ONE_WAY' ? '#0e7490' : '#1d4ed8'
                        }}>
                          {sale.trip_type === 'ONE_WAY' ? '➡️ One Way' : '🔄 Round Trip'}
                        </span>
                      </div>
                    </div>
                  )}
                  {sale.driver_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                      <span>Driver:</span>
                      <strong>{sale.driver_name} {sale.driver_mobile ? `(${sale.driver_mobile})` : ''}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Items Breakdown Table */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Ordered Items Breakdown
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 800 }}>
                      <th style={{ width: '36px', textAlign: 'center', padding: '6px 4px' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '6px 10px' }}>Item Name</th>
                      <th style={{ textAlign: 'center', padding: '6px 6px', width: '150px' }}>Packing / Utensils</th>
                      <th style={{ textAlign: 'center', padding: '6px 6px', width: '90px' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', width: '100px' }}>Rate (₹)</th>
                      <th style={{ textAlign: 'right', padding: '6px 12px', width: '120px' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sale.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ textAlign: 'center', padding: '6px 4px', color: '#94a3b8' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <strong style={{ color: '#0f172a' }}>{it.product_name}</strong>
                          {(it as any).notes && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{(it as any).notes}</div>}
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 6px', color: '#92400e', fontSize: '0.78rem' }}>
                          {it.vasan_type && it.vasan_type !== 'NONE' ? (
                            <span style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {it.vasan_type}: {it.vasan_qty || 1}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '6px 6px', fontWeight: 800, fontFamily: 'monospace' }}>
                          {it.quantity} {it.unit}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 8px', fontFamily: 'monospace' }}>
                          ₹{it.rate}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 12px', fontWeight: 900, fontFamily: 'monospace', color: '#0f172a' }}>
                          ₹{it.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4. Financial Calculations Line */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.84rem'
              }}>
                <div style={{ display: 'flex', gap: '16px', color: '#64748b' }}>
                  <span>Subtotal: <strong>₹{sale.subtotal}</strong></span>
                  {(sale.delivery_charge || 0) > 0 && (
                    <span>Delivery Charge: <strong style={{ color: '#2563eb' }}>+ ₹{sale.delivery_charge}</strong></span>
                  )}
                  {(sale.discount_amount || 0) > 0 && (
                    <span>Discount: <strong style={{ color: '#16a34a' }}>- ₹{sale.discount_amount}</strong></span>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 800 }}>Grand Total: </span>
                  <strong style={{ fontSize: '1.15rem', color: '#0f172a', fontFamily: 'monospace' }}>
                    ₹{sale.grand_total}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Vyapar Quick Actions Footer Bar */}
        {sale && (
          <div style={{
            padding: '12px 20px',
            background: '#ffffff',
            borderTop: '1.5px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {/* Left Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleWhatsAppShare}
                style={{ fontWeight: 800, color: '#16a34a', borderColor: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Send Bill Details via WhatsApp"
              >
                <Share2 size={14} /> 💬 WhatsApp Bill
              </button>

              {onEdit && !isCancelled && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onEdit(sale);
                    onClose();
                  }}
                  style={{ fontWeight: 800, color: '#2563eb', borderColor: '#93c5fd', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Edit3 size={14} /> ✏️ Edit Bill
                </button>
              )}

              {onDuplicate && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onDuplicate(sale);
                    onClose();
                  }}
                  style={{ fontWeight: 800, color: '#7c3aed', borderColor: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Create Duplicate / Repeat Bill with Same Items"
                >
                  <Copy size={14} /> 📋 Duplicate Bill
                </button>
              )}

              {onCancelInvoice && !isCancelled && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsPinDialogOpen(true)}
                  style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={13} /> 🗑️ Delete Bill
                </button>
              )}
            </div>

            {/* Right Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {waSuccess && (
                <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700 }}>
                  {waSuccess}
                </span>
              )}

              {sale.customer_mobile && !isCancelled && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleWhatsAppShare}
                  disabled={waSending}
                  style={{
                    color: '#075e54',
                    borderColor: '#86efac',
                    background: '#f0fdf4',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Send formatted bill & PhonePe QR to customer WhatsApp"
                >
                  {waGatewayStatus?.isConnected ? <Zap size={13} color="#16a34a" /> : <Share2 size={13} />}
                  {waSending ? 'Sending...' : waGatewayStatus?.isConnected ? '⚡ 1-Click WhatsApp Bill' : '📲 WhatsApp Bill'}
                </button>
              )}

              {sale.due_amount > 0 && onPaymentIn && !isCancelled && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onPaymentIn(sale.customer_name, sale.customer_id || undefined, sale.due_amount);
                    onClose();
                  }}
                  style={{
                    background: '#16a34a',
                    borderColor: '#16a34a',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ArrowDownLeft size={14} /> 💰 Payment In
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
                style={{ fontWeight: 700 }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Master PIN Verification Dialog for Bill Deletion */}
      {isPinDialogOpen && sale && (
        <MasterPinDialog
          isOpen={isPinDialogOpen}
          title="Permanent Bill Delete"
          message={`Are you sure you want to delete invoice #${sale.invoice_no} (${sale.customer_name} - ₹${sale.grand_total}) permanently? Enter Master PIN to confirm:`}
          onClose={() => setIsPinDialogOpen(false)}
          onConfirm={() => {
            if (onCancelInvoice) {
              onCancelInvoice(sale.id);
              onClose();
            }
          }}
        />
      )}
    </div>
  );
};
