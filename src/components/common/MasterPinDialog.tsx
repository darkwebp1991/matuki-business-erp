import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldAlert, X, CheckCircle2 } from 'lucide-react';

interface MasterPinDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onConfirm: () => void;
  requiredPin?: string;
}

export const MasterPinDialog: React.FC<MasterPinDialogProps> = ({
  isOpen,
  title = 'Master PIN Security Verification',
  message = 'Enter 4-digit Master Security PIN (1234) to proceed with this action.',
  onClose,
  onConfirm,
  requiredPin = '1234'
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.trim() === requiredPin) {
      onConfirm();
      onClose();
    } else {
      setError('❌ Incorrect Master Security PIN! Access Denied');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 100002,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        animation: 'scaleUp 0.15s ease-out'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ffffff', color: '#dc2626', padding: '6px', borderRadius: '50%' }}>
              <Lock size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>
                {title}
              </h3>
              <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                🔒 Security Authorization Required
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleVerify} style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: '#475569', lineHeight: 1.4 }}>
            {message}
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
              🔑 Enter Master Security PIN:
            </label>
            <input
              ref={inputRef}
              type="password"
              maxLength={8}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError('');
              }}
              placeholder="••••"
              style={{
                width: '100%',
                fontSize: '1.4rem',
                letterSpacing: '8px',
                textAlign: 'center',
                padding: '10px',
                borderRadius: '8px',
                border: error ? '2px solid #dc2626' : '2px solid #cbd5e1',
                background: error ? '#fef2f2' : '#f8fafc',
                fontFamily: 'monospace',
                fontWeight: 900,
                outline: 'none'
              }}
            />
            {error && (
              <div style={{ color: '#dc2626', fontSize: '0.78rem', fontWeight: 800, marginTop: '6px', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ fontWeight: 700, padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-vyapar-red"
              style={{
                fontWeight: 900,
                padding: '8px 20px',
                background: '#dc2626',
                borderColor: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={16} /> Verify & Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
