import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogOut, 
  Send, 
  ShieldCheck, 
  Zap,
  Info
} from 'lucide-react';
import { api } from '../../api/client';

interface WhatsAppGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (connected: boolean) => void;
}

export const WhatsAppGatewayModal: React.FC<WhatsAppGatewayModalProps> = ({
  isOpen,
  onClose,
  onStatusChange
}) => {
  const [status, setStatus] = useState<{
    isConnected: boolean;
    isConnecting: boolean;
    phone: string | null;
    name: string | null;
    qrCode: string | null;
    qrGeneratedAt: number | null;
    lastError: string | null;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [testMobile, setTestMobile] = useState<string>('');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testSuccess, setTestSuccess] = useState<string>('');
  const [testError, setTestError] = useState<string>('');

  const fetchStatus = async () => {
    try {
      const res = await api.getWhatsAppGatewayStatus();
      const data = (res as any).data || res;
      setStatus(data);
      if (onStatusChange) {
        onStatusChange(Boolean(data.isConnected));
      }
    } catch (err: any) {
      console.error('Error fetching WhatsApp Gateway status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartConnect = async (forceNew = false) => {
    try {
      setRefreshing(true);
      await api.connectWhatsAppGateway(forceNew);
      await fetchStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to start WhatsApp connection');
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out and unlink this WhatsApp device?')) {
      try {
        setRefreshing(true);
        await api.logoutWhatsAppGateway();
        await fetchStatus();
      } catch (err: any) {
        alert(err.message || 'Failed to logout');
        setRefreshing(false);
      }
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMobile.trim()) return;

    try {
      setTestSending(true);
      setTestSuccess('');
      setTestError('');

      await api.sendWhatsAppGatewayMessage({
        to_mobile: testMobile.trim(),
        message_text: `Namaste! 🙏\nThis is a test message from *MATUKI SWEETS ERP* WhatsApp Web Gateway.\n\n✅ Gateway is 100% connected and operational!`,
        media_file_path: '/payment_qr.png'
      });

      setTestSuccess(`✓ Test message with PhonePe QR image sent successfully to ${testMobile}!`);
      setTimeout(() => setTestSuccess(''), 5000);
    } catch (err: any) {
      setTestError(err.message || 'Failed to send test message');
    } finally {
      setTestSending(false);
    }
  };

  // Poll status while modal is open and connecting
  useEffect(() => {
    if (!isOpen) return;

    fetchStatus();
    // Start connect if not connected
    handleStartConnect(false);

    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

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
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
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
              <Smartphone size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                WhatsApp Web QR Gateway
              </h3>
              <p style={{ fontSize: '0.72rem', margin: 0, opacity: 0.9 }}>
                Link Phone for 1-Click Background Messaging & Auto QR Attachment
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Status Banner */}
          {status?.isConnected ? (
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={24} color="#16a34a" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>WhatsApp Device Connected</span>
                      <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>ACTIVE</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
                      📱 Phone: <strong style={{ color: '#0f172a' }}>{status.phone || 'Linked'}</strong> {status.name ? `(${status.name})` : ''}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2', fontSize: '0.74rem', padding: '5px 10px', fontWeight: 700 }}
                >
                  <LogOut size={13} /> Unlink / Log Out
                </button>
              </div>

              <div style={{ fontSize: '0.74rem', color: '#166534', background: '#dcfce7', padding: '8px 12px', borderRadius: '6px' }}>
                ⚡ <strong>1-Click Automated Sending Active:</strong> All Sales Bills, Advance Orders, and Ugharani Reminders (with PhonePe QR attached) will be delivered silently in the background without needing to open WhatsApp Web tabs!
              </div>

              {/* Test Message Form */}
              <form onSubmit={handleSendTestMessage} style={{ borderTop: '1px solid #bbf7d0', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#14532d' }}>
                  Send a Quick Test Message with Attached PhonePe QR:
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
                    value={testMobile}
                    onChange={(e) => setTestMobile(e.target.value)}
                    className="form-input"
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-vyapar-green btn-sm"
                    disabled={testSending || !testMobile.trim()}
                    style={{ padding: '6px 14px', fontWeight: 800, fontSize: '0.78rem' }}
                  >
                    <Send size={13} /> {testSending ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
                {testSuccess && (
                  <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700 }}>
                    {testSuccess}
                  </span>
                )}
                {testError && (
                  <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700 }}>
                    ⚠️ {testError}
                  </span>
                )}
              </form>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', alignItems: 'center' }}>
              
              {/* QR Code Container */}
              <div style={{
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}>
                {status?.qrCode ? (
                  <>
                    <img
                      src={status.qrCode}
                      alt="WhatsApp Web Pairing QR"
                      style={{
                        width: '210px',
                        height: '210px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                        ⏳ Scan with WhatsApp
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartConnect(true)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                        title="Reload new QR code"
                      >
                        <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <RefreshCw size={32} color="#075e54" className="animate-spin" />
                    <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                      {status?.isConnecting ? 'Generating Link QR Code...' : 'Waiting for connection...'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartConnect(true)}
                      className="btn btn-vyapar-green btn-sm"
                      style={{ fontSize: '0.74rem', padding: '6px 12px', fontWeight: 800, marginTop: '8px' }}
                    >
                      <Zap size={13} /> Generate QR Code
                    </button>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                  How to Link Your WhatsApp Account:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#075e54', color: '#fff', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      1
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                      Open <strong>WhatsApp</strong> on your phone.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#075e54', color: '#fff', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      2
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                      Tap <strong>Menu (⋮)</strong> on Android or <strong>Settings</strong> on iPhone.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#075e54', color: '#fff', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      3
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                      Tap <strong>Linked Devices</strong> ➔ <strong>Link a Device</strong>.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#075e54', color: '#fff', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      4
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                      Point your phone camera at this QR code to scan!
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '6px', fontSize: '0.72rem', color: '#475569', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <ShieldCheck size={16} color="#075e54" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    <strong>100% Offline & Private:</strong> Session tokens are saved securely on your local PC. No external server or third-party sees your messages.
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* Bottom Features Info */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            color: '#64748b'
          }}>
            <span>✨ <strong>Automatic Attachment:</strong> Official PhonePe QR code is delivered automatically with each payment reminder.</span>
            <span style={{ fontWeight: 700, color: '#075e54' }}>✓ 0 Per-SMS Fees</span>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '10px 18px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 700 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
