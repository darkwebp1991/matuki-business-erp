import React, { useState, useEffect } from 'react';
import { Plus, Search, ShoppingBag, Download, Eye, Printer, Paperclip } from 'lucide-react';
import { api } from '../../api/client';
import { Purchase, User } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';
import { canEditModule } from '../../utils/permissionUtils';
import { StatusBadge } from '../common/StatusBadge';
import { NewPurchaseModal } from './NewPurchaseModal';
import { PurchaseDetailsModal } from './PurchaseDetailsModal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';

interface PurchasesViewProps {
  currentUser?: User | null;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ currentUser }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const canEdit = canEditModule(currentUser, 'purchases');

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const data = await api.getPurchases({ search });
      setPurchases(data);
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
            📦 Purchases & Supplier Invoices
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Raw material purchases, weighted average rate updates & supplier ledger credit
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportToCSV(purchases, 'Matuki_Purchases.csv')}
          >
            <Download size={14} />
            Export CSV
          </button>
          {canEdit && (
            <button 
              className="btn btn-vyapar-blue btn-sm" 
              onClick={() => setIsModalOpen(true)}
              style={{ fontWeight: 800 }}
            >
              <Plus size={15} />
              + New Purchase Entry [Alt+P]
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search Purchases by PO #, Supplier Name, or Supplier Invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Purchase #</th>
              <th>Supplier Name</th>
              <th>Supplier Bill #</th>
              <th>Subtotal</th>
              <th>GST Tax</th>
              <th>Grand Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Payment Mode</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No purchase vouchers recorded.
                </td>
              </tr>
            ) : (
              purchases.map((p) => (
                <tr 
                  key={p.id}
                  onClick={() => setSelectedPurchaseId(p.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {formatDate(p.date)}
                  </td>
                  <td className="font-mono" style={{ color: '#fbbf24', fontWeight: 700 }}>
                    {p.purchase_no}
                  </td>
                  <td>
                    <strong style={{ color: '#fff' }}>{p.supplier_name}</strong>
                  </td>
                  <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {p.supplier_invoice_no || '-'}
                  </td>
                  <td className="font-mono">{formatCurrency(p.subtotal)}</td>
                  <td className="font-mono">{formatCurrency(p.tax_amount)}</td>
                  <td className="font-mono" style={{ fontWeight: 800, color: '#34d399', fontSize: '0.95rem' }}>
                    {formatCurrency(p.grand_total)}
                  </td>
                  <td className="font-mono" style={{ color: '#38bdf8' }}>
                    {formatCurrency(p.paid_amount)}
                  </td>
                  <td className="font-mono" style={{ color: p.due_amount > 0 ? '#fb7185' : '#64748b' }}>
                    {formatCurrency(p.due_amount)}
                  </td>
                  <td>
                    <span className="badge badge-blue">{p.payment_mode}</span>
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {(p as any).bill_photo_url && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewUrl((p as any).bill_photo_url);
                          }}
                          className="btn btn-sm"
                          style={{ padding: '3px 6px', fontSize: '0.72rem', background: '#0284c7', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          title="View Attached Bill Photo"
                        >
                          <Paperclip size={11} /> Bill
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPurchaseId(p.id);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={12} /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Purchase Full Screen Vyapar Modal */}
      {isModalOpen && (
        <NewPurchaseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchPurchases();
          }}
        />
      )}

      {/* Purchase Details Modal */}
      {selectedPurchaseId && (
        <PurchaseDetailsModal
          isOpen={!!selectedPurchaseId}
          purchaseId={selectedPurchaseId}
          onClose={() => setSelectedPurchaseId(null)}
        />
      )}

      {/* Lightbox for Bill Photo */}
      {previewUrl && (
        <ImageLightboxModal
          isOpen={!!previewUrl}
          imageUrl={previewUrl}
          title="Attached Purchase Bill"
          onClose={() => setPreviewUrl('')}
        />
      )}
    </div>
  );
};
