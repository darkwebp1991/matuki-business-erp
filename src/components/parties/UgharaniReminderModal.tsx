import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Search, 
  DollarSign, 
  Calendar, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  Filter, 
  QrCode, 
  Sparkles,
  Phone,
  ArrowDownLeft,
  Zap,
  Send,
  Smartphone,
  Users
} from 'lucide-react';
import { Customer, BusinessSettings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../api/client';
import { WhatsAppGatewayModal } from '../common/WhatsAppGatewayModal';

interface UgharaniReminderModalProps {
  isOpen: boolean;
  customers: Customer[];
  settings: BusinessSettings | null;
  selectedCustomer?: Customer | null;
  onClose: () => void;
  onViewStatement?: (customer: Customer) => void;
}

export const UgharaniReminderModal: React.FC<UgharaniReminderModalProps> = ({
  isOpen,
  customers,
  settings,
  selectedCustomer,
  onClose,
  onViewStatement
}) => {
  if (!isOpen) return null;

  const [search, setSearch] = useState<string>('');
  const [minBalance, setMinBalance] = useState<number>(0);
  const [activeCustomer, setActiveCustomer] = useState<Customer>(
    selectedCustomer || customers.find(c => c.current_balance > 0) || customers[0]
  );
  const [templateType, setTemplateType] = useState<'POLITE' | 'WEEKLY' | 'URGENT' | 'DISPATCH'>('POLITE');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [waGateway, setWaGateway] = useState<any>(null);
  const [showWAGatewayModal, setShowWAGatewayModal] = useState(false);
  const [autoSending, setAutoSending] = useState(false);

  const businessName = settings?.business_name || 'MATUKI SWEETS';
  const upiId = (settings as any)?.upi_id || 'Q070321548@ybl';

  React.useEffect(() => {
    api.getWhatsAppGatewayStatus().then(res => {
      setWaGateway((res as any)?.data || res);
    }).catch(() => {});
  }, []);

  // Filter customers with positive balance
  const debtors = customers
    .filter(c => c.current_balance > minBalance)
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      const city = (c as any).city || c.address || '';
      return (
        c.name.toLowerCase().includes(q) ||
        (c.mobile && c.mobile.includes(q)) ||
        city.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.current_balance - a.current_balance);

  const totalOutstanding = debtors.reduce((sum, c) => sum + (Number(c.current_balance) || 0), 0);

  // Generate Message Text with Official PhonePe UPI & QR Link
  const generateMessage = (customer: Customer, type = templateType) => {
    const custName = customer.name;
    const balanceStr = formatCurrency(customer.current_balance);
    const dateStr = formatDate(new Date().toISOString().split('T')[0]);
    const upiPayLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${customer.current_balance}&cu=INR`;

    const replacePlaceholders = (template: string) => {
      return template
        .replace(/\{customer_name\}/g, custName)
        .replace(/\{balance\}/g, balanceStr)
        .replace(/\{date\}/g, dateStr)
        .replace(/\{upi_id\}/g, upiId)
        .replace(/\{business_name\}/g, businessName)
        .replace(/\{pay_link\}/g, upiPayLink);
    };

    if (type === 'POLITE') {
      if (settings?.template_polite && settings.template_polite.trim()) {
        return replacePlaceholders(settings.template_polite);
      }
      return `Namaste ${custName} ji 🙏,
Greetings from *${businessName}*.

This is a gentle reminder that your current outstanding ledger balance as of ${dateStr} is *${balanceStr}*.

━━━━━━━━━━━━━━━━━━━━
💳 *Official PhonePe UPI ID:* \`${upiId}\`
📲 *1-Click Pay Link:* ${upiPayLink}
📷 *Payment QR Code:* Attached PhonePe QR Code
━━━━━━━━━━━━━━━━━━━━

Kindly arrange the payment via PhonePe, GPay, Paytm or Cash at your earliest convenience. If you have already paid, please ignore this message.

Thank you!
*${businessName}*`;
    }

    if (type === 'WEEKLY') {
      if (settings?.template_weekly && settings.template_weekly.trim()) {
        return replacePlaceholders(settings.template_weekly);
      }
      return `Hello ${custName} ji,
Hope you are doing well!

This is our weekly account reconciliation update from *${businessName}*.
• *Customer:* ${custName}
• *Pending Balance Due:* ${balanceStr}
• *As of Date:* ${dateStr}

━━━━━━━━━━━━━━━━━━━━
💳 *PhonePe UPI ID:* \`${upiId}\`
📲 *Pay via UPI Link:* ${upiPayLink}
━━━━━━━━━━━━━━━━━━━━

Please scan the attached PhonePe QR code or pay via UPI link. For detailed ledger statements or bill copies, please feel free to reply to this message.

Regards,
*${businessName}*`;
    }

    if (type === 'URGENT') {
      if (settings?.template_urgent && settings.template_urgent.trim()) {
        return replacePlaceholders(settings.template_urgent);
      }
      return `⚠️ *URGENT PAYMENT NOTICE* ⚠️
Dear ${custName} ji,

Your account with *${businessName}* has an overdue balance of *${balanceStr}*.

We request you to kindly clear this pending balance today to maintain an uninterrupted billing cycle and credit terms.

━━━━━━━━━━━━━━━━━━━━
💳 *PhonePe UPI ID:* \`${upiId}\`
📲 *Direct Pay Link:* ${upiPayLink}
━━━━━━━━━━━━━━━━━━━━
Thank you for your prompt cooperation.

*${businessName}*`;
    }

    // DISPATCH
    if (settings?.template_dispatch && settings.template_dispatch.trim()) {
      return replacePlaceholders(settings.template_dispatch);
    }
    return `Namaste ${custName} ji,
Your advance catering order with *${businessName}* is prepared and scheduled for dispatch.

Kindly clear your previous outstanding balance of *${balanceStr}* before driver departure.

━━━━━━━━━━━━━━━━━━━━
💳 *PhonePe UPI ID:* \`${upiId}\`
📲 *Direct Pay Link:* ${upiPayLink}
━━━━━━━━━━━━━━━━━━━━
Thank you!
*${businessName}*`;
  };

  const [copyStatusMsg, setCopyStatusMsg] = useState<string>('');
  const [copiedQR, setCopiedQR] = useState(false);

  const handleCopyQRImage = async () => {
    const qrSrc = (settings as any)?.upi_qr_image || '/payment_qr.png';
    try {
      const response = await fetch(qrSrc);
      const blob = await response.blob();
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ [blob.type || 'image/png']: blob })
        ]);
        setCopiedQR(true);
        setCopyStatusMsg('📋 QR Code Image Copied to Clipboard! Press Ctrl + V in WhatsApp chat to paste QR!');
        setTimeout(() => { setCopiedQR(false); setCopyStatusMsg(''); }, 5000);
        return true;
      }
    } catch (e) {
      console.warn('Clipboard write error', e);
    }
    return false;
  };

  const handleAutoSendGateway = async (customer: Customer) => {
    if (!customer.mobile) {
      alert(`Customer ${customer.name} does not have a registered mobile number.`);
      return;
    }
    const text = generateMessage(customer, templateType);
    try {
      setAutoSending(true);
      setCopyStatusMsg('⏳ Delivering message & PhonePe QR to customer WhatsApp in background...');
      await api.sendWhatsAppGatewayMessage({
        to_mobile: customer.mobile,
        message_text: text,
        media_file_path: (settings as any)?.upi_qr_image || '/payment_qr.png'
      });
      setCopyStatusMsg(`⚡ Sent successfully to ${customer.name} with PhonePe QR attached!`);
      setTimeout(() => setCopyStatusMsg(''), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to auto-send message');
      setCopyStatusMsg('');
    } finally {
      setAutoSending(false);
    }
  };

  const handleBulkAutoSendGateway = async (debtorsList: Customer[]) => {
    if (debtorsList.length === 0) return;
    if (!window.confirm(`Auto-send payment reminders with PhonePe QR to all ${debtorsList.length} selected debtors in the background?`)) {
      return;
    }
    const batchList = debtorsList
      .filter(c => c.mobile && c.mobile.trim())
      .map(c => ({
        id: c.id,
        to_mobile: c.mobile,
        message_text: generateMessage(c, templateType),
        media_file_path: (settings as any)?.upi_qr_image || '/payment_qr.png'
      }));

    try {
      setAutoSending(true);
      setCopyStatusMsg(`🚀 Dispatching ${batchList.length} reminders via WhatsApp Web Gateway...`);
      const summary = await api.sendWhatsAppGatewayBatch({ list: batchList, delay_ms: 2500 });
      const data = (summary as any)?.data || summary;
      setCopyStatusMsg(`✓ Bulk Dispatch Complete! Sent: ${data.sent || 0}, Failed: ${data.failed || 0}`);
      setTimeout(() => setCopyStatusMsg(''), 6000);
    } catch (err: any) {
      alert(err.message || 'Bulk auto-send failed');
      setCopyStatusMsg('');
    } finally {
      setAutoSending(false);
    }
  };

  const handleSendWhatsApp = async (customer: Customer) => {
    if (!customer.mobile) {
      alert(`Customer ${customer.name} does not have a registered mobile number.`);
      return;
    }

    const qrSrc = (settings as any)?.upi_qr_image || '/payment_qr.png';
    const text = generateMessage(customer, templateType);

    // 1. Try to copy QR image to clipboard automatically
    let qrCopied = false;
    try {
      const response = await fetch(qrSrc);
      const blob = await response.blob();
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ [blob.type || 'image/png']: blob })
        ]);
        qrCopied = true;
      }

      // If mobile device / web share with files is supported, share natively
      const file = new File([blob], 'Matuki_Payment_QR.png', { type: blob.type || 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Payment Reminder - ${businessName}`,
          text: text
        });
        return;
      }
    } catch (e) {
      console.warn('Auto copy QR error:', e);
    }

    // 2. Open WhatsApp Web / Mobile
    const cleanMobile = customer.mobile.replace(/\D/g, '');
    const mobileWithCode = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    const url = `https://wa.me/${mobileWithCode}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    // 3. Show prominent toast instruction
    setCopyStatusMsg(
      qrCopied
        ? '📋 QR Image Copied to Clipboard! In WhatsApp, just press Ctrl + V (or Right Click ➔ Paste) to attach the PhonePe QR code!'
        : '📲 WhatsApp Opened! You can also attach the saved QR code.'
    );
    setTimeout(() => setCopyStatusMsg(''), 7000);
  };

  const handleCopy = (customer: Customer) => {
    const text = generateMessage(customer, templateType);
    navigator.clipboard.writeText(text);
    setCopiedId(customer.id);
    setCopyStatusMsg('✓ Message text copied to clipboard!');
    setTimeout(() => { setCopiedId(null); setCopyStatusMsg(''); }, 2500);
  };

  const currentMsg = activeCustomer ? generateMessage(activeCustomer, templateType) : '';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
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
        maxWidth: '920px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '12px 18px',
          background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#ffffff', color: '#075e54', padding: '5px', borderRadius: '6px', display: 'flex' }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                1-Click WhatsApp Payment Reminder Bot (Ugharani Assistant)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', opacity: 0.9 }}>
                Send professional WhatsApp payment reminders with official PhonePe QR code attached
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowWAGatewayModal(true)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Manage WhatsApp Web Device Link"
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: waGateway?.isConnected ? '#4ade80' : '#facc15'
              }} />
              {waGateway?.isConnected ? 'WA Online' : 'Link WA Web (QR)'}
            </button>

            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#ffffff', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: 800 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Top KPI Banner */}
        <div style={{
          padding: '8px 18px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span>
              Total Pending Debtors: <strong style={{ color: '#0f172a' }}>{debtors.length} Parties</strong>
            </span>
            <span>
              Total Outstanding: <strong style={{ color: '#dc2626', fontSize: '0.92rem' }}>{formatCurrency(totalOutstanding)}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontWeight: 700 }}>Min Balance:</span>
            <select
              value={minBalance}
              onChange={(e) => setMinBalance(Number(e.target.value))}
              className="form-select"
              style={{ padding: '2px 6px', fontSize: '0.74rem', height: '26px', borderRadius: '4px' }}
            >
              <option value={0}>All Overdue (&gt; ₹0)</option>
              <option value={1000}>Above ₹1,000</option>
              <option value={5000}>Above ₹5,000</option>
              <option value={10000}>Above ₹10,000</option>
            </select>
          </div>
        </div>

        {/* 2-Column Split: Parties List (Left) vs WhatsApp Message Live Preview (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', flex: 1, overflow: 'hidden' }}>
          {/* Left Column: Debtors List */}
          <div style={{ borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '26px', fontSize: '0.76rem', height: '28px' }}
                  placeholder="Search customer / mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
              {debtors.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                  No pending debtors found for this filter.
                </div>
              ) : (
                debtors.map(c => {
                  const isSelected = activeCustomer?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveCustomer(c)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        marginBottom: '4px',
                        cursor: 'pointer',
                        background: isSelected ? '#f0fdf4' : '#ffffff',
                        border: isSelected ? '1.5px solid #22c55e' : '1px solid #f1f5f9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.1s ease'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Phone size={10} /> {c.mobile || 'No Mobile'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(c.current_balance)}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700 }}>
                          Click to select
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live Message Preview & 1-Click WhatsApp Trigger */}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', background: '#fafafa' }}>
            {/* Template Selector Pills */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569' }}>Template:</span>
              <button
                type="button"
                onClick={() => setTemplateType('POLITE')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  background: templateType === 'POLITE' ? '#075e54' : '#e2e8f0',
                  color: templateType === 'POLITE' ? '#ffffff' : '#334155'
                }}
              >
                🤝 Standard Polite
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('WEEKLY')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  background: templateType === 'WEEKLY' ? '#075e54' : '#e2e8f0',
                  color: templateType === 'WEEKLY' ? '#ffffff' : '#334155'
                }}
              >
                📅 Weekly Reconciliation
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('URGENT')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  background: templateType === 'URGENT' ? '#dc2626' : '#e2e8f0',
                  color: templateType === 'URGENT' ? '#ffffff' : '#334155'
                }}
              >
                🚨 Overdue Urgent
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('DISPATCH')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  background: templateType === 'DISPATCH' ? '#2563eb' : '#e2e8f0',
                  color: templateType === 'DISPATCH' ? '#ffffff' : '#334155'
                }}
              >
                🚚 Dispatch Clearance
              </button>
            </div>

            {/* Target Customer Card */}
            {activeCustomer && (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                    {activeCustomer.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    📞 {activeCustomer.mobile || 'No Mobile'} | City: {(activeCustomer as any).city || activeCustomer.address || 'Surat'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Total Balance Due</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#dc2626', fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(activeCustomer.current_balance)}
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Green Bubble Message Preview */}
            <div style={{
              background: '#dcf8c6',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '12px 14px',
              color: '#111b21',
              fontSize: '0.8rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              {currentMsg}
            </div>

            {/* Status Toast Banner */}
            {copyStatusMsg && (
              <div style={{
                background: '#ecfdf5',
                border: '1.5px solid #10b981',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#065f46',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Check size={16} color="#059669" />
                <span>{copyStatusMsg}</span>
              </div>
            )}

            {/* Attached PhonePe QR Code Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 12px',
              gap: '12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={(settings as any)?.upi_qr_image || '/payment_qr.png'}
                  alt="Official PhonePe QR"
                  style={{ width: '65px', height: '95px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff' }}
                />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                    💳 Matuki Sweets Official PhonePe QR
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#1e40af', fontFamily: 'monospace', marginTop: '2px' }}>
                    UPI ID: <strong>{upiId}</strong>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                    ✓ Auto-linked to PhonePe, Google Pay, Paytm & BHIM
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '3px' }}>
                    💡 <em>Tip: When WhatsApp opens, press <strong>Ctrl + V</strong> to paste this QR image!</em>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleCopyQRImage}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                  title="Copy QR Image to Clipboard"
                >
                  <Copy size={12} color={copiedQR ? '#16a34a' : '#2563eb'} />
                  {copiedQR ? '✓ Copied!' : '📋 Copy QR Image'}
                </button>
                <a
                  href={(settings as any)?.upi_qr_image || '/payment_qr.png'}
                  download="Matuki_Payment_QR.png"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 8px', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}
                  title="Download full QR Image"
                >
                  📥 Save QR
                </a>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {activeCustomer && onViewStatement && (
                  <button
                    type="button"
                    onClick={() => onViewStatement(activeCustomer)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem', padding: '5px 10px', fontWeight: 700 }}
                  >
                    📄 View Statement
                  </button>
                )}

                {activeCustomer && (
                  <button
                    type="button"
                    onClick={() => handleCopy(activeCustomer)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem', padding: '5px 10px', fontWeight: 700 }}
                  >
                    {copiedId === activeCustomer.id ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    {copiedId === activeCustomer.id ? 'Copied!' : 'Copy Text'}
                  </button>
                )}

                {waGateway?.isConnected && debtors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleBulkAutoSendGateway(debtors)}
                    disabled={autoSending}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem', padding: '5px 10px', fontWeight: 700, color: '#075e54', borderColor: '#86efac', background: '#f0fdf4' }}
                    title="Send reminder to all filtered debtors with delay"
                  >
                    <Users size={12} /> 🚀 Bulk Auto-Send All ({debtors.length})
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {activeCustomer && waGateway?.isConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(activeCustomer)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.74rem', padding: '6px 10px' }}
                      title="Open standard WhatsApp Web tab"
                    >
                      <ExternalLink size={12} /> WA Web Tab
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAutoSendGateway(activeCustomer)}
                      disabled={autoSending}
                      style={{
                        padding: '8px 18px',
                        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: autoSending ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                      }}
                    >
                      <Zap size={15} />
                      {autoSending ? '⚡ Delivering in Background...' : '⚡ 1-Click Auto Send (QR Attached)'}
                    </button>
                  </>
                ) : activeCustomer ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowWAGatewayModal(true)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.74rem', padding: '6px 10px', borderColor: '#86efac', background: '#f0fdf4', color: '#15803d', fontWeight: 700 }}
                    >
                      <QrCode size={12} /> 📲 Link WA Web for 1-Click Auto Send
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(activeCustomer)}
                      style={{
                        padding: '8px 18px',
                        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                      }}
                    >
                      <MessageSquare size={15} /> 📲 Send WhatsApp Reminder
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Web Gateway Pairing Modal */}
      {showWAGatewayModal && (
        <WhatsAppGatewayModal
          isOpen={showWAGatewayModal}
          onClose={() => {
            setShowWAGatewayModal(false);
            api.getWhatsAppGatewayStatus().then(res => setWaGateway((res as any)?.data || res)).catch(() => {});
          }}
          onStatusChange={(conn) => {
            api.getWhatsAppGatewayStatus().then(res => setWaGateway((res as any)?.data || res)).catch(() => {});
          }}
        />
      )}
    </div>
  );
};
