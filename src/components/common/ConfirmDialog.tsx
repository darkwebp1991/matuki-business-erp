import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Yes, Confirm',
  cancelText = 'Cancel',
  isDangerous = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="480px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={`btn ${isDangerous ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '8px 0' }}>
        <div style={{
          padding: '10px',
          borderRadius: 'var(--radius-sm)',
          background: isDangerous ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          color: isDangerous ? '#fb7185' : '#fbbf24'
        }}>
          <AlertTriangle size={24} />
        </div>
        <div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};
