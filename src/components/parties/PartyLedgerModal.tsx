import React, { useState, useEffect } from 'react';
import { BookOpen, Printer, Download, Calendar } from 'lucide-react';
import { api } from '../../api/client';
import { LedgerEntry } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';
import { Modal } from '../common/Modal';

interface PartyLedgerModalProps {
  isOpen: boolean;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId: number;
  partyName: string;
  onClose: () => void;
}

export const PartyLedgerModal: React.FC<PartyLedgerModalProps> = ({
  isOpen,
  partyType,
  partyId,
  partyName,
  onClose
}) => {
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const res = await api.getPartyLedgerStatement(partyType, partyId, startDate, endDate);
      setStatement(res);
    } catch (err) {
      console.error('Error fetching ledger statement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partyId) {
      fetchStatement();
    }
  }, [partyId, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (statement?.entries) {
      exportToCSV(statement.entries, `${partyName}_Statement.csv`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Statement of Account: ${partyName}`}
      subtitle={`${partyType === 'CUSTOMER' ? 'Customer Receivable' : 'Supplier Payable'} Ledger with live running balance`}
      maxWidth="860px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: statement?.closing_balance > 0 ? (partyType === 'CUSTOMER' ? '#34d399' : '#fb7185') : '#fff' }}>
            Closing Balance: {formatCurrency(statement?.closing_balance)}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={14} /> Print Statement
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Date Filter Bar */}
        <div className="glass-panel no-print" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Filter Statement Range:</span>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Ledger Table */}
        <div className="table-container invoice-printable">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher Type</th>
                <th>Voucher #</th>
                <th>Particulars / Notes</th>
                <th>Debit (₹)</th>
                <th>Credit (₹)</th>
                <th>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {statement?.entries?.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No ledger transactions recorded for this period.
                  </td>
                </tr>
              ) : (
                statement?.entries?.map((entry: LedgerEntry) => (
                  <tr key={entry.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {formatDate(entry.entry_date)}
                    </td>
                    <td>
                      <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                        {entry.voucher_type}
                      </span>
                    </td>
                    <td className="font-mono" style={{ color: '#fbbf24' }}>
                      {entry.voucher_no}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#fff', maxWidth: '240px' }}>
                      {entry.notes}
                    </td>
                    <td className="font-mono" style={{ color: entry.debit_amount > 0 ? '#34d399' : 'inherit' }}>
                      {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                    </td>
                    <td className="font-mono" style={{ color: entry.credit_amount > 0 ? '#fb7185' : 'inherit' }}>
                      {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 800, color: '#fff' }}>
                      {formatCurrency(entry.running_balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
