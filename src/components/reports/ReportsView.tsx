import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Table as TableIcon, 
  Calendar, 
  Download, 
  Printer, 
  Search, 
  FileText, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  TrendingUp,
  Boxes,
  Users,
  Layers,
  ChevronRight,
  Truck,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  CreditCard,
  RotateCcw,
  Send,
  FileDown,
  Share2
} from 'lucide-react';
import { api } from '../../api/client';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';
import { generateAndDownloadPartyStatementPDF, createWhatsAppStatementShareLink } from '../../utils/pdfStatementGenerator';
import { GoogleSheetPnLView } from './GoogleSheetPnLView';
import { DriverTrip, VasanLedgerEntry, VasanYadiBill, BusinessSettings } from '../../types';
import { VasanMasterModal } from '../settings/VasanMasterModal';
import { Box } from 'lucide-react';

export type ReportKey =
  | 'sale'
  | 'purchase'
  | 'day_book'
  | 'all_transactions'
  | 'profit_and_loss'
  | 'bill_wise_profit'
  | 'cash_flow'
  | 'trial_balance'
  | 'balance_sheet'
  | 'party_statement'
  | 'party_wise_profit'
  | 'all_parties'
  | 'party_report_by_item'
  | 'sale_purchase_by_party'
  | 'driver_trips'
  | 'vasan_yadi'
  | 'vasan_tracker'
  | 'stock_summary'
  | 'item_movement'
  | 'item_wise_profit'
  | 'item_category_profit'
  | 'low_stock_summary';

