import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 2000,
      maxWidth: '380px',
      pointerEvents: 'none'
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bg = toast.type === 'success' ? '#064e3b' : toast.type === 'error' ? '#881337' : '#0c4a6e';
  const border = toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#f43f5e' : '#38bdf8';
  const icon = toast.type === 'success'
    ? <CheckCircle2 size={18} color="#34d399" />
    : toast.type === 'error'
    ? <AlertCircle size={18} color="#fb7185" />
    : <Info size={18} color="#38bdf8" />;

  return (
    <div style={{
      pointerEvents: 'auto',
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      color: '#fff',
      fontSize: '0.85rem',
      fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon}
        <span>{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
