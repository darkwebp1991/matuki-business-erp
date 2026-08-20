import React, { useState } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  Share2,
  Printer,
  Store,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface OrderQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderQRModal: React.FC<OrderQRModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'outlet1' | 'outlet2' | 'general'>('outlet1');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const origin = window.location.origin;

  const getLink = () => {
    if (activeTab === 'outlet1') return `${origin}?page=order&outlet=1`;
    if (activeTab === 'outlet2') return `${origin}?page=order&outlet=2`;
    return `${origin}?page=order`;
  };

  const getTitle = () => {
    if (activeTab === 'outlet1') return '🏬 Outlet 1 (Sarthana Branch Counter)';
    if (activeTab === 'outlet2') return '🏬 Outlet 2 (Katargam Branch Counter)';
    return '🌐 General Caterers & Customer Direct Link';
  };

  const currentUrl = getLink();

  // Free high quality QR generator API
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentUrl)}&color=0f172a&bgcolor=ffffff`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `🚩 *MATUKI SWEETS* 🚩\n` +
      `Hello! You can book your advance sweets order directly using our online link:\n\n` +
      `🔗 *Online Order Booking Link:*\n${currentUrl}\n\n` +
      `✅ 100% Pure Desi Ghee & Fresh Mawa Sweets\n` +
      `📞 Contact: +91 98765 43210`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrintStandee = () => {
    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Matuki Sweets - Counter Standee QR</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; color: #0f172a; margin: 0; padding: 20px; }
          .standee-card { border: 4px solid #d32f2f; border-radius: 24px; padding: 36px 24px; max-width: 500px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          .logo { font-size: 28px; font-weight: 900; color: #d32f2f; letter-spacing: 1px; margin-bottom: 4px; }
          .tagline { font-size: 14px; font-weight: 700; color: #475569; margin-bottom: 20px; }
          .outlet-badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 6px 16px; border-radius: 20px; font-weight: 800; font-size: 14px; margin-bottom: 20px; border: 1.5px solid #f87171; }
          .qr-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 20px; display: inline-block; margin-bottom: 20px; }
          .instruction { font-size: 18px; font-weight: 900; color: #15803d; margin-bottom: 8px; }
          .sub-inst { font-size: 13px; color: #64748b; margin-bottom: 24px; line-height: 1.5; }
          .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; }
        </style>
      </head>
      <body>
        <div class="standee-card">
          <div class="logo">🚩 MATUKI SWEETS 🚩</div>
          <div class="tagline">Pure Desi Ghee & Fresh Mawa Sweets</div>
          <div class="outlet-badge">${getTitle()}</div>
          <div class="instruction">📲 Scan with Camera to Book Order</div>
          <div class="sub-inst">Book Wedding, Event & Catering Sweets in 1 Minute directly from your phone</div>
          <div class="qr-box">
            <img src="${qrImageUrl}" width="260" height="260" alt="Order QR Code" />
          </div>
          <div style="font-family: monospace; font-size: 12px; color: #64748b; word-break: break-all; margin-bottom: 16px;">
            ${currentUrl}
          </div>
          <div class="footer">
            📍 Matuki Sweets • Surat • Helpline: +91 98765 43210
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #d32f2f 0%, #b91c1c 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <QrCode size={22} color="#fef08a" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
                Online Order QR Code & Booking Links
              </h2>
              <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                Direct Self-Order Portal for Outlet 1 & 2 Counters and Caterers
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Outlet Tabs */}
        <div style={{
          display: 'flex',
          background: '#f8fafc',
          padding: '6px 12px',
          borderBottom: '1px solid #e2e8f0',
          gap: '6px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('outlet1')}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'outlet1' ? '#ffffff' : 'transparent',
              color: activeTab === 'outlet1' ? '#d32f2f' : '#64748b',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'outlet1' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🏪 Outlet 1 (Sarthana)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outlet2')}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'outlet2' ? '#ffffff' : 'transparent',
              color: activeTab === 'outlet2' ? '#d32f2f' : '#64748b',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'outlet2' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🏪 Outlet 2 (Katargam)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'general' ? '#ffffff' : 'transparent',
              color: activeTab === 'general' ? '#d32f2f' : '#64748b',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'general' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🌐 Caterer Direct Link
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
            {getTitle()}
          </div>

          {/* QR Code Frame */}
          <div style={{
            display: 'inline-block',
            padding: '12px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '2px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            marginBottom: '14px'
          }}>
            <img
              src={qrImageUrl}
              alt="QR Code"
              width={200}
              height={200}
              style={{ display: 'block', borderRadius: '8px' }}
            />
          </div>

          {/* Link Box */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <span style={{
              fontSize: '0.78rem',
              color: '#334155',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'left'
            }}>
              {currentUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: copied ? '#16a34a' : '#d32f2f',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={handlePrintStandee}
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: '1.5px solid #d32f2f',
                background: '#fff1f2',
                color: '#9f1239',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Printer size={16} /> 🖨️ Print Counter Standee (A4/A5)
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: '#25D366',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Share2 size={16} /> 📲 Share Link on WhatsApp
            </button>
          </div>

          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              🌐 Open Portal Live Preview <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
