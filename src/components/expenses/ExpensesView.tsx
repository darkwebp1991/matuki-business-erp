import React, { useState, useEffect } from 'react';
import { Plus, Search, Receipt, Download, Filter, Paperclip } from 'lucide-react';
import { api } from '../../api/client';
import { Expense, User } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';
import { canEditModule } from '../../utils/permissionUtils';
import { ExpenseModal } from './ExpenseModal';
import { ImageLightboxModal } from '../common/ImageLightboxModal';

interface ExpensesViewProps {
  currentUser?: User | null;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ currentUser }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const canEdit = canEditModule(currentUser, 'expenses');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      const data = await api.getExpenses(params);
      setExpenses(data);
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getExpenseCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [search, categoryFilter]);

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
            💸 Expenses & Overhead Vouchers
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Total Period Expenses: <strong style={{ color: '#dc2626', fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalExpense)}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportToCSV(expenses, 'Matuki_Expenses.csv')}
          >
            <Download size={14} />
            Export CSV
          </button>
          {canEdit && (
            <button className="btn btn-vyapar-green btn-sm" onClick={() => setIsModalOpen(true)} style={{ fontWeight: 800 }}>
              <Plus size={15} />
              + Add Expense
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            placeholder="Search expenses by category, voucher #, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ width: '240px' }}>
          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Expense Categories</option>
            {categories.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher #</th>
              <th>Expense Category</th>
              <th>Type</th>
              <th>Amount (₹)</th>
              <th>Payment Mode</th>
              <th>Reference #</th>
              <th>Notes / Remarks</th>
              <th style={{ textAlign: 'center' }}>Bill Photo</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No expenses recorded.
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {formatDate(e.date)}
                  </td>
                  <td className="font-mono" style={{ color: '#fbbf24', fontWeight: 700 }}>
                    {e.expense_no}
                  </td>
                  <td>
                    <strong style={{ color: '#fff' }}>{e.category}</strong>
                  </td>
                  <td>
                    {e.is_manufacturing_overhead ? (
                      <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>DIRECT OVERHEAD</span>
                    ) : (
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>INDIRECT EXPENSE</span>
                    )}
                  </td>
                  <td className="font-mono" style={{ fontWeight: 800, color: '#fb7185', fontSize: '0.95rem' }}>
                    {formatCurrency(e.amount)}
                  </td>
                  <td>
                    <span className="badge badge-blue">{e.payment_mode}</span>
                  </td>
                  <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {e.reference_no || '-'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                    {e.notes || '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {(e as any).bill_photo_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewUrl((e as any).bill_photo_url)}
                        className="btn btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#dc2626', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        title="View Attached Expense Receipt"
                      >
                        <Paperclip size={11} /> Bill
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <ExpenseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchExpenses();
          }}
        />
      )}

      {/* Lightbox for Expense Receipt */}
      {previewUrl && (
        <ImageLightboxModal
          isOpen={!!previewUrl}
          imageUrl={previewUrl}
          title="Attached Expense Receipt"
          onClose={() => setPreviewUrl('')}
        />
      )}
    </div>
  );
};
