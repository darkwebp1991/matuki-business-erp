import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'payment' | 'stock' | 'recipe';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'order' }) => {
  const s = (status || '').toUpperCase();

  if (s === 'ACTIVE' || s === 'COMPLETED' || s === 'PAID' || s === 'APPROVED') {
    return <span className="badge badge-green">{status}</span>;
  }
  if (s === 'CANCELLED' || s === 'DUE' || s === 'LOW_STOCK' || s === 'ARCHIVED') {
    return <span className="badge badge-red">{status}</span>;
  }
  if (s === 'DRAFT' || s === 'IN_PROGRESS' || s === 'PARTIAL' || s === 'PLANNED') {
    return <span className="badge badge-amber">{status}</span>;
  }
  if (s === 'CASH' || s === 'UPI' || s === 'BANK' || s === 'CARD') {
    return <span className="badge badge-blue">{status}</span>;
  }

  return <span className="badge badge-amber">{status}</span>;
};
