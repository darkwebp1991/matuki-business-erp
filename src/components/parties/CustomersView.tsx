import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Users, 
  BookOpen, 
  CreditCard, 
  Download, 
  Printer, 
  Phone, 
  MapPin, 
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
  Calendar,
  Eye,
  Trash2,
  ShoppingCart,
  MessageSquare,
  Edit3,
  Copy,
  ArrowLeft
} from 'lucide-react';
import { api } from '../../api/client';
import { Customer, LedgerEntry, Sale, User } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV, downloadCustomerTemplateCSV } from '../../utils/exportUtils';
import { canEditModule, isViewOnlyModule } from '../../utils/permissionUtils';
import { PaymentModal } from './PaymentModal';
import { InvoiceDetailsModal } from '../sales/InvoiceDetailsModal';
import { InvoicePrintModal } from '../sales/InvoicePrintModal';
import { NewSaleModal } from '../sales/NewSaleModal';
import { MasterPinDialog } from '../common/MasterPinDialog';
import { Modal } from '../common/Modal';
import { UgharaniReminderModal } from './UgharaniReminderModal';
import { CustomerModal } from './CustomerModal';
import { BulkImportModal } from '../common/BulkImportModal';
import { VoiceSearchButton } from '../common/VoiceSearchButton';

interface CustomersViewProps {
  initialSearch?: string;
  currentUser?: User | null;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ initialSearch = '', currentUser }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [filterType, setFilterType] = useState<'ALL' | 'RED' | 'YELLOW' | 'GREEN' | 'TO_COLLECT' | 'CLEARED'>('ALL');
  const [sortBy, setSortBy] = useState<'MAX_AMOUNT' | 'MIN_AMOUNT' | 'NAME_ASC' | 'NAME_DESC' | 'DEFAULT'>('MAX_AMOUNT');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [isUgharaniModalOpen, setIsUgharaniModalOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const canEdit = canEditModule(currentUser, 'customers');
  const isViewOnly = isViewOnlyModule(currentUser, 'customers');

  // Selected customer details
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'LEDGER'>('TRANSACTIONS');
  const [ledgerStatement, setLedgerStatement] = useState<any>(null);
  const [partySales, setPartySales] = useState<Sale[]>([]);

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isPaymentInOpen, setIsPaymentInOpen] = useState(false);
  const [isNewSaleForCustomerOpen, setIsNewSaleForCustomerOpen] = useState(false);
  const [editingSaleData, setEditingSaleData] = useState<Sale | null>(null);
  const [duplicateSaleData, setDuplicateSaleData] = useState<Sale | null>(null);
  const [pinConfirmSale, setPinConfirmSale] = useState<Sale | null>(null);
  const [selectedInvoiceDetailsId, setSelectedInvoiceDetailsId] = useState<number | null>(null);
  const [printInvoiceId, setPrintInvoiceId] = useState<number | null>(null);

  // Prefilled Payment Modal state
  const [paymentPartyName, setPaymentPartyName] = useState<string>('');
  const [paymentCustomerId, setPaymentCustomerId] = useState<number | undefined>(undefined);
  const [paymentDueAmount, setPaymentDueAmount] = useState<number | undefined>(undefined);

  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setIsCustomerModalOpen(true);
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers({ search });
      setCustomers(data);
      if (data.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    api.getSettings().then(setSettings).catch(console.error);
  }, [search]);

  // When selected customer changes, load ledger statement & transactions
  const refreshPartyData = () => {
    if (selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      setSelectedCustomer(cust || null);

      api.getPartyLedgerStatement('CUSTOMER', selectedCustomerId)
        .then(setLedgerStatement)
        .catch(console.error);

      api.getSales({ search: cust?.name || '' })
        .then(setPartySales)
        .catch(console.error);
    }
  };

  useEffect(() => {
    refreshPartyData();
  }, [selectedCustomerId, customers]);



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
    const phone = s.customer_mobile ? s.customer_mobile.replace(/[^0-9]/g, '') : (selectedCustomer?.mobile ? selectedCustomer.mobile.replace(/[^0-9]/g, '') : '');
    const itemsText = (s.items || [])
      .map((it, idx) => `${idx + 1}. ${it.product_name} - ${it.quantity} ${it.unit} @ ₹${it.rate} = ₹${it.amount}`)
      .join('%0A');

    const message = `*🧾 ${bName} - Sale Invoice*%0A` +
      `*Invoice #:* ${s.invoice_no}%0A` +
      `*Date:* ${formatDate(s.date)}%0A` +
      `*Customer:* ${s.customer_name}%0A` +
      `------------------------%0A` +
      `*Items:*%0A${itemsText}%0A` +
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

  const handleWhatsAppStatement = () => {
    if (!selectedCustomer) return;
    const bName = settings?.business_name || 'MATUKI SWEETS';
    const phone = selectedCustomer.mobile ? selectedCustomer.mobile.replace(/[^0-9]/g, '') : '';
    const msg = `*📊 ${bName} - Customer Account Statement*%0A` +
      `*Customer Name:* ${selectedCustomer.name}%0A` +
      `*Mobile:* ${selectedCustomer.mobile || '-'}\n` +
      `*Balance Due:* ₹${selectedCustomer.current_balance}%0A%0A` +
      `Thank you! *${bName}*`;
    const url = phone.length >= 10 ? `https://wa.me/91${phone.slice(-10)}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  const handleCancelSale = async (saleId: number) => {
    if (window.confirm('Are you sure you want to delete this sale invoice?')) {
      try {
        await api.cancelSale(saleId, 'Cancelled by user from party view');
        refreshPartyData();
        fetchCustomers();
      } catch (err: any) {
        alert(err.message || 'Failed to cancel bill');
      }
    }
  };

  const handleStrictWhatsAppNotice = (cust: any) => {
    const bName = settings?.business_name || 'MATUKI SWEETS';
    const phone = cust.mobile ? cust.mobile.replace(/[^0-9]/g, '') : '';
    if (!phone) {
      alert('No mobile number found for this customer.');
      return;
    }
    const days = cust.days_overdue || 30;
    const bal = Math.round(cust.current_balance || 0).toLocaleString('en-IN');
    const msg = `🚨 *URGENT OVERDUE PAYMENT NOTICE - ${bName.toUpperCase()}*%0A%0A` +
      `Namaste *${encodeURIComponent(cust.name)}* ji 🙏,%0A` +
      `This is an important update from *${bName}*.%0A%0A` +
      `Your account shows an overdue balance of *₹${bal}* pending for over *${days} days*.%0A%0A` +
      `━━━━━━━━━━━━━━━━━━━━%0A` +
      `💳 *Official UPI ID:* \`${settings?.upi_id || 'Q070321548@ybl'}\`%0A` +
      `📲 *1-Click Pay Link:* https://phon.pe/pay?pa=${settings?.upi_id || 'Q070321548@ybl'}&am=${Math.round(cust.current_balance || 0)}%0A` +
      `━━━━━━━━━━━━━━━━━━━━%0A%0A` +
      `Kindly clear this pending payment today to maintain an uninterrupted supply and booking account.%0A%0A` +
      `Thank you!%0A*${bName}*`;
    window.open(`https://wa.me/91${phone.slice(-10)}?text=${msg}`, '_blank');
  };

  const redCount = customers.filter(c => (c as any).risk_zone === 'RED').length;
  const yellowCount = customers.filter(c => (c as any).risk_zone === 'YELLOW').length;
  const greenCount = customers.filter(c => (c as any).risk_zone === 'GREEN').length;

  const filteredCustomers = customers
    .filter(c => {
      if (filterType === 'RED') return (c as any).risk_zone === 'RED';
      if (filterType === 'YELLOW') return (c as any).risk_zone === 'YELLOW';
      if (filterType === 'GREEN') return (c as any).risk_zone === 'GREEN';
      if (filterType === 'TO_COLLECT') return c.current_balance > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'MAX_AMOUNT') return (b.current_balance || 0) - (a.current_balance || 0);
      if (sortBy === 'MIN_AMOUNT') return (a.current_balance || 0) - (b.current_balance || 0);
      if (sortBy === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'NAME_DESC') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });

  const totalReceivable = customers.reduce((sum, c) => sum + (c.current_balance > 0 ? c.current_balance : 0), 0);

  return (
    <div className={`vyapar-party-layout ${showMobileDetail ? 'mobile-show-detail' : 'mobile-show-list'}`}>
      {/* LEFT COLUMN: Vyapar Searchable Party List */}
      <div className="vyapar-party-sidebar">
        {/* Header & Add Button */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card-alt)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Parties ({filteredCustomers.length})
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="btn btn-sm"
                onClick={() => setIsUgharaniModalOpen(true)}
                style={{ background: '#075e54', color: '#ffffff', fontSize: '0.72rem', padding: '3px 8px', fontWeight: 800 }}
                title="1-Click WhatsApp Ugharani & Balance Reminder Bot"
              >
                <MessageSquare size={12} /> Ugharani Bot
              </button>
              {canEdit && (
                <>
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setIsBulkImportOpen(true)}
                    style={{ fontSize: '0.72rem', padding: '3px 8px', fontWeight: 800, color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}
                    title="Import multiple customers/parties from Excel"
                  >
                    📥 Excel
                  </button>
                  <button className="btn btn-vyapar-red btn-sm" onClick={handleOpenAddCustomer} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                    <Plus size={13} /> + Party
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '30px', paddingRight: '10px', padding: '5px 10px 5px 30px', fontSize: '0.8rem', width: '100%' }}
              placeholder="Search customer / mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Vyapar-Style Sort Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            padding: '3px 6px',
            background: 'var(--bg-card)',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            fontSize: '0.7rem'
          }}>
            <span style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>
              ⚡ SORT:
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              <button
                type="button"
                onClick={() => setSortBy('MAX_AMOUNT')}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: sortBy === 'MAX_AMOUNT' ? '1px solid #16a34a' : '1px solid var(--border-color)',
                  background: sortBy === 'MAX_AMOUNT' ? '#dcfce7' : 'transparent',
                  color: sortBy === 'MAX_AMOUNT' ? '#15803d' : 'var(--text-secondary)'
                }}
                title="સૌથી વધુ લેવાના રૂપિયા (Highest Receivable First)"
              >
                🔼 Max ₹
              </button>
              <button
                type="button"
                onClick={() => setSortBy('MIN_AMOUNT')}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: sortBy === 'MIN_AMOUNT' ? '1px solid #2563eb' : '1px solid var(--border-color)',
                  background: sortBy === 'MIN_AMOUNT' ? '#eff6ff' : 'transparent',
                  color: sortBy === 'MIN_AMOUNT' ? '#1d4ed8' : 'var(--text-secondary)'
                }}
                title="સૌથી ઓછા લેવાના રૂપિયા (Lowest Receivable First)"
              >
                🔽 Min ₹
              </button>
              <button
                type="button"
                onClick={() => setSortBy(sortBy === 'NAME_ASC' ? 'NAME_DESC' : 'NAME_ASC')}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: (sortBy === 'NAME_ASC' || sortBy === 'NAME_DESC') ? '1px solid #7c3aed' : '1px solid var(--border-color)',
                  background: (sortBy === 'NAME_ASC' || sortBy === 'NAME_DESC') ? '#f3e8ff' : 'transparent',
                  color: (sortBy === 'NAME_ASC' || sortBy === 'NAME_DESC') ? '#6d28d9' : 'var(--text-secondary)'
                }}
                title="નામ મુજબ ક્રમબદ્ધ કરો (A to Z / Z to A)"
              >
                🔤 {sortBy === 'NAME_DESC' ? 'Z-A' : 'A-Z'}
              </button>
            </div>
          </div>


        </div>

        {/* Scrollable Party List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No parties found.
            </div>
          ) : (
            filteredCustomers.map(c => {
              const isSelected = c.id === selectedCustomerId;
              const rZone = (c as any).risk_zone || 'GREEN';
              const daysOver = (c as any).days_overdue || 0;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomerId(c.id);
                    setShowMobileDetail(true);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(211, 47, 47, 0.08)' : 'transparent',
                    borderLeft: isSelected 
                      ? '4px solid var(--vyapar-red)' 
                      : rZone === 'RED' 
                        ? '4px solid #dc2626' 
                        : rZone === 'YELLOW' 
                          ? '4px solid #f59e0b' 
                          : '4px solid transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        fontWeight: isSelected ? 800 : 700,
                        fontSize: '0.84rem',
                        color: isSelected ? 'var(--vyapar-red)' : 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden'
                      }}>
                        {c.name}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {c.mobile || 'No mobile'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.9rem',
                      color: '#059669'
                    }}>
                      {Number(c.current_balance ?? c.opening_balance ?? 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Total Footer */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Total Receivable:
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--vyapar-green)', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(totalReceivable)}
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: Selected Party Ledger & All Bill Transactions */}
      <div className="vyapar-party-main vyapar-party-detail-panel">
        {/* Mobile Back Button Header */}
        <div className="mobile-only-header" style={{ display: 'none', padding: '6px 0' }}>
          <button
            type="button"
            onClick={() => setShowMobileDetail(false)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
          >
            <ArrowLeft size={16} /> પાછા જાઓ (Back to Parties)
          </button>
        </div>
        {selectedCustomer ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
            {/* Risk Zone & Follow-up Alert Banner */}
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              background: (selectedCustomer as any).risk_zone === 'RED' ? '#fef2f2' : (selectedCustomer as any).risk_zone === 'YELLOW' ? '#fffbeb' : '#f0fdf4',
              border: `1.5px solid ${(selectedCustomer as any).risk_zone === 'RED' ? '#fecaca' : (selectedCustomer as any).risk_zone === 'YELLOW' ? '#fde68a' : '#bbf7d0'}`,
              color: (selectedCustomer as any).risk_zone === 'RED' ? '#991b1b' : (selectedCustomer as any).risk_zone === 'YELLOW' ? '#92400e' : '#166534'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {(selectedCustomer as any).risk_zone === 'RED' ? '🚨' : (selectedCustomer as any).risk_zone === 'YELLOW' ? '⚠️' : '🟢'}
                </span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>
                    {(selectedCustomer as any).risk_zone === 'RED' 
                      ? `RED ZONE: 30+ Days Overdue (Strict Follow-up Required)` 
                      : (selectedCustomer as any).risk_zone === 'YELLOW' 
                        ? `YELLOW ZONE: 15-30 Days Payment Due` 
                        : `GREEN ZONE: Safe Credit & Regular Settlement`}
                  </div>
                  <div style={{ fontSize: '0.74rem', opacity: 0.9, marginTop: '2px' }}>
                    {(selectedCustomer as any).risk_reason || 'Account healthy'}
                    {(selectedCustomer as any).last_payment_date && ` • Last Received Payment: ${formatDate((selectedCustomer as any).last_payment_date)}`}
                  </div>
                </div>
              </div>

              {/* Strict Follow-up Button for Red/Yellow zones */}
              {((selectedCustomer as any).risk_zone === 'RED' || (selectedCustomer as any).risk_zone === 'YELLOW') && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleStrictWhatsAppNotice(selectedCustomer)}
                  style={{
                    background: (selectedCustomer as any).risk_zone === 'RED' ? '#dc2626' : '#d97706',
                    color: '#ffffff',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '5px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  <MessageSquare size={13} /> {(selectedCustomer as any).risk_zone === 'RED' ? '🚨 Send Strict Overdue Notice (WA)' : '📲 Send Payment Reminder (WA)'}
                </button>
              )}
            </div>

            {/* Party Header Bar with Full Vyapar Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                  {selectedCustomer.name}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedCustomer.mobile && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} color="var(--vyapar-red)" /> {selectedCustomer.mobile}
                    </span>
                  )}
                  {selectedCustomer.email && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✉️ {selectedCustomer.email}
                    </span>
                  )}
                  {(selectedCustomer.city || selectedCustomer.address) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="var(--vyapar-red)" /> {[selectedCustomer.city, selectedCustomer.address].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {selectedCustomer.gstin && (
                    <span>GSTIN: <strong>{selectedCustomer.gstin}</strong></span>
                  )}
                  {selectedCustomer.credit_limit !== undefined && (
                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>
                      Limit: {formatCurrency(selectedCustomer.credit_limit)}
                    </span>
                  )}
                  {((selectedCustomer.advance_balance && selectedCustomer.advance_balance > 0) || selectedCustomer.current_balance < 0) && (
                    <span style={{ fontSize: '0.74rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, border: '1px solid #86efac' }}>
                      💰 Advance Held: {formatCurrency(selectedCustomer.advance_balance || Math.abs(selectedCustomer.current_balance))}
                    </span>
                  )}
                  {selectedCustomer.notes && (
                    <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                      📝 {selectedCustomer.notes}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: Total Balance & Iconic Vyapar Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right', paddingRight: '12px', borderRight: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Current Balance
                  </span>
                  <div style={{
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: selectedCustomer.current_balance > 0 ? 'var(--vyapar-green)' : 'var(--text-main)'
                  }}>
                    {formatCurrency(selectedCustomer.current_balance)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: selectedCustomer.current_balance > 0 ? 'var(--vyapar-green)' : 'var(--text-muted)', fontWeight: 700 }}>
                    {selectedCustomer.current_balance > 0 ? 'You will Receive' : 'Settled Balance'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Edit Profile Button */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEditCustomer(selectedCustomer)}
                    style={{ padding: '7px 11px', fontWeight: 800, fontSize: '0.8rem', color: '#1e40af', borderColor: '#bfdbfe', background: '#eff6ff', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Edit Name, Mobile, Address, GSTIN, and Preferences"
                  >
                    <Edit3 size={14} color="#2563eb" />
                    ✏️ Edit Profile
                  </button>

                  {/* + New Sale Button */}
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsNewSaleForCustomerOpen(true)}
                    style={{ padding: '7px 12px', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <ShoppingCart size={15} />
                    + New Sale
                  </button>

                  {/* + Payment In Button */}
                  <button
                    className="btn btn-vyapar-green"
                    onClick={() => {
                      setPaymentPartyName(selectedCustomer.name);
                      setPaymentCustomerId(selectedCustomer.id);
                      setPaymentDueAmount(selectedCustomer.current_balance > 0 ? selectedCustomer.current_balance : 0);
                      setIsPaymentInOpen(true);
                    }}
                    style={{ padding: '7px 12px', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <ArrowDownLeft size={15} />
                    + Payment In
                  </button>

                  {/* WhatsApp Statement & Reminder */}
                  <button
                    className="btn btn-sm"
                    onClick={() => setIsUgharaniModalOpen(true)}
                    style={{ background: '#075e54', color: '#ffffff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="1-Click WhatsApp Balance & Payment Reminder Bot"
                  >
                    <MessageSquare size={13} /> 📲 Send Reminder
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleWhatsAppStatement}
                    style={{ color: '#16a34a', borderColor: '#86efac', fontWeight: 700 }}
                    title="Send Full Statement via WhatsApp"
                  >
                    <Share2 size={13} /> Statement
                  </button>

                  {/* Print Statement */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => window.print()}
                    title="Print Statement"
                  >
                    <Printer size={15} />
                  </button>

                  {/* Export CSV */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (ledgerStatement?.entries) {
                        exportToCSV(ledgerStatement.entries, `${selectedCustomer.name}_Ledger.csv`);
                      }
                    }}
                    title="Export Excel / CSV"
                  >
                    <Download size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-tabs: Transactions vs Party Statement (Ledger) */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
              <button
                style={{
                  padding: '8px 16px',
                  background: activeTab === 'TRANSACTIONS' ? 'var(--vyapar-red)' : 'transparent',
                  color: activeTab === 'TRANSACTIONS' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab('TRANSACTIONS')}
              >
                Transactions ({partySales.length} Bills)
              </button>
              <button
                style={{
                  padding: '8px 16px',
                  background: activeTab === 'LEDGER' ? 'var(--vyapar-red)' : 'transparent',
                  color: activeTab === 'LEDGER' ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab('LEDGER')}
              >
                Statement of Account (Khata Ledger)
              </button>
            </div>

            {/* Tab 1: Transactions Table with Complete Vyapar Row Actions */}
            {activeTab === 'TRANSACTIONS' && (
              <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '85px' }}>Type</th>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                      <th style={{ textAlign: 'right' }}>Received</th>
                      <th style={{ textAlign: 'right' }}>Balance Due</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center', width: '220px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partySales.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No transactions recorded for this customer.
                        </td>
                      </tr>
                    ) : (
                      partySales.map(s => {
                        const isPaid = s.due_amount <= 0;
                        const isPartial = s.paid_amount > 0 && s.due_amount > 0;
                        const isCancelled = s.status === 'CANCELLED';

                        return (
                          <tr key={s.id} style={{ background: isCancelled ? '#fef2f2' : 'inherit' }}>
                            <td>
                              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>Sale</span>
                            </td>
                            <td 
                              className="font-mono" 
                              style={{ fontWeight: 800, color: 'var(--vyapar-red)', cursor: 'pointer' }}
                              onClick={() => setSelectedInvoiceDetailsId(s.id)}
                              title="Click to view details"
                            >
                              {s.invoice_no}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {formatDate(s.date)}
                            </td>
                            <td className="font-mono" style={{ fontWeight: 800, textAlign: 'right' }}>
                              {formatCurrency(s.grand_total)}
                            </td>
                            <td className="font-mono" style={{ color: 'var(--vyapar-green)', textAlign: 'right' }}>
                              {formatCurrency(s.paid_amount)}
                            </td>
                            <td className="font-mono" style={{ color: s.due_amount > 0 ? 'var(--vyapar-red)' : 'var(--text-muted)', fontWeight: 800, textAlign: 'right' }}>
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

                            {/* Complete Vyapar Row Actions Bar */}
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
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
                                {!isCancelled && (
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
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleDuplicateSale(s)}
                                  title="Duplicate / Repeat Bill"
                                  style={{ padding: '4px 6px', fontSize: '0.72rem', color: '#7c3aed', background: '#f5f3ff', borderColor: '#ddd6fe' }}
                                >
                                  <Copy size={13} />
                                </button>

                                {/* 5. Payment In against this bill */}
                                {s.due_amount > 0 && !isCancelled && (
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
                                    style={{ padding: '4px 7px', fontSize: '0.72rem', fontWeight: 800 }}
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
                                {!isCancelled && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setPinConfirmSale(s)}
                                    title="Cancel Bill (Master PIN Required)"
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
            )}

            {/* Tab 2: Vyapar Double-Entry Statement of Account (Ledger) */}
            {activeTab === 'LEDGER' && (
              <div className="table-container invoice-printable" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Voucher Type</th>
                      <th>Voucher #</th>
                      <th>Particulars / Notes</th>
                      <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                      <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                      <th style={{ textAlign: 'right' }}>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerStatement?.entries?.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No ledger entries found.
                        </td>
                      </tr>
                    ) : (
                      ledgerStatement?.entries?.map((entry: LedgerEntry) => (
                        <tr key={entry.id}>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {formatDate(entry.entry_date)}
                          </td>
                          <td>
                            <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                              {entry.voucher_type}
                            </span>
                          </td>
                          <td 
                            className="font-mono" 
                            style={{ 
                              color: 'var(--vyapar-red)', 
                              fontWeight: 700, 
                              cursor: entry.voucher_type === 'SALE' && entry.voucher_id ? 'pointer' : 'default' 
                            }}
                            onClick={() => {
                              if (entry.voucher_type === 'SALE' && entry.voucher_id) {
                                setSelectedInvoiceDetailsId(entry.voucher_id);
                              }
                            }}
                          >
                            {entry.voucher_no}
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            {entry.notes}
                          </td>
                          <td className="font-mono" style={{ color: entry.debit_amount > 0 ? 'var(--vyapar-green)' : 'inherit', textAlign: 'right' }}>
                            {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                          </td>
                          <td className="font-mono" style={{ color: entry.credit_amount > 0 ? 'var(--vyapar-red)' : 'inherit', textAlign: 'right' }}>
                            {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                          </td>
                          <td className="font-mono" style={{ fontWeight: 800, color: 'var(--text-main)', textAlign: 'right' }}>
                            {formatCurrency(entry.running_balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Select a customer from the left list to view ledger and transactions.
          </div>
        )}
      </div>

      {/* 1. Add / Edit Customer Modal */}
      {isCustomerModalOpen && (
        <CustomerModal
          isOpen={isCustomerModalOpen}
          customer={editingCustomer}
          onClose={() => setIsCustomerModalOpen(false)}
          onSuccess={(updatedCust) => {
            fetchCustomers();
            if (updatedCust && updatedCust.id) {
              setSelectedCustomerId(updatedCust.id);
              setSelectedCustomer(updatedCust);
            }
          }}
        />
      )}

      {/* 2. Payment In Modal */}
      {isPaymentInOpen && (
        <PaymentModal
          isOpen={isPaymentInOpen}
          partyType="CUSTOMER"
          partyId={paymentCustomerId || selectedCustomer?.id || 0}
          partyName={paymentPartyName || selectedCustomer?.name || ''}
          defaultAmount={paymentDueAmount !== undefined ? paymentDueAmount : (selectedCustomer?.current_balance && selectedCustomer.current_balance > 0 ? selectedCustomer.current_balance : 0)}
          onClose={() => {
            setIsPaymentInOpen(false);
            setPaymentDueAmount(undefined);
          }}
          onSuccess={() => {
            setIsPaymentInOpen(false);
            setPaymentDueAmount(undefined);
            fetchCustomers();
            refreshPartyData();
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
          onCancelInvoice={(id) => handleCancelSale(id)}
        />
      )}

      {/* 4. Invoice 1-Click Print Modal */}
      {printInvoiceId && (
        <InvoicePrintModal
          isOpen={!!printInvoiceId}
          saleId={printInvoiceId}
          onClose={() => setPrintInvoiceId(null)}
          autoPrint={true}
        />
      )}

      {/* 5. New Sale / Edit / Duplicate Sale for Customer Modal */}
      {(isNewSaleForCustomerOpen || !!editingSaleData || !!duplicateSaleData) && (
        <NewSaleModal
          isOpen={isNewSaleForCustomerOpen || !!editingSaleData || !!duplicateSaleData}
          editingSale={editingSaleData}
          duplicateSale={duplicateSaleData}
          initialCustomerId={editingSaleData ? undefined : selectedCustomer?.id}
          onClose={() => {
            setIsNewSaleForCustomerOpen(false);
            setEditingSaleData(null);
            setDuplicateSaleData(null);
          }}
          onSuccess={() => {
            setIsNewSaleForCustomerOpen(false);
            setEditingSaleData(null);
            setDuplicateSaleData(null);
            fetchCustomers();
            refreshPartyData();
          }}
        />
      )}

      {/* 6. Master PIN Security Dialog for Bill Cancellation */}
      {pinConfirmSale && (
        <MasterPinDialog
          isOpen={!!pinConfirmSale}
          title="Cancel Invoice Security Verification"
          message={`Are you sure you want to permanently delete invoice #${pinConfirmSale.invoice_no} (${pinConfirmSale.customer_name} - ₹${pinConfirmSale.grand_total})? Enter Master PIN (1234):`}
          onClose={() => setPinConfirmSale(null)}
          onConfirm={() => {
            const saleId = pinConfirmSale.id;
            setPinConfirmSale(null);
            handleCancelSale(saleId);
          }}
        />
      )}

      {/* 7. WhatsApp Ugharani Payment Reminder Bot Modal */}
      {isUgharaniModalOpen && (
        <UgharaniReminderModal
          isOpen={isUgharaniModalOpen}
          customers={customers}
          settings={settings}
          selectedCustomer={selectedCustomer}
          onClose={() => setIsUgharaniModalOpen(false)}
          onViewStatement={(c) => {
            setSelectedCustomerId(c.id);
            setActiveTab('LEDGER');
            setIsUgharaniModalOpen(false);
          }}
        />
      )}

      {/* 8. Bulk Import Customers from Excel */}
      {isBulkImportOpen && (
        <BulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          title="📥 Bulk Import Customers & Parties via Excel/CSV"
          subtitle="Download sample template, fill customer names, mobile numbers & credit limits, and upload directly"
          type="CUSTOMERS"
          onDownloadTemplate={downloadCustomerTemplateCSV}
          onImport={(rows) => api.bulkImportCustomers(rows)}
          onSuccessCallback={() => fetchCustomers()}
        />
      )}
    </div>
  );
};
