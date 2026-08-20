import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  CreditCard, 
  DollarSign, 
  Save, 
  Building,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Customer } from '../../types';
import { api } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';

interface CustomerModalProps {
  isOpen: boolean;
  customer?: Customer | null;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSuccess
}) => {
  const isEditing = !!customer;

  const [name, setName] = useState('');
  const [customerNo, setCustomerNo] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [gstin, setGstin] = useState('');
  const [creditLimit, setCreditLimit] = useState('50000');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [advanceBalance, setAdvanceBalance] = useState('0');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setCustomerNo(customer.customer_no || '');
      setMobile(customer.mobile || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setCity(customer.city || '');
      setGstin(customer.gstin || '');
      setCreditLimit(String(customer.credit_limit ?? 50000));
      setOpeningBalance(String(customer.opening_balance ?? 0));
      setAdvanceBalance(String(customer.advance_balance ?? 0));
      setNotes(customer.notes || '');
      setActive(customer.active === 1);
    } else {
      setName('');
      setCustomerNo('');
      setMobile('');
      setEmail('');
      setAddress('');
      setCity('');
      setGstin('');
      setCreditLimit('50000');
      setOpeningBalance('0');
      setAdvanceBalance('0');
      setNotes('');
      setActive(true);
    }
    setError('');
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        name: name.trim(),
        customer_no: customerNo.trim() || undefined,
        mobile: mobile.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        gstin: gstin.trim().toUpperCase(),
        credit_limit: Number(creditLimit) || 50000,
        notes: notes.trim(),
        active: active ? 1 : 0,
        ...(!isEditing && {
          opening_balance: Number(openingBalance) || 0,
          advance_balance: Number(advanceBalance) || 0
        })
      };

      let resultCustomer: Customer;
      if (isEditing && customer) {
        const res = await api.updateCustomer(customer.id, payload);
        resultCustomer = (res as any).data || res;
      } else {
        const res = await api.createCustomer(payload);
        resultCustomer = (res as any).data || res;
      }

      onSuccess(resultCustomer);
      onClose();
    } catch (err: any) {
      console.error('Error saving customer:', err);
      setError(err.message || 'Failed to save customer profile');
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
        maxWidth: '680px',
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
            ? 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)'
            : 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ffffff', color: isEditing ? '#1e40af' : '#b91c1c', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <User size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                {isEditing ? `Edit Customer Profile: ${customer?.name}` : '+ Add New Customer / Party'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', opacity: 0.9 }}>
                {isEditing ? `Party Code: ${customer?.customer_no || ''}` : 'Enter customer contact info, billing address, and account details'}
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

            {/* Row 1: Name & Code */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 800 }}>
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rameshwar Caterers / Pareshbhai"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Party Code / No
                </label>
                <input
                  type="text"
                  placeholder="e.g. CUST-001 (Auto)"
                  className="form-input font-mono"
                  value={customerNo}
                  onChange={e => setCustomerNo(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Mobile & Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={13} color="#16a34a" /> Primary Mobile (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile (e.g. 9825123456)"
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
                  placeholder="e.g. party@gmail.com"
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
                  placeholder="e.g. Katargam / Sarthana"
                  className="form-input"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Full Billing / Delivery Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104, Madhav Complex, Opp. Matuki Chowk"
                  className="form-input"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Row 4: GSTIN & Credit Limit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  GSTIN (Optional 15-Digit)
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
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="50000"
                  className="form-input font-mono"
                  value={creditLimit}
                  onChange={e => setCreditLimit(e.target.value)}
                />
              </div>
            </div>

            {/* If Adding New Customer: Show Opening & Advance Balances */}
            {!isEditing && (
              <div style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800, color: '#047857' }}>
                    💰 Order Advance Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    className="form-input font-mono"
                    style={{ fontWeight: 800, color: '#047857', background: '#f0fdf4', borderColor: '#86efac' }}
                    value={advanceBalance}
                    onChange={e => setAdvanceBalance(e.target.value)}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#047857' }}>
                    Held with store, auto-deducted at billing.
                  </span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800, color: '#b91c1c' }}>
                    🔴 Previous Balance Due (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    className="form-input font-mono"
                    style={{ fontWeight: 800, color: '#b91c1c', background: '#fef2f2', borderColor: '#fca5a5' }}
                    value={openingBalance}
                    onChange={e => setOpeningBalance(e.target.value)}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#b91c1c' }}>
                    Customer owes this balance to shop.
                  </span>
                </div>
              </div>
            )}

            {/* Notes / Special Preferences */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Special Notes & Preferences
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Prefers less sugar sweets / Call 2 hours before delivery / Sarthana branch"
                className="form-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Active Status Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <input
                type="checkbox"
                id="customer_active"
                checked={active}
                onChange={e => setActive(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="customer_active" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                Active Customer (Visible in New Sale & Order search lists)
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
            {isEditing && customer && (
              <span style={{ fontSize: '0.76rem', color: '#475569' }}>
                Current Khata Balance: <strong style={{ color: customer.current_balance > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(customer.current_balance)}</strong>
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
                {saving ? 'Saving...' : isEditing ? '💾 Save Profile Changes' : '💾 Create Customer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
