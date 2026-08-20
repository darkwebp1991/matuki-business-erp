import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Truck, 
  BookOpen, 
  CreditCard, 
  Download, 
  Printer, 
  Phone, 
  MapPin, 
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft
} from 'lucide-react';
import { api } from '../../api/client';
import { Supplier, LedgerEntry, Purchase, User as UserType } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV, downloadSupplierTemplateCSV } from '../../utils/exportUtils';
import { canEditModule, isViewOnlyModule } from '../../utils/permissionUtils';
import { PaymentModal } from './PaymentModal';
import { Modal } from '../common/Modal';
import { SupplierModal } from './SupplierModal';
import { BulkImportModal } from '../common/BulkImportModal';
import { VoiceSearchButton } from '../common/VoiceSearchButton';
import { Edit3, User, Landmark } from 'lucide-react';

interface SuppliersViewProps {
  initialSearch?: string;
  currentUser?: UserType | null;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ initialSearch = '', currentUser }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const canEdit = canEditModule(currentUser, 'suppliers');
  const isViewOnly = isViewOnlyModule(currentUser, 'suppliers');

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);
  const [filterType, setFilterType] = useState<'ALL' | 'TO_PAY' | 'CLEARED'>('ALL');
  const [sortBy, setSortBy] = useState<'MAX_AMOUNT' | 'MIN_AMOUNT' | 'NAME_ASC' | 'NAME_DESC' | 'DEFAULT'>('MAX_AMOUNT');
  const [filterExpenseType, setFilterExpenseType] = useState<'ALL' | 'DIRECT' | 'INDIRECT'>('ALL');
  const [filterLocation, setFilterLocation] = useState<'ALL' | 'FACTORY' | 'SARTHANA' | 'KATARGAM' | 'HEAD_OFFICE'>('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);

  const getPlCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'DIRECT_EXPENSES': return { label: 'Direct Raw Material', short: '🍬 Direct Raw', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
      case 'TRANSPORTATION': return { label: 'Transportation Charges', short: '🚚 Transport', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' };
      case 'LABOUR_CHARGES': return { label: 'Labour Charges / Wages', short: '👨‍🍳 Labour', bg: '#fef3c7', color: '#b45309', border: '#fcd34d' };
      case 'MEDICAL_EXPENSES': return { label: 'Medical & Staff Health', short: '🏥 Medical', bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' };
      case 'FUEL_EXPENSES': return { label: 'Fuel (Petrol / Diesel)', short: '⛽ Fuel', bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' };
      case 'GENERAL_MAINTENANCE': return { label: 'General Maintenance', short: '🔧 Maintenance', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      case 'LIGHT_BILL': return { label: 'Light Bill & Power', short: '💡 Light Bill', bg: '#fef9c3', color: '#854d0e', border: '#fde047' };
      case 'GST_TAX_EXPENSES': return { label: 'GST & Tax Expenses', short: '🏛️ GST/Tax', bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' };
      case 'PARTNER_SALARY': return { label: 'Partner Salary & Drawings', short: '💼 Partner Sal.', bg: '#f3e8ff', color: '#6b21a8', border: '#d8b4fe' };
      case 'TEAM_KARIYANU': return { label: 'Team Kariyanu / Staff Kitchen', short: '🍚 Team Kariy.', bg: '#d1fae5', color: '#047857', border: '#6ee7b7' };
      case 'PACKAGING_BOXES': return { label: 'Packaging Boxes & Foil', short: '📦 Packaging', bg: '#e0f2fe', color: '#0284c7', border: '#93c5fd' };
      case 'COMMERCIAL_GAS': return { label: 'Commercial LPG Gas Cylinders', short: '🔥 LPG Gas', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' };
      case 'SHOP_FACTORY_RENT': return { label: 'Shop & Factory Rent', short: '🏢 Rent', bg: '#e5e7eb', color: '#374151', border: '#d1d5db' };
      case 'INDIRECT_EXPENSES': return { label: 'Indirect Expenses', short: '📂 Indirect', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
      default: return { label: cat || 'Direct Raw Material', short: cat || '🍬 Direct', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
    }
  };

  const getLocationBadge = (loc?: string) => {
    switch (loc) {
      case 'FACTORY': return { label: 'Main Factory / Kitchen (મેઈન કારખાનું)', short: '🏭 Factory', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
      case 'SARTHANA': return { label: 'Outlet 1 - Sarthana (સરથાણા)', short: '🏪 Sarthana', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
      case 'KATARGAM': return { label: 'Outlet 2 - Katargam (કતારગામ)', short: '🏪 Katargam', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
      case 'HEAD_OFFICE': return { label: 'Head Office / All Branches (મુખ્ય ઓફિસ)', short: '🏢 Head Office', bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff' };
      default: return { label: loc || 'Factory', short: loc || '🏭 Factory', bg: '#f8fafc', color: '#334155', border: '#e2e8f0' };
    }
  };

  // Selected supplier details
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'LEDGER'>('TRANSACTIONS');
  const [ledgerStatement, setLedgerStatement] = useState<any>(null);
  const [partyPurchases, setPartyPurchases] = useState<Purchase[]>([]);

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPaymentOutOpen, setIsPaymentOutOpen] = useState(false);

  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setIsSupplierModalOpen(true);
  };

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.getSuppliers({ search });
      setSuppliers(data);
      if (data.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  useEffect(() => {
    if (selectedSupplierId) {
      const sup = suppliers.find(s => s.id === selectedSupplierId);
      setSelectedSupplier(sup || null);

      api.getPartyLedgerStatement('SUPPLIER', selectedSupplierId)
        .then(setLedgerStatement)
        .catch(console.error);

      api.getPurchases({ search: sup?.name || '' })
        .then(setPartyPurchases)
        .catch(console.error);
    }
  }, [selectedSupplierId, suppliers]);

  const filteredSuppliers = suppliers
    .filter(s => {
      if (filterType === 'TO_PAY' && s.current_balance <= 0) return false;
      if (filterType === 'CLEARED' && s.current_balance > 0) return false;
      if (filterExpenseType !== 'ALL' && (s.expense_type || 'DIRECT') !== filterExpenseType) return false;
      if (filterLocation !== 'ALL' && (s.allocated_location || 'FACTORY') !== filterLocation) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'MAX_AMOUNT') return (b.current_balance || 0) - (a.current_balance || 0);
      if (sortBy === 'MIN_AMOUNT') return (a.current_balance || 0) - (b.current_balance || 0);
      if (sortBy === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'NAME_DESC') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });

  const totalPayable = suppliers.reduce((sum, s) => sum + (s.current_balance > 0 ? s.current_balance : 0), 0);

  return (
    <div className={`vyapar-party-layout ${showMobileDetail ? 'mobile-show-detail' : 'mobile-show-list'}`}>
      {/* LEFT COLUMN: Vyapar Searchable Supplier List */}
      <div className="vyapar-party-sidebar">
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card-alt)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Suppliers ({filteredSuppliers.length})
            </span>
            {canEdit && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setIsBulkImportOpen(true)}
                  style={{ fontSize: '0.72rem', padding: '3px 8px', fontWeight: 800, color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                  title="Import multiple vendors/suppliers from Excel"
                >
                  📥 Excel
                </button>
                <button className="btn btn-vyapar-blue btn-sm" onClick={handleOpenAddSupplier} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                  <Plus size={13} /> + Vendor
                </button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '30px', paddingRight: '34px', padding: '5px 34px 5px 30px', fontSize: '0.8rem', width: '100%' }}
              placeholder="Search vendor / mobile (or speak)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={{ position: 'absolute', right: '4px' }}>
              <VoiceSearchButton 
                onTranscript={(spoken) => setSearch(spoken)}
                title="🎙️ બોલીને વેપારી શોધો (Speak supplier name in Gujarati)"
              />
            </div>
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
                  border: sortBy === 'MAX_AMOUNT' ? '1px solid #dc2626' : '1px solid var(--border-color)',
                  background: sortBy === 'MAX_AMOUNT' ? '#fef2f2' : 'transparent',
                  color: sortBy === 'MAX_AMOUNT' ? '#dc2626' : 'var(--text-secondary)'
                }}
                title="સૌથી વધુ ચૂકવવાના રૂપિયા (Highest Payable First)"
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
                title="સૌથી ઓછા ચૂકવવાના રૂપિયા (Lowest Payable First)"
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

          {/* Filters: To Pay / Cleared */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            <button
              style={{
                flex: 1,
                padding: '3px',
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: filterType === 'ALL' ? 'var(--vyapar-blue)' : 'var(--bg-card)',
                color: filterType === 'ALL' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              onClick={() => setFilterType('ALL')}
            >
              All
            </button>
            <button
              style={{
                flex: 1,
                padding: '3px',
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: filterType === 'TO_PAY' ? 'var(--vyapar-red)' : 'var(--bg-card)',
                color: filterType === 'TO_PAY' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              onClick={() => setFilterType('TO_PAY')}
            >
              To Pay
            </button>
            <button
              style={{
                flex: 1,
                padding: '3px',
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: filterType === 'CLEARED' ? '#64748b' : 'var(--bg-card)',
                color: filterType === 'CLEARED' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              onClick={() => setFilterType('CLEARED')}
            >
              Cleared
            </button>
          </div>

          {/* Advanced P&L Classification Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px' }}>
            <select
              value={filterExpenseType}
              onChange={e => setFilterExpenseType(e.target.value as any)}
              style={{ fontSize: '0.68rem', padding: '3px 4px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b' }}
            >
              <option value="ALL">All Classification</option>
              <option value="DIRECT">🍬 Direct Expense</option>
              <option value="INDIRECT">📂 Indirect Expense</option>
            </select>

            <select
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value as any)}
              style={{ fontSize: '0.68rem', padding: '3px 4px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b' }}
            >
              <option value="ALL">All Branches</option>
              <option value="FACTORY">🏭 Main Factory</option>
              <option value="SARTHANA">🏪 Sarthana Outlet</option>
              <option value="KATARGAM">🏪 Katargam Outlet</option>
              <option value="HEAD_OFFICE">🏢 Head Office</option>
            </select>
          </div>
        </div>

        <div className="vyapar-party-list">
          {filteredSuppliers.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No suppliers found.
            </div>
          ) : (
            filteredSuppliers.map(s => {
              const isSelected = selectedSupplierId === s.id;
              const plBadge = getPlCategoryBadge(s.pl_category);
              const locBadge = getLocationBadge(s.allocated_location);
              const isDirect = (s.expense_type || 'DIRECT') === 'DIRECT';

              return (
                <div
                  key={s.id}
                  className={`vyapar-party-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSupplierId(s.id);
                    setShowMobileDetail(true);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: isSelected ? 'var(--vyapar-blue)' : 'var(--text-main)' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {s.mobile || 'No Mobile'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.9rem',
                        color: '#dc2626'
                      }}>
                        {Number(s.opening_balance || s.current_balance || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* P&L & Location Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: isDirect ? '#dcfce7' : '#eff6ff',
                      color: isDirect ? '#15803d' : '#1e40af',
                      border: `1px solid ${isDirect ? '#86efac' : '#bfdbfe'}`
                    }}>
                      {isDirect ? '🍬 Direct' : '📂 Indirect'}
                    </span>

                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: plBadge.bg,
                      color: plBadge.color,
                      border: `1px solid ${plBadge.border}`
                    }}>
                      {plBadge.short}
                    </span>

                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: locBadge.bg,
                      color: locBadge.color,
                      border: `1px solid ${locBadge.border}`
                    }}>
                      {locBadge.short}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Payable:</span>
          <span style={{ fontWeight: 800, color: 'var(--vyapar-red)', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(totalPayable)}
          </span>
        </div>
      </div>

      {/* RIGHT MAIN PANEL */}
      {selectedSupplier ? (
        <div className="vyapar-party-detail-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
          {/* Mobile Back Button Header */}
          <div className="mobile-only-header" style={{ display: 'none', padding: '6px 0' }}>
            <button
              type="button"
              onClick={() => setShowMobileDetail(false)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
            >
              <ArrowLeft size={16} /> પાછા જાઓ (Back to Vendors)
            </button>
          </div>
          <div className="vyapar-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {selectedSupplier.name}
                </h2>

                {/* Badges for Classification & Location */}
                {(() => {
                  const isDirect = (selectedSupplier.expense_type || 'DIRECT') === 'DIRECT';
                  const plBadge = getPlCategoryBadge(selectedSupplier.pl_category);
                  const locBadge = getLocationBadge(selectedSupplier.allocated_location);
                  return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: isDirect ? '#dcfce7' : '#eff6ff',
                        color: isDirect ? '#15803d' : '#1e40af',
                        border: `1px solid ${isDirect ? '#86efac' : '#bfdbfe'}`
                      }}>
                        {isDirect ? '🍬 Direct Expense' : '📂 Indirect Expense'}
                      </span>

                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: plBadge.bg,
                        color: plBadge.color,
                        border: `1px solid ${plBadge.border}`
                      }}>
                        {plBadge.label}
                      </span>

                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: locBadge.bg,
                        color: locBadge.color,
                        border: `1px solid ${locBadge.border}`
                      }}>
                        {locBadge.label}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {selectedSupplier.contact_person && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0369a1', fontWeight: 600 }}>
                    <User size={13} /> {selectedSupplier.contact_person}
                  </span>
                )}
                {selectedSupplier.mobile && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} color="var(--vyapar-blue)" /> {selectedSupplier.mobile}
                  </span>
                )}
                {selectedSupplier.email && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✉️ {selectedSupplier.email}
                  </span>
                )}
                {(selectedSupplier.city || selectedSupplier.address) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} color="var(--vyapar-blue)" /> {[selectedSupplier.city, selectedSupplier.address].filter(Boolean).join(', ')}
                  </span>
                )}
                {selectedSupplier.gstin && (
                  <span>GSTIN: <strong>{selectedSupplier.gstin}</strong></span>
                )}
                {selectedSupplier.credit_terms && (
                  <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>
                    Terms: {selectedSupplier.credit_terms}
                  </span>
                )}
                {(selectedSupplier.bank_name || selectedSupplier.bank_account_no || selectedSupplier.upi_id) && (
                  <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '1px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Landmark size={12} /> {selectedSupplier.bank_name ? `${selectedSupplier.bank_name} - ` : ''}{selectedSupplier.bank_account_no ? `A/c: ${selectedSupplier.bank_account_no}` : ''} {selectedSupplier.upi_id ? `(UPI: ${selectedSupplier.upi_id})` : ''}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ textAlign: 'right', paddingRight: '12px', borderRight: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Current Balance
                </span>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono)',
                  color: selectedSupplier.current_balance > 0 ? 'var(--vyapar-red)' : 'var(--text-main)'
                }}>
                  {formatCurrency(selectedSupplier.current_balance)}
                </div>
                <span style={{ fontSize: '0.7rem', color: selectedSupplier.current_balance > 0 ? 'var(--vyapar-red)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {selectedSupplier.current_balance > 0 ? 'You will Pay' : 'Settled Balance'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenEditSupplier(selectedSupplier)}
                  style={{ padding: '7px 11px', fontWeight: 800, fontSize: '0.8rem', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Edit Vendor Name, Mobile, Bank & UPI Details"
                >
                  <Edit3 size={14} color="#0284c7" />
                  ✏️ Edit Profile
                </button>

                <button
                  className="btn btn-vyapar-red"
                  onClick={() => setIsPaymentOutOpen(true)}
                  style={{ padding: '8px 14px', fontWeight: 700 }}
                >
                  <ArrowUpRight size={16} />
                  - Payment Out
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (ledgerStatement?.entries) {
                      exportToCSV(ledgerStatement.entries, `${selectedSupplier.name}_Ledger.csv`);
                    }
                  }}
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
            <button
              style={{
                padding: '8px 16px',
                background: activeTab === 'TRANSACTIONS' ? 'var(--vyapar-blue)' : 'transparent',
                color: activeTab === 'TRANSACTIONS' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('TRANSACTIONS')}
            >
              Purchases & Bills
            </button>
            <button
              style={{
                padding: '8px 16px',
                background: activeTab === 'LEDGER' ? 'var(--vyapar-blue)' : 'transparent',
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

          {activeTab === 'TRANSACTIONS' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Purchase #</th>
                    <th>Supplier Bill #</th>
                    <th>Date</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {partyPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No purchases recorded for this supplier.
                      </td>
                    </tr>
                  ) : (
                    partyPurchases.map(p => (
                      <tr key={p.id}>
                        <td>
                          <span className="badge badge-blue">Purchase Bill</span>
                        </td>
                        <td className="font-mono" style={{ fontWeight: 700, color: 'var(--vyapar-blue)' }}>
                          {p.purchase_no}
                        </td>
                        <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                          {p.supplier_invoice_no || '-'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {formatDate(p.date)}
                        </td>
                        <td className="p-3 text-red-500 font-bold">
                        ₹ {Number(selectedSupplier.opening_balance || selectedSupplier.current_balance || 0).toLocaleString('en-IN')}
                      </td>
                        <td className="font-mono" style={{ color: 'var(--vyapar-green)' }}>
                          {formatCurrency(p.paid_amount)}
                        </td>
                        <td className="font-mono" style={{ color: p.due_amount > 0 ? 'var(--vyapar-red)' : 'var(--text-muted)' }}>
                          {formatCurrency(p.due_amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'LEDGER' && (
            <div className="table-container invoice-printable">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Voucher Type</th>
                    <th>Voucher #</th>
                    <th>Particulars / Notes</th>
                    <th>Debit (Paid)</th>
                    <th>Credit (Billed)</th>
                    <th>Running Balance</th>
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
                        <td className="font-mono" style={{ color: 'var(--vyapar-blue)', fontWeight: 700 }}>
                          {entry.voucher_no}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {entry.notes}
                        </td>
                        <td className="font-mono" style={{ color: entry.debit_amount > 0 ? 'var(--vyapar-green)' : 'inherit' }}>
                          {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                        </td>
                        <td className="font-mono" style={{ color: entry.credit_amount > 0 ? 'var(--vyapar-red)' : 'inherit' }}>
                          {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                        </td>
                        <td className="font-mono" style={{ fontWeight: 800, color: 'var(--text-main)' }}>
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
          Select a supplier from the left list.
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {isSupplierModalOpen && (
        <SupplierModal
          isOpen={isSupplierModalOpen}
          supplier={editingSupplier}
          onClose={() => setIsSupplierModalOpen(false)}
          onSuccess={(updatedSup) => {
            fetchSuppliers();
            if (updatedSup && updatedSup.id) {
              setSelectedSupplierId(updatedSup.id);
              setSelectedSupplier(updatedSup);
            }
          }}
        />
      )}

      {isPaymentOutOpen && selectedSupplier && (
        <PaymentModal
          isOpen={isPaymentOutOpen}
          partyType="SUPPLIER"
          partyId={selectedSupplier.id}
          partyName={selectedSupplier.name}
          defaultAmount={selectedSupplier.current_balance > 0 ? selectedSupplier.current_balance : 0}
          onClose={() => setIsPaymentOutOpen(false)}
          onSuccess={() => {
            setIsPaymentOutOpen(false);
            fetchSuppliers();
          }}
        />
      )}

      {/* Bulk Import Suppliers from Excel */}
      {isBulkImportOpen && (
        <BulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          title="📥 Bulk Import Suppliers & Vendors via Excel/CSV"
          subtitle="Download sample template, fill vendor names, contact numbers & bank details, and upload directly"
          type="SUPPLIERS"
          onDownloadTemplate={downloadSupplierTemplateCSV}
          onImport={(rows) => api.bulkImportSuppliers(rows)}
          onSuccessCallback={() => fetchSuppliers()}
        />
      )}
    </div>
  );
};
