import React, { useState, useEffect, useRef } from 'react';
import { 
  DatabaseBackup, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  FileSpreadsheet, 
  Upload, 
  FileText, 
  HardDrive,
  Clock,
  Layers,
  ArrowDownToLine,
  CheckCircle,
  HelpCircle,
  Database,
  Trash2,
  Sparkles,
  Zap,
  Check
} from 'lucide-react';
import { api } from '../../api/client';
import { formatDate, formatDateTime, formatCurrency } from '../../utils/formatters';
import { exportAllDataToMasterExcel, exportIndividualTableExcel } from '../../utils/excelBackupGenerator';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const BackupRestoreView: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Selected local archive file to restore
  const [restoreFilePath, setRestoreFilePath] = useState<string | null>(null);

  // Uploaded .db file state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isConfirmUploadRestoreOpen, setIsConfirmUploadRestoreOpen] = useState(false);

  // Reset Confirmation Modals
  const [isConfirmResetTransactionsOpen, setIsConfirmResetTransactionsOpen] = useState(false);
  const [isConfirmFactoryResetOpen, setIsConfirmFactoryResetOpen] = useState(false);
  const [isConfirmReloadDemoOpen, setIsConfirmReloadDemoOpen] = useState(false);

  const loadBackupData = async () => {
    try {
      setLoading(true);
      const [historyData, statsData] = await Promise.all([
        api.getBackupHistory(),
        api.getBackupStats()
      ]);
      setHistory(historyData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading backup data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackupData();
  }, []);

  // 1. Create Local Snapshot
  const handleCreateLocalSnapshot = async () => {
    try {
      setCreating(true);
      setMessage(null);
      const res = await api.createBackupNow('MANUAL');
      setMessage({
        type: 'success',
        text: `✅ Local Snapshot created successfully: ${res.filename} (${(res.file_size_bytes / 1024).toFixed(1)} KB)`
      });
      loadBackupData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Snapshot creation failed' });
    } finally {
      setCreating(false);
    }
  };

  // 2. Direct Download SQLite Database File to Local Drive
  const handleDownloadDatabaseFile = () => {
    const downloadUrl = api.getDatabaseDownloadUrl();
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `matuki_sweets_backup_${new Date().toISOString().slice(0, 10)}.db`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage({
      type: 'success',
      text: '📥 SQLite Database Backup (.db) file is downloading to your computer.'
    });
  };

  // 3. Download Complete Business Data in Master Excel Spreadsheet
  const handleExportAllDataExcel = async () => {
    try {
      setExportingExcel(true);
      setMessage(null);
      const allData = await api.exportAllBusinessData();
      exportAllDataToMasterExcel(allData);
      setMessage({
        type: 'success',
        text: '📊 Complete Business Data Backup in Excel (.csv) has been generated and saved to your Downloads!'
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Excel export failed' });
    } finally {
      setExportingExcel(false);
    }
  };

  // 4. Download Specific Table in Excel
  const handleExportTableExcel = async (tableName: string) => {
    try {
      const allData = await api.exportAllBusinessData();
      const tableRows = allData.tables?.[tableName] || [];
      exportIndividualTableExcel(tableName, tableRows);
      setMessage({
        type: 'success',
        text: `📥 Table '${tableName}' exported to Excel successfully!`
      });
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  // 5. Handle File Picker Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite')) {
        alert('Please select a valid SQLite database backup file (.db or .sqlite)');
        return;
      }
      setSelectedUploadFile(file);
    }
  };

  // 6. Execute Upload & Restore
  const handleExecuteUploadRestore = async () => {
    if (!selectedUploadFile) return;
    try {
      setRestoring(true);
      setMessage(null);
      setIsConfirmUploadRestoreOpen(false);

      const result = await api.uploadAndRestoreBackup(selectedUploadFile);
      alert(`🎉 ${result.message || 'Database restored successfully!'}\n\nAll records, Khata ledgers, recipes, and stock have been verified.`);
      window.location.reload();
    } catch (err: any) {
      console.error('Restore error:', err);
      alert(`❌ Restore Failed: ${err.message}`);
    } finally {
      setRestoring(false);
      setSelectedUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 7. Restore from Local History Archive Path
  const handleConfirmLocalRestore = async () => {
    if (restoreFilePath) {
      try {
        setRestoring(true);
        const res = await api.restoreBackup(restoreFilePath);
        alert(`🎉 ${res.message || 'Database restored successfully!'}`);
        window.location.reload();
      } catch (err: any) {
        alert(`❌ Restore failed: ${err.message}`);
      } finally {
        setRestoring(false);
        setRestoreFilePath(null);
      }
    }
  };

  // 8. Execute Reset Transactions (Clean Trial Data, Keep Masters / Ready for LIVE)
  const handleExecuteResetTransactions = async () => {
    try {
      setResetting(true);
      setIsConfirmResetTransactionsOpen(false);
      const res = await api.resetTrialTransactions();
      alert(`🎉 ${res.message}\n\n🛡️ Automatic safety backup saved: ${res.backup_file || 'Saved'}\n\nPreserved Masters:\n• ${res.preserved?.products || 0} Products\n• ${res.preserved?.customers || 0} Customers\n• ${res.preserved?.suppliers || 0} Suppliers\n• ${res.preserved?.recipes || 0} Recipes\n• ${res.preserved?.drivers || 0} Drivers\n• ${res.preserved?.locations || 0} Delivery Venues`);
      window.location.reload();
    } catch (err: any) {
      alert('❌ Reset failed: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  // 9. Execute Full Factory Reset
  const handleExecuteFactoryReset = async () => {
    try {
      setResetting(true);
      setIsConfirmFactoryResetOpen(false);
      const res = await api.factoryResetSystem();
      alert(`🎉 ${res.message}\n\n🛡️ Automatic safety backup saved: ${res.backup_file || 'Saved'}`);
      window.location.reload();
    } catch (err: any) {
      alert('❌ Factory reset failed: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  // 10. Execute Reload Demo Dataset
  const handleExecuteReloadDemo = async () => {
    try {
      setResetting(true);
      setIsConfirmReloadDemoOpen(false);
      const res = await api.reloadDemoData();
      alert(`🎉 ${res.message}`);
      window.location.reload();
    } catch (err: any) {
      alert('❌ Demo reload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  const counts = stats?.counts || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1080px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            Database Backup, Safe Restore & System Reset Center
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            100% Offline SQLite database snapshots, file restoration, Excel exports, and Live Data Reset
          </span>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={loadBackupData} title="Refresh Database Health">
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Status
        </button>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.84rem',
          fontWeight: 600,
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. Live Database Health & Record Counter Grid */}
      <div className="vyapar-card" style={{ padding: '14px 18px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="#d32f2f" />
            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Active Offline SQLite Database Health</strong>
          </div>
          <span className="badge badge-green">● Connected & Synced</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          fontSize: '0.78rem'
        }}>
          <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b' }}>Database Size</div>
            <strong className="font-mono" style={{ fontSize: '0.92rem', color: '#0f172a' }}>{stats?.db_size_formatted || '0 KB'}</strong>
          </div>

          <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b' }}>Sales Invoices</div>
            <strong className="font-mono" style={{ fontSize: '0.92rem', color: '#15803d' }}>{counts.sales || 0} Bills</strong>
          </div>

          <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b' }}>Customers Khata</div>
            <strong className="font-mono" style={{ fontSize: '0.92rem', color: '#0f172a' }}>{counts.customers || 0} Parties</strong>
          </div>

          <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b' }}>Items & Sweets</div>
            <strong className="font-mono" style={{ fontSize: '0.92rem', color: '#0f172a' }}>{counts.products || 0} Products</strong>
          </div>

          <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b' }}>Mfg Batches</div>
            <strong className="font-mono" style={{ fontSize: '0.92rem', color: '#b45309' }}>{counts.batches || 0} Batches</strong>
          </div>

          <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
            <div style={{ color: '#64748b' }}>Ledger Entries</div>
            <strong className="font-mono" style={{ fontSize: '0.92rem', color: '#1e40af' }}>{counts.ledger_entries || 0} Records</strong>
          </div>
        </div>

        <div style={{ marginTop: '10px', fontSize: '0.74rem', color: '#64748b', wordBreak: 'break-all' }}>
          <strong>Location:</strong> <span className="font-mono">{stats?.db_path || 'C:\\Users\\MATUKI\\AppData\\Local\\Matuki Business ERP\\data\\matuki.db'}</span>
        </div>
      </div>

      {/* 2. Core Actions: 3 Columns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        {/* CARD A: SQLite Database Backup */}
        <div className="vyapar-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', background: '#fef2f2', borderRadius: '4px', color: '#d32f2f' }}>
                <HardDrive size={20} />
              </div>
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>1. Full SQLite Database Backup (.db)</strong>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Save 100% complete database file</div>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, margin: '6px 0 12px' }}>
              Creates an exact binary copy of your entire system database including recipes, sales, ledgers, and settings. Can be used to restore on any PC.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn btn-vyapar-red"
              style={{ width: '100%', justifyContent: 'center', fontWeight: 800 }}
              onClick={handleDownloadDatabaseFile}
            >
              <Download size={15} /> 📥 Download Database Backup (.db)
            </button>

            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleCreateLocalSnapshot}
              disabled={creating}
            >
              <DatabaseBackup size={14} /> {creating ? 'Creating Snapshot...' : '⚡ Create Local Archive Snapshot'}
            </button>
          </div>
        </div>

        {/* CARD B: Master Excel / Google Sheets Data Backup */}
        <div className="vyapar-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', background: '#f0fdf4', borderRadius: '4px', color: '#15803d' }}>
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>2. Complete Excel Data Backup (.csv)</strong>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>View all business records in MS Excel</div>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, margin: '6px 0 12px' }}>
              Exports all 11 tables (Sales, Customers, Khata, Stock, Purchases, Mfg Batches) into readable spreadsheets you can open in Microsoft Excel anytime.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="btn btn-vyapar-green"
              style={{ width: '100%', justifyContent: 'center', fontWeight: 800 }}
              onClick={handleExportAllDataExcel}
              disabled={exportingExcel}
            >
              <FileSpreadsheet size={15} /> {exportingExcel ? 'Exporting All Tables...' : '📦 Export Complete Data in Excel'}
            </button>

            {/* Quick Single Table Links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '2px 6px' }} onClick={() => handleExportTableExcel('sales')}>
                Sales CSV
              </button>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '2px 6px' }} onClick={() => handleExportTableExcel('customers')}>
                Customers CSV
              </button>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '2px 6px' }} onClick={() => handleExportTableExcel('products')}>
                Stock CSV
              </button>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem', padding: '2px 6px' }} onClick={() => handleExportTableExcel('manufacturing_batches')}>
                Mfg Batches CSV
              </button>
            </div>
          </div>
        </div>

        {/* CARD C: Restore Database from File */}
        <div className="vyapar-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', background: '#eff6ff', borderRadius: '4px', color: '#1e40af' }}>
                <Upload size={20} />
              </div>
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>3. Restore Database from Backup (.db)</strong>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Upload & Restore previous backup</div>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, margin: '6px 0 12px' }}>
              Choose any saved <code className="font-mono">.db</code> file from your computer or USB drive. The system automatically creates a safety snapshot before restoring.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="file"
              accept=".db,.sqlite"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {!selectedUploadFile ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', fontWeight: 700, borderColor: '#3b82f6', color: '#1e40af' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} /> 📂 Choose .db File to Restore...
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#eff6ff', padding: '8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1e40af', wordBreak: 'break-all' }}>
                  Selected: {selectedUploadFile.name} ({(selectedUploadFile.size / 1024).toFixed(1)} KB)
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-vyapar-red btn-sm"
                    style={{ flex: 1, justifyContent: 'center', fontWeight: 800 }}
                    onClick={() => setIsConfirmUploadRestoreOpen(true)}
                    disabled={restoring}
                  >
                    {restoring ? 'Restoring Database...' : '⚡ Confirm Restore Now'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedUploadFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. NEW: SYSTEM DATA RESET & LIVE BUSINESS PREPARATION CARD */}
      <div className="vyapar-card" style={{
        padding: '18px 20px',
        background: '#ffffff',
        border: '1.5px solid #fed7aa',
        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: '#ffedd5', borderRadius: '6px', color: '#ea580c' }}>
              <Trash2 size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#9a3412', margin: 0 }}>
                Clear Trial Data & Start Fresh for LIVE Business
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Done testing? Clear all trial orders, test invoices, and payment receipts while keeping your Item Master, Customer Directory, Recipes & Drivers intact.
              </p>
            </div>
          </div>

          <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, border: '1px solid #fde68a' }}>
            🛡️ Auto Safety Snapshot created before reset
          </span>
        </div>

        {/* 3 Reset Options Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '12px', marginTop: '10px' }}>
          
          {/* OPTION 1: RECOMMENDED FOR LIVE BILLING */}
          <div style={{
            background: '#fff7ed',
            border: '1.5px solid #fb923c',
            borderRadius: '6px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="#ea580c" /> Option 1: Start LIVE Billing
                </strong>
                <span className="badge badge-green" style={{ fontSize: '0.66rem' }}>RECOMMENDED</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#7c2d12', margin: '4px 0 8px', lineHeight: 1.4 }}>
                <strong>Clears:</strong> All trial Sales, Purchases, Receipts, Ledgers, Mfg Batches, Vasan records, and Expenses. Stock resets to opening balance. Invoice # starts from <strong>001</strong>.
              </p>
              <div style={{ fontSize: '0.72rem', color: '#15803d', background: '#ffffff', padding: '6px 8px', borderRadius: '4px', border: '1px solid #fed7aa', marginBottom: '12px' }}>
                ✓ <strong>Preserves:</strong> Customer List, Suppliers, Sweet Items, Recipes, Rickshaw Drivers (Personal Rixa), Delivery Venues, Store Profile & GSTIN.
              </div>
            </div>

            <button
              type="button"
              className="btn btn-vyapar-red"
              style={{ width: '100%', justifyContent: 'center', fontWeight: 800, fontSize: '0.84rem' }}
              onClick={() => setIsConfirmResetTransactionsOpen(true)}
              disabled={resetting}
            >
              <Trash2 size={14} /> {resetting ? 'Resetting Transactions...' : '🧹 Clear Trial Data & Start LIVE'}
            </button>
          </div>

          {/* OPTION 2: FULL FACTORY CLEAN RESET */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={16} color="#64748b" /> Option 2: Factory Clean Reset
                </strong>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#475569', margin: '4px 0 8px', lineHeight: 1.4 }}>
                <strong>Zeroes out everything:</strong> Clears all trial transactions, customers, suppliers, sweets, and recipes. Leaves only store settings and default units/categories.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', borderColor: '#fca5a5', color: '#b91c1c' }}
              onClick={() => setIsConfirmFactoryResetOpen(true)}
              disabled={resetting}
            >
              <AlertTriangle size={14} /> Complete Factory Reset
            </button>
          </div>

          {/* OPTION 3: RELOAD DEMO DATA */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={16} color="#3b82f6" /> Option 3: Reload Demo Data
                </strong>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#475569', margin: '4px 0 8px', lineHeight: 1.4 }}>
                Reloads fresh demonstration sweets, recipes, stock, and sample catering sale vouchers for testing or staff training.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', borderColor: '#93c5fd', color: '#1d4ed8' }}
              onClick={() => setIsConfirmReloadDemoOpen(true)}
              disabled={resetting}
            >
              <RefreshCw size={14} /> Reload Demo Sweets Data
            </button>
          </div>

        </div>
      </div>

      {/* Safety Notice Banner */}
      <div style={{
        padding: '12px 16px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.82rem'
      }}>
        <ShieldCheck size={26} color="#1d4ed8" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: '#1e3a8a' }}>Automatic Emergency Pre-Reset Snapshot Protection:</strong>
          <span style={{ color: '#1e40af', marginLeft: '4px' }}>
            Whenever you reset data or restore any backup file, the system automatically creates an emergency snapshot of your database first. Your business data is always 100% recoverable.
          </span>
        </div>
      </div>

      {/* 4. Local Archive Backup History Table */}
      <div className="vyapar-card" style={{ padding: '0', overflow: 'hidden', background: '#ffffff' }}>
        <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="#475569" />
            <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>Local Archive Snapshots History</strong>
          </div>
          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{history.length} Snapshots Saved</span>
        </div>

        <div className="table-container" style={{ margin: 0, border: 'none' }}>
          <table className="data-table" style={{ fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th style={{ width: '160px' }}>BACKUP DATE & TIME</th>
                <th>FILE PATH / NAME</th>
                <th style={{ width: '100px' }}>SIZE</th>
                <th style={{ width: '120px' }}>TYPE</th>
                <th style={{ width: '90px' }}>STATUS</th>
                <th style={{ width: '110px', textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No local backup snapshots recorded yet. Click "Create Local Archive Snapshot" or "Download Database Backup" above.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600 }}>{formatDateTime(h.backup_date)}</td>
                    <td className="font-mono" style={{ fontSize: '0.72rem', color: '#334155', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.file_path}
                    </td>
                    <td className="font-mono font-bold">
                      {(h.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td>
                      <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                        {h.backup_type}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green">{h.status}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setRestoreFilePath(h.file_path)}
                        style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#1e40af' }}
                        title="Restore database to this specific snapshot"
                      >
                        <RefreshCw size={11} /> Restore
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Local Archive Restore */}
      <ConfirmDialog
        isOpen={Boolean(restoreFilePath)}
        title="Confirm Database Restore from Local Snapshot"
        message={`Are you sure you want to restore the database from:\n${restoreFilePath}\n\nThe system will automatically take an emergency snapshot of your current database first.`}
        confirmText="Yes, Restore Database"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleConfirmLocalRestore}
        onClose={() => setRestoreFilePath(null)}
      />

      {/* Confirmation Modal for Uploaded File Restore */}
      <ConfirmDialog
        isOpen={isConfirmUploadRestoreOpen}
        title="Confirm Restore from Uploaded Backup File"
        message={`Are you sure you want to overwrite the current database with the uploaded file:\n\n${selectedUploadFile?.name} (${((selectedUploadFile?.size || 0) / 1024).toFixed(1)} KB)\n\nAn emergency backup of the current database will be saved first.`}
        confirmText="Yes, Overwrite & Restore"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleExecuteUploadRestore}
        onClose={() => setIsConfirmUploadRestoreOpen(false)}
      />

      {/* Confirmation Modal for Reset Trial Transactions */}
      <ConfirmDialog
        isOpen={isConfirmResetTransactionsOpen}
        title="🧹 Clear All Trial Transactions & Start LIVE Business?"
        message={`This will clear all trial Sales Bills, Purchases, Payment Receipts, Ledger Entries, and Vasan logs.\n\n✓ Your Customers, Suppliers, Products, Recipes, Drivers, and Settings will be 100% PRESERVED.\n✓ Bill invoice numbering will restart from #001.\n🛡️ An automatic safety backup will be saved first.\n\nAre you sure you want to proceed?`}
        confirmText="Yes, Clear Trial Data & Start LIVE"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleExecuteResetTransactions}
        onClose={() => setIsConfirmResetTransactionsOpen(false)}
      />

      {/* Confirmation Modal for Full Factory Reset */}
      <ConfirmDialog
        isOpen={isConfirmFactoryResetOpen}
        title="⚠️ Complete Factory Clean Reset"
        message={`This will ERASE ALL records from the system, including trial customers, suppliers, products, and vouchers.\n\n🛡️ An emergency backup snapshot will be saved first.\n\nAre you sure you want to completely wipe all records?`}
        confirmText="Yes, Factory Reset"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleExecuteFactoryReset}
        onClose={() => setIsConfirmFactoryResetOpen(false)}
      />

      {/* Confirmation Modal for Reload Demo */}
      <ConfirmDialog
        isOpen={isConfirmReloadDemoOpen}
        title="🔄 Reload Demo Sweets Dataset?"
        message={`This will overwrite current trial records and load the standard sample Sweets ERP dataset with recipes, stock, and sample catering bills.\n\nAre you sure?`}
        confirmText="Yes, Reload Demo Data"
        cancelText="Cancel"
        onConfirm={handleExecuteReloadDemo}
        onClose={() => setIsConfirmReloadDemoOpen(false)}
      />
    </div>
  );
};
