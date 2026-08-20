import React, { useState, useEffect } from 'react';
import { 
  X, 
  Truck, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  CreditCard, 
  Landmark, 
  DollarSign, 
  Save, 
  Building,
  CheckCircle2,
  QrCode
} from 'lucide-react';
import { Supplier } from '../../types';
import { api } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';

interface SupplierModalProps {
  isOpen: boolean;
  supplier?: Supplier | null;
  onClose: () => void;
  onSuccess: (supplier: Supplier) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  supplier,
  onClose,
  onSuccess
}) => {
  const isEditing = !!supplier;

  const [name, setName] = useState('');
  const [supplierNo, setSupplierNo] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [gstin, setGstin] = useState('');
  const [creditTerms, setCreditTerms] = useState('Net 15 Days');
  const [bankName, setBankName] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const [expenseType, setExpenseType] = useState<'DIRECT' | 'INDIRECT'>('DIRECT');
  const [plCategory, setPlCategory] = useState<string>('DIRECT_EXPENSES');
  const [allocatedLocation, setAllocatedLocation] = useState<string>('FACTORY');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '');
      setSupplierNo(supplier.supplier_no || '');
      setContactPerson(supplier.contact_person || '');
      setMobile(supplier.mobile || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setCity(supplier.city || '');
      setGstin(supplier.gstin || '');
      setCreditTerms(supplier.credit_terms || 'Net 15 Days');
      setExpenseType(supplier.expense_type || 'DIRECT');
      setPlCategory(supplier.pl_category || 'DIRECT_EXPENSES');
      setAllocatedLocation(supplier.allocated_location || 'FACTORY');
      setBankName(supplier.bank_name || '');
      setBankAccountNo(supplier.bank_account_no || '');
      setBankIfsc(supplier.bank_ifsc || '');
      setUpiId(supplier.upi_id || '');
      setOpeningBalance(String(supplier.opening_balance ?? 0));
      setNotes(supplier.notes || '');
      setActive(supplier.active === 1);
    } else {
      setName('');
      setSupplierNo('');
      setContactPerson('');
      setMobile('');
      setEmail('');
      setAddress('');
      setCity('');
      setGstin('');
      setCreditTerms('Net 15 Days');
      setExpenseType('DIRECT');
      setPlCategory('DIRECT_EXPENSES');
      setAllocatedLocation('FACTORY');
      setBankName('');
      setBankAccountNo('');
      setBankIfsc('');
      setUpiId('');
      setOpeningBalance('0');
      setNotes('');
      setActive(true);
    }
    setError('');
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Supplier / Vendor name is required.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        name: name.trim(),
        supplier_no: supplierNo.trim() || undefined,
        contact_person: contactPerson.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        gstin: gstin.trim().toUpperCase(),
        credit_terms: creditTerms.trim(),
        expense_type: expenseType,
        pl_category: plCategory,
        allocated_location: allocatedLocation,
        bank_name: bankName.trim(),
        bank_account_no: bankAccountNo.trim(),
        bank_ifsc: bankIfsc.trim().toUpperCase(),
        upi_id: upiId.trim(),
        notes: notes.trim(),
        active: active ? 1 : 0,
        ...(!isEditing && {
          opening_balance: Number(openingBalance) || 0
        })
      };

      let resultSupplier: Supplier;
      if (isEditing && supplier) {
        const res = await api.updateSupplier(supplier.id, payload);
        resultSupplier = (res as any).data || res;
      } else {
        const res = await api.createSupplier(payload);
        resultSupplier = (res as any).data || res;
      }

      onSuccess(resultSupplier);
      onClose();
    } catch (err: any) {
      console.error('Error saving supplier:', err);
      setError(err.message || 'Failed to save supplier profile');
    } finally {
      setSaving(false);
    }
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
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          background: isEditing 
            ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
            : 'linear-gradient(135deg, #475569 0%, #334155 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ffffff', color: isEditing ? '#0284c7' : '#334155', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Truck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                {isEditing ? `Edit Vendor / Supplier Profile: ${supplier?.name}` : '+ Add New Raw Material Supplier / Vendor'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', opacity: 0.9 }}>
                {isEditing ? `Vendor Code: ${supplier?.supplier_no || ''}` : 'Enter vendor contact, payment terms, and bank details'}
              </p>
            </div>
          </div>

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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1.5px solid #f87171', borderRadius: '6px', color: '#b91c1c', fontSize: '0.82rem', fontWeight: 700 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Row 1: Company Name & Supplier Code */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amul Dairy Products / Gokul Dryfruits"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Vendor Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SUP-001 (Auto)"
                  className="form-input font-mono"
                  value={supplierNo}
                  onChange={e => setSupplierNo(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Contact Person & Mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} color="#64748b" /> Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajeshbhai Shah"
                  className="form-input"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={13} color="#16a34a" /> Mobile Number
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  className="form-input font-mono"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mail size={13} color="#2563eb" /> Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. sales@vendor.com"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Row 3: City & Address */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="#ea580c" /> City / Area
                </label>
                <input
                  type="text"
                  placeholder="e.g. Surat / Anand"
                  className="form-input"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Vendor Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot No. 12, GIDC Industrial Estate"
                  className="form-input"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Row 4: GSTIN & Credit Terms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  GSTIN (15-Digit)
                </label>
                <input
                  type="text"
                  placeholder="24AAAAA0000A1Z5"
                  className="form-input font-mono"
                  style={{ textTransform: 'uppercase' }}
                  value={gstin}
                  onChange={e => setGstin(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Payment Credit Terms
                </label>
                <select
                  className="form-select"
                  value={creditTerms}
                  onChange={e => setCreditTerms(e.target.value)}
                >
                  <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                  <option value="Advance Payment">100% Advance Payment</option>
                  <option value="Net 7 Days">Net 7 Days</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Weekly Every Sunday">Weekly Every Sunday</option>
                </select>
              </div>
            </div>

            {/* Google P&L Accounting Classification & Location Allocation */}
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={15} color="#15803d" /> 📊 Google P&L Accounting & Location Classification (નફા-નુકસાન & બ્રાન્ચ ફાળવણી)
                </div>
                <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                  Accurate P&L Hisab ⚡
                </span>
              </div>

              {/* 1. Direct vs Indirect Selection */}
              <div>
                <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
                  Expense Nature / Classification (ખર્ચનો પ્રકાર) *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1.5px solid ${expenseType === 'DIRECT' ? '#16a34a' : '#cbd5e1'}`,
                    background: expenseType === 'DIRECT' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    fontWeight: expenseType === 'DIRECT' ? 800 : 500
                  }}>
                    <input
                      type="radio"
                      name="expense_type"
                      checked={expenseType === 'DIRECT'}
                      onChange={() => {
                        setExpenseType('DIRECT');
                        if (plCategory === 'INDIRECT_EXPENSES') setPlCategory('DIRECT_EXPENSES');
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 800 }}>🍬 Direct Expense (ડાયરેક્ટ ખર્ચ)</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>કાચો માલ, દૂધ, માવો, ઘી, ખાંડ, ગેસ, પેકિંગ</div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1.5px solid ${expenseType === 'INDIRECT' ? '#2563eb' : '#cbd5e1'}`,
                    background: expenseType === 'INDIRECT' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    fontWeight: expenseType === 'INDIRECT' ? 800 : 500
                  }}>
                    <input
                      type="radio"
                      name="expense_type"
                      checked={expenseType === 'INDIRECT'}
                      onChange={() => {
                        setExpenseType('INDIRECT');
                        if (plCategory === 'DIRECT_EXPENSES') setPlCategory('INDIRECT_EXPENSES');
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 800 }}>📂 Indirect Expense (ઈનડાયરેક્ટ ખર્ચ)</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>ઓફિસ, મજૂરી, ભાડું, લાઈટબિલ, વાહન, દવા</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. P&L Head & Location Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b' }}>
                    Google P&L Expense Head (P&L શીટ હેડ / એકાઉન્ટ) *
                  </label>
                  <select
                    className="form-select"
                    value={plCategory}
                    onChange={e => setPlCategory(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '7px 10px', background: '#ffffff', fontWeight: 700 }}
                  >
                    <optgroup label="🍬 Direct Cost of Goods / Manufacturing">
                      <option value="DIRECT_EXPENSES">🍬 Direct Expenses (કાચો માલ, દૂધ, માવો, ઘી, ડ્રાયફ્રૂટ્સ)</option>
                      <option value="PACKAGING_BOXES">📦 Packaging Boxes & Sweet Boxes (પેકિંગ બોક્સ & વરખ)</option>
                      <option value="COMMERCIAL_GAS">🔥 Commercial LPG Gas Cylinders (કોમર્શિયલ ગેસ)</option>
                    </optgroup>

                    <optgroup label="🚚 Operating & Overhead Heads (Google P&L)">
                      <option value="TRANSPORTATION">🚚 Transportation Charges (વાહન ભાડું, ટેમ્પો, રિક્ષા)</option>
                      <option value="LABOUR_CHARGES">👨‍🍳 Labour Charges (કારીગર મજૂરી, ડેઈલી વેજ)</option>
                      <option value="FUEL_EXPENSES">⛽ Fuel Expenses (પેટ્રોલ / ડીઝલ ફ્યુઅલ ખર્ચ)</option>
                      <option value="MEDICAL_EXPENSES">🏥 Medical Expenses (સ્ટાફ હેલ્થ & દવા ખર્ચ)</option>
                      <option value="GENERAL_MAINTENANCE">🔧 General Maintenance & Repairs (રિપેરિંગ & મેન્ટેનન્સ)</option>
                      <option value="LIGHT_BILL">💡 Light Bill & Power (વીજળી બિલ & પાવર)</option>
                      <option value="GST_TAX_EXPENSES">🏛️ GST & Tax Expenses (જીએસટી & કરવેરા ખર્ચ)</option>
                      <option value="PARTNER_SALARY">💼 Partner Salary & Withdrawals (પાર્ટનર સેલેરી & ઉપાડ)</option>
                      <option value="TEAM_KARIYANU">🍚 Team Kariyanu / Staff Kitchen (સ્ટાફ કરિયાણું & રસોડું)</option>
                      <option value="SHOP_FACTORY_RENT">🏢 Shop & Factory Rent (દુકાન-કારખાનું ભાડું)</option>
                      <option value="INDIRECT_EXPENSES">📂 General Indirect Expenses (સામાન્ય ઓફિસ ખર્ચ)</option>
                    </optgroup>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b' }}>
                    Allocated Location / Branch (બ્રાન્ચ / કારખાનું) *
                  </label>
                  <select
                    className="form-select"
                    value={allocatedLocation}
                    onChange={e => setAllocatedLocation(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '7px 10px', background: '#ffffff', fontWeight: 700 }}
                  >
                    <option value="FACTORY">🏭 Main Factory / Kitchen (મેઈન કારખાનું)</option>
                    <option value="SARTHANA">🏪 Outlet 1 - Sarthana (સરથાણા શાખા)</option>
                    <option value="KATARGAM">🏪 Outlet 2 - Katargam (કતારગામ શાખા)</option>
                    <option value="HEAD_OFFICE">🏢 Head Office / All Outlets (મુખ્ય ઓફિસ / તમામ)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bank & Payment Details Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Landmark size={14} color="#0284c7" /> Vendor Bank & UPI Details (For Payment Out Vouchers)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    className="form-input"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 50200012345678"
                    className="form-input font-mono"
                    value={bankAccountNo}
                    onChange={e => setBankAccountNo(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>IFSC Code</label>
                  <input
                    type="text"
                    placeholder="HDFC0001234"
                    className="form-input font-mono"
                    style={{ textTransform: 'uppercase' }}
                    value={bankIfsc}
                    onChange={e => setBankIfsc(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Vendor UPI ID</label>
                  <input
                    type="text"
                    placeholder="vendor@upi"
                    className="form-input font-mono"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* If Adding New Supplier: Show Opening Balance */}
            {!isEditing && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800, color: '#b91c1c' }}>
                  🔴 Previous Opening Balance Payable to Vendor (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  className="form-input font-mono"
                  style={{ fontWeight: 800, color: '#b91c1c', background: '#fef2f2', borderColor: '#fca5a5', maxWidth: '300px' }}
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                />
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Matuki Sweets owes this starting balance to the supplier.
                </span>
              </div>
            )}

            {/* Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Notes / Special Terms
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Delivers mawa daily at 7 AM / Ghee supplier / 2% cash discount on same-day payment"
                className="form-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Active Status Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <input
                type="checkbox"
                id="supplier_active"
                checked={active}
                onChange={e => setActive(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="supplier_active" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                Active Supplier (Available in New Purchase Vouchers)
              </label>
            </div>

          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 20px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {isEditing && supplier && (
              <span style={{ fontSize: '0.76rem', color: '#475569' }}>
                Current Balance Payable: <strong style={{ color: supplier.current_balance > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(supplier.current_balance)}</strong>
              </span>
            )}
            {!isEditing && <div />}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`btn btn-sm ${isEditing ? 'btn-vyapar-blue' : 'btn-vyapar-red'}`}
                disabled={saving}
                style={{ padding: '7px 20px', fontWeight: 800 }}
              >
                <Save size={14} />
                {saving ? 'Saving...' : isEditing ? '💾 Save Vendor Changes' : '💾 Create Supplier'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
