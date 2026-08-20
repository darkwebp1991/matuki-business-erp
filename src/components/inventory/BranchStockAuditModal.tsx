import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Download, 
  Upload, 
  Save, 
  X, 
  Printer, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Copy, 
  Calendar, 
  User, 
  TrendingUp, 
  TrendingDown,
  FileSpreadsheet,
  FileText,
  Tag
} from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';
import { exportStockAuditCSV, parseCSV } from '../../utils/exportUtils';

interface BranchStockAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMonth?: string;
}

export const BranchStockAuditModal: React.FC<BranchStockAuditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMonth
}) => {
  const currentMonthStr = initialMonth || new Date().toISOString().slice(0, 7);
  const [auditMonth, setAuditMonth] = useState<string>(currentMonthStr);
  const [auditDate, setAuditDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [auditorName, setAuditorName] = useState<string>('Suraj Bhai / Paresh Patel');
  const [notes, setNotes] = useState<string>('');

  // Sarthana & Katargam Direct Totals + Category Breakdown Descriptions
  const [sarthanaValuation, setSarthanaValuation] = useState<number>(125000);
  const [sarthanaNotes, setSarthanaNotes] = useState<string>('Kaju Sweets ₹50,000 | Mawa ₹40,000 | Farsan ₹20,000 | Packaging ₹15,000');

  const [katargamValuation, setKatargamValuation] = useState<number>(95000);
  const [katargamNotes, setKatargamNotes] = useState<string>('Kaju Katli ₹40,000 | Bengali Sweets ₹30,000 | Gift Boxes ₹25,000');
  
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    factory_valuation: 0,
    sarthana_valuation: 125000,
    katargam_valuation: 95000,
    total_valuation: 0,
    total_variance_value: 0,
    total_items: 0
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('ALL'); // ALL, RAW_MATERIAL, PRODUCT

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showCloseConfirm, setShowCloseConfirm] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load audit template for selected month
  const loadAuditData = async (month: string) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await api.getStockAuditTemplate(month);
      setItems(data.items || []);
      
      const sVal = Number(data.sarthana_valuation) || 125000;
      const sNotes = data.sarthana_notes || 'Kaju Sweets ₹50,000 | Mawa ₹40,000 | Farsan ₹20,000 | Packaging ₹15,000';
      const kVal = Number(data.katargam_valuation) || 95000;
      const kNotes = data.katargam_notes || 'Kaju Katli ₹40,000 | Bengali Sweets ₹30,000 | Gift Boxes ₹25,000';

      setSarthanaValuation(sVal);
      setSarthanaNotes(sNotes);
      setKatargamValuation(kVal);
      setKatargamNotes(kNotes);

      if (data.audit_date) setAuditDate(data.audit_date);
      if (data.auditor_name) setAuditorName(data.auditor_name);
      if (data.notes) setNotes(data.notes);

      // Recalculate summary
      recalculateTotals(data.items || [], sVal, kVal);
      setHasChanges(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load stock audit template');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditData(auditMonth);
    }
  }, [isOpen, auditMonth]);

  // Recalculate summary from active factory item rows + direct branch valuations
  const recalculateTotals = (newItems: any[], sVal = sarthanaValuation, kVal = katargamValuation) => {
    let fVal = 0;
    let varVal = 0;

    newItems.forEach(i => {
      const rate = Number(i.cost_rate) || 0;
      const fQty = Number(i.factory_stock) || 0;
      const variance = fQty - Number(i.system_stock || 0);

      fVal += (fQty * rate);
      varVal += (variance * rate);
    });

    const sValNum = Math.max(0, Number(sVal) || 0);
    const kValNum = Math.max(0, Number(kVal) || 0);
    const totVal = fVal + sValNum + kValNum;

    setSummary({
      factory_valuation: Math.round(fVal * 100) / 100,
      sarthana_valuation: Math.round(sValNum * 100) / 100,
      katargam_valuation: Math.round(kValNum * 100) / 100,
      total_valuation: Math.round(totVal * 100) / 100,
      total_variance_value: Math.round(varVal * 100) / 100,
      total_items: newItems.length
    });
  };

  // Update physical stock in row
  const handleItemQtyChange = (index: number, val: string) => {
    const qty = val === '' ? 0 : Math.max(0, Number(val));
    const updated = [...items];
    const item = { ...updated[index] };

    item.factory_stock = qty;
    const variance = qty - Number(item.system_stock || 0);
    item.total_physical_stock = qty;
    item.variance_qty = Math.round(variance * 100) / 100;
    item.total_valuation = Math.round(qty * Number(item.cost_rate || 0) * 100) / 100;

    updated[index] = item;
    setItems(updated);
    recalculateTotals(updated, sarthanaValuation, katargamValuation);
    setHasChanges(true);
  };

  // Copy Book Stock into Factory Count for all items
  const handleCopyAllBookStock = () => {
    const updated = items.map(item => {
      const sys = Number(item.system_stock) || 0;
      return {
        ...item,
        factory_stock: sys,
        total_physical_stock: sys,
        variance_qty: 0,
        total_valuation: Math.round(sys * Number(item.cost_rate || 0) * 100) / 100
      };
    });
    setItems(updated);
    recalculateTotals(updated, sarthanaValuation, katargamValuation);
    setHasChanges(true);
  };

  // Handle Sarthana direct total valuation change
  const handleSarthanaValChange = (val: string) => {
    const num = val === '' ? 0 : Math.max(0, Number(val));
    setSarthanaValuation(num);
    recalculateTotals(items, num, katargamValuation);
    setHasChanges(true);
  };

  // Handle Katargam direct total valuation change
  const handleKatargamValChange = (val: string) => {
    const num = val === '' ? 0 : Math.max(0, Number(val));
    setKatargamValuation(num);
    recalculateTotals(items, sarthanaValuation, num);
    setHasChanges(true);
  };

  // 1-Click Save Audit & Update Stock
  const handleSaveAudit = async () => {
    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const payload = {
        audit_month: auditMonth,
        audit_date: auditDate,
        auditor_name: auditorName,
        sarthana_valuation: sarthanaValuation,
        sarthana_notes: sarthanaNotes,
        katargam_valuation: katargamValuation,
        katargam_notes: katargamNotes,
        notes: notes || `Monthly Stock Audit - ${auditMonth}`,
        items: items
      };

      const res = await api.saveStockAudit(payload);
      setSuccessMessage(`✅ Stock Audit Applied! Total Closing Stock: ₹${res.total_valuation.toLocaleString('en-IN')} updated across Factory and Branches!`);
      setHasChanges(false);

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save stock audit');
    } finally {
      setSaving(false);
    }
  };

  // Export Printable Excel / CSV Checklist
  const handleExportCSV = () => {
    exportStockAuditCSV(items, {
      ...summary,
      sarthana_notes: sarthanaNotes,
      katargam_notes: katargamNotes
    }, auditMonth, auditorName);
  };

  // 1-Click Excel / CSV Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsedRows = parseCSV(text);
        if (parsedRows.length === 0) {
          setErrorMessage('Could not parse any rows from the selected file.');
          return;
        }

        // Match with items
        let matchedCount = 0;
        const updated = items.map(item => {
          const matched = parsedRows.find(r => {
            const rCode = (r['Item Code'] || r['ItemCode'] || r['code'] || '').toString().toLowerCase().trim();
            const rName = (r['Item Name'] || r['ItemName'] || r['name'] || '').toString().toLowerCase().trim();
            return (rCode && rCode === (item.item_code || '').toLowerCase().trim()) ||
                   (rName && rName === item.item_name.toLowerCase().trim());
          });

          if (matched) {
            matchedCount++;
            const fQty = Number(matched['Factory Physical Count (MFG)'] ?? matched['Factory Stock (MFG)'] ?? matched['Factory Stock'] ?? matched['factory_stock'] ?? matched['Physical Qty'] ?? item.factory_stock) || 0;
            const variance = fQty - Number(item.system_stock || 0);

            return {
              ...item,
              factory_stock: fQty,
              total_physical_stock: fQty,
              variance_qty: Math.round(variance * 100) / 100,
              total_valuation: Math.round(fQty * Number(item.cost_rate || 0) * 100) / 100
            };
          }
          return item;
        });

        setItems(updated);
        recalculateTotals(updated, sarthanaValuation, katargamValuation);
        setHasChanges(true);
        setSuccessMessage(`✅ 1-Click Upload Success! Loaded & matched ${matchedCount} items from Excel sheet.`);
      } catch (err: any) {
        setErrorMessage(`CSV Upload Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Smart ESC handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (hasChanges) {
          setShowCloseConfirm(true);
        } else {
          onClose();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveAudit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, items, sarthanaValuation, sarthanaNotes, katargamValuation, katargamNotes, auditMonth, auditDate, auditorName]);

  if (!isOpen) return null;

  // Filter items
  const categories = Array.from(new Set(items.map(i => i.category_name).filter(Boolean)));
  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.item_code && item.item_code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === 'ALL' || item.category_name === categoryFilter;
    const matchesType = itemTypeFilter === 'ALL' || item.item_type === itemTypeFilter;
    return matchesSearch && matchesCat && matchesType;
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        width: '98vw',
        maxWidth: '1440px',
        height: '95vh',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid #cbd5e1'
      }}>
        
        {/* MODAL HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
          color: '#ffffff',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #0d9488'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#134e4a', padding: '6px', borderRadius: '6px' }}>
              <Building2 size={22} color="#99f6e4" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.01em' }}>
                3-Branch Physical Stock Audit & Closing Valuation Matrix
              </h2>
              <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                Factory Item-by-Item Count + Sarthana & Katargam Category Totals for Google Sheet P&L Hisab
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleExportCSV}
              style={{ background: '#ffffff', color: '#0f766e', fontWeight: 800, fontSize: '0.78rem' }}
              title="Download Printable Excel Audit Sheet"
            >
              <Download size={14} /> 🖨️ Download Excel Sheet
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ background: '#134e4a', color: '#99f6e4', fontWeight: 800, fontSize: '0.78rem', border: '1px solid #2dd4bf' }}
              title="1-Click Excel/CSV Upload"
            >
              <Upload size={14} /> 📥 1-Click Excel Upload
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              style={{ display: 'none' }}
            />

            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSaveAudit}
              disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.82rem',
                padding: '6px 16px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              <Save size={15} /> {saving ? 'Updating...' : '💾 1-Click Update All Stock (Ctrl+S)'}
            </button>

            <button
              type="button"
              onClick={() => hasChanges ? setShowCloseConfirm(true) : onClose()}
              style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS BAR */}
        {successMessage && (
          <div style={{ background: '#dcfce7', color: '#15803d', padding: '8px 18px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #86efac' }}>
            <CheckCircle2 size={16} /> {successMessage}
          </div>
        )}
        {errorMessage && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 18px', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #fca5a5' }}>
            <AlertTriangle size={16} /> {errorMessage}
          </div>
        )}

        {/* 3-BRANCH VALUATION SUMMARY STRIP */}
        <div style={{
          background: '#f8fafc',
          padding: '10px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px'
        }}>
          {/* 1. FACTORY CALCULATED VALUATION */}
          <div style={{ background: '#ffffff', border: '1.5px solid #99f6e4', padding: '10px 14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f766e' }}>🏭 FACTORY (MFG)</span>
              <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>Item-Wise Count</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#115e59', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(summary.factory_valuation)}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Calculated from {items.length} raw materials & sweets
            </span>
          </div>

          {/* 2. SARTHANA DIRECT VALUATION */}
          <div style={{ background: '#ffffff', border: '1.5px solid #bfdbfe', padding: '10px 14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af' }}>🏪 SARTHANA OUTLET (SAR)</span>
              <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>Direct Value</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e3a8a', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(sarthanaValuation)}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
              {sarthanaNotes || 'Category wise total'}
            </span>
          </div>

          {/* 3. KATARGAM DIRECT VALUATION */}
          <div style={{ background: '#ffffff', border: '1.5px solid #e9d5ff', padding: '10px 14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7e22ce' }}>🏪 KATARGAM BRANCH (KAT)</span>
              <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>Direct Value</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#6b21a8', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(katargamValuation)}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
              {katargamNotes || 'Category wise total'}
            </span>
          </div>

          {/* 4. TOTAL CLOSING STOCK FOR GOOGLE P&L */}
          <div style={{ background: '#f0fdf4', border: '2px solid #86efac', padding: '10px 14px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#15803d' }}>💰 TOTAL CLOSING STOCK</span>
              <span className="badge badge-green" style={{ fontSize: '0.62rem', fontWeight: 900 }}>P&L WN 4</span>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#166534', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(summary.total_valuation)}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700 }}>
              Factory + Sarthana + Katargam Total
            </span>
          </div>
        </div>

        {/* AUDIT META + 2 BRANCH DIRECT ENTRY CARDS */}
        <div style={{
          padding: '10px 18px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: '320px 1fr 1fr',
          gap: '12px'
        }}>
          {/* Audit Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Audit Month:</span>
              <input
                type="month"
                className="form-input"
                style={{ width: '130px', padding: '2px 6px', fontSize: '0.76rem' }}
                value={auditMonth}
                onChange={(e) => setAuditMonth(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Audit Date:</span>
              <input
                type="date"
                className="form-input"
                style={{ width: '130px', padding: '2px 6px', fontSize: '0.76rem' }}
                value={auditDate}
                onChange={(e) => { setAuditDate(e.target.value); setHasChanges(true); }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Auditor Name:</span>
              <input
                type="text"
                className="form-input"
                style={{ width: '130px', padding: '2px 6px', fontSize: '0.76rem' }}
                value={auditorName}
                onChange={(e) => { setAuditorName(e.target.value); setHasChanges(true); }}
              />
            </div>
          </div>

          {/* SARTHANA BRANCH DIRECT ENTRY CARD */}
          <div style={{ background: '#eff6ff', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#1e40af' }}>
                🏪 Sarthana Outlet (SAR) - Direct Stock Total
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#1e40af' }}>₹</span>
                <input
                  type="number"
                  className="form-input"
                  style={{
                    width: '120px',
                    padding: '2px 6px',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: '#1e3a8a',
                    textAlign: 'right'
                  }}
                  value={sarthanaValuation || ''}
                  onChange={(e) => handleSarthanaValChange(e.target.value)}
                  placeholder="Total ₹"
                />
              </div>
            </div>
            <input
              type="text"
              className="form-input"
              style={{ padding: '3px 8px', fontSize: '0.72rem', width: '100%' }}
              value={sarthanaNotes}
              onChange={(e) => { setSarthanaNotes(e.target.value); setHasChanges(true); }}
              placeholder="Category-wise Notes (e.g. Kaju Sweets ₹50,000, Mawa ₹40,000, Farsan ₹20,000)"
            />
          </div>

          {/* KATARGAM BRANCH DIRECT ENTRY CARD */}
          <div style={{ background: '#faf5ff', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #e9d5ff', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#7e22ce' }}>
                🏪 Katargam Main (KAT) - Direct Stock Total
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 900, color: '#7e22ce' }}>₹</span>
                <input
                  type="number"
                  className="form-input"
                  style={{
                    width: '120px',
                    padding: '2px 6px',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: '#6b21a8',
                    textAlign: 'right'
                  }}
                  value={katargamValuation || ''}
                  onChange={(e) => handleKatargamValChange(e.target.value)}
                  placeholder="Total ₹"
                />
              </div>
            </div>
            <input
              type="text"
              className="form-input"
              style={{ padding: '3px 8px', fontSize: '0.72rem', width: '100%' }}
              value={katargamNotes}
              onChange={(e) => { setKatargamNotes(e.target.value); setHasChanges(true); }}
              placeholder="Category-wise Notes (e.g. Kaju Katli ₹40,000, Bengali Sweets ₹30,000, Boxes ₹25,000)"
            />
          </div>
        </div>

        {/* FACTORY ITEM FILTER BAR */}
        <div style={{
          padding: '8px 18px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🏭 Factory Items Count:
            </span>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '7px', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '28px', paddingRight: '8px', paddingTop: '3px', paddingBottom: '3px', fontSize: '0.78rem', width: '100%' }}
                placeholder="Search raw material, mawa, kaju sweet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              className="form-select"
              style={{ padding: '3px 8px', fontSize: '0.76rem', width: '140px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c: any) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ padding: '3px 8px', fontSize: '0.76rem', width: '130px' }}
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
            >
              <option value="ALL">All Item Types</option>
              <option value="RAW_MATERIAL">Raw Materials</option>
              <option value="PRODUCT">Finished Sweets</option>
            </select>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopyAllBookStock}
              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
              title="Copy current ERP system stock into Factory Physical Count for rapid auditing"
            >
              <Copy size={13} /> Copy Book Stock ⚡
            </button>
          </div>
        </div>

        {/* FACTORY ITEM-BY-ITEM AUDIT TABLE */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto' }} />
              Loading factory items & audit template...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              No items match your filter criteria.
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                <tr>
                  <th style={{ width: '35px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '90px' }}>CODE</th>
                  <th>ITEM NAME</th>
                  <th style={{ width: '140px' }}>CATEGORY</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>UNIT</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>RATE (₹)</th>
                  <th style={{ width: '100px', textAlign: 'right', background: '#f8fafc' }}>ERP BOOK</th>
                  <th style={{ width: '140px', textAlign: 'right', background: '#f0fdfa', color: '#0f766e', fontWeight: 900 }}>
                    🏭 FACTORY PHYSICAL
                  </th>
                  <th style={{ width: '90px', textAlign: 'right' }}>VARIANCE</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>VALUATION (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const actualIdx = items.findIndex(i => i.item_type === item.item_type && i.item_id === item.item_id);
                  const isLow = Number(item.factory_stock) < Number(item.system_stock);
                  const isHigh = Number(item.factory_stock) > Number(item.system_stock);

                  return (
                    <tr key={`${item.item_type}_${item.item_id}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                      <td className="font-mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {item.item_code}
                      </td>
                      <td>
                        <strong>{item.item_name}</strong>
                        {item.item_type === 'RAW_MATERIAL' && (
                          <span className="badge badge-blue" style={{ marginLeft: '6px', fontSize: '0.6rem' }}>RAW</span>
                        )}
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.74rem' }}>{item.category_name}</td>
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{item.unit}</td>
                      <td className="font-mono" style={{ textAlign: 'right' }}>
                        {formatCurrency(item.cost_rate)}
                      </td>
                      <td className="font-mono" style={{ textAlign: 'right', background: '#f8fafc', fontWeight: 600 }}>
                        {item.system_stock}
                      </td>

                      {/* FACTORY PHYSICAL COUNT INPUT */}
                      <td style={{ textAlign: 'right', background: '#f0fdfa', padding: '3px 8px' }}>
                        <input
                          type="number"
                          step="any"
                          className="form-input"
                          style={{
                            width: '100%',
                            textAlign: 'right',
                            fontWeight: 900,
                            fontFamily: 'var(--font-mono)',
                            color: '#0f766e',
                            background: '#ffffff',
                            border: '1.5px solid #2dd4bf',
                            padding: '3px 6px',
                            fontSize: '0.84rem'
                          }}
                          value={item.factory_stock === 0 ? '0' : (item.factory_stock || '')}
                          onChange={(e) => handleItemQtyChange(actualIdx, e.target.value)}
                        />
                      </td>

                      {/* VARIANCE */}
                      <td className="font-mono" style={{
                        textAlign: 'right',
                        fontWeight: 800,
                        color: isLow ? '#dc2626' : isHigh ? '#16a34a' : '#94a3b8'
                      }}>
                        {item.variance_qty > 0 ? `+${item.variance_qty}` : item.variance_qty}
                      </td>

                      {/* FACTORY VALUATION */}
                      <td className="font-mono" style={{ textAlign: 'right', fontWeight: 900, color: '#0f766e' }}>
                        {formatCurrency(item.total_valuation)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '10px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: '#475569' }}>
            <span>⌨️ Shortcut: <strong>Ctrl+S</strong> to Update Stock & P&L</span>
            <span>•</span>
            <span>ESC to close</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => hasChanges ? setShowCloseConfirm(true) : onClose()}
            >
              Cancel / Close
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={handleSaveAudit}
              disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.85rem',
                padding: '6px 20px',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
              }}
            >
              <Save size={16} /> {saving ? 'Saving & Updating Stock...' : '💾 1-Click Update All Stock & P&L'}
            </button>
          </div>
        </div>

      </div>

      {/* DISCARD CHANGES CONFIRMATION POPUP */}
      {showCloseConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '8px',
            padding: '20px 24px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} /> Discard Unsaved Stock Audit?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#475569' }}>
              You have modified physical stock counts. Are you sure you want to discard without updating the stock?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCloseConfirm(false)}
              >
                Keep Editing
              </button>
              <button
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
