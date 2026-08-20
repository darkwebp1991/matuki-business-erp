import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Save, 
  Search, 
  Truck, 
  User, 
  Phone, 
  MapPin, 
  Check, 
  X, 
  ChevronDown, 
  CreditCard,
  Layers,
  ArrowUpRight,
  Package,
  Boxes,
  HelpCircle,
  FileText
} from 'lucide-react';
import { api } from '../../api/client';
import { Supplier, RawMaterial, Product } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { SupplierModal } from '../parties/SupplierModal';
import { ImageUploadDropzone } from '../common/ImageUploadDropzone';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPurchase?: any, shouldPrint?: boolean) => void;
}

interface PurchaseRowItem {
  item_type: 'RAW_MATERIAL' | 'PRODUCT' | 'PACKAGING';
  raw_material_id: number | null;
  product_id: number | null;
  item_name: string;
  item_code: string;
  current_stock: number;
  unit: string;
  quantity: number | '';
  rate: number | '';
  discount: number;
  gst_rate: number;
  amount: number;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // Bill Basic Info
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierMobile, setSupplierMobile] = useState<string>('');
  const [supplierGstin, setSupplierGstin] = useState<string>('');
  const [supplierCity, setSupplierCity] = useState<string>('');
  const [supplierBalance, setSupplierBalance] = useState<number>(0);
  const [supplierCreditTerms, setSupplierCreditTerms] = useState<string>('Net 15 Days');

  // Supplier Search dropdown
  const [supplierSearchText, setSupplierSearchText] = useState<string>('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState<boolean>(false);
  const [selectedSupplierHighlightIdx, setSelectedSupplierHighlightIdx] = useState<number>(0);
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Bill Identifiers
  const [purchaseNo, setPurchaseNo] = useState<string>('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('CREDIT');
  const [paidAmount, setPaidAmount] = useState<number | ''>(0);
  const [notes, setNotes] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [billPhotoUrl, setBillPhotoUrl] = useState<string>('');
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);

  // Quick Add Supplier Modal
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState<boolean>(false);

  // Check if any purchase voucher details were entered
  const isDirty = () => {
    const hasSupplier = Boolean(supplierId);
    const hasInvoiceNo = Boolean(supplierInvoiceNo && supplierInvoiceNo.trim() !== '');
    const hasPaid = paidAmount !== '' && Number(paidAmount) > 0;
    const hasNotes = Boolean(notes && notes.trim() !== '');
    const hasPhoto = Boolean(billPhotoUrl && billPhotoUrl.trim() !== '');
    const hasItems = items.some(i => 
      Boolean(i.raw_material_id || i.product_id) || 
      Boolean(i.item_name && i.item_name.trim() !== '') || 
      (i.rate !== '' && Number(i.rate) > 0)
    );
    return hasSupplier || hasInvoiceNo || hasPaid || hasNotes || hasPhoto || hasItems;
  };

  const handleRequestClose = () => {
    if (isDirty()) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // Item Rows (Starts with 5 clean rows)
  const createEmptyRow = (): PurchaseRowItem => ({
    item_type: 'RAW_MATERIAL',
    raw_material_id: null,
    product_id: null,
    item_name: '',
    item_code: '',
    current_stock: 0,
    unit: 'KG',
    quantity: 1,
    rate: '',
    discount: 0,
    gst_rate: 5,
    amount: 0
  });

  const [items, setItems] = useState<PurchaseRowItem[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow()
  ]);

  // Autocomplete Item Dropdown State (per row index)
  const [activeItemDropdownIdx, setActiveItemDropdownIdx] = useState<number | null>(null);
  const [itemSearchText, setItemSearchText] = useState<string>('');
  const [itemHighlightIdx, setItemHighlightIdx] = useState<number>(0);
  
  // Element input refs for keyboard navigation
  const itemInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const qtyInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const rateInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const discountInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch Suppliers, Raw Materials, Products, Units
  const loadData = async () => {
    try {
      const [sups, rms, prds, unitList] = await Promise.all([
        api.getSuppliers({ active: true }),
        api.getRawMaterials({ active: true }),
        api.getProducts({ active: 1 }),
        api.getUnits()
      ]);
      setSuppliers(sups);
      setRawMaterials(rms);
      setProducts(prds);
      setUnits(unitList);
    } catch (err) {
      console.error('Error loading purchase dependencies:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setDate(new Date().toISOString().split('T')[0]);
      setSupplierInvoiceDate(new Date().toISOString().split('T')[0]);
      setPaymentMode('CREDIT');
      setPaidAmount(0);
      setNotes('');
      setError('');
      setItems([
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow()
      ]);
      setTimeout(() => {
        supplierInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Combined searchable catalogue items for Purchase (Raw Materials + Packaging + Products)
  const allCatalogueItems = [
    ...rawMaterials.map(rm => ({
      id: rm.id,
      name: rm.name,
      code: rm.code,
      item_type: 'RAW_MATERIAL' as const,
      raw_material_id: rm.id,
      product_id: null,
      unit: rm.unit || 'KG',
      rate: rm.current_purchase_rate || rm.last_purchase_rate || 0,
      stock: rm.current_stock || 0,
      category: rm.category_name || 'Raw Material'
    })),
    ...products.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      item_type: 'PRODUCT' as const,
      raw_material_id: null,
      product_id: p.id,
      unit: p.unit || 'KG',
      rate: p.purchase_rate || 0,
      stock: p.current_stock || 0,
      category: p.category_name || 'Finished Sweet'
    }))
  ];

  // Filtered Catalogue Items based on active row search text
  const filteredCatalogueItems = allCatalogueItems.filter(item => {
    if (!itemSearchText.trim()) return true;
    const query = itemSearchText.toLowerCase();
    return item.name.toLowerCase().includes(query) ||
           (item.code && item.code.toLowerCase().includes(query)) ||
           (item.category && item.category.toLowerCase().includes(query));
  }).slice(0, 15);

  // Filtered Suppliers for Supplier Combobox
  const filteredSuppliers = suppliers.filter(s => {
    if (!supplierSearchText.trim()) return true;
    const q = supplierSearchText.toLowerCase();
    return s.name.toLowerCase().includes(q) ||
           (s.mobile && s.mobile.includes(q)) ||
           (s.supplier_no && s.supplier_no.toLowerCase().includes(q)) ||
           (s.city && s.city.toLowerCase().includes(q));
  });

  // Calculate line item totals
  const recalculateItemAmount = (item: PurchaseRowItem): PurchaseRowItem => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const disc = Number(item.discount) || 0;
    const gstRate = Number(item.gst_rate) || 0;

    const baseAmount = Math.max(0, (qty * rate) - disc);
    const gstAmount = (baseAmount * gstRate) / 100;
    const lineTotal = baseAmount + gstAmount;

    return {
      ...item,
      amount: Math.round(lineTotal * 100) / 100
    };
  };

  const handleRowChange = (index: number, field: keyof PurchaseRowItem, value: any) => {
    const updated = [...items];
    let row = { ...updated[index], [field]: value };
    row = recalculateItemAmount(row);
    updated[index] = row;
    setItems(updated);
  };

  // Select Item from Dropdown
  const handleSelectItem = (rowIndex: number, catalogueItem: any) => {
    const updated = [...items];
    updated[rowIndex] = recalculateItemAmount({
      ...updated[rowIndex],
      item_type: catalogueItem.item_type,
      raw_material_id: catalogueItem.raw_material_id,
      product_id: catalogueItem.product_id,
      item_name: catalogueItem.name,
      item_code: catalogueItem.code || '',
      current_stock: catalogueItem.stock || 0,
      unit: catalogueItem.unit || 'KG',
      rate: catalogueItem.rate || '',
      quantity: updated[rowIndex].quantity || 1
    });

    setItems(updated);
    setActiveItemDropdownIdx(null);
    setItemSearchText('');

    // Focus Quantity input for instant fast typing
    setTimeout(() => {
      qtyInputRefs.current[rowIndex]?.focus();
      qtyInputRefs.current[rowIndex]?.select();
    }, 50);
  };

  // Add new empty row
  const handleAddRow = () => {
    setItems(prev => [...prev, createEmptyRow()]);
    setTimeout(() => {
      const nextIndex = items.length;
      itemInputRefs.current[nextIndex]?.focus();
    }, 50);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setItems([createEmptyRow()]);
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Select Supplier
  const handleSelectSupplier = (sup: Supplier) => {
    setSupplierId(String(sup.id));
    setSupplierName(sup.name);
    setSupplierMobile(sup.mobile || '');
    setSupplierGstin(sup.gstin || '');
    setSupplierCity(sup.city || sup.address || '');
    setSupplierBalance(sup.current_balance || 0);
    setSupplierCreditTerms(sup.credit_terms || 'Net 15 Days');
    setSupplierSearchText(sup.name);
    setIsSupplierDropdownOpen(false);

    // Focus first item row after selecting supplier
    setTimeout(() => {
      itemInputRefs.current[0]?.focus();
    }, 80);
  };

  // Financial Calculations
  const validItems = items.filter(i => i.item_name.trim() !== '' && Number(i.quantity) > 0);
  
  const subtotal = validItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const disc = Number(item.discount) || 0;
    return sum + Math.max(0, (qty * rate) - disc);
  }, 0);

  const totalGst = validItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const disc = Number(item.discount) || 0;
    const gstRate = Number(item.gst_rate) || 0;
    const base = Math.max(0, (qty * rate) - disc);
    return sum + ((base * gstRate) / 100);
  }, 0);

  const rawGrandTotal = subtotal + totalGst - discountAmount;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;
  
  const finalPaid = paymentMode === 'CASH' 
    ? (paidAmount === '' || Number(paidAmount) === 0 ? grandTotal : Number(paidAmount))
    : (paidAmount === '' ? 0 : Number(paidAmount));

  const dueAmount = Math.max(0, grandTotal - finalPaid);

  // Global Keyboard Shortcuts (F2: Party, F3: Add Item, Ctrl+S: Save, Ctrl+P: Print, Esc: Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Esc: Close with dirty check
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (activeItemDropdownIdx !== null) {
          setActiveItemDropdownIdx(null);
          return;
        }
        if (isSupplierDropdownOpen) {
          setIsSupplierDropdownOpen(false);
          return;
        }
        if (showCloseConfirm) {
          setShowCloseConfirm(false);
          return;
        }
        handleRequestClose();
        return;
      }

      // F2: Focus Supplier Input
      if (e.key === 'F2') {
        e.preventDefault();
        supplierInputRef.current?.focus();
        supplierInputRef.current?.select();
        setIsSupplierDropdownOpen(true);
        return;
      }

      // F3: Add New Row
      if (e.key === 'F3') {
        e.preventDefault();
        handleAddRow();
        return;
      }

      // Ctrl+S / F8: Save
      if ((e.ctrlKey && e.key === 's') || e.key === 'F8') {
        e.preventDefault();
        handleSave(false);
        return;
      }

      // Ctrl+P: Save & Print
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        handleSave(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeItemDropdownIdx, isSupplierDropdownOpen, items, supplierId, date, grandTotal, finalPaid, paymentMode]);

  // Save Handler
  const handleSave = async (shouldPrint = false) => {
    if (!supplierId) {
      setError('Please select a Supplier / Vendor first (Press F2).');
      supplierInputRef.current?.focus();
      return;
    }

    if (validItems.length === 0) {
      setError('Please add at least one item with Quantity and Rate.');
      itemInputRefs.current[0]?.focus();
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        date,
        supplier_id: Number(supplierId),
        supplier_invoice_no: supplierInvoiceNo.trim(),
        supplier_invoice_date: supplierInvoiceDate,
        subtotal: Math.round(subtotal * 100) / 100,
        discount_amount: discountAmount,
        tax_amount: Math.round(totalGst * 100) / 100,
        round_off: roundOff,
        grand_total: grandTotal,
        paid_amount: finalPaid,
        due_amount: dueAmount,
        payment_mode: paymentMode,
        notes: notes.trim(),
        bill_photo_url: billPhotoUrl,
        items: validItems.map(item => ({
          item_type: item.item_type,
          raw_material_id: item.raw_material_id,
          product_id: item.product_id,
          item_name: item.item_name,
          quantity: Number(item.quantity),
          unit: item.unit,
          rate: Number(item.rate),
          discount: Number(item.discount),
          gst_rate: Number(item.gst_rate),
          amount: item.amount
        }))
      };

      const result = await api.createPurchase(payload);
      onSuccess(result, shouldPrint);
      onClose();
    } catch (err: any) {
      console.error('Error saving purchase:', err);
      setError(err.message || 'Failed to save purchase voucher');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      overflow: 'hidden'
    }}>
      {/* 1. TOP VYAPAR FULL-SCREEN HEADER BAR */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        padding: '10px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #0284c7',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Left Title & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#0284c7', color: '#fff', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 900 }}>
            <Truck size={18} />
            <span>PURCHASE ENTRY</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Raw Material & Goods Purchase Voucher
              <span style={{ fontSize: '0.72rem', background: '#0369a1', color: '#e0f2fe', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                Vyapar Rapid Mode
              </span>
            </h1>
          </div>
        </div>

        {/* Middle Keyboard Shortcuts Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem' }}>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <strong style={{ color: '#38bdf8' }}>F2</strong> Supplier
          </span>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <strong style={{ color: '#38bdf8' }}>F3</strong> Add Row
          </span>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <strong style={{ color: '#38bdf8' }}>Enter</strong> Next Field
          </span>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <strong style={{ color: '#4ade80' }}>Ctrl+S</strong> Save
          </span>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <strong style={{ color: '#facc15' }}>Ctrl+P</strong> Print
          </span>
        </div>

        {/* Right Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleRequestClose}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#fca5a5',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.8rem'
            }}
          >
            <X size={15} /> Close (Esc)
          </button>
        </div>
      </div>

      {/* 2. ERROR BANNER */}
      {error && (
        <div style={{
          background: '#fef2f2',
          borderBottom: '2px solid #ef4444',
          color: '#b91c1c',
          padding: '8px 20px',
          fontWeight: 700,
          fontSize: '0.84rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* 3. MAIN WORKSPACE (Vyapar Top Panel + Spreadsheet Grid + Bottom Sticky Footer) */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        
        {/* VENDOR & INVOICE HEADER PANEL */}
        <div style={{
          background: '#ffffff',
          padding: '14px 20px',
          borderBottom: '1px solid #cbd5e1',
          display: 'grid',
          gridTemplateColumns: '2.2fr 1fr 1fr 1fr 1.2fr',
          gap: '14px',
          alignItems: 'start'
        }}>
          {/* Column 1: Searchable Supplier / Vendor */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Truck size={13} color="#0284c7" /> Vendor / Supplier Name * <span style={{ color: '#0284c7', fontSize: '0.7rem' }}>[F2]</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddSupplierModalOpen(true)}
                style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                + New Vendor
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                ref={supplierInputRef}
                type="text"
                className="form-input"
                placeholder="Type supplier name, mobile or city..."
                style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  borderColor: supplierId ? '#0284c7' : '#cbd5e1',
                  background: supplierId ? '#f0f9ff' : '#ffffff'
                }}
                value={supplierSearchText}
                onChange={e => {
                  setSupplierSearchText(e.target.value);
                  setIsSupplierDropdownOpen(true);
                  setSelectedSupplierHighlightIdx(0);
                }}
                onFocus={() => setIsSupplierDropdownOpen(true)}
                onKeyDown={e => {
                  if (!isSupplierDropdownOpen) {
                    if (e.key === 'ArrowDown') setIsSupplierDropdownOpen(true);
                    return;
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedSupplierHighlightIdx(prev => Math.min(prev + 1, filteredSuppliers.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedSupplierHighlightIdx(prev => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredSuppliers[selectedSupplierHighlightIdx]) {
                      handleSelectSupplier(filteredSuppliers[selectedSupplierHighlightIdx]);
                    }
                  }
                }}
              />

              {supplierId && (
                <button
                  type="button"
                  onClick={() => {
                    setSupplierId('');
                    setSupplierName('');
                    setSupplierMobile('');
                    setSupplierGstin('');
                    setSupplierBalance(0);
                    setSupplierSearchText('');
                    supplierInputRef.current?.focus();
                  }}
                  style={{ position: 'absolute', right: '8px', top: '8px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 800 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Supplier Autocomplete Dropdown */}
            {isSupplierDropdownOpen && (
              <div 
                ref={supplierDropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  border: '1.5px solid #0284c7',
                  borderRadius: '6px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  zIndex: 999999,
                  maxHeight: '260px',
                  overflowY: 'auto',
                  marginTop: '2px'
                }}
              >
                {filteredSuppliers.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                    No vendor found for "{supplierSearchText}".
                    <button
                      type="button"
                      onClick={() => {
                        setIsSupplierDropdownOpen(false);
                        setIsAddSupplierModalOpen(true);
                      }}
                      style={{ display: 'block', margin: '6px auto 0', color: '#0284c7', fontWeight: 800, background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      + Create New Vendor
                    </button>
                  </div>
                ) : (
                  filteredSuppliers.map((s, idx) => {
                    const isHighlighted = idx === selectedSupplierHighlightIdx;
                    return (
                      <div
                        key={s.id}
                        onMouseDown={() => handleSelectSupplier(s)}
                        onMouseEnter={() => setSelectedSupplierHighlightIdx(idx)}
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isHighlighted ? '#e0f2fe' : 'transparent',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                            {s.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '8px' }}>
                            {s.mobile && <span>📞 {s.mobile}</span>}
                            {s.city && <span>📍 {s.city}</span>}
                            {s.gstin && <span>GST: {s.gstin}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: s.current_balance > 0 ? '#dc2626' : '#16a34a', fontFamily: 'monospace' }}>
                            {formatCurrency(s.current_balance)}
                          </div>
                          <span style={{ fontSize: '0.65rem', color: s.current_balance > 0 ? '#dc2626' : '#64748b' }}>
                            {s.current_balance > 0 ? 'Payable' : 'Settled'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected Supplier Status Pills */}
            {supplierId && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', fontSize: '0.72rem' }}>
                {supplierMobile && (
                  <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#334155' }}>
                    📞 {supplierMobile}
                  </span>
                )}
                {supplierGstin && (
                  <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#334155' }}>
                    GST: {supplierGstin}
                  </span>
                )}
                <span style={{ background: supplierBalance > 0 ? '#fef2f2' : '#f0fdf4', color: supplierBalance > 0 ? '#b91c1c' : '#16a34a', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, border: `1px solid ${supplierBalance > 0 ? '#fca5a5' : '#86efac'}` }}>
                  Current Balance: {formatCurrency(supplierBalance)} ({supplierBalance > 0 ? 'To Pay' : 'Settled'})
                </span>
              </div>
            )}
          </div>

          {/* Column 2: Purchase Date */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
              📅 Purchase Date
            </label>
            <input
              type="date"
              className="form-input"
              style={{ fontWeight: 700 }}
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Column 3: Supplier Bill No */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
              🧾 Supplier Bill / Inv #
            </label>
            <input
              type="text"
              className="form-input font-mono"
              placeholder="e.g. INV-2026/894"
              value={supplierInvoiceNo}
              onChange={e => setSupplierInvoiceNo(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  itemInputRefs.current[0]?.focus();
                }
              }}
            />
          </div>

          {/* Column 4: Supplier Bill Date */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
              🗓️ Supplier Bill Date
            </label>
            <input
              type="date"
              className="form-input"
              value={supplierInvoiceDate}
              onChange={e => setSupplierInvoiceDate(e.target.value)}
            />
          </div>

          {/* Column 5: Payment Terms / Mode */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
              💳 Payment Terms
            </label>
            <select
              className="form-select"
              style={{ fontWeight: 800, color: paymentMode === 'CREDIT' ? '#b91c1c' : '#047857', background: paymentMode === 'CREDIT' ? '#fef2f2' : '#f0fdf4' }}
              value={paymentMode}
              onChange={e => {
                const mode = e.target.value;
                setPaymentMode(mode);
                if (mode === 'CASH') {
                  setPaidAmount(grandTotal);
                } else if (mode === 'CREDIT') {
                  setPaidAmount(0);
                }
              }}
            >
              <option value="CREDIT">🔴 CREDIT (Udhar / Khata)</option>
              <option value="CASH">🟢 CASH (Full Payment)</option>
              <option value="BANK">🔵 BANK TRANSFER (NEFT/RTGS)</option>
              <option value="UPI">🟣 UPI / QR PAYMENT</option>
              <option value="CHEQUE">🟡 CHEQUE</option>
            </select>
          </div>
        </div>

        {/* 4. SPREADSHEET ITEM ENTRY GRID */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: '16px 20px' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            overflow: 'visible'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>
                  <th style={{ width: '38px', padding: '10px 8px', textAlign: 'center' }}>#</th>
                  <th style={{ minWidth: '280px', padding: '10px 10px' }}>ITEM DESCRIPTION (RAW MATERIAL / PRODUCT)</th>
                  <th style={{ width: '100px', padding: '10px 8px' }}>STOCK</th>
                  <th style={{ width: '110px', padding: '10px 8px' }}>UNIT</th>
                  <th style={{ width: '110px', padding: '10px 8px', textAlign: 'right' }}>QTY</th>
                  <th style={{ width: '130px', padding: '10px 8px', textAlign: 'right' }}>RATE (₹)</th>
                  <th style={{ width: '110px', padding: '10px 8px', textAlign: 'right' }}>DISC (₹)</th>
                  <th style={{ width: '100px', padding: '10px 8px', textAlign: 'right' }}>GST %</th>
                  <th style={{ width: '140px', padding: '10px 12px', textAlign: 'right' }}>AMOUNT (₹)</th>
                  <th style={{ width: '45px', padding: '10px 6px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const isDropdownActive = activeItemDropdownIdx === idx;

                  return (
                    <tr 
                      key={idx}
                      style={{ 
                        borderBottom: '1px solid #e2e8f0',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                    >
                      {/* # Number */}
                      <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>
                        {idx + 1}
                      </td>

                      {/* Item Search & Autocomplete */}
                      <td style={{ padding: '6px 8px', position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            ref={el => { itemInputRefs.current[idx] = el; }}
                            type="text"
                            className="form-input"
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              borderColor: item.item_name ? '#0284c7' : '#cbd5e1',
                              background: item.item_name ? '#f0f9ff' : '#ffffff'
                            }}
                            placeholder="Search raw material, mawa, ghee, almond, box..."
                            value={isDropdownActive ? itemSearchText : item.item_name}
                            onFocus={() => {
                              setActiveItemDropdownIdx(idx);
                              setItemSearchText(item.item_name || '');
                              setItemHighlightIdx(0);
                            }}
                            onChange={e => {
                              setItemSearchText(e.target.value);
                              setActiveItemDropdownIdx(idx);
                              handleRowChange(idx, 'item_name', e.target.value);
                            }}
                            onKeyDown={e => {
                              if (!isDropdownActive) {
                                if (e.key === 'ArrowDown') {
                                  setActiveItemDropdownIdx(idx);
                                  return;
                                }
                              }

                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setItemHighlightIdx(prev => Math.min(prev + 1, filteredCatalogueItems.length - 1));
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setItemHighlightIdx(prev => Math.max(prev - 1, 0));
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (filteredCatalogueItems[itemHighlightIdx]) {
                                  handleSelectItem(idx, filteredCatalogueItems[itemHighlightIdx]);
                                } else {
                                  // Jump to Quantity
                                  qtyInputRefs.current[idx]?.focus();
                                  qtyInputRefs.current[idx]?.select();
                                }
                              }
                            }}
                          />

                          {/* Live Autocomplete Dropdown */}
                          {isDropdownActive && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: '#ffffff',
                              border: '2px solid #0284c7',
                              borderRadius: '6px',
                              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                              zIndex: 999999,
                              maxHeight: '260px',
                              overflowY: 'auto',
                              marginTop: '2px'
                            }}>
                              {filteredCatalogueItems.length === 0 ? (
                                <div style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748b' }}>
                                  No exact match. Press <strong>Enter</strong> to use "<strong>{itemSearchText}</strong>" as custom entry.
                                </div>
                              ) : (
                                filteredCatalogueItems.map((catItem, catIdx) => {
                                  const isHigh = catIdx === itemHighlightIdx;
                                  return (
                                    <div
                                      key={catIdx}
                                      onMouseDown={() => handleSelectItem(idx, catItem)}
                                      onMouseEnter={() => setItemHighlightIdx(catIdx)}
                                      style={{
                                        padding: '7px 12px',
                                        borderBottom: '1px solid #f1f5f9',
                                        cursor: 'pointer',
                                        background: isHigh ? '#e0f2fe' : 'transparent',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
                                          {catItem.name}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '8px' }}>
                                          <span style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '3px' }}>{catItem.category}</span>
                                          {catItem.code && <span>SKU: {catItem.code}</span>}
                                          <span>Unit: <strong>{catItem.unit}</strong></span>
                                        </div>
                                      </div>

                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0284c7', fontFamily: 'monospace' }}>
                                          {formatCurrency(catItem.rate)} / {catItem.unit}
                                        </div>
                                        <span style={{ fontSize: '0.68rem', color: catItem.stock <= 5 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                                          Stock: {catItem.stock} {catItem.unit}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td style={{ padding: '6px 8px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                        {item.current_stock ? `${item.current_stock} ${item.unit}` : '-'}
                      </td>

                      {/* Unit */}
                      <td style={{ padding: '6px 8px' }}>
                        <select
                          className="form-select"
                          style={{ padding: '5px 6px', fontSize: '0.8rem', fontWeight: 700 }}
                          value={item.unit}
                          onChange={e => handleRowChange(idx, 'unit', e.target.value)}
                        >
                          <option value="KG">KG (Kilo)</option>
                          <option value="GM">GM (Gram)</option>
                          <option value="LTR">LTR (Litre)</option>
                          <option value="ML">ML (Millilitre)</option>
                          <option value="PCS">PCS (Pieces)</option>
                          <option value="BOX">BOX (Sweet Box)</option>
                          <option value="PKT">PKT (Packet)</option>
                          <option value="BAG">BAG (Bora / Sack)</option>
                          <option value="TIN">TIN (Ghee Dabba)</option>
                        </select>
                      </td>

                      {/* Quantity */}
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          ref={el => { qtyInputRefs.current[idx] = el; }}
                          type="number"
                          min="0.001"
                          step="any"
                          className="form-input font-mono"
                          style={{ padding: '5px 8px', fontSize: '0.88rem', fontWeight: 800, textAlign: 'right' }}
                          value={item.quantity}
                          onChange={e => handleRowChange(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              rateInputRefs.current[idx]?.focus();
                              rateInputRefs.current[idx]?.select();
                            }
                          }}
                        />
                      </td>

                      {/* Rate */}
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          ref={el => { rateInputRefs.current[idx] = el; }}
                          type="number"
                          min="0"
                          step="any"
                          className="form-input font-mono"
                          placeholder="0.00"
                          style={{ padding: '5px 8px', fontSize: '0.88rem', fontWeight: 800, textAlign: 'right', color: '#0f172a' }}
                          value={item.rate}
                          onChange={e => handleRowChange(idx, 'rate', e.target.value === '' ? '' : Number(e.target.value))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              discountInputRefs.current[idx]?.focus();
                              discountInputRefs.current[idx]?.select();
                            }
                          }}
                        />
                      </td>

                      {/* Discount */}
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          ref={el => { discountInputRefs.current[idx] = el; }}
                          type="number"
                          min="0"
                          step="any"
                          className="form-input font-mono"
                          style={{ padding: '5px 8px', fontSize: '0.82rem', textAlign: 'right' }}
                          value={item.discount}
                          onChange={e => handleRowChange(idx, 'discount', Number(e.target.value) || 0)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              // Move to next row or add new row
                              if (idx < items.length - 1) {
                                itemInputRefs.current[idx + 1]?.focus();
                              } else {
                                handleAddRow();
                              }
                            }
                          }}
                        />
                      </td>

                      {/* GST % */}
                      <td style={{ padding: '6px 8px' }}>
                        <select
                          className="form-select font-mono"
                          style={{ padding: '5px 6px', fontSize: '0.8rem', textAlign: 'right' }}
                          value={item.gst_rate}
                          onChange={e => handleRowChange(idx, 'gst_rate', Number(e.target.value))}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>

                      {/* Line Amount */}
                      <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', fontFamily: 'monospace' }}>
                        {formatCurrency(item.amount)}
                      </td>

                      {/* Delete */}
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                          title="Remove row"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Quick Add Row Button */}
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleAddRow}
                style={{
                  background: '#ffffff',
                  border: '1.5px dashed #0284c7',
                  color: '#0284c7',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} /> + Add Item Row (F3)
              </button>

              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                Total Items: <strong>{validItems.length}</strong> | Total Qty: <strong>{validItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 5. BOTTOM STICKY FINANCIALS & ACTIONS FOOTER */}
        <div style={{
          background: '#ffffff',
          borderTop: '2px solid #cbd5e1',
          padding: '14px 20px',
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1.5fr',
          gap: '20px',
          alignItems: 'center',
          boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.06)'
        }}>
          {/* Left: Notes & Transporter Details + Bill Attachment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                📝 Notes / Transport / E-Way Bill Details
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Tempo GJ-05-AB-1234 / Driver Ramesh / Checked at factory gate"
                style={{ fontSize: '0.82rem' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div>
              <ImageUploadDropzone
                value={billPhotoUrl}
                onChange={setBillPhotoUrl}
                placeholder="Attach vendor purchase bill photo / invoice slip"
              />
            </div>
          </div>

          {/* Middle: Paid Amount & Balance Due */}
          <div style={{ background: '#f8fafc', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>Paid Amount (₹):</span>
              <input
                type="number"
                min="0"
                step="any"
                className="form-input font-mono"
                style={{ width: '130px', padding: '4px 8px', fontSize: '0.85rem', fontWeight: 800, textAlign: 'right', color: '#047857', background: '#f0fdf4', borderColor: '#86efac' }}
                value={paidAmount}
                onChange={e => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>Balance Payable:</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: dueAmount > 0 ? '#b91c1c' : '#16a34a', fontFamily: 'monospace' }}>
                {formatCurrency(dueAmount)}
              </span>
            </div>
          </div>

          {/* Right: Grand Total & Big Save Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Grand Total ({validItems.length} items)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                {formatCurrency(grandTotal)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Sub: {formatCurrency(subtotal)} | GST: {formatCurrency(totalGst)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '10px 16px', fontWeight: 800 }}
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  padding: '10px 20px',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Saving...' : '💾 Save Voucher (Ctrl+S)'}
              </button>

              <button
                type="button"
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
                  color: '#ffffff',
                  padding: '10px 16px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(15, 118, 110, 0.35)',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <Printer size={15} />
                🖨️ Save & Print
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Quick Add Supplier Modal Popup */}
      {isAddSupplierModalOpen && (
        <SupplierModal
          isOpen={isAddSupplierModalOpen}
          onClose={() => setIsAddSupplierModalOpen(false)}
          onSuccess={(newSup) => {
            loadData();
            handleSelectSupplier(newSup);
          }}
        />
      )}

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
              Discard Current Purchase Bill?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              You have unsaved purchase entries or vendor details. Are you sure you want to discard and close?
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
