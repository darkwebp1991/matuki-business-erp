import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Trash2, X, Save } from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import { PaymentAccount } from '../../types';
import { ImageUploadDropzone } from '../common/ImageUploadDropzone';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const defaultCategories = [
    'DIESEL, PETROL & GAS',
    'DISTRIBUTOR COMMISSION',
    'FSSAI AND TAX EXPENSES',
    'GENERAL MAINTENANCE',
    'GODOWN LIGHT BILL',
    'KARIGAR / FACTORY EXPENSES',
    'LIGHT BILL',
    'OFFICE EXPENSES',
    'PETROL',
    'RENT',
    'TEA & NASHTO',
    'TIFFIN'
  ];

  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategories[0]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [expenseType, setExpenseType] = useState<'DIRECT' | 'INDIRECT'>('INDIRECT');
  const [plCategory, setPlCategory] = useState<string>('INDIRECT_EXPENSES');
  const [location, setLocation] = useState<string>('FACTORY');
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [expenseNo, setExpenseNo] = useState<string>(`EXP-${Date.now().toString().slice(-5)}`);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [paymentMode, setPaymentMode] = useState<string>('Cash');

  const [items, setItems] = useState<Array<{
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }>>([
    { name: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [billPhotoUrl, setBillPhotoUrl] = useState<string>('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const isDirty = () => {
    const hasItems = items.some(i => (i.name && i.name.trim() !== '') || (Number(i.rate) > 0) || (Number(i.amount) > 0));
    const hasPhoto = Boolean(billPhotoUrl && billPhotoUrl.trim() !== '');
    return hasItems || hasPhoto;
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
  }, [isOpen, items, billPhotoUrl, showCloseConfirm]);

  useEffect(() => {
    api.getNextDocumentNumber('EXPENSE').then(res => {
      if (res && res.number) {
        setExpenseNo(res.number);
      }
    }).catch(console.error);

    api.getPaymentAccounts().then((accs) => {
      setAccounts(accs);
      const def = accs.find(a => a.is_default) || accs[0];
      if (def) {
        setSelectedAccountId(String(def.id));
      }
    }).catch(console.error);

    api.getSuppliers().then((sups) => {
      setSuppliers(sups || []);
    }).catch(console.error);
  }, [isOpen]);

  const selectedAccount = accounts.find(a => a.id === Number(selectedAccountId));

  const handleSupplierSelect = (supId: string) => {
    setSelectedSupplierId(supId);
    if (!supId) return;
    const found = suppliers.find(s => s.id === Number(supId));
    if (found) {
      if (found.expense_type) setExpenseType(found.expense_type);
      if (found.pl_category) {
        setPlCategory(found.pl_category);
        setSelectedCategory(found.pl_category);
      }
      if (found.allocated_location) setLocation(found.allocated_location);
    }
  };

  const handleModeChange = (mode: string) => {
    setPaymentMode(mode);
    const upper = mode.toUpperCase();
    const matched = accounts.find(a => a.account_type === upper) || accounts.find(a => a.account_name.toUpperCase().includes(upper));
    if (matched) {
      setSelectedAccountId(String(matched.id));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    item.amount = Math.round(Number(item.quantity || 0) * Number(item.rate || 0) * 100) / 100;
    updated[index] = item;
    setItems(updated);
  };

  const handleAddRow = () => {
    setItems([...items, { name: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length === 1) {
      setItems([{ name: '', quantity: 1, rate: 0, amount: 0 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const isOverhead = expenseType === 'DIRECT' || selectedCategory.includes('GAS') || selectedCategory.includes('KARIGAR') || selectedCategory.includes('FACTORY');
      const matchedSup = suppliers.find(s => s.id === Number(selectedSupplierId));

      await api.createExpense({
        category: selectedCategory,
        amount: totalAmount,
        date,
        payment_mode: paymentMode.toUpperCase(),
        account_id: selectedAccountId ? Number(selectedAccountId) : undefined,
        account_name: selectedAccount?.account_name || '',
        reference_no: expenseNo,
        notes: items.map(i => i.name).filter(Boolean).join(', ') || selectedCategory,
        bill_photo_url: billPhotoUrl,
        supplier_id: selectedSupplierId ? Number(selectedSupplierId) : undefined,
        supplier_name: matchedSup?.name || '',
        expense_type: expenseType,
        pl_category: plCategory,
        location: location,
        is_manufacturing_overhead: isOverhead ? 1 : 0
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ padding: '8px' }}>
      <div className="modal-content" style={{ maxWidth: '860px', width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header from Video 02:58 */}
        <div style={{
          padding: '12px 18px',
          background: '#d32f2f',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)'
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
            Expense Voucher
          </h2>
          <button
            type="button"
            onClick={handleRequestClose}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto' }}>
            {error && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#dc2626', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            {/* Top Details: Vendor, P&L Classification, Location, Expense No, Date */}
            <div style={{
              background: '#f8fafc',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* Row 1: Vendor Selection & Basic info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800, color: '#1e293b' }}>
                    🏢 Linked Vendor / Party (વેપારી / પાર્ટી)
                  </label>
                  <select
                    className="form-select"
                    value={selectedSupplierId}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                    style={{ background: '#fff', fontWeight: 600 }}
                  >
                    <option value="">-- General Expense / No Vendor --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.expense_type === 'DIRECT' ? '🍬 Direct' : '📂 Indirect'} • {s.allocated_location || 'Factory'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Expense No</label>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={expenseNo}
                    onChange={(e) => setExpenseNo(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 2: Google P&L Classification, P&L Head, and Location */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '12px', background: '#f0fdf4', padding: '10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#166534' }}>
                    Expense Nature *
                  </label>
                  <select
                    className="form-select"
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value as any)}
                    style={{ fontSize: '0.8rem', padding: '6px 8px', background: '#fff', fontWeight: 800 }}
                  >
                    <option value="DIRECT">🍬 Direct Expense</option>
                    <option value="INDIRECT">📂 Indirect Expense</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#166534' }}>
                    Google P&L Expense Head *
                  </label>
                  <select
                    className="form-select"
                    value={plCategory}
                    onChange={(e) => {
                      setPlCategory(e.target.value);
                      setSelectedCategory(e.target.value);
                    }}
                    style={{ fontSize: '0.8rem', padding: '6px 8px', background: '#fff', fontWeight: 700 }}
                  >
                    <option value="DIRECT_EXPENSES">🍬 Direct Expenses (કાચો માલ, દૂધ, માવો, ઘી)</option>
                    <option value="TRANSPORTATION">🚚 Transportation (વાહન ભાડું, ટેમ્પો, રિક્ષા)</option>
                    <option value="LABOUR_CHARGES">👨‍🍳 Labour Charges (કારીગર મજૂરી, ડેઈલી વેજ)</option>
                    <option value="FUEL_EXPENSES">⛽ Fuel Expenses (પેટ્રોલ / ડીઝલ ફ્યુઅલ ખર્ચ)</option>
                    <option value="MEDICAL_EXPENSES">🏥 Medical Expenses (સ્ટાફ હેલ્થ & દવા ખર્ચ)</option>
                    <option value="GENERAL_MAINTENANCE">🔧 General Maintenance & Repairs (રિપેરિંગ)</option>
                    <option value="LIGHT_BILL">💡 Light Bill & Power (વીજળી બિલ & પાવર)</option>
                    <option value="GST_TAX_EXPENSES">🏛️ GST & Tax Expenses (જીએસટી & કરવેરા)</option>
                    <option value="PARTNER_SALARY">💼 Partner Salary & Withdrawals (પાર્ટનર સેલેરી)</option>
                    <option value="TEAM_KARIYANU">🍚 Team Kariyanu / Staff Kitchen (કરિયાણું)</option>
                    <option value="PACKAGING_BOXES">📦 Packaging Boxes & Sweet Boxes (પેકિંગ)</option>
                    <option value="COMMERCIAL_GAS">🔥 Commercial LPG Gas Cylinders (ગેસ)</option>
                    <option value="SHOP_FACTORY_RENT">🏢 Shop & Factory Rent (ભાડું)</option>
                    <option value="INDIRECT_EXPENSES">📂 General Indirect Expenses (સામાન્ય ખર્ચ)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#166534' }}>
                    Allocated Location *
                  </label>
                  <select
                    className="form-select"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '6px 8px', background: '#fff', fontWeight: 700 }}
                  >
                    <option value="FACTORY">🏭 Main Factory / Kitchen</option>
                    <option value="SARTHANA">🏪 Outlet 1 - Sarthana</option>
                    <option value="KATARGAM">🏪 Outlet 2 - Katargam</option>
                    <option value="HEAD_OFFICE">🏢 Head Office / All Branches</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Items Grid */}
            <div className="table-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '35px' }}>#</th>
                    <th style={{ width: '50%' }}>ITEM / DESCRIPTION</th>
                    <th>QTY</th>
                    <th>PRICE / UNIT (₹)</th>
                    <th style={{ textAlign: 'right' }}>AMOUNT (₹)</th>
                    <th style={{ width: '35px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                          placeholder="e.g. 2 LPG commercial gas bottles for kitchen"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          className="form-input"
                          style={{ width: '70px', padding: '4px 6px', textAlign: 'right', fontSize: '0.82rem' }}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="10"
                          className="form-input"
                          style={{ width: '100px', padding: '4px 6px', textAlign: 'right', fontSize: '0.82rem' }}
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                        />
                      </td>
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                        {formatCurrency(item.amount)}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddRow}
                style={{ alignSelf: 'flex-start', borderStyle: 'dashed' }}
              >
                <Plus size={14} /> + Add Row
              </button>

              <div style={{ flex: 1, maxWidth: '400px' }}>
                <ImageUploadDropzone
                  value={billPhotoUrl}
                  onChange={setBillPhotoUrl}
                  placeholder="Attach expense receipt / gas slip photo"
                />
              </div>
            </div>
          </div>

          {/* Footer from Video 03:00 */}
          <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Mode:</span>
                {['Cash', 'Bank', 'UPI'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      background: paymentMode === mode ? '#d32f2f' : '#ffffff',
                      color: paymentMode === mode ? '#ffffff' : '#0f172a',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleModeChange(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Paid From Account Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Paid From:</span>
                <select
                  className="form-select"
                  style={{ padding: '3px 8px', fontSize: '0.78rem', width: 'auto', fontWeight: 600 }}
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (Bal: {formatCurrency(acc.current_balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
                Total: {formatCurrency(totalAmount)}
              </div>
              <button
                type="submit"
                className="btn btn-vyapar-red"
                disabled={saving}
              >
                <Save size={15} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
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
              Discard Current Expense?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              You have entered unsaved expense items. Are you sure you want to discard and close?
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
