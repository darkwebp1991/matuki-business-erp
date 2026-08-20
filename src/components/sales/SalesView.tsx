import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Printer, 
  XCircle, 
  Download, 
  Calendar,
  AlertTriangle,
  RotateCcw,
  Eye,
  Share2,
  ArrowDownLeft,
  Trash2,
  Edit3,
  Copy,
  Truck
} from 'lucide-react';
import { api } from '../../api/client';
import { Sale, User } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';
import { canEditModule, canDeleteModule } from '../../utils/permissionUtils';
import { StatusBadge } from '../common/StatusBadge';
import { NewSaleModal } from './NewSaleModal';
import { InvoicePrintModal } from './InvoicePrintModal';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { SalesReturnModal } from './SalesReturnModal';
import { DriverTripModal } from './DriverTripModal';
import { PaymentModal } from '../parties/PaymentModal';
import { MasterPinDialog } from '../common/MasterPinDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SalesViewProps {
  onOpenNewSaleDirect?: boolean;
  currentUser?: User | null;
}

export const SalesView: React.FC<SalesViewProps> = ({ currentUser }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const canEdit = canEditModule(currentUser, 'sales');
  const canDelete = canDeleteModule(currentUser, 'sales');
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [editingSaleData, setEditingSaleData] = useState<Sale | null>(null);
  const [duplicateSaleData, setDuplicateSaleData] = useState<Sale | null>(null);
  const [pinConfirmSale, setPinConfirmSale] = useState<Sale | null>(null);
  const [isSalesReturnOpen, setIsSalesReturnOpen] = useState(false);
  const [isDriverTripOpen, setIsDriverTripOpen] = useState(false);
  const [selectedInvoiceDetailsId, setSelectedInvoiceDetailsId] = useState<number | null>(null);
  const [printInvoiceId, setPrintInvoiceId] = useState<number | null>(null);
  const [autoTriggerPrint, setAutoTriggerPrint] = useState<boolean>(false);
  const [cancelSaleId, setCancelSaleId] = useState<number | null>(null);

  // Payment In Modal State
  const [isPaymentInOpen, setIsPaymentInOpen] = useState<boolean>(false);
  const [paymentPartyName, setPaymentPartyName] = useState<string>('');
  const [paymentCustomerId, setPaymentCustomerId] = useState<number | undefined>(undefined);
  const [paymentDueAmount, setPaymentDueAmount] = useState<number | undefined>(undefined);

  // 5-Minute Auto WhatsApp Dispatch Queue State
  const [pendingDispatches, setPendingDispatches] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  const fetchPendingDispatches = async () => {
    try {
      const res = await api.getPendingAutoDispatches();
      if (res) {
        setPendingDispatches(Array.isArray(res) ? res : (res as any).data || []);
      }
    } catch (e) {}
  };

  const handleSendWhatsAppNow = async (saleId: number) => {
    try {
      await api.sendSaleWhatsAppNow(saleId);
      fetchPendingDispatches();
    } catch (e: any) {
      console.error(e);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const data = await api.getSales({ search });
      setSales(data);
      fetchPendingDispatches();
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchPendingDispatches, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchSales();
    api.getSettings().then(setSettings).catch(console.error);
  }, [search]);

  // Keyboard shortcut listener: F2 for new sale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsNewSaleOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleConfirmCancel = async () => {
    if (cancelSaleId) {
      try {
        await api.cancelSale(cancelSaleId, 'Cancelled by cashier');
        setCancelSaleId(null);
        fetchSales();
      } catch (err: any) {
        alert(err.message || 'Failed to cancel invoice');
      }
    }
  };

  const handleEditSale = async (saleSummary: Sale) => {
    try {
      const res = await api.getSaleById(saleSummary.id);
      const data = (res as any).data || res;
      setEditingSaleData(data);
    } catch (e) {
      setEditingSaleData(saleSummary);
    }
  };

  const handleDuplicateSale = async (saleSummary: Sale) => {
    try {
      const res = await api.getSaleById(saleSummary.id);
      const data = (res as any).data || res;
      setDuplicateSaleData(data);
    } catch (e) {
      setDuplicateSaleData(saleSummary);
    }
  };

  const handleWhatsAppBill = (s: Sale) => {
    const bName = settings?.business_name || 'MATUKI SWEETS';
    const phone = s.customer_mobile ? s.customer_mobile.replace(/[^0-9]/g, '') : '';
    const itemsText = (s.items || [])
      .map((it, idx) => `${idx + 1}. ${it.product_name} - ${it.quantity} ${it.unit} @ ₹${it.rate} = ₹${it.amount}`)
      .join('%0A');

    const message = `*🧾 ${bName} - Sale Invoice*%0A` +
      `*Invoice #:* ${s.invoice_no}%0A` +
      `*Date:* ${formatDate(s.date)}%0A` +
      `*Customer:* ${s.customer_name}%0A` +
      `------------------------%0A` +
      `*Items Summary:*%0A${itemsText}%0A` +
      `------------------------%0A` +
      `*Grand Total:* ₹${s.grand_total}%0A` +
      `*Paid Amount:* ₹${s.paid_amount}%0A` +
      `*Balance Due:* ₹${s.due_amount}%0A%0A` +
      `Thank you! *${bName}*`;

    const url = phone.length >= 10 
      ? `https://wa.me/91${phone.slice(-10)}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
            🛒 Sales Register & Counter Billing
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            High-speed POS billing, customer ledgers, Chaki/Vasan container returns & A5/Thermal bill printing
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setIsDriverTripOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)'
            }}
            title="Open Rickshaw Driver Trip Sheet & Route WhatsApp Dispatch"
          >
            <Truck size={15} color="#fef08a" />
            <span>🛺 Driver Trip Sheet (રવાનગી ચિઠ્ઠી)</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportToCSV(sales, 'Matuki_Sales_Register.csv')}
          >
            <Download size={14} />
            Export CSV
          </button>
          {canEdit && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsSalesReturnOpen(true)} style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
                <RotateCcw size={14} />
                Sales Return & Vasan
              </button>
              <button className="btn btn-vyapar-red btn-sm" onClick={() => setIsNewSaleOpen(true)} style={{ fontWeight: 800 }}>
                <Plus size={15} />
                + New Sale Invoice (F2)
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5-Minute Auto-Dispatch Queue Active Banner */}
      {pendingDispatches.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #ecfdf5 0%, #f0fdf4 100%)',
          border: '1.5px solid #86efac',
          borderRadius: '10px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: '#065f46',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <span style={{ fontSize: '1.1rem' }}>📲</span>
            <span>
              <strong>Smart WhatsApp Auto-Dispatch Queue Active:</strong> {pendingDispatches.length} customer invoice(s) waiting for 5-minute edit stability countdown. If you edit the bill, timer resets automatically.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
              Auto-Sending Active (+919081822283)
            </span>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search Invoices by Invoice # (MS/26-27/001), Customer Name, or Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Bill #</th>
              <th>Customer Name</th>
              <th>Delivery Destination</th>
              <th>Rixa Driver</th>
              <th>Vasan (Utensils)</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th>
              <th style={{ textAlign: 'right' }}>Paid</th>
              <th style={{ textAlign: 'right' }}>Due</th>
              <th>Status</th>
              <th style={{ textAlign: 'center', width: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No sales bills recorded.
                </td>
              </tr>
            ) : (
              sales.map((s: Sale) => {
                const isPaid = s.due_amount <= 0;
                const isPartial = s.paid_amount > 0 && s.due_amount > 0;
                const isCancelled = s.status === 'CANCELLED';

                return (
                  <tr key={s.id} style={{ background: isCancelled ? '#fef2f2' : 'inherit' }}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {formatDate(s.date)}
                    </td>
                    <td 
                      className="font-mono" 
                      style={{ color: '#d32f2f', fontWeight: 800, cursor: 'pointer' }}
                      onClick={() => setSelectedInvoiceDetailsId(s.id)}
                      title="Click to view full bill details"
                    >
                      {s.invoice_no}
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{s.customer_name}</strong>
                      {s.customer_mobile && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.customer_mobile}</div>
                      )}
                      {((s as any).billed_by || s.created_by) && (
                        <div style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 700 }}>
                          Billed by: {(s as any).billed_by || s.created_by}
                        </div>
                      )}
                      {pendingDispatches.some(d => d.reference_type === 'SALE' && d.reference_id === s.id) && (
                        <div style={{ marginTop: '3px' }}>
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppNow(s.id)}
                            style={{
                              fontSize: '0.68rem',
                              padding: '1px 6px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              borderRadius: '12px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="Click to send WhatsApp immediately without waiting for 5-min timer"
                          >
                            ⏱️ Auto-WA in {pendingDispatches.find(d => d.reference_type === 'SALE' && d.reference_id === s.id)?.remaining_seconds || 300}s (Send Now)
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      {s.delivery_venue ? (
                        <div>
                          <strong style={{ color: '#0f172a' }}>{s.delivery_venue}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.delivery_address}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Counter Pickup</span>
                      )}
                    </td>
                    <td>
                      {s.driver_name ? (
                        <div>
                          <strong>{s.driver_name}</strong>
                          <div style={{ fontSize: '0.72rem', color: '#15803d' }}>Rent: {formatCurrency(s.rickshaw_rent || 0)}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>
                      )}
                    </td>
                    <td>
                      {s.vasan_summary ? (
                        <span style={{ fontSize: '0.76rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '3px', fontWeight: 700 }}>
                          {s.vasan_summary}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>
                      )}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 800, color: 'var(--vyapar-red)', fontSize: '0.95rem', textAlign: 'right' }}>
                      {formatCurrency(s.grand_total)}
                    </td>
                    <td className="font-mono" style={{ color: '#15803d', textAlign: 'right' }}>
                      {formatCurrency(s.paid_amount)}
                    </td>
                    <td className="font-mono" style={{ color: s.due_amount > 0 ? '#dc2626' : '#64748b', fontWeight: 800, textAlign: 'right' }}>
                      {formatCurrency(s.due_amount)}
                    </td>
                    <td>
                      {isCancelled ? (
                        <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          CANCELLED
                        </span>
                      ) : isPaid ? (
                        <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          PAID
                        </span>
                      ) : isPartial ? (
                        <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          PARTIAL
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          UNPAID
                        </span>
                      )}
                    </td>

                    {/* Complete Vyapar Action Options */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        {/* 1. View Details */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedInvoiceDetailsId(s.id)}
                          title="View Invoice Details"
                          style={{ padding: '4px 6px', fontSize: '0.72rem', color: '#2563eb' }}
                        >
                          <Eye size={13} />
                        </button>

                        {/* 2. 1-Click Print */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPrintInvoiceId(s.id)}
                          title="Print Bill"
                          style={{ padding: '4px 6px', fontSize: '0.72rem', color: '#0f172a' }}
                        >
                          <Printer size={13} />
                        </button>

                        {/* 3. Edit Bill */}
                        {!isCancelled && canEdit && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleEditSale(s)}
                            title="Edit Bill"
                            style={{ padding: '4px 6px', fontSize: '0.72rem', color: '#2563eb' }}
                          >
                            <Edit3 size={13} />
                          </button>
                        )}

                        {/* 4. Duplicate / Repeat Bill */}
                        {canEdit && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDuplicateSale(s)}
                            title="Duplicate / Repeat Bill"
                            style={{ padding: '4px 6px', fontSize: '0.72rem', color: '#7c3aed', background: '#f5f3ff', borderColor: '#ddd6fe' }}
                          >
                            <Copy size={13} />
                          </button>
                        )}

                        {/* 5. Payment In for this bill */}
                        {s.due_amount > 0 && !isCancelled && canEdit && (
                          <button
                            type="button"
                            className="btn btn-vyapar-green btn-sm"
                            onClick={() => {
                              setPaymentPartyName(s.customer_name);
                              setPaymentCustomerId(s.customer_id || undefined);
                              setPaymentDueAmount(s.due_amount);
                              setIsPaymentInOpen(true);
                            }}
                            title="Receive Payment for this Bill"
                            style={{ padding: '4px 6px', fontSize: '0.72rem', fontWeight: 800 }}
                          >
                            <ArrowDownLeft size={12} /> Pay In
                          </button>
                        )}

                        {/* 6. WhatsApp Share */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleWhatsAppBill(s)}
                          title="Share on WhatsApp"
                          style={{ padding: '4px 6px', fontSize: '0.72rem', color: '#16a34a' }}
                        >
                          <Share2 size={13} />
                        </button>

                        {/* 7. Cancel Bill (with Master PIN) */}
                        {s.status === 'ACTIVE' && canDelete && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPinConfirmSale(s)}
                            title="Cancel Bill (Master PIN 1234 Required)"
                            style={{ padding: '4px 6px', fontSize: '0.72rem', color: '#dc2626' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(isNewSaleOpen || !!editingSaleData || !!duplicateSaleData) && (
        <NewSaleModal
          isOpen={isNewSaleOpen || !!editingSaleData || !!duplicateSaleData}
          editingSale={editingSaleData}
          duplicateSale={duplicateSaleData}
          onClose={() => {
            setIsNewSaleOpen(false);
            setEditingSaleData(null);
            setDuplicateSaleData(null);
          }}
          onSuccess={(newSale, shouldPrint = true) => {
            setIsNewSaleOpen(false);
            setEditingSaleData(null);
            setDuplicateSaleData(null);
            fetchSales();
            const saleObj = (newSale as any)?.data || newSale;
            const sid = saleObj?.id || (saleObj as any)?.insertId;
            if (sid) {
              setPrintInvoiceId(sid);
              setAutoTriggerPrint(shouldPrint);
            }
          }}
        />
      )}

      {/* 2. Payment In Modal */}
      {isPaymentInOpen && (
        <PaymentModal
          isOpen={isPaymentInOpen}
          partyType="CUSTOMER"
          partyId={paymentCustomerId || 0}
          partyName={paymentPartyName}
          defaultAmount={paymentDueAmount || 0}
          onClose={() => {
            setIsPaymentInOpen(false);
            setPaymentDueAmount(undefined);
          }}
          onSuccess={() => {
            setIsPaymentInOpen(false);
            setPaymentDueAmount(undefined);
            fetchSales();
          }}
        />
      )}

      {/* 3. Invoice Details Modal */}
      {selectedInvoiceDetailsId && (
        <InvoiceDetailsModal
          isOpen={!!selectedInvoiceDetailsId}
          saleId={selectedInvoiceDetailsId}
          onClose={() => setSelectedInvoiceDetailsId(null)}
          onPrint={(id) => setPrintInvoiceId(id)}
          onEdit={(sale) => setEditingSaleData(sale)}
          onDuplicate={(sale) => setDuplicateSaleData(sale)}
          onPaymentIn={(name, custId, due) => {
            setPaymentPartyName(name);
            setPaymentCustomerId(custId);
            setPaymentDueAmount(due);
            setIsPaymentInOpen(true);
          }}
          onCancelInvoice={(id) => {
            const s = sales.find(x => x.id === id);
            if (s) setPinConfirmSale(s);
          }}
        />
      )}

      {isSalesReturnOpen && (
        <SalesReturnModal
          isOpen={isSalesReturnOpen}
          onClose={() => setIsSalesReturnOpen(false)}
          onSuccess={(result) => {
            setIsSalesReturnOpen(false);
            fetchSales();
            alert(`Sales Return #${result.return_no} recorded successfully! Total: ₹${result.total_amount}${result.vasan_returned ? ' (Vasan Returned: ' + result.vasan_returned + ')' : ''}`);
          }}
        />
      )}

      {printInvoiceId && (
        <InvoicePrintModal
          isOpen={!!printInvoiceId}
          saleId={printInvoiceId}
          autoPrint={autoTriggerPrint}
          onClose={() => {
            setPrintInvoiceId(null);
            setAutoTriggerPrint(false);
          }}
        />
      )}

      {isDriverTripOpen && (
        <DriverTripModal
          isOpen={isDriverTripOpen}
          onClose={() => setIsDriverTripOpen(false)}
        />
      )}

      {/* Master PIN Verification for Permanent Clean Bill Deletion */}
      {pinConfirmSale && (
        <MasterPinDialog
          isOpen={!!pinConfirmSale}
          title="Permanent Bill Delete"
          message={`Are you sure you want to permanently delete invoice #${pinConfirmSale.invoice_no} (${pinConfirmSale.customer_name} - ₹${pinConfirmSale.grand_total}) permanently? (Stock will be restored and ledger entry reversed). Enter Master PIN (1234):`}
          onClose={() => setPinConfirmSale(null)}
          onConfirm={async () => {
            const saleToDelete = pinConfirmSale;
            setPinConfirmSale(null);
            try {
              await api.deleteSale(saleToDelete.id);
              fetchSales();
            } catch (err: any) {
              alert(err.message || 'Failed to delete invoice');
            }
          }}
        />
      )}
    </div>
  );
};
