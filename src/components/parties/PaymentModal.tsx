import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  X, 
  Printer, 
  Save, 
  Wallet, 
  Maximize2, 
  Minimize2, 
  UserPlus, 
  Search, 
  Calendar, 
  Clock, 
  FileText, 
  Paperclip, 
  Settings, 
  AlertTriangle,
  Building,
  Check,
  ChevronDown
} from 'lucide-react';
import { api } from '../../api/client';
import { Customer, Supplier, PaymentAccount } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ImageUploadDropzone } from '../common/ImageUploadDropzone';
import { CustomerModal } from './CustomerModal';
import { SupplierModal } from './SupplierModal';

interface PaymentModalProps {
  isOpen: boolean;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId?: number | null;
  partyName?: string;
  defaultAmount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  partyType,
  partyId = null,
  partyName = '',
  defaultAmount = 0,
  onClose,
  onSuccess
}) => {
  const [parties, setParties] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(partyId ? String(partyId) : '');
  const [partySearchText, setPartySearchText] = useState<string>(partyName || '');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState<boolean>(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>(defaultAmount || '');
  const [discount, setDiscount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [shouldPrint, setShouldPrint] = useState<boolean>(false);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const [isAddPartyOpen, setIsAddPartyOpen] = useState<boolean>(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const partyInputRef = useRef<HTMLInputElement>(null);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const isPaymentIn = partyType === 'CUSTOMER';
  const selectedParty = parties.find(p => p.id === Number(selectedPartyId));
  const selectedAccount = accounts.find(a => a.id === Number(selectedAccountId));
  const totalCalculated = Number(amount || 0) + Number(discount || 0);

  // Check if any field has been touched/filled
  const isDirty = () => {
    const hasParty = Boolean(selectedPartyId) && (!partyId || String(partyId) !== selectedPartyId);
    const hasAmount = amount !== '' && Number(amount) > 0 && (!defaultAmount || Number(amount) !== defaultAmount);
    const hasDiscount = discount !== '' && Number(discount) > 0;
    const hasNotes = Boolean(notes && notes.trim() !== '');
    const hasAttachment = Boolean(attachmentUrl && attachmentUrl.trim() !== '');
    return hasParty || hasAmount || hasDiscount || hasNotes || hasAttachment;
  };

  const handleRequestClose = () => {
    if (isDirty()) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const loadParties = () => {
    if (partyType === 'CUSTOMER') {
      api.getCustomers().then(custs => {
        setParties(custs);
        if (partyId) {
          const found = custs.find(c => c.id === partyId);
          if (found) {
            setSelectedPartyId(String(found.id));
            setPartySearchText(found.name);
          }
        }
      }).catch(console.error);
    } else {
      api.getSuppliers().then(supps => {
        setParties(supps);
        if (partyId) {
          const found = supps.find(s => s.id === partyId);
          if (found) {
            setSelectedPartyId(String(found.id));
            setPartySearchText(found.name);
          }
        }
      }).catch(console.error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    loadParties();

    // Fetch sequential voucher number
    api.getNextDocumentNumber(isPaymentIn ? 'PAYMENT_IN' : 'PAYMENT_OUT')
      .then(res => {
        if (res && res.number) {
          setReceiptNo(res.number);
        }
      })
      .catch(console.error);

    api.getPaymentAccounts().then((accs) => {
      setAccounts(accs);
      const def = accs.find(a => a.is_default) || accs[0];
      if (def) {
        setSelectedAccountId(String(def.id));
      }
    }).catch(console.error);

    // Auto-focus amount or party input
    setTimeout(() => {
      if (partyId) {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      } else {
        partyInputRef.current?.focus();
      }
    }, 150);
  }, [partyType, isOpen, partyId]);

  // Outside click for party dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node) &&
          partyInputRef.current && !partyInputRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        if (isPartyDropdownOpen) {
          setIsPartyDropdownOpen(false);
          return;
        }
        if (showCloseConfirm) {
          setShowCloseConfirm(false);
          return;
        }
        handleRequestClose();
        return;
      }

      // Ctrl+S: Save
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSubmit();
        return;
      }

      // Ctrl+P: Save & Print
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setShouldPrint(true);
        handleSubmit();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedPartyId, amount, discount, notes, attachmentUrl, showCloseConfirm, isPartyDropdownOpen]);

  const handleModeChange = (mode: string) => {
    setPaymentMode(mode);
    const upper = mode.toUpperCase();
    const matched = accounts.find(a => a.account_type === upper) || accounts.find(a => a.account_name.toUpperCase().includes(upper));
    if (matched) {
      setSelectedAccountId(String(matched.id));
    }
  };

  const handleSelectParty = (p: any) => {
    setSelectedPartyId(String(p.id));
    setPartySearchText(p.name);
    setIsPartyDropdownOpen(false);
    setTimeout(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }, 50);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPartyId || !amount || Number(amount) <= 0) {
      setError(`Please select a ${isPaymentIn ? 'Customer' : 'Supplier'} and enter a valid amount`);
      return;
    }

    try {
      setSaving(true);
      setError('');

      await api.recordPayment({
        party_type: partyType,
        party_id: Number(selectedPartyId),
        payment_date: date,
        amount: Number(amount),
        payment_mode: paymentMode.toUpperCase(),
        account_id: selectedAccountId ? Number(selectedAccountId) : undefined,
        account_name: selectedAccount?.account_name || '',
        reference_no: receiptNo,
        notes: notes || `${isPaymentIn ? 'Payment In' : 'Payment Out'} - ${receiptNo}`,
        attachment_url: attachmentUrl
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredParties = parties.filter(p => {
    if (!partySearchText) return true;
    const q = partySearchText.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.mobile && p.mobile.includes(q));
  });

  const primaryColor = isPaymentIn ? '#16a34a' : '#dc2626';
  const primaryBg = isPaymentIn ? 'linear-gradient(135deg, #15803d 0%, #166534 100%)' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        padding: isFullscreen ? '0px' : '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999
      }}
    >
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: isFullscreen ? '100vw' : '900px', 
          width: '100%', 
          height: isFullscreen ? '100vh' : 'auto',
          maxHeight: isFullscreen ? '100vh' : '92vh',
          borderRadius: isFullscreen ? '0px' : '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
        }}
      >
        {/* Top Header matching Vyapar App Video */}
        <div 
          style={{
            padding: '12px 20px',
            background: primaryBg,
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex'
            }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, letterSpacing: '0.02em' }}>
                {isPaymentIn ? 'Payment-In' : 'Payment-Out'}
              </h2>
              <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                {isPaymentIn ? 'Record customer money collection & update ledger' : 'Record supplier / vendor payout'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              type="button"
              onClick={handleRequestClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2-Column Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div 
            style={{ 
              padding: '20px 24px', 
              display: 'grid', 
              gridTemplateColumns: '1.15fr 0.85fr', 
              gap: '24px',
              overflowY: 'auto',
              flex: 1,
              background: '#ffffff'
            }}
          >
            {/* LEFT COLUMN: Party, Payment Type, Description & Image Attachment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={15} />
                  {error}
                </div>
              )}

              {/* 1. Party Selector with Combobox & Balance */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                    Party *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddPartyOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: primaryColor,
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: 0
                    }}
                  >
                    <UserPlus size={12} /> + Add Party
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    ref={partyInputRef}
                    type="text"
                    className="form-input"
                    placeholder="Search by Name / Phone..."
                    style={{
                      fontSize: '0.88rem',
                      padding: '8px 12px',
                      fontWeight: 700,
                      borderColor: selectedPartyId ? primaryColor : '#cbd5e1',
                      background: selectedPartyId ? (isPaymentIn ? '#f0fdf4' : '#fef2f2') : '#ffffff'
                    }}
                    value={partySearchText}
                    onFocus={() => setIsPartyDropdownOpen(true)}
                    onChange={e => {
                      setPartySearchText(e.target.value);
                      setSelectedPartyId('');
                      setIsPartyDropdownOpen(true);
                    }}
                  />
                  <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '12px', top: '12px', pointerEvents: 'none' }} />
                </div>

                {/* Dropdown Menu with Party Balance (from Video) */}
                {isPartyDropdownOpen && (
                  <div
                    ref={partyDropdownRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      background: '#ffffff',
                      border: '1.5px solid #94a3b8',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      zIndex: 999999,
                      marginTop: '4px'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      background: '#f1f5f9',
                      borderBottom: '1px solid #cbd5e1',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#475569'
                    }}>
                      <span>PARTY NAME</span>
                      <span>PARTY BALANCE</span>
                    </div>

                    {filteredParties.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                        No party found. Click "+ Add Party" above.
                      </div>
                    ) : (
                      filteredParties.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectParty(p)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '0.82rem',
                            background: selectedPartyId === String(p.id) ? (isPaymentIn ? '#ecfdf5' : '#fef2f2') : '#ffffff'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = selectedPartyId === String(p.id) ? (isPaymentIn ? '#ecfdf5' : '#fef2f2') : '#ffffff'}
                        >
                          <div>
                            <strong style={{ color: '#0f172a' }}>{p.name}</strong>
                            {p.mobile && <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>({p.mobile})</span>}
                          </div>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 800,
                            color: Number(p.current_balance || 0) > 0 ? '#15803d' : '#64748b'
                          }}>
                            {formatCurrency(p.current_balance || 0)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Selected Party Balance Pill */}
                {selectedParty && (
                  <div style={{
                    marginTop: '6px',
                    padding: '6px 10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.78rem'
                  }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Current Party Ledger Balance:</span>
                    <strong style={{
                      fontFamily: 'var(--font-mono)',
                      color: Number(selectedParty.current_balance || 0) > 0 ? (isPaymentIn ? '#15803d' : '#dc2626') : '#64748b'
                    }}>
                      {formatCurrency(selectedParty.current_balance || 0)}
                    </strong>
                  </div>
                )}
              </div>

              {/* 2. Payment Type (Cash / Cheque / Bank / UPI) */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Payment Type
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Cash', 'Cheque', 'Bank A/C', 'UPI'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleModeChange(mode)}
                      style={{
                        flex: '1 1 70px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1.5px solid',
                        borderColor: paymentMode === mode ? primaryColor : '#cbd5e1',
                        background: paymentMode === mode ? (isPaymentIn ? '#f0fdf4' : '#fef2f2') : '#ffffff',
                        color: paymentMode === mode ? primaryColor : '#334155',
                        fontSize: '0.82rem',
                        fontWeight: paymentMode === mode ? 800 : 600,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Paid to / from Account dropdown if Bank/Cheque */}
                {paymentMode !== 'Cash' && accounts.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>
                      {isPaymentIn ? 'Deposit To Bank Account:' : 'Pay From Bank Account:'}
                    </label>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                      value={selectedAccountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_name} ({acc.account_type}) — Bal: {formatCurrency(acc.current_balance)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 3. Description / Remarks (Collapsible / Expandable) */}
              <div>
                {!showDescription && !notes ? (
                  <button
                    type="button"
                    onClick={() => setShowDescription(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: primaryColor,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FileText size={13} /> + ADD DESCRIPTION
                  </button>
                ) : (
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Description / Remarks
                    </label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="Add transaction notes, Cheque #, UTR #, or bank reference..."
                      style={{ fontSize: '0.82rem', resize: 'vertical' }}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* 4. Attach Bill / Voucher Image Dropzone */}
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  📷 Attach Bill / Cheque / Original Receipt Photo
                </label>
                <ImageUploadDropzone
                  value={attachmentUrl}
                  onChange={setAttachmentUrl}
                  placeholder="Click or drag payment proof / bill photo here"
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Receipt No, Date, Time, Amount, Discount, Total */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Receipt No */}
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  {isPaymentIn ? 'Receipt No' : 'Voucher No'}
                </label>
                <input
                  type="text"
                  className="form-input font-mono"
                  style={{ fontWeight: 800, fontSize: '0.86rem', color: primaryColor }}
                  value={receiptNo}
                  onChange={e => setReceiptNo(e.target.value)}
                />
              </div>

              {/* Date & Time Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ fontSize: '0.84rem' }}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    Time
                  </label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    style={{ fontSize: '0.84rem' }}
                    value={time}
                    onChange={e => setTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Received (or Paid) Amount */}
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  {isPaymentIn ? 'Received Amount (₹) *' : 'Paid Amount (₹) *'}
                </label>
                <input
                  ref={amountInputRef}
                  type="number"
                  step="any"
                  min="0"
                  required
                  className="form-input font-mono"
                  placeholder="0.00"
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    textAlign: 'right',
                    color: primaryColor,
                    borderColor: primaryColor,
                    background: '#ffffff'
                  }}
                  value={amount}
                  onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              {/* Discount */}
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '3px' }}>
                  Discount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="form-input font-mono"
                  placeholder="0.00"
                  style={{ fontSize: '0.9rem', textAlign: 'right', fontWeight: 700 }}
                  value={discount}
                  onChange={e => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              {/* Total Calculation Card */}
              <div style={{
                background: isPaymentIn ? '#f0fdf4' : '#fef2f2',
                border: `1.5px solid ${isPaymentIn ? '#86efac' : '#fca5a5'}`,
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 'auto'
              }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155' }}>
                  Total:
                </span>
                <span style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono)',
                  color: primaryColor
                }}>
                  {formatCurrency(totalCalculated)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer with Print & Save */}
          <div 
            style={{
              padding: '12px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            {/* Left: Print Toggle */}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
              <input
                type="checkbox"
                checked={shouldPrint}
                onChange={e => setShouldPrint(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: primaryColor }}
              />
              <Printer size={15} color="#475569" />
              <span>Print Receipt / Slip (Ctrl+P)</span>
            </label>

            {/* Right: Cancel & Save Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRequestClose}
                disabled={saving}
                style={{ padding: '7px 16px', fontSize: '0.84rem' }}
              >
                Cancel [Esc]
              </button>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-sm"
                style={{
                  background: primaryBg,
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '7px 20px',
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: `0 2px 8px ${isPaymentIn ? 'rgba(22, 163, 74, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`
                }}
              >
                <Save size={15} />
                {saving ? 'Saving...' : 'Save [Ctrl+S]'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Quick Add Party Modals */}
      {isAddPartyOpen && (
        isPaymentIn ? (
          <CustomerModal
            isOpen={isAddPartyOpen}
            onClose={() => setIsAddPartyOpen(false)}
            onSuccess={(newCust) => {
              setIsAddPartyOpen(false);
              loadParties();
              setSelectedPartyId(String(newCust.id));
              setPartySearchText(newCust.name);
            }}
          />
        ) : (
          <SupplierModal
            isOpen={isAddPartyOpen}
            onClose={() => setIsAddPartyOpen(false)}
            onSuccess={(newSupp) => {
              setIsAddPartyOpen(false);
              loadParties();
              setSelectedPartyId(String(newSupp.id));
              setPartySearchText(newSupp.name);
            }}
          />
        )
      )}

      {/* Discard Confirmation Dialog on ESC */}
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
              Discard Current {isPaymentIn ? 'Payment-In' : 'Payment-Out'}?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              You have entered unsaved payment details. Are you sure you want to discard and close?
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
