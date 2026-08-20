import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { WhatsAppParsedItem } from '../../types';

interface WhatsAppPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

export const WhatsAppPasteModal: React.FC<WhatsAppPasteModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated
}) => {
  const [outletName, setOutletName] = useState<string>('Outlet 1 - Sarthana Branch');
  const [rawMessage, setRawMessage] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Parsed Preview State
  const [preview, setPreview] = useState<{
    customer_name: string;
    customer_mobile: string;
    delivery_date: string;
    delivery_slot: string;
    delivery_venue: string;
    advance_amount: number;
    deposit_mode: string;
    outlet_name: string;
    items: WhatsAppParsedItem[];
  } | null>(null);

  // Debounced auto-parsing when raw text changes
  useEffect(() => {
    if (!rawMessage.trim()) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(() => {
      setIsParsing(true);
      api.parseWhatsAppPreview(rawMessage, outletName)
        .then(res => {
          const data = (res as any)?.data || res;
          if (data) {
            setPreview(data);
          }
        })
        .catch(console.error)
        .finally(() => setIsParsing(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [rawMessage, outletName]);

  if (!isOpen) return null;

  const handleSaveToInbox = async (autoApprove = false) => {
    if (!rawMessage.trim()) {
      setError('Please paste a WhatsApp message.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createRes = await api.createWhatsAppInboundOrder({
        raw_message: rawMessage,
        outlet_name: outletName,
        customer_name: preview?.customer_name,
        customer_mobile: preview?.customer_mobile,
        advance_amount: preview?.advance_amount
      });

      const orderId = (createRes as any)?.id || (createRes as any)?.data?.id;
      if (orderId) {
        if (autoApprove) {
          await api.approveWhatsAppOrder(orderId, 'Admin');
        }
        onOrderCreated();
        onClose();
        setRawMessage('');
      } else {
        setError('Failed to ingest WhatsApp order');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleEnglish = `Paresh Bhai Caterers
Mobile: 9898989898
Date: 15/08/2026 Morning 8:00 AM
Venue: Patel Wadi, Surat
Items:
- Gulab Jamun 25 kg
- Kaju Katli 10 kg
- Mohanthal 15 kg
Advance: 1000 Cash`;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #075e54 0%, #128c7e 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📲</span> Ingest WhatsApp Order (Direct Parser)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
              Paste message from Sarthana or Katargam WhatsApp groups ➔ Decoded into structured ERP order in 1 second!
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#ffffff', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Outlet Selection */}
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
              🏬 Select Source Branch:
            </label>
            <select
              value={outletName}
              onChange={(e) => setOutletName(e.target.value)}
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', borderColor: '#25d366', borderRadius: '8px', width: '280px' }}
            >
              <option value="Outlet 1 - Sarthana Branch">🏬 Outlet 1 - Sarthana Branch</option>
              <option value="Outlet 2 - Katargam Branch">🏬 Outlet 2 - Katargam Branch</option>
              <option value="Main Factory / Counter">🏭 Main Factory / Counter</option>
            </select>

            <button
              type="button"
              onClick={() => setRawMessage(sampleEnglish)}
              style={{ marginLeft: 'auto', fontSize: '0.78rem', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: 600 }}
            >
              📝 Fill Sample Message
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Left: Raw WhatsApp Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                  💬 Raw Message (Paste Text Here):
                </span>
                {isParsing && <span style={{ fontSize: '0.75rem', color: '#25d366', fontWeight: 700 }}>⏳ Decoding...</span>}
              </div>
              <textarea
                rows={12}
                className="form-input font-mono"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '0.86rem',
                  lineHeight: '1.5',
                  background: '#f8fafc',
                  borderColor: '#cbd5e1',
                  borderRadius: '10px'
                }}
                placeholder={`Paste WhatsApp group message here...\n\nExample:\nParesh Bhai Caterers\n15/8 morning 8:00 AM\nVenue: Patel Wadi\nGulab Jamun 25 kg\nKaju Katli 10 kg\nMohanthal 15 kg\nAdvance: 1000`}
                value={rawMessage}
                onChange={(e) => setRawMessage(e.target.value)}
                autoFocus
              />
            </div>

            {/* Right: Live Decoded Preview */}
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#166534', borderBottom: '1px solid #bbf7d0', paddingBottom: '6px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🤖</span> Smart Decoded Order Preview (Live Parsed)
              </div>

              {preview ? (
                <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>👤 Customer / Party Name</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{preview.customer_name || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>📞 Mobile Number</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{preview.customer_mobile || '-'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>📅 Delivery Date & Slot</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>
                        {preview.delivery_date} ({preview.delivery_slot === 'MORNING_1' || preview.delivery_slot === 'MORNING' ? '🌅 Morning' : '🌇 Evening'})
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>💰 Advance Token</div>
                      <div style={{ fontWeight: 800, color: '#15803d' }}>
                        ₹{preview.advance_amount} ({preview.deposit_mode})
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>📍 Delivery Venue</div>
                    <div style={{ fontWeight: 700, color: '#334155' }}>{preview.delivery_venue || '-'}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>
                      🧁 Sweets Items ({preview.items?.length || 0} Items)
                    </div>
                    {preview.items && preview.items.length > 0 ? (
                      <div style={{ background: '#ffffff', borderRadius: '6px', border: '1px solid #bbf7d0', overflow: 'hidden' }}>
                        {preview.items.map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderBottom: idx < preview.items.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '0.8rem' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{it.item_name}</span>
                            <span style={{ fontWeight: 800, color: '#166534', fontFamily: 'monospace' }}>
                              {it.quantity} {it.unit} {it.rate > 0 ? `(@ ₹${it.rate})` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.78rem' }}>No items detected</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                  Paste a message to see the automatic parsed preview here.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              disabled={isSubmitting || !rawMessage.trim()}
              onClick={() => handleSaveToInbox(false)}
              style={{
                padding: '8px 18px',
                background: '#ffffff',
                border: '1.5px solid #25d366',
                borderRadius: '8px',
                color: '#15803d',
                fontWeight: 700,
                cursor: (isSubmitting || !rawMessage.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              📥 Save to Inbox
            </button>

            <button
              type="button"
              disabled={isSubmitting || !rawMessage.trim()}
              onClick={() => handleSaveToInbox(true)}
              style={{
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 800,
                cursor: (isSubmitting || !rawMessage.trim()) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
              }}
            >
              ⚡ Ingest & 1-Click Approve Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
