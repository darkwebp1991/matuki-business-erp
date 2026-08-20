import React, { useState, useEffect } from 'react';
import { ShieldAlert, Download, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { formatDateTime } from '../../utils/formatters';
import { exportToCSV } from '../../utils/exportUtils';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs(150);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Immutable System Audit Logs
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Comprehensive traceability of every sales invoice, stock adjustment, price change & login
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchLogs}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => exportToCSV(logs, 'Matuki_Audit_Logs.csv')}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Module</th>
              <th>Record ID</th>
              <th>Audit Trail Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No audit logs recorded.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td>
                    <strong style={{ color: '#fbbf24' }}>{log.username}</strong>
                  </td>
                  <td>
                    <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                      {log.module}
                    </span>
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.75rem' }}>
                    {log.record_id || '-'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#fff' }}>
                    {log.notes}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
