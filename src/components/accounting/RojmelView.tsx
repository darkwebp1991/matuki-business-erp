import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { 
  BookOpen, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowRightLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Printer, 
  FileSpreadsheet, 
  Calendar, 
  Search, 
  Filter, 
  CheckCircle2, 
  Landmark, 
  CreditCard, 
  Banknote, 
  QrCode,
  X,
  Save,
  Clock,
  Layers,
  Share2,
  Download,
  Copy,
  Check,
  Send,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { api } from '../../api/client';
import { PaymentAccount, RojmelData, RojmelEntry, BusinessSettings, User } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { canEditModule } from '../../utils/permissionUtils';

interface RojmelViewProps {
  settings?: BusinessSettings | null;
  currentUser?: User | null;
}

export const RojmelView: React.FC<RojmelViewProps> = ({ settings: propSettings, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'daybook' | 'accounts'>('daybook');
  const rojmelCardFrameRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<BusinessSettings | null>(propSettings || null);

  const canEdit = canEditModule(currentUser, 'rojmel');

  // Date filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('today');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // WhatsApp & Snapshot State
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedSignalText, setCopiedSignalText] = useState<boolean>(false);
  const [ownerMobile, setOwnerMobile] = useState<string>(() => localStorage.getItem('matuki_owner_whatsapp') || propSettings?.mobile || '');

  // 3-Partner Auto 8:45 PM Daybook Snapshot State
  const [partner1Mobile, setPartner1Mobile] = useState<string>(() => propSettings?.partner_1_mobile || '+91 90818 22283');
  const [partner2Mobile, setPartner2Mobile] = useState<string>(() => propSettings?.partner_2_mobile || '+91 98251 44556');
  const [partner3Mobile, setPartner3Mobile] = useState<string>(() => propSettings?.partner_3_mobile || '');
  const [autoRojmelTime, setAutoRojmelTime] = useState<string>(() => propSettings?.auto_rojmel_time || '20:45');
  const [autoRojmelEnabled, setAutoRojmelEnabled] = useState<boolean>(() => propSettings?.auto_rojmel_enabled !== 0);
  const [isPartnerConfigOpen, setIsPartnerConfigOpen] = useState<boolean>(false);
  const [sendingPartners, setSendingPartners] = useState<boolean>(false);
  const [partnerSuccessMsg, setPartnerSuccessMsg] = useState<string>('');

  // Data states
  const [rojmelData, setRojmelData] = useState<RojmelData | null>(null);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);

  // Transfer Form State
  const [transferFromId, setTransferFromId] = useState<string>('');
  const [transferToId, setTransferToId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<number | ''>('');
  const [transferDate, setTransferDate] = useState<string>(todayStr);
  const [transferNotes, setTransferNotes] = useState<string>('Cash deposited into Bank / Internal Transfer');
  const [transferSaving, setTransferSaving] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<string>('');

  // Account Form State
  const [accName, setAccName] = useState<string>('');
  const [accType, setAccType] = useState<'CASH' | 'BANK' | 'UPI' | 'OTHER'>('BANK');
  const [accNumber, setAccNumber] = useState<string>('');
  const [accBankName, setAccBankName] = useState<string>('');
  const [accIfsc, setAccIfsc] = useState<string>('');
  const [accOpeningBal, setAccOpeningBal] = useState<number | ''>(0);
  const [accIsDefault, setAccIsDefault] = useState<boolean>(false);
  const [accNotes, setAccNotes] = useState<string>('');
  const [accSaving, setAccSaving] = useState<boolean>(false);
  const [accError, setAccError] = useState<string>('');

  // Keep settings synced if prop changes
  useEffect(() => {
    if (propSettings) {
      setSettings(propSettings);
      if (!ownerMobile && propSettings.mobile) {
        setOwnerMobile(propSettings.mobile);
      }
      if (propSettings.partner_1_mobile) setPartner1Mobile(propSettings.partner_1_mobile);
      if (propSettings.partner_2_mobile) setPartner2Mobile(propSettings.partner_2_mobile);
      if (propSettings.partner_3_mobile) setPartner3Mobile(propSettings.partner_3_mobile);
      if (propSettings.auto_rojmel_time) setAutoRojmelTime(propSettings.auto_rojmel_time);
      if (propSettings.auto_rojmel_enabled !== undefined) setAutoRojmelEnabled(propSettings.auto_rojmel_enabled === 1);
    }
  }, [propSettings]);

  // Load Rojmel, Accounts and Settings
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [rojmelRes, accsRes, settRes] = await Promise.all([
        api.getRojmel(startDate, endDate, selectedAccountId),
        api.getPaymentAccounts(false),
        !propSettings ? api.getSettings().catch(() => null) : Promise.resolve(propSettings)
      ]);

      const accList: PaymentAccount[] = Array.isArray(accsRes) ? accsRes : ((accsRes as any)?.data || []);
      setRojmelData((rojmelRes as any)?.data || rojmelRes);
      setAccounts(accList);
      if (settRes) {
        setSettings(settRes);
        if (!ownerMobile && settRes.mobile) {
          setOwnerMobile(settRes.mobile);
        }
      }

      if (accList.length >= 2 && !transferFromId) {
        setTransferFromId(String(accList[0].id));
        setTransferToId(String(accList[1].id));
      }
    } catch (err: any) {
      console.error('Error loading Rojmel data:', err);
      setError(err.message || 'Failed to load Rojmel daybook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, selectedAccountId]);

  // Handle Date Filter presets
  const handleDateFilterChange = (mode: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom') => {
    setDateFilterMode(mode);
    const now = new Date();
    const tStr = now.toISOString().split('T')[0];

    if (mode === 'today') {
      setStartDate(tStr);
      setEndDate(tStr);
    } else if (mode === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (mode === 'this_week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(tStr);
    } else if (mode === 'this_month') {
      setStartDate(`${tStr.slice(0, 7)}-01`);
      setEndDate(tStr);
    }
  };

  // Handle Contra Fund Transfer Submit
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFromId || !transferToId || transferFromId === transferToId) {
      setTransferError('Please choose different source and destination accounts');
      return;
    }
    if (!transferAmount || Number(transferAmount) <= 0) {
      setTransferError('Please enter a valid transfer amount');
      return;
    }

    try {
      setTransferSaving(true);
      setTransferError('');

      await api.transferFunds({
        from_account_id: Number(transferFromId),
        to_account_id: Number(transferToId),
        amount: Number(transferAmount),
        date: transferDate,
        notes: transferNotes
      });

      setIsTransferModalOpen(false);
      setTransferAmount('');
      loadData();
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed');
    } finally {
      setTransferSaving(false);
    }
  };

  // Open Create/Edit Account Modal
  const handleOpenAccountModal = (acc: PaymentAccount | null = null) => {
    setEditingAccount(acc);
    if (acc) {
      setAccName(acc.account_name);
      setAccType(acc.account_type);
      setAccNumber(acc.account_number || '');
      setAccBankName(acc.bank_name || '');
      setAccIfsc(acc.ifsc_code || '');
      setAccOpeningBal(acc.opening_balance || 0);
      setAccIsDefault(Boolean(acc.is_default));
      setAccNotes(acc.notes || '');
    } else {
      setAccName('');
      setAccType('BANK');
      setAccNumber('');
      setAccBankName('');
      setAccIfsc('');
      setAccOpeningBal(0);
      setAccIsDefault(false);
      setAccNotes('');
    }
    setAccError('');
    setIsAccountModalOpen(true);
  };

  // Save Account Submit
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) {
      setAccError('Account name is required');
      return;
    }

    try {
      setAccSaving(true);
      setAccError('');

      const payload = {
        account_name: accName.trim(),
        account_type: accType,
        account_number: accNumber.trim(),
        bank_name: accBankName.trim(),
        ifsc_code: accIfsc.trim(),
        opening_balance: Number(accOpeningBal) || 0,
        is_default: accIsDefault ? 1 : 0,
        notes: accNotes.trim()
      };

      if (editingAccount) {
        await api.updatePaymentAccount(editingAccount.id, payload);
      } else {
        await api.createPaymentAccount(payload);
      }

      setIsAccountModalOpen(false);
      loadData();
    } catch (err: any) {
      setAccError(err.message || 'Failed to save payment account');
    } finally {
      setAccSaving(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete account "${name}"?`)) return;
    try {
      await api.deletePaymentAccount(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    }
  };

  // Print Rojmel Daybook
  const handlePrintRojmel = () => {
    window.print();
  };

  // Generate Formatted WhatsApp Summary Message
  const generateWhatsAppText = () => {
    const dStr = startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} to ${formatDate(endDate)}`;
    const op = formatCurrency(rojmelData?.opening_balance || 0);
    const inf = formatCurrency(rojmelData?.total_inflow || 0);
    const out = formatCurrency(rojmelData?.total_outflow || 0);
    const cls = formatCurrency(rojmelData?.closing_balance || 0);
    const net = formatCurrency(rojmelData?.net_flow || 0);
    const cashOp = formatCurrency(rojmelData?.opening_cash || 0);
    const bankOp = formatCurrency(rojmelData?.opening_bank || 0);

    const saleTot = formatCurrency(rojmelData?.total_sales || rojmelData?.sales_summary?.total_sales || 0);
    const saleBills = rojmelData?.sales_summary?.total_bills || 0;
    const saleKg = rojmelData?.sales_summary?.total_kg || 0;
    const cashSale = formatCurrency(rojmelData?.sales_summary?.cash_sales || 0);
    const creditSale = formatCurrency(rojmelData?.sales_summary?.credit_sales || 0);

    const cashBal = formatCurrency(accounts.find(a => a.account_type === 'CASH')?.current_balance || 0);
    const bankBal = formatCurrency(accounts.find(a => a.account_type === 'BANK')?.current_balance || 0);
    const upiBal = formatCurrency(accounts.find(a => a.account_type === 'UPI')?.current_balance || 0);

    const bName = settings?.business_name || 'MATUKI SWEETS';

    return `📊 *${bName} — Daily Cashbook*
📅 *Date:* ${dStr}
⏰ *Time:* ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

━━━━━━━━━━━━━━━━━━━━━━━━
🛍️ *Total Sales:* ${saleTot}
   • Bills: ${saleBills} | Weight: ${saleKg} KG
   • Cash Sales: ${cashSale} | Credit Sales: ${creditSale}
━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Opening Balance:* ${op}
   • Cash: ${cashOp} | Bank: ${bankOp}

🟢 *Total Inflow (Receipts):* + ${inf}
🔴 *Total Outflow (Payments):* - ${out}
━━━━━━━━━━━━━━━━━━━━━━━━
💎 *Closing Balance (Net Closing Balance):* ${cls}
📈 *Net Flow:* ${Number(rojmelData?.net_flow || 0) >= 0 ? '+' : ''}${net}
━━━━━━━━━━━━━━━━━━━━━━━━
💵 *Cash Balance:* ${cashBal}
🏦 *Bank Balance:* ${bankBal}
📱 *UPI QR:* ${upiBal}
━━━━━━━━━━━━━━━━━━━━━━━━
✅ _Daily Daybook Summary Generated via ${bName} ERP_`;
  };

  // 1-Click WhatsApp Share: Capture HD Snapshot + Open WhatsApp with Text
  const handleCaptureAndShareWhatsApp = async () => {
    if (!rojmelCardFrameRef.current) return;
    try {
      setIsCapturing(true);

      // 1. Capture High-Definition Canvas (2x scale for crystal clarity)
      const canvas = await html2canvas(rojmelCardFrameRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // 2. Download Image Snapshot
      const imageUri = canvas.toDataURL('image/png');
      const dStr = startDate.replace(/-/g, '');
      const prefix = (settings?.business_name || 'ROJMEL').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const link = document.createElement('a');
      link.download = `${prefix}_ROJMEL_${dStr}.png`;
      link.href = imageUri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 3. Try to copy image to clipboard
      try {
        canvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard && (window as any).ClipboardItem) {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({ 'image/png': blob })
            ]);
          }
        });
      } catch (e) {
        console.log('Clipboard image copy not available', e);
      }

      // 4. Open WhatsApp Web / Mobile with Formatted Message
      const text = generateWhatsAppText();
      const cleanPhone = ownerMobile.replace(/\D/g, '');
      let waUrl = '';
      if (cleanPhone) {
        const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        waUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}`;
      } else {
        waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      }

      // 5. Automatic Timestamped Database Safety Backup on Day Closing
      try {
        await api.createBackupNow();
      } catch (backupErr) {
        console.warn('Auto backup notice:', backupErr);
      }

      window.open(waUrl, '_blank');
    } catch (err: any) {
      console.error('Error capturing snapshot:', err);
      alert('Failed to capture snapshot: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  // Download Image Snapshot Only
  const handleDownloadOnlyImage = async () => {
    if (!rojmelCardFrameRef.current) return;
    try {
      setIsCapturing(true);
      const canvas = await html2canvas(rojmelCardFrameRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imageUri = canvas.toDataURL('image/png');
      const dStr = startDate.replace(/-/g, '');
      const prefix = (settings?.business_name || 'ROJMEL').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const link = document.createElement('a');
      link.download = `${prefix}_ROJMEL_${dStr}.png`;
      link.href = imageUri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Error downloading image: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  // Copy WhatsApp Text Only
  const handleCopyText = async () => {
    try {
      const text = generateWhatsAppText();
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (e) {
      alert('Failed to copy text');
    }
  };

  // Save Partner Settings
  const handleSavePartnerSettings = async () => {
    try {
      await api.updateSettings({
        partner_1_mobile: partner1Mobile.trim(),
        partner_2_mobile: partner2Mobile.trim(),
        partner_3_mobile: partner3Mobile.trim(),
        auto_rojmel_time: autoRojmelTime,
        auto_rojmel_enabled: autoRojmelEnabled ? 1 : 0
      });
      setIsPartnerConfigOpen(false);
      setPartnerSuccessMsg('✅ 3-Partner Auto 8:45 PM Dispatch Settings Saved Successfully!');
      setTimeout(() => setPartnerSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save partner settings');
    }
  };

  // 1-Click Send Snapshot to 3 Partners Now (Sends HD Snapshot Photo Only)
  const handleSendToPartnersNow = async () => {
    try {
      setSendingPartners(true);
      setPartnerSuccessMsg('');
      const partnersList = [partner1Mobile, partner2Mobile, partner3Mobile].filter(m => m && m.trim().length >= 8);
      if (partnersList.length === 0) {
        alert('Please enter at least 1 partner mobile number in configuration.');
        setIsPartnerConfigOpen(true);
        return;
      }

      // Capture HD Snapshot Canvas of the Daybook card
      let imageBase64: string | undefined = undefined;
      if (rojmelCardFrameRef.current) {
        try {
          const canvas = await html2canvas(rojmelCardFrameRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
          });
          imageBase64 = canvas.toDataURL('image/png');
        } catch (cErr) {
          console.warn('Canvas snapshot capture notice:', cErr);
        }
      }

      const res = await api.dispatchDaybookToPartners(startDate, partnersList, imageBase64);
      setPartnerSuccessMsg(`🎉 Daily Daybook Snapshot Photo sent successfully to ${res.total_recipients || partnersList.length} Partners on WhatsApp!`);
      setTimeout(() => setPartnerSuccessMsg(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch snapshot photo to partners');
    } finally {
      setSendingPartners(false);
    }
  };

  // 1-Click Signal Share (Copies HD Snapshot Photo to Clipboard & Launches Signal)
  const handleSignalShare = async () => {
    try {
      if (rojmelCardFrameRef.current) {
        // 1. Capture HD Canvas
        const canvas = await html2canvas(rojmelCardFrameRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });

        // 2. Copy Image directly to Clipboard
        try {
          canvas.toBlob(async (blob) => {
            if (blob && navigator.clipboard && (window as any).ClipboardItem) {
              await navigator.clipboard.write([
                new (window as any).ClipboardItem({ 'image/png': blob })
              ]);
            }
          });
        } catch (clipErr) {
          console.log('Clipboard image copy fallback:', clipErr);
        }

        // 3. Trigger Photo Download
        const imageUri = canvas.toDataURL('image/png');
        const dStr = startDate.replace(/-/g, '');
        const link = document.createElement('a');
        link.download = `MATUKI_DAYBOOK_SNAPSHOT_${dStr}.png`;
        link.href = imageUri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setCopiedSignalText(true);
      setTimeout(() => setCopiedSignalText(false), 3500);

      // Open Signal web / desktop URI
      const targetPhone = partner1Mobile.replace(/\D/g, '') || ownerMobile.replace(/\D/g, '');
      const signalUrl = targetPhone ? `https://signal.me/#p/${targetPhone.length === 10 ? `+91${targetPhone}` : `+${targetPhone}`}` : 'https://signal.org';
      window.open(signalUrl, '_blank');
    } catch (err: any) {
      alert('Could not prepare snapshot photo for Signal: ' + err.message);
    }
  };

  // Filter entries based on search term
  const filteredEntries = (rojmelData?.entries || []).filter(e => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (e.voucher_no && e.voucher_no.toLowerCase().includes(s)) ||
      (e.party_name && e.party_name.toLowerCase().includes(s)) ||
      (e.account_name && e.account_name.toLowerCase().includes(s)) ||
      (e.notes && e.notes.toLowerCase().includes(s))
    );
  });

  const getVoucherBadge = (type: string) => {
    switch (type) {
      case 'SALE':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>SALE</span>;
      case 'PAYMENT_RECEIVED':
        return <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>RECEIPT</span>;
      case 'PURCHASE':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>PURCHASE</span>;
      case 'PAYMENT_MADE':
        return <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>PAYMENT</span>;
      case 'EXPENSE':
        return <span style={{ background: '#fff1f2', color: '#e11d48', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>EXPENSE</span>;
      case 'CONTRA':
        return <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>CONTRA</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>{type}</span>;
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'BANK': return <Landmark size={15} style={{ color: '#2563eb' }} />;
      case 'UPI': return <QrCode size={15} style={{ color: '#7c3aed' }} />;
      default: return <Banknote size={15} style={{ color: '#16a34a' }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '100%' }}>
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        padding: '14px 20px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            color: '#ffffff',
            padding: '10px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            <BookOpen size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Daily Cashbook (Rojmel & Cash-Bank Book)
              <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                100% OFFLINE ACCOUNTING
              </span>
            </h1>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              Daily cash, bank, and UPI inflow/outflow reconciliation, closing balance, and daybook ledger
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {canEdit && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsTransferModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem', borderColor: '#3b82f6', color: '#1d4ed8' }}
              >
                <ArrowRightLeft size={14} /> 💸 Contra Transfer
              </button>
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleOpenAccountModal(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem' }}
              >
                <Plus size={16} /> + New Bank / Account
              </button>
            </>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrintRojmel}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.82rem', background: '#0f172a', borderColor: '#0f172a' }}
          >
            <Printer size={14} /> Print Daybook
          </button>
        </div>
      </div>

      {/* 2. TAB SWITCHER */}
      <div className="no-print" style={{
        display: 'flex',
        borderBottom: '2px solid #e2e8f0',
        gap: '8px',
        padding: '0 4px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('daybook')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'daybook' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'daybook' ? '#1d4ed8' : '#64748b',
            fontWeight: activeTab === 'daybook' ? 800 : 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <BookOpen size={15} /> 📖 Daily Cashbook (Rojmel Daybook)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'accounts' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'accounts' ? '#1d4ed8' : '#64748b',
            fontWeight: activeTab === 'accounts' ? 800 : 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <Wallet size={15} /> 🏦 Payment Accounts & Live Balances
          <span style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#334155', padding: '1px 7px', borderRadius: '10px' }}>
            {accounts.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DAILY ROJMEL DAYBOOK */}
      {/* ======================================================== */}
      {activeTab === 'daybook' && (
        <>
          {/* Filter Bar */}
          <div className="no-print" style={{
            background: '#ffffff',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* Quick Date Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginRight: '4px' }}>
                <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                Date:
              </span>
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'custom', label: 'Custom Range' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleDateFilterChange(f.id as any)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    fontSize: '0.78rem',
                    fontWeight: dateFilterMode === f.id ? 800 : 600,
                    border: '1px solid',
                    borderColor: dateFilterMode === f.id ? '#3b82f6' : '#cbd5e1',
                    background: dateFilterMode === f.id ? '#eff6ff' : '#ffffff',
                    color: dateFilterMode === f.id ? '#1d4ed8' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}

              {/* Custom Date Pickers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '4px 8px', fontSize: '0.8rem', width: '130px' }}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateFilterMode('custom');
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>to</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '4px 8px', fontSize: '0.8rem', width: '130px' }}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateFilterMode('custom');
                  }}
                />
              </div>
            </div>

            {/* Account & Search Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Account Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={14} color="#64748b" />
                <select
                  className="form-select"
                  style={{ padding: '5px 10px', fontSize: '0.8rem', fontWeight: 600, width: '210px' }}
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  <option value="ALL">🌐 All Accounts (All Accounts)</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={String(acc.id)}>
                      {acc.account_name} ({acc.account_type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '30px', paddingRight: '8px', fontSize: '0.8rem', height: '32px' }}
                  placeholder="Search party, voucher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3. SHAREABLE ROJMEL SUMMARY CARD (Automatic Snapshot Capture Frame) */}
          <div 
            ref={rojmelCardFrameRef} 
            id="rojmel-shareable-card" 
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              padding: '16px 20px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Top Frame Header with Logo, Business Name, Date & Time */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1.5px solid #e2e8f0',
              paddingBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #d32f2f, #991b1b)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  letterSpacing: '0.04em',
                  boxShadow: '0 2px 4px rgba(211, 47, 47, 0.3)'
                }}>
                  {settings?.business_name || 'MATUKI SWEETS'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900, color: '#0f172a' }}>
                    Daily Daybook Financial Summary
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    {settings?.subtitle || settings?.address || 'Business ERP'}
                  </span>
                </div>
              </div>

              {/* Prominent Date & Time Badge */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 14px',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Calendar size={20} color="#2563eb" />
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>
                    📅 {formatDate(startDate)} {startDate !== endDate ? ` to ${formatDate(endDate)}` : ''}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>

            {/* The 5 KPI Cards Grid (Including Total Sales for Selected Date) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {/* 1. Total Sales for Selected Date */}
              <div style={{
                background: '#ffffff',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid #fed7aa',
                borderLeft: '5px solid #ea580c',
                boxShadow: '0 2px 4px rgba(234, 88, 12, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    TOTAL SALES
                  </span>
                  <ShoppingBag size={16} color="#ea580c" />
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#c2410c', fontFamily: 'var(--font-mono)', margin: '4px 0 2px 0' }}>
                  {formatCurrency(rojmelData?.total_sales || rojmelData?.sales_summary?.total_sales || 0)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9a3412', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                  <span>Bills: <strong>{rojmelData?.sales_summary?.total_bills || 0}</strong></span>
                  <span>•</span>
                  <span>Weight: <strong>{rojmelData?.sales_summary?.total_kg || 0} KG</strong></span>
                  <span>•</span>
                  <span>Cash: {formatCurrency(rojmelData?.sales_summary?.cash_sales || 0)}</span>
                </div>
              </div>

              {/* 2. Opening Balance */}
              <div style={{
                background: '#ffffff',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #e2e8f0',
                borderLeft: '5px solid #64748b',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    OPENING BALANCE
                  </span>
                  <Clock size={15} color="#64748b" />
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', fontFamily: 'var(--font-mono)', margin: '4px 0 2px 0' }}>
                  {formatCurrency(rojmelData?.opening_balance || 0)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '6px' }}>
                  <span>Cash: {formatCurrency(rojmelData?.opening_cash || 0)}</span>
                  <span>•</span>
                  <span>Bank: {formatCurrency(rojmelData?.opening_bank || 0)}</span>
                </div>
              </div>

              {/* 3. Total Inflow / Aavak */}
              <div style={{
                background: '#ffffff',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #e2e8f0',
                borderLeft: '5px solid #16a34a',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    TOTAL INFLOW (RECEIPTS)
                  </span>
                  <ArrowDownLeft size={16} color="#16a34a" />
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', fontFamily: 'var(--font-mono)', margin: '4px 0 2px 0' }}>
                  + {formatCurrency(rojmelData?.total_inflow || 0)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#15803d' }}>
                  Sales receipts, party collections, and account inflows
                </div>
              </div>

              {/* 4. Total Outflow / Javak */}
              <div style={{
                background: '#ffffff',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #e2e8f0',
                borderLeft: '5px solid #dc2626',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    TOTAL OUTFLOW (PAYMENTS)
                  </span>
                  <ArrowUpRight size={16} color="#dc2626" />
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', fontFamily: 'var(--font-mono)', margin: '4px 0 2px 0' }}>
                  - {formatCurrency(rojmelData?.total_outflow || 0)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>
                  Material purchases, vendor payments, and operational expenses
                </div>
              </div>

              {/* 5. Closing Balance */}
              <div style={{
                background: '#ffffff',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #e2e8f0',
                borderLeft: '5px solid #2563eb',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Closing Balance (NET CLOSING BALANCE)
                  </span>
                  <Wallet size={16} color="#2563eb" />
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: (rojmelData?.closing_balance || 0) >= 0 ? '#1d4ed8' : '#dc2626', fontFamily: 'var(--font-mono)', margin: '4px 0 2px 0' }}>
                  {formatCurrency(rojmelData?.closing_balance || 0)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                  Net Flow: <strong style={{ color: (rojmelData?.net_flow || 0) >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(rojmelData?.net_flow || 0)}</strong>
                </div>
              </div>
            </div>

            {/* Bottom Live Account Breakdown Footer inside Frame */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.78rem',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: '#475569' }}>Closing Balances:</span>
                <span style={{ color: '#15803d', fontWeight: 700 }}>💵 Cash Drawer: {formatCurrency(accounts.find(a => a.account_type === 'CASH')?.current_balance || 0)}</span>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>🏦 Bank Account: {formatCurrency(accounts.find(a => a.account_type === 'BANK')?.current_balance || 0)}</span>
                <span style={{ color: '#7c3aed', fontWeight: 700 }}>📱 UPI QR: {formatCurrency(accounts.find(a => a.account_type === 'UPI')?.current_balance || 0)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 800 }}>
                <CheckCircle2 size={14} /> Daybook Reconciled & Balanced
              </div>
            </div>
          </div>

          {/* 4. 1-CLICK SEND TO WHATSAPP ACTION BAR (Right below the Frame) */}
          <div className="no-print" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1.5px solid #86efac',
            borderRadius: '10px',
            padding: '12px 18px',
            boxShadow: '0 2px 6px rgba(34, 197, 94, 0.15)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: '#22c55e',
                color: '#ffffff',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(34, 197, 94, 0.4)'
              }}>
                <Share2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.94rem', fontWeight: 900, color: '#14532d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  1-Click Daily Daybook Snapshot & WhatsApp Share
                  <span style={{ fontSize: '0.7rem', background: '#22c55e', color: '#ffffff', padding: '1px 6px', borderRadius: '4px' }}>
                    FAST
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#166534' }}>
                  Export and share daily closing daybook summary to WhatsApp
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Optional Owner Phone Input */}
              <input
                type="text"
                className="form-input"
                style={{ width: '160px', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 700, borderColor: '#86efac', background: '#ffffff' }}
                placeholder="Owner Mobile No..."
                value={ownerMobile}
                onChange={(e) => {
                  setOwnerMobile(e.target.value);
                  localStorage.setItem('matuki_owner_whatsapp', e.target.value);
                }}
                title="Save Owner WhatsApp Number for 1-Click Send"
              />

              <button
                type="button"
                onClick={handleCopyText}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem', background: '#ffffff' }}
                title="Copy Rojmel summary text message"
              >
                {copiedText ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                {copiedText ? 'Copied!' : 'Copy Text'}
              </button>

              <button
                type="button"
                onClick={handleDownloadOnlyImage}
                disabled={isCapturing}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem', background: '#ffffff' }}
                title="Download PNG Screenshot of above frame"
              >
                <Download size={16} /> Download Photo
              </button>

              {/* MAIN 1-CLICK WHATSAPP BUTTON */}
              <button
                type="button"
                onClick={handleCaptureAndShareWhatsApp}
                disabled={isCapturing}
                style={{
                  background: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 8px -1px rgba(34, 197, 94, 0.45)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#16a34a'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#22c55e'}
              >
                <Send size={17} />
                {isCapturing ? 'Capturing Snapshot...' : '📱 Send to WhatsApp'}
              </button>
            </div>
          </div>

          {/* 5. 3-PARTNER DAILY 8:45 PM AUTO-DISPATCH & SIGNAL SHARING BAR */}
          <div className="no-print" style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1.5px solid #334155',
            borderRadius: '10px',
            padding: '14px 18px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: '#d97706',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex'
              }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.94rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👑 Daily 8:45 PM Auto Daybook Snapshot (3 પાર્ટનર્સને દૈનિક રિપોર્ટ)
                  <span style={{
                    fontSize: '0.68rem',
                    background: autoRojmelEnabled ? '#16a34a' : '#64748b',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 800
                  }}>
                    {autoRojmelEnabled ? `AUTO ACTIVE (${autoRojmelTime} DAILY)` : 'DISABLED'}
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                  Recipients: <strong>1. {partner1Mobile || 'Partner 1'}</strong> • <strong>2. {partner2Mobile || 'Partner 2'}</strong> • <strong>3. {partner3Mobile || 'Partner 3'}</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons for 3 Partners */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSendToPartnersNow}
                disabled={sendingPartners}
                className="btn btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                }}
                title="Send Daybook summary to all 3 Partners on WhatsApp right now"
              >
                <Send size={14} />
                <span>{sendingPartners ? 'Dispatching...' : '📲 Send to 3 Partners Now'}</span>
              </button>

              {/* Signal App Share Button */}
              <button
                type="button"
                onClick={handleSignalShare}
                className="btn btn-sm"
                style={{
                  background: '#3a76f0',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px'
                }}
                title="Copy formatted snapshot text and launch Signal App"
              >
                <Share2 size={14} />
                <span>{copiedSignalText ? 'Copied for Signal!' : '💬 Signal Share'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPartnerConfigOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{
                  background: '#334155',
                  borderColor: '#475569',
                  color: '#f8fafc',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Edit size={14} />
                <span>Edit 3 Numbers</span>
              </button>
            </div>
          </div>

          {/* Success Banner if Dispatched */}
          {partnerSuccessMsg && (
            <div style={{
              background: '#dcfce7',
              border: '1.5px solid #86efac',
              borderRadius: '8px',
              color: '#15803d',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} />
              <span>{partnerSuccessMsg}</span>
            </div>
          )}

          {/* Partner Settings Modal */}
          {isPartnerConfigOpen && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: '520px' }}>
                <div className="modal-header">
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    👑 3-Partner Auto 8:45 PM WhatsApp Settings
                  </h3>
                  <button onClick={() => setIsPartnerConfigOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    Every night at <strong>{autoRojmelTime} (8:45 PM)</strong> before PC is turned off, the system will automatically send today's Rojmel Daybook Snapshot to the following 3 mobile numbers:
                  </p>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                      👑 Partner 1 Mobile (મુખ્ય માલિક / Partner 1):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="+91 90818 22283"
                      value={partner1Mobile}
                      onChange={(e) => setPartner1Mobile(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                      👑 Partner 2 Mobile (પાર્ટનર 2):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="+91 98251 44556"
                      value={partner2Mobile}
                      onChange={(e) => setPartner2Mobile(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                      👑 Partner 3 Mobile (પાર્ટનર 3):
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="+91 98980 12345"
                      value={partner3Mobile}
                      onChange={(e) => setPartner3Mobile(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                        ⏰ Auto-Dispatch Time (સમય):
                      </label>
                      <input
                        type="time"
                        className="form-input"
                        value={autoRojmelTime}
                        onChange={(e) => setAutoRojmelTime(e.target.value)}
                      />
                    </div>

                    <div style={{ flex: 1, paddingTop: '18px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                        <input
                          type="checkbox"
                          checked={autoRojmelEnabled}
                          onChange={(e) => setAutoRojmelEnabled(e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>Enable Auto Daily Send</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsPartnerConfigOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleSavePartnerSettings} style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 800 }}>
                    Save Partner Numbers
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. ROJMEL DAYBOOK TABLE (Full Width High-Density Ledger) */}
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Printable Header */}
            <div className="print-only" style={{ padding: '16px', borderBottom: '2px solid #0f172a', textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', textTransform: 'uppercase' }}>{settings?.business_name || 'MATUKI SWEETS'}</h2>
              <h3 style={{ margin: '4px 0', fontSize: '1.1rem' }}>DAILY CASH & BANK DAYBOOK (ROJMEL)</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                {settings?.address ? `${settings.address} | ` : ''}Date: {formatDate(startDate)} to {formatDate(endDate)} | Account: {selectedAccountId === 'ALL' ? 'All Accounts' : accounts.find(a => String(a.id) === selectedAccountId)?.account_name}
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '50px', color: '#475569', fontWeight: 800 }}>#</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '110px', color: '#475569', fontWeight: 800 }}>Date</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '130px', color: '#475569', fontWeight: 800 }}>Voucher #</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569', fontWeight: 800 }}>Particulars / Party</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '180px', color: '#475569', fontWeight: 800 }}>Account</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '130px', color: '#15803d', fontWeight: 900 }}>Inflow (Receipt ₹)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '130px', color: '#b91c1c', fontWeight: 900 }}>Outflow (Payment ₹)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', width: '140px', color: '#1e293b', fontWeight: 900 }}>Balance (Balance ₹)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', color: '#475569', fontWeight: 700 }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontWeight: 800 }}>
                    <td style={{ textAlign: 'center', padding: '8px' }}>-</td>
                    <td style={{ padding: '8px 12px' }}>{formatDate(startDate)}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                        OPENING
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#0f172a' }}>
                      🌟 Opening Balance Brought Forward
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>
                      {selectedAccountId === 'ALL' ? 'All Accounts Combined' : accounts.find(a => String(a.id) === selectedAccountId)?.account_name}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 14px', color: '#15803d', fontFamily: 'var(--font-mono)' }}>-</td>
                    <td style={{ textAlign: 'right', padding: '8px 14px', color: '#b91c1c', fontFamily: 'var(--font-mono)' }}>-</td>
                    <td style={{ textAlign: 'right', padding: '8px 14px', color: '#0f172a', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.92rem' }}>
                      {formatCurrency(rojmelData?.opening_balance || 0)}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>Opening Liquid Funds</td>
                  </tr>

                  {/* Day's Transactions */}
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                        No transactions recorded for this date range.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((e, idx) => (
                      <tr
                        key={e.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '8px', color: '#94a3b8', fontWeight: 700 }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                          {formatDate(e.entry_date)}
                        </td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                              {e.voucher_no}
                            </span>
                            <div>{getVoucherBadge(e.voucher_type)}</div>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                          {e.party_name}
                        </td>
                        <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#334155' }}>
                            {getAccountIcon(e.account_type)}
                            <span>{e.account_name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 14px', fontWeight: 800, color: e.inflow_amount > 0 ? '#15803d' : '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                          {e.inflow_amount > 0 ? `+ ${formatCurrency(e.inflow_amount)}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 14px', fontWeight: 800, color: e.outflow_amount > 0 ? '#dc2626' : '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                          {e.outflow_amount > 0 ? `- ${formatCurrency(e.outflow_amount)}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 14px', fontWeight: 900, color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(e.running_balance)}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '0.78rem' }}>
                          {e.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900 }}>
                    <td colSpan={5} style={{ padding: '12px 14px', textAlign: 'right', color: '#0f172a', fontSize: '0.9rem' }}>
                      Period Totals & Net Closing Balance:
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#15803d', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                      + {formatCurrency(rojmelData?.total_inflow || 0)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#dc2626', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                      - {formatCurrency(rojmelData?.total_outflow || 0)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 14px', color: '#1d4ed8', fontFamily: 'var(--font-mono)', fontSize: '1.05rem', background: '#eff6ff' }}>
                      {formatCurrency(rojmelData?.closing_balance || 0)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#15803d' }}>
                      Closing Balance
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PAYMENT ACCOUNTS & LIVE BALANCES */}
      {/* ======================================================== */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Cash & Bank Accounts Management
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Live balances and settings for bank accounts, cash registers, and UPI QR
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleOpenAccountModal(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.84rem' }}
            >
              <Plus size={15} /> + Add New Account
            </button>
          </div>

          {/* Account Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {accounts.map(acc => (
              <div
                key={acc.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative'
                }}
              >
                {/* Top Badge & Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: acc.account_type === 'BANK' ? '#eff6ff' : (acc.account_type === 'UPI' ? '#f5f3ff' : '#f0fdf4'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getAccountIcon(acc.account_type)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                        {acc.account_name}
                      </h3>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Type: <strong>{acc.account_type}</strong> {acc.is_default ? '• ⭐ Default' : ''}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px' }}
                      title="Edit Account"
                      onClick={() => handleOpenAccountModal(acc)}
                    >
                      <Edit size={13} />
                    </button>
                    {!acc.is_default && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', color: '#dc2626' }}
                        title="Delete Account"
                        onClick={() => handleDeleteAccount(acc.id, acc.account_name)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Account Details */}
                <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>
                  {acc.account_number && (
                    <div>A/c No / UPI: <strong>{acc.account_number}</strong></div>
                  )}
                  {acc.bank_name && (
                    <div>Bank: <strong>{acc.bank_name}</strong> {acc.ifsc_code ? `(${acc.ifsc_code})` : ''}</div>
                  )}
                  {acc.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Note: {acc.notes}</div>
                  )}
                </div>

                {/* Live Balance */}
                <div style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline'
                }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                    Live Balance:
                  </span>
                  <strong style={{
                    fontSize: '1.25rem',
                    fontFamily: 'var(--font-mono)',
                    color: (acc.current_balance || 0) >= 0 ? '#15803d' : '#dc2626'
                  }}>
                    {formatCurrency(acc.current_balance || 0)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. CONTRA FUND TRANSFER MODAL */}
      {/* ======================================================== */}
      {isTransferModalOpen && (
        <div className="modal-overlay" style={{ padding: '12px', zIndex: 99999 }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', overflow: 'hidden' }}>
            <div style={{
              padding: '12px 18px',
              background: '#1e293b',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowRightLeft size={16} /> 💸 Contra Fund Transfer (Internal Transfer)
              </h2>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit}>
              <div className="modal-body" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {transferError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#dc2626', fontSize: '0.82rem' }}>
                    {transferError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Transfer Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📤 From Account (Source) *</label>
                  <select
                    className="form-select"
                    required
                    value={transferFromId}
                    onChange={(e) => setTransferFromId(e.target.value)}
                    style={{ fontWeight: 600 }}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={String(acc.id)}>
                        {acc.account_name} (Bal: {formatCurrency(acc.current_balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">📥 To Account (Destination) *</label>
                  <select
                    className="form-select"
                    required
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                    style={{ fontWeight: 600 }}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={String(acc.id)}>
                        {acc.account_name} (Bal: {formatCurrency(acc.current_balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Transfer Amount (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    className="form-input"
                    style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#2563eb' }}
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Cash deposited in HDFC Bank, ATM Withdrawal..."
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsTransferModalOpen(false)} disabled={transferSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={transferSaving} style={{ background: '#2563eb', borderColor: '#1d4ed8', fontWeight: 800 }}>
                  <CheckCircle2 size={16} /> {transferSaving ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CREATE / EDIT ACCOUNT MODAL */}
      {/* ======================================================== */}
      {isAccountModalOpen && (
        <div className="modal-overlay" style={{ padding: '12px', zIndex: 99999 }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', overflow: 'hidden' }}>
            <div style={{
              padding: '12px 18px',
              background: '#0f172a',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Landmark size={18} /> {editingAccount ? 'Edit Payment Account' : 'Add New Payment / Bank Account'}
              </h2>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit}>
              <div className="modal-body" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {accError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#dc2626', fontSize: '0.82rem' }}>
                    {accError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Account Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. SBI Bank Katargam, Cash Drawer 2, GPay PhonePe..."
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Account Type *</label>
                    <select
                      className="form-select"
                      value={accType}
                      onChange={(e) => setAccType(e.target.value as any)}
                    >
                      <option value="CASH">💵 Cash Register</option>
                      <option value="BANK">🏦 Bank Account</option>
                      <option value="UPI">📱 UPI / QR Code</option>
                      <option value="OTHER">🪙 Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Opening Balance (₹)</label>
                    <input
                      type="number"
                      step="1"
                      className="form-input"
                      value={accOpeningBal}
                      onChange={(e) => setAccOpeningBal(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>

                {(accType === 'BANK' || accType === 'UPI') && (
                  <>
                    <div className="form-group">
                      <label className="form-label">{accType === 'BANK' ? 'Account Number' : 'UPI ID / Phone Number'}</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={accType === 'BANK' ? 'e.g. 50200012345678' : 'e.g. matukisweets@hdfcbank'}
                        value={accNumber}
                        onChange={(e) => setAccNumber(e.target.value)}
                      />
                    </div>

                    {accType === 'BANK' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label">Bank Name & Branch</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. HDFC Bank, Katargam"
                            value={accBankName}
                            onChange={(e) => setAccBankName(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">IFSC Code</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. HDFC0001234"
                            value={accIfsc}
                            onChange={(e) => setAccIfsc(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Notes / Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add notes..."
                    value={accNotes}
                    onChange={(e) => setAccNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="accIsDefault"
                    checked={accIsDefault}
                    onChange={(e) => setAccIsDefault(e.target.checked)}
                  />
                  <label htmlFor="accIsDefault" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    Set as default account for {accType} transactions
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAccountModalOpen(false)} disabled={accSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={accSaving} style={{ background: '#0f172a', borderColor: '#0f172a', fontWeight: 800 }}>
                  <Save size={16} /> {accSaving ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
