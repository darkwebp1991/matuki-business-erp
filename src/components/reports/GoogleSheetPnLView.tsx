import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Download, 
  Printer, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Layers, 
  FileSpreadsheet,
  Building2,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Calculator,
  PieChart,
  CheckCircle2,
  Upload,
  ClipboardList
} from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';
import { BranchStockAuditModal } from '../inventory/BranchStockAuditModal';

import { BusinessSettings } from '../../types';

interface GoogleSheetPnLViewProps {
  settings?: BusinessSettings | null;
}

export const GoogleSheetPnLView: React.FC<GoogleSheetPnLViewProps> = ({ settings: propSettings }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(`${todayStr.slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'main' | 'wn1_expenses' | 'wn2_customers' | 'wn3_suppliers' | 'wn4_stock'>('main');
  const [settings, setSettings] = useState<BusinessSettings | null>(propSettings || null);
  const [isStockAuditModalOpen, setIsStockAuditModalOpen] = useState<boolean>(false);

  // WN1 Expense filters
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseFilterType, setExpenseFilterType] = useState<'ALL' | 'DIRECT' | 'INDIRECT'>('ALL');
  const [expenseFilterLocation, setExpenseFilterLocation] = useState<'ALL' | 'FACTORY' | 'SARTHANA' | 'KATARGAM' | 'HEAD_OFFICE'>('ALL');
  const [expenseFilterHead, setExpenseFilterHead] = useState<string>('ALL');

  useEffect(() => {
    if (!propSettings) {
      api.getSettings().then(setSettings).catch(() => null);
    } else {
      setSettings(propSettings);
    }
  }, [propSettings]);

  const fetchPnL = async () => {
    try {
      setLoading(true);
      const data = await api.getGoogleSheetPnL(startDate, endDate);
      setReport(data);
    } catch (err) {
      console.error('Error fetching Google Sheet PnL:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnL();
  }, [startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const columns = report?.columns || [];
  const colCount = columns.length;

  const handleExportCSV = () => {
    if (!report || columns.length === 0) return;
    const headerRow = ['Profit / Loss Particulars', ...columns.map((c: any) => c.pct_label), ...columns.map((c: any) => `${c.label} (₹)`), 'Working Note'];
    const rows = [
      headerRow,
      ['Sales', ...columns.map(() => '100.00%'), ...columns.map((c: any) => c.data.sales), ''],
      ['Less: Direct Expense', ...columns.map((c: any) => `${c.data.direct_expense_pct}%`), ...columns.map((c: any) => -c.data.direct_expense), 'WN 1'],
      ['Less: Labour', ...columns.map((c: any) => `${c.data.labour_pct}%`), ...columns.map((c: any) => -c.data.labour), 'WN 2'],
      ['Less: Transportation', ...columns.map((c: any) => `${c.data.transportation_pct}%`), ...columns.map((c: any) => -c.data.transportation), 'WN 3'],
      ['Add/Less: Stock Addition / Usage', ...columns.map((c: any) => `${c.data.stock_addition_pct}%`), ...columns.map((c: any) => c.data.stock_addition), 'WN 4'],
      ['Gross Profit', ...columns.map((c: any) => `${c.data.gross_profit_pct}%`), ...columns.map((c: any) => c.data.gross_profit), ''],
      ['Less: Indirect Expense', ...columns.map((c: any) => `${c.data.indirect_expense_pct}%`), ...columns.map((c: any) => -c.data.indirect_expense), ''],
      ['Cash Profit', ...columns.map((c: any) => `${c.data.cash_profit_pct}%`), ...columns.map((c: any) => c.data.cash_profit), ''],
      ['Less: Depreciation', ...columns.map((c: any) => `${c.data.depreciation_pct}%`), ...columns.map((c: any) => -c.data.depreciation), ''],
      ['Net Profit', ...columns.map((c: any) => `${c.data.net_profit_pct}%`), ...columns.map((c: any) => c.data.net_profit), '']
    ];
    exportToCSV(rows, `Matuki_Monthly_Profit_Loss_${startDate}_to_${endDate}.csv`);
  };

  if (loading && !report) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={28} className="spin" style={{ marginBottom: '14px', color: '#15803d' }} />
        <p style={{ fontWeight: 600 }}>Calculating live Monthly Profit & Loss Spreadsheet...</p>
      </div>
    );
  }

  const cash = report?.cash_reconciliation || {};
  const stockLoc = report?.stock_by_location || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Header Toolbar */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: '#ffffff',
        padding: '12px 18px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '8px',
            borderRadius: '4px',
            background: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0'
          }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              {settings?.business_name || 'MATUKI SWEETS'} — Monthly Profit & Loss (Google Sheet Specification)
            </h2>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              Live Dynamic Revenue & Expense Matrix with Real-Time Customer Collections & Working Notes
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Sub-Tabs */}
          <div style={{ display: 'flex', background: '#f8fafc', padding: '3px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <button
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '3px',
                border: 'none',
                background: activeTab === 'main' ? '#15803d' : 'transparent',
                color: activeTab === 'main' ? '#fff' : '#64748b',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('main')}
            >
              Main P&L Sheet
            </button>
            <button
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '3px',
                border: 'none',
                background: activeTab === 'wn1_expenses' ? '#15803d' : 'transparent',
                color: activeTab === 'wn1_expenses' ? '#fff' : '#64748b',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('wn1_expenses')}
            >
              WN 1: Expenses & Heads
            </button>
            <button
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '3px',
                border: 'none',
                background: activeTab === 'wn2_customers' ? '#15803d' : 'transparent',
                color: activeTab === 'wn2_customers' ? '#fff' : '#64748b',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('wn2_customers')}
            >
              WN 2: Customer Receivables
            </button>
            <button
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '3px',
                border: 'none',
                background: activeTab === 'wn3_suppliers' ? '#15803d' : 'transparent',
                color: activeTab === 'wn3_suppliers' ? '#fff' : '#64748b',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('wn3_suppliers')}
            >
              WN 3: Supplier Payables
            </button>
            <button
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '3px',
                border: 'none',
                background: activeTab === 'wn4_stock' ? '#0f766e' : 'transparent',
                color: activeTab === 'wn4_stock' ? '#fff' : '#64748b',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('wn4_stock')}
            >
              WN 4: 3-Branch Stock
            </button>
          </div>

          <button 
            className="btn btn-sm" 
            onClick={() => setIsStockAuditModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
              color: '#ffffff',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              padding: '5px 12px',
              boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)'
            }}
          >
            <Building2 size={14} /> 🏢 3-Branch Stock Audit ⚡
          </button>

          <button className="btn btn-secondary btn-sm" onClick={fetchPnL} title="Recalculate Live Data">
            <RefreshCw size={14} /> Recalculate
          </button>

          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} style={{ color: '#15803d', borderColor: '#bbf7d0' }}>
            <Download size={14} /> Export CSV
          </button>

          <button className="btn btn-vyapar-red btn-sm" onClick={handlePrint}>
            <Printer size={14} /> Print Sheet
          </button>
        </div>
      </div>

      {/* Date Range Selector Filter Bar */}
      <div className="no-print" style={{
        background: '#ffffff',
        padding: '10px 16px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.82rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 700, color: '#475569' }}>Selected Period:</span>
          <input
            type="date"
            className="form-input"
            style={{ width: '135px', padding: '3px 8px', fontSize: '0.8rem' }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span>to</span>
          <input
            type="date"
            className="form-input"
            style={{ width: '135px', padding: '3px 8px', fontSize: '0.8rem' }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={fetchPnL} style={{ padding: '3px 10px' }}>
            Apply Filter
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
            onClick={() => {
              const d = new Date();
              setStartDate(`${d.toISOString().slice(0, 7)}-01`);
              setEndDate(d.toISOString().split('T')[0]);
            }}
          >
            This Month
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
            onClick={() => {
              const d = new Date();
              const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
              const last = new Date(d.getFullYear(), d.getMonth(), 0);
              setStartDate(prev.toISOString().split('T')[0]);
              setEndDate(last.toISOString().split('T')[0]);
            }}
          >
            Last Month
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
            onClick={() => {
              const d = new Date();
              setStartDate(`${d.getFullYear()}-04-01`);
              setEndDate(d.toISOString().split('T')[0]);
            }}
          >
            Full FY 26-27
          </button>
        </div>
      </div>

      {/* TAB 1: MAIN MONTHLY PROFIT & LOSS SPREADSHEET + CASH RECONCILIATION */}
      {activeTab === 'main' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: '14px' }}>
          {/* LEFT: The Exact Google Sheet Table */}
          <div className="sheet-wrapper invoice-printable" style={{ padding: '0', overflowX: 'auto' }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                Trading & Manufacturing Profit / Loss Account
              </span>
              <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>
                ● LIVE REAL-TIME FORMULA ENGINE
              </span>
            </div>

            <table className="sheet-grid" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Profit / Loss Particulars</th>
                  {columns.map((col: any) => (
                    <th key={col.key} style={{ textAlign: 'right', minWidth: '85px', color: col.key === 'current' ? '#15803d' : '#0f172a' }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 1. SALES */}
                <tr style={{ background: '#f0fdf4' }}>
                  <td><strong style={{ color: '#0f172a' }}>Sales & Revenue</strong></td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: col.key === 'current' ? '#15803d' : '#0f172a' }}>
                      {formatCurrency(col.data.sales)}
                    </td>
                  ))}
                </tr>

                {/* 2. DIRECT EXPENSE (WN 1) */}
                <tr>
                  <td>
                    <span>Less: Direct Expense (Raw Material Purchases)</span>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('wn1_expenses')}
                      className="badge badge-amber" 
                      style={{ marginLeft: '6px', fontSize: '0.65rem', cursor: 'pointer', border: 'none' }}
                      title="View Working Note 1: Direct & Indirect Expenses Breakdown"
                    >
                      WN 1 ↗
                    </button>
                  </td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="font-mono" style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                      -{formatCurrency(col.data.direct_expense)}
                    </td>
                  ))}
                </tr>

                {/* 3. LABOUR (WN 1 - Labour) */}
                <tr>
                  <td>
                    <span>Less: Labour & Wages</span>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('wn1_expenses')}
                      className="badge badge-amber" 
                      style={{ marginLeft: '6px', fontSize: '0.65rem', cursor: 'pointer', border: 'none' }}
                      title="View Labour Charges in WN 1"
                    >
                      WN 1 (Labour) ↗
                    </button>
                  </td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="font-mono" style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                      -{formatCurrency(col.data.labour)}
                    </td>
                  ))}
                </tr>

                {/* 4. TRANSPORTATION (WN 1 - Transport) */}
                <tr>
                  <td>
                    <span>Less: Transportation & Fuel</span>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('wn1_expenses')}
                      className="badge badge-amber" 
                      style={{ marginLeft: '6px', fontSize: '0.65rem', cursor: 'pointer', border: 'none' }}
                      title="View Transportation in WN 1"
                    >
                      WN 1 (Transport) ↗
                    </button>
                  </td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="font-mono" style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                      -{formatCurrency(col.data.transportation)}
                    </td>
                  ))}
                </tr>

                {/* 5. STOCK ADDITION / USAGE (WN 4) */}
                <tr>
                  <td>
                    <span>Add/Less: Stock Addition / -Usage</span>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('wn4_stock')}
                      className="badge badge-teal" 
                      style={{ marginLeft: '6px', fontSize: '0.65rem', cursor: 'pointer', border: 'none', background: '#ccfbf1', color: '#0f766e' }}
                      title="View 3-Branch Stock in WN 4"
                    >
                      WN 4 (Stock) ↗
                    </button>
                  </td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="font-mono" style={{ textAlign: 'right', color: col.data.stock_addition >= 0 ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                      {col.data.stock_addition >= 0 ? `+${formatCurrency(col.data.stock_addition)}` : `-${formatCurrency(Math.abs(col.data.stock_addition))}`}
                    </td>
                  ))}
                </tr>

                {/* 6. GROSS PROFIT */}
                <tr className="sheet-highlight-green">
                  <td><strong>Gross Profit</strong></td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="font-mono" style={{ textAlign: 'right', fontWeight: 900, fontSize: '0.88rem' }}>
                      {formatCurrency(col.data.gross_profit)}
                      <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700 }}>
                        ({col.data.gross_profit_pct}%)
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 7. INDIRECT EXPENSE */}
                <tr>
                  <td>
                    <span>Less: Indirect Expenses (Rent, Electricity, Maintenance)</span>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('wn1_expenses')}
                      className="badge badge-blue" 
                      style={{ marginLeft: '6px', fontSize: '0.65rem', cursor: 'pointer', border: 'none', background: '#dbeafe', color: '#1e40af' }}
                      title="View Indirect Expenses in WN 1"
                    >
                      WN 1 (Overheads) ↗
                    </button>
                  </td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="font-mono" style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                      -{formatCurrency(col.data.indirect_expense)}
                    </td>
                  ))}
                </tr>

                {/* 8. CASH PROFIT */}
                <tr style={{ background: '#fefce8' }}>
                  <td><strong style={{ color: '#d97706' }}>Cash Profit</strong></td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="font-mono" style={{ textAlign: 'right', fontWeight: 900, color: '#d97706', fontSize: '0.88rem' }}>
                      {formatCurrency(col.data.cash_profit)}
                      <div style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700 }}>
                        ({col.data.cash_profit_pct}%)
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 9. DEPRECIATION */}
                <tr>
                  <td><span>Less: Depreciation (2.5%)</span></td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="font-mono" style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                      -{formatCurrency(col.data.depreciation)}
                    </td>
                  ))}
                </tr>

                {/* 10. NET PROFIT */}
                <tr className="sheet-highlight-amber">
                  <td><strong>Net Profit</strong></td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="font-mono" style={{ textAlign: 'right', fontWeight: 900, fontSize: '0.94rem', color: col.data.net_profit >= 0 ? '#15803d' : '#dc2626' }}>
                      {formatCurrency(col.data.net_profit)}
                      <div style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                        ({col.data.net_profit_pct}%)
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT: CASH RECONCILIATION & STOCK BY LOCATION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Cash Reconciliation Block */}
            <div className="sheet-wrapper" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                  Cash Reconciliation
                </span>
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Live Collections</span>
              </div>

              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Opening Cash Balance:</span>
                  <strong className="font-mono">{formatCurrency(cash.opening_cash_balance)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                  <span>(+) Cash Profit:</span>
                  <strong className="font-mono">+{formatCurrency(cash.cash_profit)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '4px', fontWeight: 700 }}>
                  <span>Total Cash Available:</span>
                  <strong className="font-mono">{formatCurrency(cash.total_cash_available)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>(-) Partner Distribution:</span>
                  <strong className="font-mono">{formatCurrency(cash.partner_distribution)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>(-) Working Partner Salary:</span>
                  <strong className="font-mono">{formatCurrency(cash.working_partner_salary)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 700 }}>
                  <span>(+) Ugharani Jama (Customer Collections / Payment In):</span>
                  <strong className="font-mono">+{formatCurrency(cash.ugharani_jama)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>(-) Devana Chookvya (Supplier Outflows):</span>
                  <strong className="font-mono">-{formatCurrency(cash.devana_vadhya)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>(-) Fixed Asset Purchases:</span>
                  <strong className="font-mono">{formatCurrency(cash.new_fixed_asset)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>(-) Stock Usage:</span>
                  <strong className="font-mono">{formatCurrency(cash.stock_usage)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '4px', fontWeight: 800 }}>
                  <span>Ideal Cash Balance:</span>
                  <strong className="font-mono">{formatCurrency(cash.ideal_cash_balance)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 900, background: '#f0fdf4', padding: '4px 6px', borderRadius: '3px' }}>
                  <span>Real Cash & Bank Balance:</span>
                  <strong className="font-mono">{formatCurrency(cash.real_cash_balance)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: cash.difference_in_cash < 0 ? '#dc2626' : '#15803d' }}>
                  <span>Difference / Unaccounted:</span>
                  <strong className="font-mono">{formatCurrency(cash.difference_in_cash)}</strong>
                </div>
              </div>
            </div>

            {/* Stock Valuation by Location */}
            <div className="sheet-wrapper" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: stockLoc.is_physical_verified ? '#f0fdfa' : '#f8fafc', borderBottom: `1px solid ${stockLoc.is_physical_verified ? '#99f6e4' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: stockLoc.is_physical_verified ? '#0f766e' : '#0f172a' }}>
                  🏢 3-Branch Closing Stock
                </span>
                {stockLoc.is_physical_verified ? (
                  <span className="badge badge-green" style={{ fontSize: '0.68rem', fontWeight: 800 }}>
                    ✅ Verified ({stockLoc.audit_date})
                  </span>
                ) : (
                  <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                    ⚠️ System Estimate
                  </span>
                )}
              </div>

              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏭 Central Factory (MFG):</span>
                  <strong className="font-mono">{formatCurrency(stockLoc.godown)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏪 Sarthana Outlet (SAR):</span>
                  <strong className="font-mono">{formatCurrency(stockLoc.sarthana)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏪 Katargam Main (KAT):</span>
                  <strong className="font-mono">{formatCurrency(stockLoc.katargam)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #0f172a', paddingTop: '4px', fontWeight: 900 }}>
                  <span style={{ color: '#0f766e' }}>Total Closing Stock:</span>
                  <strong className="font-mono" style={{ color: '#0f766e', fontSize: '0.95rem' }}>{formatCurrency(stockLoc.total)}</strong>
                </div>

                <div style={{ marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setIsStockAuditModalOpen(true)}
                    style={{
                      width: '100%',
                      background: '#0f766e',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Building2 size={13} /> {stockLoc.is_physical_verified ? 'Re-Audit / Edit Stock ⚡' : 'Perform Physical Audit (1-Click) ⚡'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1.5: WN 1 DIRECT & INDIRECT EXPENSES, P&L HEADS & LOCATION BREAKDOWN */}
      {activeTab === 'wn1_expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Banner */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #86efac',
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#166534' }}>
                  📊 Working Note 1: Direct & Indirect Expenses & P&L Heads Allocation
                </span>
                <span className="badge badge-green">Accurate P&L Hisab ⚡</span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#475569' }}>
                Complete breakdown of raw material costs, karigar labour, transportation, fuel, medical, light bill, maintenance, partner salary, and branch allocation.
              </p>
            </div>

            {/* Quick Filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input font-mono"
                style={{ fontSize: '0.78rem', padding: '5px 10px', width: '220px' }}
                placeholder="Search expense / vendor / notes..."
                value={expenseSearch}
                onChange={e => setExpenseSearch(e.target.value)}
              />

              <select
                value={expenseFilterType}
                onChange={e => setExpenseFilterType(e.target.value as any)}
                style={{ fontSize: '0.78rem', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="ALL">All Nature (Direct & Indirect)</option>
                <option value="DIRECT">🍬 Direct Expenses Only</option>
                <option value="INDIRECT">📂 Indirect Expenses Only</option>
              </select>

              <select
                value={expenseFilterLocation}
                onChange={e => setExpenseFilterLocation(e.target.value as any)}
                style={{ fontSize: '0.78rem', padding: '5px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}
              >
                <option value="ALL">All Branches</option>
                <option value="FACTORY">🏭 Main Factory</option>
                <option value="SARTHANA">🏪 Sarthana Outlet</option>
                <option value="KATARGAM">🏪 Katargam Outlet</option>
                <option value="HEAD_OFFICE">🏢 Head Office</option>
              </select>
            </div>
          </div>

          {/* Cards: P&L Heads Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {(() => {
              const list: any[] = report?.wn1_expenses?.list || [];
              const directTotal = list.filter(e => (e.expense_type || 'DIRECT') === 'DIRECT').reduce((sum, e) => sum + Number(e.amount || 0), 0);
              const indirectTotal = list.filter(e => e.expense_type === 'INDIRECT').reduce((sum, e) => sum + Number(e.amount || 0), 0);
              const labourTotal = list.filter(e => e.pl_category === 'LABOUR_CHARGES' || (e.category || '').toUpperCase().includes('KARIGAR') || (e.category || '').toUpperCase().includes('LABOUR')).reduce((sum, e) => sum + Number(e.amount || 0), 0);
              const transportTotal = list.filter(e => e.pl_category === 'TRANSPORTATION' || e.pl_category === 'FUEL_EXPENSES' || (e.category || '').toUpperCase().includes('TRANSPORT')).reduce((sum, e) => sum + Number(e.amount || 0), 0);

              return (
                <>
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '12px 14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 800 }}>🍬 TOTAL DIRECT EXPENSES</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                      {formatCurrency(directTotal)}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Raw materials, gas & production costs</span>
                  </div>

                  <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', padding: '12px 14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: 800 }}>📂 TOTAL INDIRECT EXPENSES</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1d4ed8', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                      {formatCurrency(indirectTotal)}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Rent, light bill, office & general</span>
                  </div>

                  <div style={{ background: '#fef3c7', border: '1.5px solid #fde047', padding: '12px 14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#92400e', fontWeight: 800 }}>👨‍🍳 LABOUR & KARIGAR CHARGES</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                      {formatCurrency(labourTotal)}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Daily wages & helper charges</span>
                  </div>

                  <div style={{ background: '#ffedd5', border: '1.5px solid #fed7aa', padding: '12px 14px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#9a3412', fontWeight: 800 }}>🚚 TRANSPORT & FUEL</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#c2410c', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                      {formatCurrency(transportTotal)}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Vehicle fuel, tempo & delivery</span>
                  </div>
                </>
              );
            })()}
          </div>

          {/* 2-Column Summary: By Google P&L Head & By Branch Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '14px' }}>
            {/* Heads Table */}
            <div className="sheet-wrapper" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  📊 Google P&L Expense Heads Breakdown
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Grouped by Head</span>
              </div>
              <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th>P&L HEAD (હિસાબ હેડ)</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>NATURE</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>COUNT</th>
                      <th style={{ textAlign: 'right' }}>TOTAL AMOUNT (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report?.wn1_expenses?.by_head || []).map((head: any, idx: number) => {
                      const isDirect = head.expense_type === 'DIRECT';
                      return (
                        <tr key={idx}>
                          <td><strong>{head.pl_category.replace(/_/g, ' ')}</strong></td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: isDirect ? '#dcfce7' : '#eff6ff',
                              color: isDirect ? '#15803d' : '#1e40af'
                            }}>
                              {isDirect ? '🍬 Direct' : '📂 Indirect'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{head.count}</td>
                          <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: isDirect ? '#15803d' : '#1e40af' }}>
                            {formatCurrency(head.total_amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Location Table */}
            <div className="sheet-wrapper" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                  🏢 Branch / Location Allocation
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Factory vs Outlets</span>
              </div>
              <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th>LOCATION / BRANCH</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>COUNT</th>
                      <th style={{ textAlign: 'right' }}>TOTAL (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report?.wn1_expenses?.by_location || []).map((loc: any, idx: number) => (
                      <tr key={idx}>
                        <td><strong>{loc.location === 'FACTORY' ? '🏭 Main Factory' : loc.location === 'SARTHANA' ? '🏪 Sarthana Outlet' : loc.location === 'KATARGAM' ? '🏪 Katargam Outlet' : '🏢 Head Office'}</strong></td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{loc.count}</td>
                        <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          {formatCurrency(loc.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detailed Itemized Transactions Table */}
          <div className="sheet-wrapper" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>
                  All Itemized Expenses with Vendor & Location Links
                </span>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Live voucher details matching the selected period
                </div>
              </div>
              <span className="badge badge-green">Live Vouchers</span>
            </div>

            <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '35px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '90px' }}>EXPENSE NO</th>
                    <th style={{ width: '85px' }}>DATE</th>
                    <th>LINKED VENDOR / PARTY</th>
                    <th>P&L EXPENSE HEAD</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>NATURE</th>
                    <th style={{ width: '100px' }}>LOCATION</th>
                    <th>NOTES / ITEMS</th>
                    <th style={{ width: '90px' }}>PAID VIA</th>
                    <th style={{ textAlign: 'right', width: '110px' }}>AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const allExpenses: any[] = report?.wn1_expenses?.list || [];
                    const filtered = allExpenses.filter(e => {
                      if (expenseFilterType !== 'ALL' && (e.expense_type || 'DIRECT') !== expenseFilterType) return false;
                      if (expenseFilterLocation !== 'ALL' && (e.location || 'FACTORY') !== expenseFilterLocation) return false;
                      if (expenseSearch) {
                        const s = expenseSearch.toLowerCase();
                        const matchNo = (e.expense_no || '').toLowerCase().includes(s);
                        const matchVendor = (e.supplier_name || '').toLowerCase().includes(s);
                        const matchCat = (e.category || '').toLowerCase().includes(s);
                        const matchPl = (e.pl_category || '').toLowerCase().includes(s);
                        const matchNotes = (e.notes || '').toLowerCase().includes(s);
                        if (!matchNo && !matchVendor && !matchCat && !matchPl && !matchNotes) return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                            No expenses matching the filters.
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((e, idx) => {
                      const isDirect = (e.expense_type || 'DIRECT') === 'DIRECT';
                      return (
                        <tr key={e.id}>
                          <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                          <td className="font-mono" style={{ fontWeight: 700 }}>{e.expense_no}</td>
                          <td>{e.date}</td>
                          <td>
                            {e.supplier_name ? (
                              <strong style={{ color: '#0369a1' }}>{e.supplier_name}</strong>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>General Expense</span>
                            )}
                          </td>
                          <td><strong>{(e.pl_category || e.category || 'DIRECT_EXPENSES').replace(/_/g, ' ')}</strong></td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: isDirect ? '#dcfce7' : '#eff6ff',
                              color: isDirect ? '#15803d' : '#1e40af'
                            }}>
                              {isDirect ? '🍬 Direct' : '📂 Indirect'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                              {e.location === 'FACTORY' ? '🏭 Factory' : e.location === 'SARTHANA' ? '🏪 Sarthana' : e.location === 'KATARGAM' ? '🏪 Katargam' : '🏢 Head Office'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.72rem', color: '#475569' }}>{e.notes || '-'}</td>
                          <td><span className="badge badge-gray" style={{ fontSize: '0.68rem' }}>{e.payment_mode || 'Cash'}</span></td>
                          <td className="font-mono" style={{ textAlign: 'right', fontWeight: 900, color: '#dc2626' }}>
                            {formatCurrency(e.amount)}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WN 2 CUSTOMER RECEIVABLES LEDGER (UGHARANI) */}
      {activeTab === 'wn2_customers' && (
        <div className="sheet-wrapper" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>
                Working Note 2: Customer Receivables Ledger
              </span>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Real-time month sales, payments in (collections), and net closing receivable balance
              </div>
            </div>
            <span className="badge badge-green">Live Customer Balances</span>
          </div>

          <div className="table-container">
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>CUSTOMER NAME</th>
                  <th style={{ textAlign: 'right' }}>OPENING (₹)</th>
                  <th style={{ textAlign: 'right' }}>MONTH SALES (₹)</th>
                  <th style={{ textAlign: 'right', color: '#15803d' }}>COLLECTIONS (₹)</th>
                  <th style={{ textAlign: 'right' }}>CLOSING DUE (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(report?.wn2_customer_receivables || []).map((cust: any, idx: number) => (
                  <tr key={cust.id}>
                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                    <td><strong>{cust.name}</strong></td>
                    <td className="font-mono" style={{ textAlign: 'right' }}>{formatCurrency(cust.opening_balance)}</td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(cust.month_sales)}</td>
                    <td className="font-mono" style={{ textAlign: 'right', color: '#15803d', fontWeight: 800 }}>{formatCurrency(cust.month_collections)}</td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 900, color: cust.closing_balance > 0 ? '#dc2626' : '#15803d' }}>
                      {formatCurrency(cust.closing_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WN 3 SUPPLIER PAYABLES LEDGER (DEVANA) */}
      {activeTab === 'wn3_suppliers' && (
        <div className="sheet-wrapper" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a' }}>
                Working Note 3: Supplier Payables Ledger
              </span>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Raw material purchases, supplier payments, and net closing payable balance
              </div>
            </div>
            <span className="badge badge-amber">Live Supplier Balances</span>
          </div>

          <div className="table-container">
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>SUPPLIER / VENDOR NAME</th>
                  <th style={{ textAlign: 'right' }}>OPENING (₹)</th>
                  <th style={{ textAlign: 'right' }}>MONTH PURCHASES (₹)</th>
                  <th style={{ textAlign: 'right', color: '#dc2626' }}>PAYMENT OUT (₹)</th>
                  <th style={{ textAlign: 'right' }}>CLOSING PAYABLE (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(report?.wn3_supplier_payables || []).map((supp: any, idx: number) => (
                  <tr key={supp.id}>
                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                    <td><strong>{supp.name}</strong></td>
                    <td className="font-mono" style={{ textAlign: 'right' }}>{formatCurrency(supp.opening_balance)}</td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(supp.month_purchases)}</td>
                    <td className="font-mono" style={{ textAlign: 'right', color: '#dc2626', fontWeight: 800 }}>{formatCurrency(supp.month_payments)}</td>
                    <td className="font-mono" style={{ textAlign: 'right', fontWeight: 900, color: supp.closing_balance > 0 ? '#d97706' : '#15803d' }}>
                      {formatCurrency(supp.closing_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: WN 4 PHYSICAL 3-BRANCH STOCK & VALUATION */}
      {activeTab === 'wn4_stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Banner with 1-Click Launch */}
          <div style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            color: '#ffffff',
            padding: '16px 20px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
                  Working Note 4: 3-Branch Physical Stock Audit & Closing Valuation
                </h3>
                {stockLoc.is_physical_verified && (
                  <span style={{ background: '#134e4a', color: '#99f6e4', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, border: '1px solid #2dd4bf' }}>
                    ✅ Audit Applied ({stockLoc.audit_date})
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>
                Physical counts for Central Kitchen & Factory, Sarthana Showroom, and Katargam Retail Branch.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-sm"
                onClick={() => setIsStockAuditModalOpen(true)}
                style={{
                  background: '#ffffff',
                  color: '#0f766e',
                  fontWeight: 900,
                  fontSize: '0.84rem',
                  padding: '8px 18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <ClipboardList size={16} /> 📝 Open Full Stock Audit Matrix (Excel / Live Entry)
              </button>
            </div>
          </div>

          {/* 3-Branch Valuation Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ background: '#ffffff', border: '1.5px solid #99f6e4', padding: '14px 16px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.76rem', color: '#0f766e', fontWeight: 800 }}>🏭 FACTORY & GODOWN (MFG)</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#115e59', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {formatCurrency(stockLoc.godown)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Raw materials & bulk finished sweets</span>
            </div>

            <div style={{ background: '#ffffff', border: '1.5px solid #bfdbfe', padding: '14px 16px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.76rem', color: '#1e40af', fontWeight: 800 }}>🏪 SARTHANA OUTLET (SAR)</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e3a8a', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {formatCurrency(stockLoc.sarthana)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stockLoc.sarthana_notes}>
                {stockLoc.sarthana_notes || 'Direct category breakdown'}
              </span>
            </div>

            <div style={{ background: '#ffffff', border: '1.5px solid #e9d5ff', padding: '14px 16px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.76rem', color: '#7e22ce', fontWeight: 800 }}>🏪 KATARGAM BRANCH (KAT)</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#6b21a8', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {formatCurrency(stockLoc.katargam)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#7e22ce', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stockLoc.katargam_notes}>
                {stockLoc.katargam_notes || 'Direct category breakdown'}
              </span>
            </div>

            <div style={{ background: '#f0fdf4', border: '2px solid #86efac', padding: '14px 16px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(21,128,61,0.1)' }}>
              <span style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 900 }}>💰 TOTAL CLOSING STOCK (P&L)</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#166534', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {formatCurrency(stockLoc.total)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>
                {stockLoc.is_physical_verified ? `Audited by: ${stockLoc.auditor_name || 'Admin'}` : 'System calculated valuation'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3-BRANCH PHYSICAL STOCK AUDIT MODAL WORKBOOK */}
      {isStockAuditModalOpen && (
        <BranchStockAuditModal
          isOpen={isStockAuditModalOpen}
          onClose={() => setIsStockAuditModalOpen(false)}
          onSuccess={() => {
            fetchPnL();
          }}
          initialMonth={endDate.slice(0, 7)}
        />
      )}
    </div>
  );
};