interface ReportsViewProps {
  settings?: BusinessSettings | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ settings: propSettings }) => {
  const [selectedReport, setSelectedReport] = useState<ReportKey>('profit_and_loss');
  const [startDate, setStartDate] = useState<string>('2022-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings | null>(propSettings || null);
  const [itemMovementSubTab, setItemMovementSubTab] = useState<'FAST' | 'DEAD' | 'ALL'>('FAST');
  const [isVasanModalOpen, setIsVasanModalOpen] = useState(false);

  useEffect(() => {
    if (!propSettings) {
      api.getSettings().then(setSettings).catch(() => null);
    } else {
      setSettings(propSettings);
    }
  }, [propSettings]);
  
  // Drivers & Vasan Filter state
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('');
  const [rentStatusFilter, setRentStatusFilter] = useState<string>('');
  const [yadiPendingOnly, setYadiPendingOnly] = useState<boolean>(true);

  // Party Statement state
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedPartyType, setSelectedPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [partySearchQuery, setPartySearchQuery] = useState<string>('');

  const fetchReport = async () => {
    if (selectedReport === 'profit_and_loss') return;
    try {
      setLoading(true);
      let data: any = null;

      switch (selectedReport) {
        case 'party_statement':
          if (selectedPartyId) {
            data = await api.getPartyLedgerStatement(selectedPartyType, selectedPartyId, startDate, endDate);
          }
          break;
        case 'sale':
          data = await api.getSaleReport(startDate, endDate);
          break;
        case 'purchase':
          data = await api.getPurchaseReport(startDate, endDate);
          break;
        case 'day_book':
          data = await api.getDayBook(endDate);
          break;
        case 'all_transactions':
          data = await api.getAllTransactionsReport(startDate, endDate);
          break;
        case 'bill_wise_profit':
          data = await api.getBillWiseProfit(startDate, endDate);
          break;
        case 'cash_flow':
          data = await api.getCashFlowReport(startDate, endDate);
          break;
        case 'trial_balance':
          data = await api.getTrialBalanceReport();
          break;
        case 'balance_sheet':
          data = await api.getBalanceSheetReport();
          break;
        case 'party_wise_profit':
          data = await api.getPartyWiseProfitReport(startDate, endDate);
          break;
        case 'all_parties':
          data = await Promise.all([api.getCustomers(), api.getSuppliers()]).then(([c, s]) => ({ customers: c, suppliers: s }));
          break;
        case 'party_report_by_item':
          data = await api.getPartyReportByItem(startDate, endDate);
          break;
        case 'sale_purchase_by_party':
          data = await api.getSalePurchaseByPartyReport();
          break;
        case 'driver_trips':
          data = await api.getDriverTripsReport({
            driver_id: selectedDriverFilter,
            rent_status: rentStatusFilter,
            startDate,
            endDate
          });
          break;
        case 'vasan_yadi':
          data = await api.getVasanYadi({
            pending_only: yadiPendingOnly,
            startDate,
            endDate
          });
          break;
        case 'vasan_tracker':
          data = await api.getVasanTracker({
            startDate,
            endDate
          });
          break;
        case 'stock_summary':
          data = await api.getInventoryItems();
          break;
        case 'item_wise_profit':
          data = await api.getItemWiseProfitReport(startDate, endDate);
          break;
        case 'item_category_profit':
          data = await api.getItemCategoryProfitReport(startDate, endDate);
          break;
        case 'item_movement':
          data = await api.getItemMovementReport(startDate, endDate);
          break;
        case 'low_stock_summary':
          data = await api.getLowStockSummaryReport();
          break;
      }

      setReportData(data);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.getCustomers(),
      api.getSuppliers(),
      api.getDrivers()
    ]).then(([custs, supps, drvs]) => {
      setCustomers(custs);
      setSuppliers(supps);
      setDrivers(drvs);
      if (custs.length > 0 && !selectedPartyId) {
        setSelectedPartyId(custs[0].id);
      }
    }).catch(console.error);
  }, []);

  // When party type changes, auto-select first party of that type
  const handlePartyTypeChange = (type: 'CUSTOMER' | 'SUPPLIER') => {
    setSelectedPartyType(type);
    setPartySearchQuery('');
    const list = type === 'CUSTOMER' ? customers : suppliers;
    if (list.length > 0) {
      setSelectedPartyId(list[0].id);
    } else {
      setSelectedPartyId(null);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport, startDate, endDate, selectedDriverFilter, rentStatusFilter, yadiPendingOnly, selectedPartyType, selectedPartyId]);

  const handleExportCSV = () => {
    if (!reportData) return;

    if (selectedReport === 'party_statement') {
      const party = reportData.party || {};
      const bName = settings?.business_name || 'MATUKI SWEETS';
      const rows = [
        [`${bName} - PARTY STATEMENT / ACCOUNT LEDGER`],
        ['Party Name', party.name || '', 'Party Type', selectedPartyType],
        ['Mobile', party.mobile || '', 'Address', party.address || ''],
        ['Statement Period', `${startDate || 'Beginning'} to ${endDate || 'Today'}`],
        ['Opening Balance (₹)', reportData.opening_balance || 0],
        [],
        ['#', 'Date', 'Voucher Type', 'Voucher #', 'Particulars / Notes', 'Debit (₹)', 'Credit (₹)', 'Running Balance (₹)']
      ];

      (reportData.entries || []).forEach((e: any, idx: number) => {
        rows.push([
          idx + 1,
          formatDate(e.entry_date),
          e.voucher_type,
          e.voucher_no || '',
          e.notes || '',
          e.debit_amount || 0,
          e.credit_amount || 0,
          e.running_balance || 0
        ]);
      });

      rows.push([]);
      rows.push(['', '', '', '', 'Total Debits (₹)', reportData.total_debit || 0, 'Total Credits (₹)', reportData.total_credit || 0]);
      rows.push(['', '', '', '', 'Net Closing Balance (₹)', reportData.closing_balance || 0]);

      exportToCSV(rows, `Party_Statement_${(party.name || 'Party').replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`);
      return;
    }

    const arrayData = Array.isArray(reportData) 
      ? reportData 
      : reportData.sales || reportData.purchases || reportData.entries || reportData.bills || reportData.accounts || reportData.trips || reportData.yadi || [];
    const prefix = (settings?.business_name || 'Business').replace(/[^a-zA-Z0-9]/g, '_');
    exportToCSV(arrayData, `${prefix}_Report_${selectedReport}.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Direct PDF Download to local drive
  const handleDownloadPDFStatement = () => {
    if (!reportData || selectedReport !== 'party_statement') return;
    try {
      generateAndDownloadPartyStatementPDF(reportData, startDate, endDate, settings);
    } catch (e: any) {
      console.error('Error generating PDF statement:', e);
      alert('Failed to generate PDF statement: ' + (e.message || 'Unknown error'));
    }
  };

  // WhatsApp Share with pre-filled message + auto-download PDF
  const handleWhatsAppShare = () => {
    if (!reportData || selectedReport !== 'party_statement') return;
    try {
      // 1. Auto generate & download the statement PDF
      generateAndDownloadPartyStatementPDF(reportData, startDate, endDate, settings);

      // 2. Open WhatsApp Web / WhatsApp Mobile
      const waUrl = createWhatsAppStatementShareLink(reportData, startDate, endDate, settings);
      window.open(waUrl, '_blank');
    } catch (e: any) {
      console.error('Error initiating WhatsApp share:', e);
      alert('Failed to initiate WhatsApp share: ' + (e.message || 'Unknown error'));
    }
  };

  // Settle Rickshaw Rent
  const handleSettleRent = async (saleId: number) => {
    try {
      await api.settleDriverRent([saleId]);
      fetchReport();
    } catch (e: any) {
      alert(e.message || 'Failed to settle rent');
    }
  };

  // Receive Returned Vasan
  const handleReceiveVasan = async (id: number, dueQty: number, vasanType = 'Vasan') => {
    const qtyStr = prompt(`Enter quantity of ${vasanType} returned (Pending: ${dueQty}):`, String(dueQty));
    if (!qtyStr) return;
    const qty = Number(qtyStr);
    if (isNaN(qty) || qty <= 0) return;

    try {
      await api.returnVasan(id, qty, 'Returned by caterer');
      fetchReport();
    } catch (e: any) {
      alert(e.message || 'Failed to record vasan return');
    }
  };

  // Charge Missing Vasan to Customer Khata
  const handleChargeMissingVasan = async (bill: VasanYadiBill) => {
    const pendingContainers = bill.containers.filter(c => c.due_qty > 0);
    if (!pendingContainers.length) {
      alert('All Vasan containers for this bill are already returned!');
      return;
    }

    if (!bill.customer_id) {
      alert('Cannot charge to cash customer. Please link bill to a registered customer Khata.');
      return;
    }

    const breakdownText = pendingContainers.map(c => `${c.due_qty}x ${c.vasan_type} (@₹${c.rate} = ₹${c.missing_amount})`).join('\n');
    const confirmMsg = `Are you sure you want to CHARGE unreturned Vasan to ${bill.customer_name}'s Khata?\n\nUnreturned Containers:\n${breakdownText}\n\nTotal Charge to Add to Bill/Khata: ₹${bill.total_missing_value}\n\nClick OK to debit customer Khata.`;

    if (window.confirm(confirmMsg)) {
      try {
        await api.chargeMissingVasan({
          sale_id: bill.sale_id,
          items: pendingContainers.map(c => ({
            id: c.id,
            vasan_type: c.vasan_type,
            missing_qty: c.due_qty,
            rate: c.rate
          }))
        });

        alert(`Successfully charged ₹${bill.total_missing_value} for missing Vasan to ${bill.customer_name}'s Khata!`);
        fetchReport();
      } catch (e: any) {
        alert(e.message || 'Failed to charge missing Vasan');
      }
    }
  };

  // Filtered party list by search
  const currentPartyList = selectedPartyType === 'CUSTOMER' ? customers : suppliers;
  const filteredParties = currentPartyList.filter(p => 
    p.name.toLowerCase().includes(partySearchQuery.toLowerCase()) ||
    (p.mobile && p.mobile.includes(partySearchQuery)) ||
    (p.code && p.code.toLowerCase().includes(partySearchQuery.toLowerCase()))
  );

  // Report Tree Navigation items
  const reportSections = [
    {
      title: 'Transaction report',
      items: [
        { id: 'sale' as ReportKey, label: 'Sale' },
        { id: 'purchase' as ReportKey, label: 'Purchase' },
        { id: 'day_book' as ReportKey, label: 'Day book' },
        { id: 'all_transactions' as ReportKey, label: 'All Transactions' },
        { id: 'profit_and_loss' as ReportKey, label: 'Profit And Loss (Google Sheet)' },
        { id: 'bill_wise_profit' as ReportKey, label: 'Bill Wise Profit' },
        { id: 'cash_flow' as ReportKey, label: 'Cash flow' },
        { id: 'trial_balance' as ReportKey, label: 'Trial Balance Report' },
        { id: 'balance_sheet' as ReportKey, label: 'Balance Sheet' }
      ]
    },
    {
      title: 'Catering Wholesale & Vasan',
      items: [
        { id: 'vasan_yadi' as ReportKey, label: '🥣 Utensil & Container Tracker' },
        { id: 'driver_trips' as ReportKey, label: '🛺 Rickshaw Driver Deliveries & Rent' },
        { id: 'vasan_tracker' as ReportKey, label: '📦 All Container Records' }
      ]
    },
    {
      title: 'Party Statement',
      items: [
        { id: 'party_statement' as ReportKey, label: '📑 Party Statement & Ledger' },
        { id: 'party_wise_profit' as ReportKey, label: 'Party wise Profit & Loss' },
        { id: 'all_parties' as ReportKey, label: 'All parties' },
        { id: 'party_report_by_item' as ReportKey, label: 'Party Report By Item' },
        { id: 'sale_purchase_by_party' as ReportKey, label: 'Sale Purchase By Party' }
      ]
    },
    {
      title: 'Item / Stock report',
      items: [
        { id: 'item_movement' as ReportKey, label: '🔥 Fast-Selling vs Dead Stock' },
        { id: 'stock_summary' as ReportKey, label: 'Stock summary' },
        { id: 'item_wise_profit' as ReportKey, label: 'Item Wise Profit And Loss' },
        { id: 'item_category_profit' as ReportKey, label: 'Item Category Wise Profit And Loss' },
        { id: 'low_stock_summary' as ReportKey, label: 'Low Stock Summary' }
      ]
    }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '16px', height: 'calc(100vh - 84px)' }}>
      {/* LEFT COLUMN: Vyapar Report Tree Navigation */}
      <div className="vyapar-party-sidebar" style={{ background: '#ffffff', overflowY: 'auto' }}>
        {reportSections.map((sec, sIdx) => (
          <div key={sIdx} style={{ marginBottom: '8px' }}>
            <div style={{
              background: '#f1f5f9',
              padding: '8px 12px',
              fontSize: '0.74rem',
              fontWeight: 800,
              color: '#64748b',
              letterSpacing: '0.04em'
            }}>
              {sec.title}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sec.items.map(item => {
                const isSelected = selectedReport === item.id;
                return (
                  <button
                    key={item.id}
                    style={{
                      padding: '9px 14px',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 500,
                      textAlign: 'left',
                      background: isSelected ? '#fef2f2' : 'transparent',
                      color: isSelected ? '#d32f2f' : '#334155',
                      border: 'none',
                      borderLeft: isSelected ? '4px solid #d32f2f' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => setSelectedReport(item.id)}
                  >
                    <span>{item.label}</span>
                    {isSelected && <ChevronRight size={14} color="#d32f2f" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT MAIN PANEL: Active Report View */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto' }}>
        {selectedReport === 'profit_and_loss' ? (
          <GoogleSheetPnLView />
        ) : (
          <>
            {/* Top Toolbar */}
            <div className="vyapar-card no-print" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {reportSections.flatMap(s => s.items).find(i => i.id === selectedReport)?.label}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Specific Filters for Party Statement */}
                {selectedReport === 'party_statement' && (
                  <>
                    <div style={{ display: 'flex', background: '#f8fafc', padding: '2px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      <button
                        type="button"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          borderRadius: '3px',
                          border: 'none',
                          background: selectedPartyType === 'CUSTOMER' ? '#15803d' : 'transparent',
                          color: selectedPartyType === 'CUSTOMER' ? '#fff' : '#475569',
                          cursor: 'pointer'
                        }}
                        onClick={() => handlePartyTypeChange('CUSTOMER')}
                      >
                        👥 Customers
                      </button>
                      <button
                        type="button"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          borderRadius: '3px',
                          border: 'none',
                          background: selectedPartyType === 'SUPPLIER' ? '#1e40af' : 'transparent',
                          color: selectedPartyType === 'SUPPLIER' ? '#fff' : '#475569',
                          cursor: 'pointer'
                        }}
                        onClick={() => handlePartyTypeChange('SUPPLIER')}
                      >
                        🚚 Suppliers
                      </button>
                    </div>

                    {/* Live Party Search Input */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '8px', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '28px', fontSize: '0.8rem', padding: '4px 8px 4px 28px', width: '180px', fontWeight: 600 }}
                        placeholder={`Search ${selectedPartyType === 'CUSTOMER' ? 'customer' : 'supplier'}...`}
                        value={partySearchQuery}
                        onChange={(e) => setPartySearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Party Dropdown */}
                    <select
                      className="form-select"
                      style={{ fontSize: '0.8rem', padding: '4px 10px', minWidth: '220px', fontWeight: 700, borderColor: '#94a3b8' }}
                      value={selectedPartyId || ''}
                      onChange={(e) => setSelectedPartyId(Number(e.target.value))}
                    >
                      {filteredParties.length === 0 ? (
                        <option value="">No {selectedPartyType === 'CUSTOMER' ? 'customers' : 'suppliers'} found</option>
                      ) : (
                        filteredParties.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.mobile ? `(${p.mobile})` : ''}
                          </option>
                        ))
                      )}
                    </select>
                  </>
                )}

                {/* Specific Filters for Vasan Yadi */}
                {selectedReport === 'vasan_yadi' && (
                  <div style={{ display: 'flex', background: '#f8fafc', padding: '2px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    <button
                      type="button"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        borderRadius: '3px',
                        border: 'none',
                        background: yadiPendingOnly ? '#d32f2f' : 'transparent',
                        color: yadiPendingOnly ? '#fff' : '#475569',
                        cursor: 'pointer'
                      }}
                      onClick={() => setYadiPendingOnly(true)}
                    >
                      Pending Utensils Only
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        borderRadius: '3px',
                        border: 'none',
                        background: !yadiPendingOnly ? '#d32f2f' : 'transparent',
                        color: !yadiPendingOnly ? '#fff' : '#475569',
                        cursor: 'pointer'
                      }}
                      onClick={() => setYadiPendingOnly(false)}
                    >
                      All Orders
                    </button>
                  </div>
                )}

                {/* Specific Filters for Driver Trips */}
                {selectedReport === 'driver_trips' && (
                  <>
                    <select
                      className="form-select"
                      style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                      value={selectedDriverFilter}
                      onChange={(e) => setSelectedDriverFilter(e.target.value)}
                    >
                      <option value="">-- All Rickshaw Drivers --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>

                    <select
                      className="form-select"
                      style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                      value={rentStatusFilter}
                      onChange={(e) => setRentStatusFilter(e.target.value)}
                    >
                      <option value="">All Rent Status</option>
                      <option value="PENDING">Pending Rent</option>
                      <option value="PAID">Paid / Settled</option>
                    </select>
                  </>
                )}

                {selectedReport !== 'trial_balance' && selectedReport !== 'balance_sheet' && selectedReport !== 'stock_summary' && selectedReport !== 'low_stock_summary' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '4px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <Calendar size={14} color="#64748b" />
                    <input
                      type="date"
                      className="form-input"
                      style={{ width: 'auto', padding: '3px 6px', fontSize: '0.78rem' }}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>to</span>
                    <input
                      type="date"
                      className="form-input"
                      style={{ width: 'auto', padding: '3px 6px', fontSize: '0.78rem' }}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                )}

                {/* Quick Date Range Preset Buttons */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 7px', fontSize: '0.72rem' }}
                    onClick={() => {
                      const d = new Date();
                      setStartDate(`${d.toISOString().slice(0, 7)}-01`);
                      setEndDate(d.toISOString().split('T')[0]);
                    }}
                    title="Current month to date"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 7px', fontSize: '0.72rem' }}
                    onClick={() => {
                      const d = new Date();
                      const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
                      const last = new Date(d.getFullYear(), d.getMonth(), 0);
                      setStartDate(prev.toISOString().split('T')[0]);
                      setEndDate(last.toISOString().split('T')[0]);
                    }}
                    title="Last full month"
                  >
                    Last Month
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 7px', fontSize: '0.72rem' }}
                    onClick={() => {
                      setStartDate('2025-01-01');
                      setEndDate(new Date().toISOString().split('T')[0]);
                    }}
                    title="All historical records"
                  >
                    All Time
                  </button>
                </div>

                <button className="btn btn-secondary btn-sm" onClick={fetchReport} title="Refresh Live Data">
                  <RefreshCw size={14} />
                </button>

                {selectedReport === 'party_statement' ? (
                  <>
                    <button
                      className="btn btn-vyapar-red btn-sm"
                      onClick={handleDownloadPDFStatement}
                      style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Save PDF Statement directly to your Downloads folder"
                    >
                      <FileDown size={14} /> 📥 Download PDF Statement
                    </button>

                    <button
                      className="btn btn-sm"
                      onClick={handleWhatsAppShare}
                      style={{
                        background: '#25D366',
                        color: '#ffffff',
                        border: '1px solid #1ebd59',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Send statement summary and PDF via WhatsApp directly to party's mobile"
                    >
                      <Send size={14} /> 📲 Send on WhatsApp
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleExportCSV}
                      style={{ color: '#15803d', borderColor: '#bbf7d0', fontWeight: 700 }}
                      title="Download complete ledger spreadsheet"
                    >
                      <Download size={14} /> Export Excel (CSV)
                    </button>

                    <button className="btn btn-secondary btn-sm" onClick={handlePrint} title="Open print preview">
                      <Printer size={14} /> Print
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} style={{ color: '#15803d', borderColor: '#bbf7d0', fontWeight: 700 }}>
                      <Download size={14} /> Export Excel (CSV)
                    </button>

                    <button className="btn btn-vyapar-red btn-sm" onClick={handlePrint}>
                      <Printer size={14} /> Print Report
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* --- REPORT 0: PARTY STATEMENT / KHATAVAHI STATEMENT (MAJOR NEW REPORT) --- */}
            {selectedReport === 'party_statement' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {!reportData ? (
                  <div className="vyapar-card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <FileText size={36} style={{ color: '#94a3b8', marginBottom: '10px' }} />
                    <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>Please select a party from the dropdown above to view the ledger statement.</p>
                  </div>
                ) : (
                  <div className="invoice-printable" style={{ background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {/* Header Statement Letterhead (Visible in Print & Screen) */}
                    <div style={{
                      padding: '16px 20px',
                      background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                      borderBottom: '2px solid #cbd5e1',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: '#d32f2f',
                            color: '#ffffff',
                            fontWeight: 900,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            {(settings?.business_name || 'MS').slice(0, 2).toUpperCase()}
                          </span>
                          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                            {settings?.business_name || 'MATUKI SWEETS'}
                          </h2>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>
                          {settings?.address || 'Surat, Gujarat'} {settings?.mobile ? `| 📞 ${settings.mobile}` : ''}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {settings?.subtitle || 'Catering Wholesale & Sweets Manufacturer'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          background: '#0f172a',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          PARTY ACCOUNT STATEMENT
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginTop: '6px' }}>
                          Period: {formatDate(startDate)} to {formatDate(endDate)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Generated on: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {/* Party Details Card */}
                    <div style={{
                      padding: '14px 20px',
                      background: '#ffffff',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '12px',
                      fontSize: '0.82rem'
                    }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
                          PARTY / CUSTOMER NAME
                        </span>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                          {reportData.party?.name}
                        </div>
                        {reportData.party?.code && (
                          <span style={{ fontSize: '0.72rem', background: '#e2e8f0', padding: '1px 6px', borderRadius: '3px', fontWeight: 700 }}>
                            Code: {reportData.party?.code}
                          </span>
                        )}
                      </div>

                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
                          CONTACT & ADDRESS
                        </span>
                        <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
                          📞 {reportData.party?.mobile || 'No Mobile Number'}
                        </div>
                        <div style={{ color: '#475569', fontSize: '0.76rem' }}>
                          📍 {reportData.party?.address || 'Surat, Gujarat'}
                        </div>
                      </div>

                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
                          ACCOUNT TYPE & GSTIN
                        </span>
                        <div style={{ marginTop: '2px' }}>
                          <span className={`badge ${reportData.party_type === 'CUSTOMER' ? 'badge-green' : 'badge-blue'}`}>
                            {reportData.party_type === 'CUSTOMER' ? '👥 CUSTOMER' : '🚚 SUPPLIER'}
                          </span>
                        </div>
                        {reportData.party?.gstin && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
                            GSTIN: {reportData.party?.gstin}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4 Financial Snapshot KPI Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '1px',
                      background: '#e2e8f0',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      {/* Opening Balance */}
                      <div style={{ background: '#ffffff', padding: '10px 16px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                          OPENING BALANCE
                        </div>
                        <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155', marginTop: '3px' }}>
                          {formatCurrency(reportData.opening_balance)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          As of {formatDate(startDate)}
                        </div>
                      </div>

                      {/* Total Debits */}
                      <div style={{ background: '#ffffff', padding: '10px 16px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>
                          TOTAL DEBIT (+ Invoices / Debit)
                        </div>
                        <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e40af', marginTop: '3px' }}>
                          +{formatCurrency(reportData.total_debit)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          Invoices & Charges
                        </div>
                      </div>

                      {/* Total Credits */}
                      <div style={{ background: '#ffffff', padding: '10px 16px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
                          TOTAL CREDIT (- Received / Payments)
                        </div>
                        <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d', marginTop: '3px' }}>
                          -{formatCurrency(reportData.total_credit)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          Payments Received & Returns
                        </div>
                      </div>

                      {/* Net Closing Balance */}
                      <div style={{ background: reportData.closing_balance > 0 ? '#fef2f2' : '#f0fdf4', padding: '10px 16px' }}>
                        <div style={{ fontSize: '0.72rem', color: reportData.closing_balance > 0 ? '#dc2626' : '#15803d', fontWeight: 900, textTransform: 'uppercase' }}>
                          {reportData.party_type === 'CUSTOMER' 
                            ? (reportData.closing_balance > 0 ? 'NET RECEIVABLE (To Collect)' : 'ADVANCE BALANCE')
                            : (reportData.closing_balance > 0 ? 'NET PAYABLE (To Pay)' : 'CLEARED')}
                        </div>
                        <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 900, color: reportData.closing_balance > 0 ? '#dc2626' : '#15803d', marginTop: '3px' }}>
                          {formatCurrency(Math.abs(reportData.closing_balance))} {reportData.closing_balance > 0 ? 'Dr' : 'Cr'}
                        </div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: reportData.closing_balance > 0 ? '#dc2626' : '#15803d' }}>
                          Closing as of {formatDate(endDate)}
                        </div>
                      </div>
                    </div>

                    {/* Itemized Ledger Statement Table */}
                    <div className="table-container" style={{ margin: 0, border: 'none' }}>
                      <table className="data-table" style={{ fontSize: '0.8rem', width: '100%' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                            <th style={{ width: '90px' }}>DATE</th>
                            <th style={{ width: '110px' }}>TYPE</th>
                            <th style={{ width: '110px' }}>VOUCHER #</th>
                            <th>PARTICULARS / DESCRIPTION</th>
                            <th style={{ textAlign: 'right', width: '110px', color: '#1e40af' }}>DEBIT (₹)</th>
                            <th style={{ textAlign: 'right', width: '110px', color: '#15803d' }}>CREDIT (₹)</th>
                            <th style={{ textAlign: 'right', width: '130px' }}>BALANCE (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Opening Balance Row if present */}
                          {reportData.opening_balance !== 0 && (
                            <tr style={{ background: '#f8fafc', fontStyle: 'italic', fontWeight: 600 }}>
                              <td style={{ textAlign: 'center', color: '#94a3b8' }}>-</td>
                              <td>{formatDate(startDate)}</td>
                              <td><span className="badge badge-slate">OPENING</span></td>
                              <td className="font-mono">-</td>
                              <td><strong>Opening Balance b/f</strong></td>
                              <td className="font-mono" style={{ textAlign: 'right' }}>
                                {reportData.opening_balance > 0 ? formatCurrency(reportData.opening_balance) : '-'}
                              </td>
                              <td className="font-mono" style={{ textAlign: 'right' }}>
                                {reportData.opening_balance < 0 ? formatCurrency(Math.abs(reportData.opening_balance)) : '-'}
                              </td>
                              <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                                {formatCurrency(Math.abs(reportData.opening_balance))} {reportData.opening_balance > 0 ? 'Dr' : 'Cr'}
                              </td>
                            </tr>
                          )}

                          {reportData.entries?.length === 0 && reportData.opening_balance === 0 ? (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                No transactions found for {reportData.party?.name} between {formatDate(startDate)} and {formatDate(endDate)}.
                              </td>
                            </tr>
                          ) : (
                            reportData.entries?.map((e: any, idx: number) => {
                              const isDebit = Number(e.debit_amount) > 0;
                              const isCredit = Number(e.credit_amount) > 0;
                              
                              let typeBadge = 'badge-slate';
                              let typeLabel = e.voucher_type;
                              if (e.voucher_type === 'SALE') {
                                typeBadge = 'badge-blue';
                                typeLabel = 'SALE';
                              } else if (e.voucher_type === 'PAYMENT_RECEIVED' || e.voucher_type === 'PAYMENT_IN') {
                                typeBadge = 'badge-green';
                                typeLabel = 'PAYMENT IN';
                              } else if (e.voucher_type === 'PAYMENT_MADE' || e.voucher_type === 'PAYMENT_OUT') {
                                typeBadge = 'badge-amber';
                                typeLabel = 'PAYMENT OUT';
                              } else if (e.voucher_type === 'SALES_RETURN' || e.voucher_type === 'CREDIT_NOTE') {
                                typeBadge = 'badge-purple';
                                typeLabel = 'CREDIT NOTE';
                              } else if (e.voucher_type === 'PURCHASE_RETURN' || e.voucher_type === 'DEBIT_NOTE') {
                                typeBadge = 'badge-purple';
                                typeLabel = 'DEBIT NOTE';
                              } else if (e.voucher_type === 'VASAN_CHARGE') {
                                typeBadge = 'badge-red';
                                typeLabel = 'VASAN PENALTY';
                              } else if (e.voucher_type === 'PURCHASE') {
                                typeBadge = 'badge-blue';
                                typeLabel = 'PURCHASE';
                              }

                              return (
                                <tr key={e.id || idx}>
                                  <td style={{ textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                                  <td>{formatDate(e.entry_date)}</td>
                                  <td>
                                    <span className={`badge ${typeBadge}`} style={{ fontSize: '0.7rem' }}>
                                      {typeLabel}
                                    </span>
                                  </td>
                                  <td className="font-mono" style={{ fontWeight: 700, color: '#d32f2f' }}>
                                    {e.voucher_no || '-'}
                                  </td>
                                  <td>
                                    <span>{e.notes || '-'}</span>
                                  </td>
                                  <td className="font-mono" style={{ textAlign: 'right', color: isDebit ? '#1e40af' : 'inherit', fontWeight: isDebit ? 700 : 400 }}>
                                    {isDebit ? formatCurrency(e.debit_amount) : '-'}
                                  </td>
                                  <td className="font-mono" style={{ textAlign: 'right', color: isCredit ? '#15803d' : 'inherit', fontWeight: isCredit ? 700 : 400 }}>
                                    {isCredit ? formatCurrency(e.credit_amount) : '-'}
                                  </td>
                                  <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: e.running_balance > 0 ? '#0f172a' : '#15803d' }}>
                                    {formatCurrency(Math.abs(e.running_balance))} {e.running_balance > 0 ? 'Dr' : 'Cr'}
                                  </td>
                                </tr>
                              );
                            })
                          )}

                          {/* Grand Totals Footer */}
                          <tr style={{ background: '#f1f5f9', fontWeight: 900, borderTop: '2px solid #0f172a' }}>
                            <td colSpan={5} style={{ textAlign: 'right', textTransform: 'uppercase', padding: '10px 14px' }}>
                              TOTAL FOR PERIOD ({formatDate(startDate)} TO {formatDate(endDate)}):
                            </td>
                            <td className="font-mono" style={{ textAlign: 'right', color: '#1e40af', fontSize: '0.9rem' }}>
                              {formatCurrency(reportData.total_debit)}
                            </td>
                            <td className="font-mono" style={{ textAlign: 'right', color: '#15803d', fontSize: '0.9rem' }}>
                              {formatCurrency(reportData.total_credit)}
                            </td>
                            <td className="font-mono" style={{ textAlign: 'right', color: reportData.closing_balance > 0 ? '#dc2626' : '#15803d', fontSize: '0.95rem' }}>
                              {formatCurrency(Math.abs(reportData.closing_balance))} {reportData.closing_balance > 0 ? 'Dr' : 'Cr'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Dual Signatures & Confirmation Footer (For Print & Official Statement) */}
                    <div style={{
                      padding: '24px 20px 16px',
                      background: '#ffffff',
                      borderTop: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ textAlign: 'center', width: '220px' }}>
                        <div style={{ borderBottom: '1px dashed #94a3b8', height: '40px', marginBottom: '6px' }}></div>
                        <span style={{ fontWeight: 700, color: '#475569' }}>Customer / Receiver Signature</span>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Account Confirmation</div>
                      </div>

                      <div style={{ textAlign: 'center', width: '220px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '35px' }}>For, {settings?.business_name || 'MATUKI SWEETS'}</div>
                        <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '6px' }}></div>
                        <span style={{ fontWeight: 700, color: '#475569' }}>Authorized Signatory</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- REPORT: VASAN YADI & MISSING PENALTY TRACKER (FEATURE RICH) --- */}
            {selectedReport === 'vasan_yadi' && reportData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Summary KPI Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px'
                }}>
                  <div className="vyapar-card" style={{ padding: '12px 16px', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL ORDERS WITH VASAN</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{reportData.summary?.total_bills || 0} Orders</div>
                  </div>

                  <div className="vyapar-card" style={{ padding: '12px 16px', borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>RETURNED CONTAINERS</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d' }}>{reportData.summary?.total_returned || 0} Vasan</div>
                  </div>

                  <div className="vyapar-card" style={{ padding: '12px 16px', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PENDING / UNRETURNED VASAN</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626' }}>{reportData.summary?.total_due || 0} Containers</div>
                  </div>

                  <div className="vyapar-card" style={{ padding: '12px 16px', borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
                    <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 800 }}>RECOVERABLE MISSING CONTAINER VALUE</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#b45309' }}>{formatCurrency(reportData.summary?.total_recoverable_value || 0)}</div>
                  </div>
                </div>

                {/* Bill-by-Bill Vasan Yadi List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reportData.yadi?.length === 0 ? (
                    <div className="vyapar-card" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      🎉 No pending Vasan returns found! All containers are cleared and accounted for.
                    </div>
                  ) : (
                    reportData.yadi?.map((bill: VasanYadiBill) => (
                      <div key={bill.sale_id} className="vyapar-card invoice-printable" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Order Header Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="font-mono" style={{ fontWeight: 900, color: '#d32f2f', fontSize: '0.95rem' }}>
                              {bill.invoice_no}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({formatDate(bill.date)})</span>
                            <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{bill.customer_name}</strong>
                            {bill.delivery_venue && (
                              <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                                📍 {bill.delivery_venue}
                              </span>
                            )}
                            {bill.driver_name && (
                              <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                                🛺 Driver: {bill.driver_name}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: bill.is_all_returned ? '#15803d' : '#dc2626' }}>
                              {bill.is_all_returned ? '✓ Fully Cleared' : `⚠️ ${bill.total_due_count} Vasan Due (Value: ₹${bill.total_missing_value})`}
                            </span>

                            {/* 1-Click Action: Charge Missing Vasan to Customer Khata */}
                            {!bill.is_all_returned && (
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary no-print"
                                style={{ color: '#d32f2f', borderColor: '#fca5a5', fontWeight: 800 }}
                                onClick={() => handleChargeMissingVasan(bill)}
                                title="If customer forgot to return, debit their ledger with container replacement cost"
                              >
                                <CreditCard size={13} /> Charge Missing Vasan (₹{bill.total_missing_value}) to Customer
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Containers Breakdown Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ textAlign: 'left', padding: '6px 8px' }}>CONTAINER TYPE</th>
                              <th style={{ textAlign: 'left', padding: '6px 8px' }}>SWEET ITEM</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px' }}>ISSUED</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px' }}>RETURNED</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px' }}>PENDING DUE</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px' }}>REPLACEMENT COST (₹)</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px' }}>MISSING VALUE (₹)</th>
                              <th style={{ textAlign: 'center', padding: '6px 8px' }} className="no-print">ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bill.containers.map((c) => (
                              <tr key={c.id} style={{ borderBottom: '1px dotted #e2e8f0' }}>
                                <td style={{ padding: '6px 8px' }}>
                                  <strong style={{
                                    color: '#92400e',
                                    background: '#fef3c7',
                                    padding: '2px 8px',
                                    borderRadius: '3px',
                                    border: '1px solid #fcd34d'
                                  }}>
                                    {c.vasan_type}
                                  </strong>
                                </td>
                                <td style={{ padding: '6px 8px', color: '#334155' }}>{c.item_name}</td>
                                <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700 }}>{c.issued_qty}</td>
                                <td style={{ textAlign: 'center', padding: '6px 8px', color: '#15803d', fontWeight: 700 }}>{c.returned_qty}</td>
                                <td style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 900, color: c.due_qty > 0 ? '#dc2626' : '#15803d' }}>
                                  {c.due_qty}
                                </td>
                                <td style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b' }}>
                                  {formatCurrency(c.rate)}
                                </td>
                                <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 800, color: c.due_qty > 0 ? '#dc2626' : '#15803d' }}>
                                  {formatCurrency(c.missing_amount)}
                                </td>
                                <td style={{ textAlign: 'center', padding: '6px 8px' }} className="no-print">
                                  {c.due_qty > 0 && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                                      onClick={() => handleReceiveVasan(c.id, c.due_qty, c.vasan_type)}
                                    >
                                      <PackageCheck size={12} /> Receive Return
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* --- REPORT 1: RICKSHAW DRIVER HISAB & DELIVERY REPORT --- */}
            {selectedReport === 'driver_trips' && reportData && (
              <div className="table-container invoice-printable">
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', fontSize: '0.84rem', flexWrap: 'wrap' }}>
                  <span>Total Delivery Trips: <strong>{reportData.summary?.total_trips || 0} Trips</strong></span>
                  <span>Total Driver Rent: <strong style={{ color: '#0f172a' }}>{formatCurrency(reportData.summary?.total_rent)}</strong></span>
                  <span>Pending To Pay: <strong style={{ color: '#dc2626' }}>{formatCurrency(reportData.summary?.pending_rent)}</strong></span>
                  <span>Paid / Settled: <strong style={{ color: '#15803d' }}>{formatCurrency(reportData.summary?.paid_rent)}</strong></span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>BILL #</th>
                      <th>CATERER CUSTOMER</th>
                      <th>DELIVERY DESTINATION / VENUE</th>
                      <th>RICKSHAW DRIVER</th>
                      <th>VASAN SENT</th>
                      <th>RENT (₹)</th>
                      <th>STATUS</th>
                      <th className="no-print">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.trips?.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                          No delivery trips found for the selected driver / dates.
                        </td>
                      </tr>
                    ) : (
                      reportData.trips?.map((t: DriverTrip) => (
                        <tr key={t.sale_id}>
                          <td>{formatDate(t.date)}</td>
                          <td className="font-mono" style={{ fontWeight: 700, color: '#d32f2f' }}>{t.invoice_no}</td>
                          <td>
                            <strong>{t.customer_name}</strong>
                            {t.customer_mobile && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.customer_mobile}</div>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <strong style={{ color: '#0f172a' }}>{t.delivery_venue || '-'}</strong>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: t.trip_type === 'ONE_WAY' ? '#cffafe' : '#dbeafe',
                                color: t.trip_type === 'ONE_WAY' ? '#0e7490' : '#1d4ed8',
                                border: `1px solid ${t.trip_type === 'ONE_WAY' ? '#a5f3fc' : '#bfdbfe'}`
                              }}>
                                {t.trip_type === 'ONE_WAY' ? '➡️ One Way' : '🔄 Round Trip'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#475569' }}>{t.delivery_address}</div>
                          </td>
                          <td>
                            <strong>{t.driver_name}</strong>
                            {t.driver_mobile && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.driver_mobile}</div>}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.78rem', color: '#92400e', background: '#fef3c7', padding: '2px 6px', borderRadius: '3px' }}>
                              {t.vasan_summary || 'No Vasan'}
                            </span>
                          </td>
                          <td className="font-mono" style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                            {formatCurrency(t.rickshaw_rent)}
                          </td>
                          <td>
                            <span className={`badge ${t.rickshaw_rent_status === 'PAID' ? 'badge-green' : 'badge-red'}`}>
                              {t.rickshaw_rent_status === 'PAID' ? 'PAID' : 'PENDING'}
                            </span>
                          </td>
                          <td className="no-print">
                            {t.rickshaw_rent_status === 'PENDING' && (
                              <button
                                className="btn btn-vyapar-green btn-sm"
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                onClick={() => handleSettleRent(t.sale_id)}
                              >
                                <CheckCircle2 size={12} /> Pay Rent
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* --- REPORT 2: VASAN ALL RECORDS REGISTER --- */}
            {selectedReport === 'vasan_tracker' && reportData && (
              <div className="table-container invoice-printable">
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <span>Total Containers Issued: <strong>{reportData.summary?.total_issued || 0}</strong></span>
                    <span>Returned: <strong style={{ color: '#15803d' }}>{reportData.summary?.total_returned || 0}</strong></span>
                    <span>Pending Due with Caterers: <strong style={{ color: '#dc2626' }}>{reportData.summary?.total_due || 0} Vasan</strong></span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsVasanModalOpen(true)}
                    style={{ fontSize: '0.76rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Box size={13} color="#2563eb" /> 🥣 Configure Vasan Master Rates
                  </button>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>BILL #</th>
                      <th>CATERER CUSTOMER</th>
                      <th>DELIVERY VENUE</th>
                      <th>SWEET ITEM</th>
                      <th>VASAN TYPE</th>
                      <th>ISSUED</th>
                      <th>RETURNED</th>
                      <th>PENDING DUE</th>
                      <th>STATUS</th>
                      <th className="no-print">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.entries?.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                          No container tracking records found.
                        </td>
                      </tr>
                    ) : (
                      reportData.entries?.map((v: VasanLedgerEntry) => (
                        <tr key={v.id}>
                          <td>{formatDate(v.date)}</td>
                          <td className="font-mono" style={{ fontWeight: 700, color: '#d32f2f' }}>{v.invoice_no}</td>
                          <td><strong>{v.customer_name}</strong></td>
                          <td>{v.delivery_venue || v.delivery_address || '-'}</td>
                          <td>{v.item_name}</td>
                          <td>
                            <strong style={{ color: '#92400e', background: '#fef3c7', padding: '2px 6px', borderRadius: '3px' }}>
                              {v.vasan_type}
                            </strong>
                          </td>
                          <td className="font-mono" style={{ fontWeight: 700 }}>{v.issued_qty}</td>
                          <td className="font-mono" style={{ color: '#15803d' }}>{v.returned_qty}</td>
                          <td className="font-mono" style={{ fontWeight: 800, color: v.due_qty > 0 ? '#dc2626' : '#15803d' }}>
                            {v.due_qty}
                          </td>
                          <td>
                            <span className={`badge ${v.status === 'RETURNED' ? 'badge-green' : v.status === 'CHARGED_TO_CUSTOMER' ? 'badge-blue' : v.status === 'PARTIAL' ? 'badge-amber' : 'badge-red'}`}>
                              {v.status}
                            </span>
                          </td>
                          <td className="no-print">
                            {v.due_qty > 0 && (
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                onClick={() => handleReceiveVasan(v.id, v.due_qty, v.vasan_type)}
                              >
                                <PackageCheck size={12} /> Receive Return
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 1. SALE REPORT */}
            {selectedReport === 'sale' && reportData && (
              <div className="table-container invoice-printable">
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', fontSize: '0.84rem' }}>
                  <span>Total Sales: <strong style={{ color: '#0f172a' }}>{formatCurrency(reportData.total_sales)}</strong></span>
                  <span>Received: <strong style={{ color: '#15803d' }}>{formatCurrency(reportData.total_paid)}</strong></span>
                  <span>Balance Due: <strong style={{ color: '#dc2626' }}>{formatCurrency(reportData.total_due)}</strong></span>
                  <span>Gross Profit: <strong style={{ color: '#15803d' }}>{formatCurrency(reportData.total_profit)}</strong></span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>BILL #</th>
                      <th>PARTY NAME</th>
                      <th>DELIVERY VENUE</th>
                      <th>PAYMENT TYPE</th>
                      <th>TOTAL AMOUNT</th>
                      <th>RECEIVED</th>
                      <th>BALANCE DUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sales?.map((s: any) => (
                      <tr key={s.id}>
                        <td>{formatDate(s.date)}</td>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#d32f2f' }}>{s.invoice_no}</td>
                        <td><strong>{s.customer_name}</strong></td>
                        <td>{s.delivery_venue || '-'}</td>
                        <td><span className="badge badge-blue">{s.payment_mode}</span></td>
                        <td className="font-mono" style={{ fontWeight: 800 }}>{formatCurrency(s.grand_total)}</td>
                        <td className="font-mono" style={{ color: '#15803d' }}>{formatCurrency(s.paid_amount)}</td>
                        <td className="font-mono" style={{ color: s.due_amount > 0 ? '#dc2626' : '#64748b' }}>{formatCurrency(s.due_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. PURCHASE REPORT */}
            {selectedReport === 'purchase' && reportData && (
              <div className="table-container invoice-printable">
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', fontSize: '0.84rem' }}>
                  <span>Total Purchases: <strong style={{ color: '#0f172a' }}>{formatCurrency(reportData.total_purchases)}</strong></span>
                  <span>Paid: <strong style={{ color: '#15803d' }}>{formatCurrency(reportData.total_paid)}</strong></span>
                  <span>Unpaid Balance: <strong style={{ color: '#dc2626' }}>{formatCurrency(reportData.total_due)}</strong></span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>PURCHASE #</th>
                      <th>SUPPLIER NAME</th>
                      <th>SUPPLIER BILL #</th>
                      <th>PAYMENT TYPE</th>
                      <th>TOTAL AMOUNT</th>
                      <th>PAID</th>
                      <th>DUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.purchases?.map((p: any) => (
                      <tr key={p.id}>
                        <td>{formatDate(p.date)}</td>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#1e40af' }}>{p.purchase_no}</td>
                        <td><strong>{p.supplier_name}</strong></td>
                        <td className="font-mono">{p.supplier_invoice_no || '-'}</td>
                        <td><span className="badge badge-blue">{p.payment_mode}</span></td>
                        <td className="font-mono" style={{ fontWeight: 800 }}>{formatCurrency(p.grand_total)}</td>
                        <td className="font-mono" style={{ color: '#15803d' }}>{formatCurrency(p.paid_amount)}</td>
                        <td className="font-mono" style={{ color: p.due_amount > 0 ? '#dc2626' : '#64748b' }}>{formatCurrency(p.due_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. DAY BOOK */}
            {selectedReport === 'day_book' && reportData && (
              <div className="table-container invoice-printable">
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', fontSize: '0.84rem' }}>
                  <span>Date: <strong>{reportData.date}</strong></span>
                  <span>Money In (Debit): <strong style={{ color: '#15803d' }}>{formatCurrency(reportData.total_money_in)}</strong></span>
                  <span>Money Out (Credit): <strong style={{ color: '#dc2626' }}>{formatCurrency(reportData.total_money_out)}</strong></span>
                  <span>Net Cash Flow: <strong style={{ color: reportData.net_cash_flow >= 0 ? '#15803d' : '#dc2626' }}>{formatCurrency(reportData.net_cash_flow)}</strong></span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>VOUCHER TYPE</th>
                      <th>VOUCHER #</th>
                      <th>PARTY / ACCOUNT</th>
                      <th>NOTES</th>
                      <th>MONEY IN (DEBIT)</th>
                      <th>MONEY OUT (CREDIT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.entries?.map((e: any) => (
                      <tr key={e.id}>
                        <td><span className="badge badge-amber">{e.voucher_type}</span></td>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#d32f2f' }}>{e.voucher_no}</td>
                        <td><strong>{e.party_name}</strong></td>
                        <td style={{ fontSize: '0.8rem' }}>{e.notes}</td>
                        <td className="font-mono" style={{ color: e.debit_amount > 0 ? '#15803d' : 'inherit' }}>
                          {e.debit_amount > 0 ? formatCurrency(e.debit_amount) : '-'}
                        </td>
                        <td className="font-mono" style={{ color: e.credit_amount > 0 ? '#dc2626' : 'inherit' }}>
                          {e.credit_amount > 0 ? formatCurrency(e.credit_amount) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. ALL TRANSACTIONS */}
            {selectedReport === 'all_transactions' && Array.isArray(reportData) && (
              <div className="table-container invoice-printable">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>TYPE</th>
                      <th>VOUCHER #</th>
                      <th>PARTY NAME</th>
                      <th>PARTICULARS</th>
                      <th>DEBIT (₹)</th>
                      <th>CREDIT (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((t: any) => (
                      <tr key={t.id}>
                        <td>{formatDate(t.date)}</td>
                        <td><span className="badge badge-amber">{t.type}</span></td>
                        <td className="font-mono" style={{ fontWeight: 700 }}>{t.voucher_no}</td>
                        <td><strong>{t.party_name}</strong></td>
                        <td style={{ fontSize: '0.8rem' }}>{t.notes}</td>
                        <td className="font-mono" style={{ color: t.debit_amount > 0 ? '#15803d' : 'inherit' }}>
                          {t.debit_amount > 0 ? formatCurrency(t.debit_amount) : '-'}
                        </td>
                        <td className="font-mono" style={{ color: t.credit_amount > 0 ? '#dc2626' : 'inherit' }}>
                          {t.credit_amount > 0 ? formatCurrency(t.credit_amount) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. BILL WISE PROFIT */}
            {selectedReport === 'bill_wise_profit' && reportData && (
              <div className="table-container invoice-printable">
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', fontSize: '0.84rem' }}>
                  <span>Total Sales: <strong>{formatCurrency(reportData.total_sale)}</strong></span>
                  <span>Total Batch Cost: <strong>{formatCurrency(reportData.total_cost)}</strong></span>
                  <span>Total Gross Profit: <strong style={{ color: '#15803d' }}>{formatCurrency(reportData.total_profit)}</strong></span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>BILL #</th>
                      <th>DATE</th>
                      <th>PARTY NAME</th>
                      <th>SALE AMOUNT (₹)</th>
                      <th>COGS / BATCH COST (₹)</th>
                      <th>PROFIT (₹)</th>
                      <th>MARGIN %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.bills?.map((b: any) => (
                      <tr key={b.id}>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#d32f2f' }}>{b.invoice_no}</td>
                        <td>{formatDate(b.date)}</td>
                        <td><strong>{b.customer_name}</strong></td>
                        <td className="font-mono">{formatCurrency(b.sale_amount)}</td>
                        <td className="font-mono">{formatCurrency(b.total_cost)}</td>
                        <td className="font-mono" style={{ fontWeight: 800, color: b.profit >= 0 ? '#15803d' : '#dc2626' }}>
                          {formatCurrency(b.profit)}
                        </td>
                        <td className="font-mono" style={{ fontWeight: 700, color: b.margin_pct >= 0 ? '#15803d' : '#dc2626' }}>
                          {b.margin_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. CASH FLOW */}
            {selectedReport === 'cash_flow' && Array.isArray(reportData) && (
              <div className="table-container invoice-printable">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>TOTAL INFLOW (RECEIPTS)</th>
                      <th>TOTAL OUTFLOW (PAYMENTS/EXPENSES)</th>
                      <th>NET CASH FLOW</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((c: any, i: number) => (
                      <tr key={i}>
                        <td>{formatDate(c.date)}</td>
                        <td className="font-mono" style={{ color: '#15803d', fontWeight: 700 }}>{formatCurrency(c.total_inflow)}</td>
                        <td className="font-mono" style={{ color: '#dc2626' }}>{formatCurrency(c.total_outflow)}</td>
                        <td className="font-mono" style={{ fontWeight: 800, color: c.net_flow >= 0 ? '#15803d' : '#dc2626' }}>
                          {formatCurrency(c.net_flow)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 7. TRIAL BALANCE */}
            {selectedReport === 'trial_balance' && reportData && (
              <div className="table-container invoice-printable">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ACCOUNT HEAD</th>
                      <th>TOTAL DEBIT (₹)</th>
                      <th>TOTAL CREDIT (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.accounts?.map((a: any, i: number) => (
                      <tr key={i}>
                        <td><strong>{a.account_head}</strong></td>
                        <td className="font-mono" style={{ color: '#15803d' }}>{formatCurrency(a.total_debit)}</td>
                        <td className="font-mono" style={{ color: '#dc2626' }}>{formatCurrency(a.total_credit)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td>TOTAL</td>
                      <td className="font-mono" style={{ color: '#15803d' }}>{formatCurrency(reportData.total_debit)}</td>
                      <td className="font-mono" style={{ color: '#dc2626' }}>{formatCurrency(reportData.total_credit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 8. BALANCE SHEET */}
            {selectedReport === 'balance_sheet' && reportData && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="invoice-printable">
                <div className="vyapar-card" style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '2px solid #15803d', paddingBottom: '6px' }}>
                    ASSETS
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Closing Stock Inventory:</span>
                      <strong className="font-mono">{formatCurrency(reportData.assets?.closing_stock)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Accounts Receivable (Customers):</span>
                      <strong className="font-mono">{formatCurrency(reportData.assets?.accounts_receivable)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Cash In Hand:</span>
                      <strong className="font-mono">{formatCurrency(reportData.assets?.cash_in_hand)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Bank Accounts:</span>
                      <strong className="font-mono">{formatCurrency(reportData.assets?.bank_balance)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f172a', paddingTop: '8px', fontSize: '1.05rem', fontWeight: 900, color: '#15803d' }}>
                      <span>TOTAL ASSETS:</span>
                      <span className="font-mono">{formatCurrency(reportData.assets?.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="vyapar-card" style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '2px solid #dc2626', paddingBottom: '6px' }}>
                    LIABILITIES & CAPITAL
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Accounts Payable (Suppliers):</span>
                      <strong className="font-mono">{formatCurrency(reportData.liabilities?.accounts_payable)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Owner Capital & Profit Reserve:</span>
                      <strong className="font-mono">{formatCurrency(reportData.liabilities?.capital_and_equity)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f172a', paddingTop: '8px', fontSize: '1.05rem', fontWeight: 900, color: '#dc2626' }}>
                      <span>TOTAL LIABILITIES:</span>
                      <span className="font-mono">{formatCurrency(reportData.liabilities?.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. PARTY WISE PROFIT */}
            {selectedReport === 'party_wise_profit' && Array.isArray(reportData) && (
              <div className="table-container invoice-printable">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PARTY NAME</th>
                      <th>PHONE NUMBER</th>
                      <th>TOTAL INVOICES</th>
                      <th>TOTAL SALE AMOUNT (₹)</th>
                      <th>TOTAL COST (₹)</th>
                      <th>PROFIT (₹)</th>
                      <th>MARGIN %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((p: any) => (
                      <tr key={p.id}>
                        <td><strong>{p.party_name}</strong></td>
                        <td>{p.mobile || '-'}</td>
                        <td>{p.total_invoices}</td>
                        <td className="font-mono">{formatCurrency(p.total_sale_amount)}</td>
                        <td className="font-mono">{formatCurrency(p.total_cost)}</td>
                        <td className="font-mono" style={{ fontWeight: 800, color: p.profit >= 0 ? '#15803d' : '#dc2626' }}>
                          {formatCurrency(p.profit)}
                        </td>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#15803d' }}>
                          {p.margin_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 10. STOCK SUMMARY */}
            {selectedReport === 'stock_summary' && Array.isArray(reportData) && (
              <div className="table-container invoice-printable">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ITEM CODE</th>
                      <th>ITEM NAME</th>
                      <th>TYPE</th>
                      <th>CURRENT STOCK</th>
                      <th>PURCHASE / MFG RATE</th>
                      <th>SELLING RATE</th>
                      <th>STOCK VALUATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#d32f2f' }}>{item.code}</td>
                        <td><strong>{item.name}</strong></td>
                        <td><span className="badge badge-amber">{item.product_type}</span></td>
                        <td className="font-mono" style={{ fontWeight: 800, color: item.current_stock < 0 ? '#dc2626' : '#15803d' }}>
                          {item.current_stock} {item.unit}
                        </td>
                        <td className="font-mono">{formatCurrency(item.purchase_rate)}</td>
                        <td className="font-mono" style={{ color: '#15803d' }}>{formatCurrency(item.selling_rate)}</td>
                        <td className="font-mono" style={{ fontWeight: 800 }}>
                          {formatCurrency(item.current_stock > 0 ? item.current_stock * item.purchase_rate : 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 11. ITEM WISE PROFIT */}
            {selectedReport === 'item_wise_profit' && Array.isArray(reportData) && (
              <div className="table-container invoice-printable">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ITEM CODE</th>
                      <th>ITEM NAME</th>
                      <th>QTY SOLD</th>
                      <th>TOTAL REVENUE (₹)</th>
                      <th>TOTAL COST (₹)</th>
                      <th>PROFIT (₹)</th>
                      <th>MARGIN %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item: any) => (
                      <tr key={item.id}>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#d32f2f' }}>{item.item_code}</td>
                        <td><strong>{item.item_name}</strong></td>
                        <td>{item.quantity_sold} {item.unit}</td>
                        <td className="font-mono">{formatCurrency(item.total_revenue)}</td>
                        <td className="font-mono">{formatCurrency(item.total_cost)}</td>
                        <td className="font-mono" style={{ fontWeight: 800, color: item.profit >= 0 ? '#15803d' : '#dc2626' }}>
                          {formatCurrency(item.profit)}
                        </td>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#15803d' }}>
                          {item.margin_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 12. ITEM CATEGORY WISE PROFIT */}
            {selectedReport === 'item_category_profit' && Array.isArray(reportData) && (
              <div className="table-container invoice-printable">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>CATEGORY</th>
                      <th>QTY SOLD</th>
                      <th>TOTAL REVENUE (₹)</th>
                      <th>TOTAL COST (₹)</th>
                      <th>PROFIT (₹)</th>
                      <th>MARGIN %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((cat: any, i: number) => (
                      <tr key={i}>
                        <td><strong>{cat.category_name}</strong></td>
                        <td>{cat.quantity_sold}</td>
                        <td className="font-mono">{formatCurrency(cat.total_revenue)}</td>
                        <td className="font-mono">{formatCurrency(cat.total_cost)}</td>
                        <td className="font-mono" style={{ fontWeight: 800, color: cat.profit >= 0 ? '#15803d' : '#dc2626' }}>
                          {formatCurrency(cat.profit)}
                        </td>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#15803d' }}>
                          {cat.margin_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 13. LOW STOCK SUMMARY */}
            {selectedReport === 'low_stock_summary' && Array.isArray(reportData) && (
              <div className="table-container invoice-printable">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>CODE</th>
                      <th>ITEM NAME</th>
                      <th>TYPE</th>
                      <th>CURRENT STOCK</th>
                      <th>MIN SAFETY STOCK</th>
                      <th>REORDER DEFICIT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="font-mono" style={{ fontWeight: 700, color: '#d32f2f' }}>{item.code}</td>
                        <td><strong>{item.name}</strong></td>
                        <td><span className="badge badge-amber">{item.item_type}</span></td>
                        <td className="font-mono" style={{ fontWeight: 800, color: '#dc2626' }}>
                          {item.current_stock} {item.unit}
                        </td>
                        <td className="font-mono">{item.min_stock} {item.unit}</td>
                        <td className="font-mono" style={{ color: '#dc2626', fontWeight: 800 }}>
                          {Math.max(0, item.min_stock - item.current_stock)} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 14. SALE PURCHASE BY PARTY */}
            {selectedReport === 'sale_purchase_by_party' && Array.isArray(reportData) && (
              <div className="table-container invoice-printable">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>PARTY NAME</th>
                      <th>TYPE</th>
                      <th>TOTAL SALES (₹)</th>
                      <th>TOTAL PURCHASES (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((p: any, i: number) => (
                      <tr key={i}>
                        <td><strong>{p.party_name}</strong></td>
                        <td><span className="badge badge-blue">{p.type}</span></td>
                        <td className="font-mono" style={{ color: '#15803d' }}>{formatCurrency(p.total_sales)}</td>
                        <td className="font-mono" style={{ color: '#dc2626' }}>{formatCurrency(p.total_purchases)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* 15. ITEM MOVEMENT & SALES VELOCITY: FAST-SELLING VS DEAD STOCK */}
            {selectedReport === 'item_movement' && reportData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* KPI Overview Cards */}
                {reportData.summary && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                    gap: '12px'
                  }}>
                    <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', padding: '12px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                        🔥 Fast-Selling Items
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803d', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                        {reportData.summary.fast_selling_count} Products
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: '2px' }}>
                        Top: {reportData.summary.top_selling_item}
                      </div>
                    </div>

                    <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', padding: '12px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                        ❄️ Non-Moving / Dead Stock
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                        {reportData.summary.dead_stock_count} Products
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#991b1b', marginTop: '2px' }}>
                        0 Sales in Selected Period
                      </div>
                    </div>

                    <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', padding: '12px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>
                        💰 Tied-Up Dead Stock Capital
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#b45309', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                        {formatCurrency(reportData.summary.dead_stock_tied_capital)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#92400e', marginTop: '2px' }}>
                        Sitting Capital to Clear
                      </div>
                    </div>

                    <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', padding: '12px 14px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>
                        📦 Total Units Sold
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#2563eb', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                        {reportData.summary.total_units_sold} Units
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#1e40af', marginTop: '2px' }}>
                        Revenue: {formatCurrency(reportData.summary.total_sales_revenue)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub Tab Switcher */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <button
                    className={`btn btn-sm ${itemMovementSubTab === 'FAST' ? 'btn-vyapar-green' : 'btn-secondary'}`}
                    onClick={() => setItemMovementSubTab('FAST')}
                    style={{ fontWeight: 800, fontSize: '0.76rem' }}
                  >
                    🔥 Top Fast-Selling Items ({reportData.fast_selling?.length || 0})
                  </button>
                  <button
                    className={`btn btn-sm ${itemMovementSubTab === 'DEAD' ? 'btn-vyapar-red' : 'btn-secondary'}`}
                    onClick={() => setItemMovementSubTab('DEAD')}
                    style={{ fontWeight: 800, fontSize: '0.76rem' }}
                  >
                    ❄️ Non-Moving & Dead Stock ({reportData.dead_stock?.length || 0})
                  </button>
                  <button
                    className={`btn btn-sm ${itemMovementSubTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setItemMovementSubTab('ALL')}
                    style={{ fontWeight: 800, fontSize: '0.76rem' }}
                  >
                    📊 All Items Sales Velocity ({reportData.all_items?.length || 0})
                  </button>
                </div>

                {/* Table: Fast-Selling Items */}
                {itemMovementSubTab === 'FAST' && (
                  <div className="table-container invoice-printable">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '60px', textAlign: 'center' }}>RANK</th>
                          <th>ITEM CODE</th>
                          <th>ITEM NAME</th>
                          <th>CATEGORY</th>
                          <th style={{ textAlign: 'right' }}>QTY SOLD</th>
                          <th style={{ textAlign: 'right' }}>REVENUE (₹)</th>
                          <th style={{ textAlign: 'center' }}>INVOICES</th>
                          <th style={{ textAlign: 'right' }}>CURRENT STOCK</th>
                          <th>LAST SOLD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.fast_selling?.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                              No fast selling items recorded in this period.
                            </td>
                          </tr>
                        ) : (
                          reportData.fast_selling?.map((item: any, idx: number) => (
                            <tr key={item.id}>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: idx === 0 ? '#fef08a' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : '#f1f5f9',
                                  fontWeight: 900,
                                  fontSize: '0.72rem',
                                  color: idx === 0 ? '#854d0e' : idx === 1 ? '#475569' : idx === 2 ? '#9a3412' : '#64748b'
                                }}>
                                  #{idx + 1}
                                </span>
                              </td>
                              <td className="font-mono" style={{ fontWeight: 700, color: '#dc2626' }}>{item.item_code}</td>
                              <td>
                                <strong>{item.item_name}</strong>
                                {item.movement_type === 'HOT_SELLER' && (
                                  <span style={{ marginLeft: '6px', fontSize: '0.65rem', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                    🔥 HOT
                                  </span>
                                )}
                              </td>
                              <td><span className="badge badge-blue">{item.category_name}</span></td>
                              <td className="font-mono" style={{ textAlign: 'right', fontWeight: 900, color: '#15803d' }}>
                                {item.quantity_sold} {item.unit}
                              </td>
                              <td className="font-mono" style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
                                {formatCurrency(item.total_revenue)}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge badge-amber">{item.invoice_count} Bills</span>
                              </td>
                              <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                                {item.current_stock} {item.unit}
                              </td>
                              <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {item.last_sold_date ? formatDate(item.last_sold_date) : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table: Non-Moving / Dead Stock */}
                {itemMovementSubTab === 'DEAD' && (
                  <div className="table-container invoice-printable">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ITEM CODE</th>
                          <th>ITEM NAME</th>
                          <th>CATEGORY</th>
                          <th style={{ textAlign: 'right' }}>SITTING STOCK</th>
                          <th style={{ textAlign: 'right' }}>PURCHASE RATE</th>
                          <th style={{ textAlign: 'right' }}>TIED-UP CAPITAL (₹)</th>
                          <th>LAST SOLD</th>
                          <th style={{ textAlign: 'center' }}>ACTION / RECOMMENDATION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.dead_stock?.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: '#15803d', fontWeight: 700 }}>
                              🎉 Fantastic! No dead stock or 0-sales items found in this period.
                            </td>
                          </tr>
                        ) : (
                          reportData.dead_stock?.map((item: any) => (
                            <tr key={item.id} style={{ background: item.stock_value > 5000 ? '#fef2f2' : undefined }}>
                              <td className="font-mono" style={{ fontWeight: 700, color: '#dc2626' }}>{item.item_code}</td>
                              <td>
                                <strong>{item.item_name}</strong>
                                <span style={{ marginLeft: '6px', fontSize: '0.65rem', background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                                  ❄️ ZERO SALES
                                </span>
                              </td>
                              <td><span className="badge badge-blue">{item.category_name}</span></td>
                              <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800, color: item.current_stock > 0 ? '#dc2626' : '#64748b' }}>
                                {item.current_stock} {item.unit}
                              </td>
                              <td className="font-mono" style={{ textAlign: 'right' }}>
                                {formatCurrency(item.purchase_rate)}
                              </td>
                              <td className="font-mono" style={{ textAlign: 'right', fontWeight: 900, color: '#dc2626' }}>
                                {formatCurrency(item.stock_value)}
                              </td>
                              <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {item.days_since_last_sold !== null ? `${item.days_since_last_sold} days ago` : 'Never sold'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                                  💡 Offer Clearance / Discount
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table: All Items */}
                {itemMovementSubTab === 'ALL' && (
                  <div className="table-container invoice-printable">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                          <th>ITEM CODE</th>
                          <th>ITEM NAME</th>
                          <th>CATEGORY</th>
                          <th style={{ textAlign: 'right' }}>QTY SOLD</th>
                          <th style={{ textAlign: 'right' }}>REVENUE (₹)</th>
                          <th style={{ textAlign: 'right' }}>CURRENT STOCK</th>
                          <th style={{ textAlign: 'center' }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.all_items?.map((item: any) => (
                          <tr key={item.id}>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{item.overall_rank}</td>
                            <td className="font-mono" style={{ fontWeight: 700, color: '#dc2626' }}>{item.item_code}</td>
                            <td><strong>{item.item_name}</strong></td>
                            <td><span className="badge badge-blue">{item.category_name}</span></td>
                            <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                              {item.quantity_sold} {item.unit}
                            </td>
                            <td className="font-mono" style={{ textAlign: 'right', fontWeight: 800 }}>
                              {formatCurrency(item.total_revenue)}
                            </td>
                            <td className="font-mono" style={{ textAlign: 'right' }}>
                              {item.current_stock} {item.unit}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: item.movement_type === 'HOT_SELLER' ? '#fef3c7' : item.movement_type === 'FAST_SELLING' ? '#dcfce7' : item.movement_type === 'SLOW_MOVING' ? '#eff6ff' : '#fee2e2',
                                color: item.movement_type === 'HOT_SELLER' ? '#b45309' : item.movement_type === 'FAST_SELLING' ? '#15803d' : item.movement_type === 'SLOW_MOVING' ? '#1e40af' : '#dc2626',
                                border: `1px solid ${item.movement_type === 'HOT_SELLER' ? '#fde68a' : item.movement_type === 'FAST_SELLING' ? '#86efac' : item.movement_type === 'SLOW_MOVING' ? '#bfdbfe' : '#fca5a5'}`
                              }}>
                                {item.movement_type === 'HOT_SELLER' ? '🔥 Hot Seller' : item.movement_type === 'FAST_SELLING' ? '✅ Fast Selling' : item.movement_type === 'SLOW_MOVING' ? '🟡 Slow Moving' : '❄️ Dead Stock'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {/* Vasan Master Modal */}
      {isVasanModalOpen && (
        <VasanMasterModal
          isOpen={isVasanModalOpen}
          onClose={() => {
            setIsVasanModalOpen(false);
            fetchReport();
          }}
        />
      )}
    </div>
  );
};
