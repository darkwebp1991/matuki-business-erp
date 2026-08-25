import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Wifi, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  QrCode,
  Laptop
} from 'lucide-react';
import { api } from '../../api/client';

interface MobileConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileConnectModal: React.FC<MobileConnectModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [loading, setLoading] = useState<boolean>(true);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      const res = await api.getNetworkInfo();
      setNetworkInfo((res as any).data || res);
    } catch (err) {
      console.error('Error fetching network info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const mobileUrl = networkInfo?.mobile_url || `http://${window.location.hostname}:5173`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileUrl)}&color=0f172a&bgcolor=ffffff&margin=1`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        maxWidth: '560px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 18px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#ffffff', color: '#1e3a8a', padding: '5px', borderRadius: '6px', display: 'flex' }}>
              <Smartphone size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                Mobile & Tablet Local Wi-Fi Access
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', opacity: 0.9 }}>
                Use ERP on any smartphone or tablet inside your shop & warehouse
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#ffffff', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#fafafa', alignItems: 'center' }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: '8px', color: '#2563eb' }} />
              <div>Detecting local shop Wi-Fi network address...</div>
            </div>
          ) : (
            <>
              {/* QR Code Container */}
              <div style={{
                background: '#ffffff',
                padding: '12px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <img
                  src={qrApiUrl}
                  alt="Mobile Access QR Code"
                  style={{ width: '180px', height: '180px', borderRadius: '6px', display: 'block' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <QrCode size={12} color="#2563eb" /> Scan with Phone Camera
                </span>
              </div>

              {/* Direct URL Box */}
              <div style={{
                width: '100%',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Local Wi-Fi Browser URL
                  </span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#1e3a8a', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mobileUrl}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem', padding: '5px 10px', fontWeight: 700 }}
                  >
                    {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(mobileUrl, '_blank')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.74rem', padding: '5px 8px' }}
                    title="Open in new tab"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>

              {/* Step-by-step Instructions Box */}
              <div style={{
                width: '100%',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: '#1e40af',
                lineHeight: '1.5'
              }}>
                <strong style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '0.82rem' }}>
                  <Wifi size={14} /> Easy 3-Step Setup:
                </strong>
                <ol style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Connect your mobile phone/tablet to your <strong>shop Wi-Fi network</strong>.</li>
                  <li>Scan the QR code above or open Chrome / Safari and type: <strong style={{ fontFamily: 'monospace' }}>{mobileUrl}</strong></li>
                  <li>Enjoy live mobile access to <strong>Order Planner</strong>, <strong>WhatsApp Orders</strong>, and <strong>Inventory</strong> from anywhere in the store!</li>
                </ol>
              </div>

              {/* Android Home Screen Widget App Download Box */}
              <div style={{
                width: '100%',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div>
                  <strong style={{ fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📲 Android Home Screen Widget (.APK)
                  </strong>
                  <div style={{ fontSize: '0.72rem', opacity: 0.95 }}>
                    Place live daily tasks widget directly on your Android phone home screen
                  </div>
                </div>

                <a
                  href="/download/matuki-tasks-widget.apk"
                  download="matuki-tasks-widget.apk"
                  style={{
                    background: '#ffffff',
                    color: '#047857',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  Download .APK ⬇️
                </a>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} /> Secure Local Area Network (No Internet Required)
          </span>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '5px 16px', fontWeight: 700 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
